const { v4: uuidv4 } = require("uuid");
const { isEmpty } = require("../utils");
const { messages } = require("../constants/messages");
const {
  findQuery,
  insertOne,
  updateOne,
  updateWithOperators,
} = require("../repository");
const { ObjectId } = require("mongodb");
const {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
} = require("../enums/farmeely");

// const createFarmeely = async (req, res, next) => {
//   const { product_id } = req.params;
//   const { address, city, number_of_slot, expected_date } = req.body;

//   // ✅ Access user data from req.params
//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     // Find the product
//     const [product] = await findQuery("Products", {
//       product_id: Number(product_id),
//     });

//     // Check if there's already an active Farmeely in this location
//     const [existingFarmeely] = await findQuery("Farmeely", {
//       product_id,
//       city: city,
//       slot_status: "active",
//     });

//     if (existingFarmeely) {
//       const err = new Error(
//         "An active Farmeely already exists in this location",
//       );
//       err.status = 400;
//       return next(err);
//     }

//     // Use product.total_slots from the product data
//     const totalSlots = product.total_slots;
//     const creatorSlots = parseInt(number_of_slot);
//     const availableSlots = totalSlots - creatorSlots;

//     // Validate slot selection
//     if (creatorSlots > totalSlots) {
//       const err = new Error(
//         `This ${product.product_name} allows maximum ${totalSlots} slots`,
//       );
//       err.status = 400;
//       return next(err);
//     }

//     if (creatorSlots <= 0) {
//       const err = new Error("You must take at least 1 slot");
//       err.status = 400;
//       return next(err);
//     }

//     // Calculate price per slot
//     const pricePerSlot = Math.ceil(
//       parseInt(product.product_price) / totalSlots,
//     );
//     const creatorAmount = pricePerSlot * creatorSlots;

//     const activeStatus = ACTIVE_SLOT_STATUS.inactive;

//     const slot_id = uuidv4();
//     const farmeely_id = uuidv4();

//     const slotValue = {
//       farmeely_id: farmeely_id,
//       user_id: user_id,
//       slot_id: slot_id,
//       product_id: product_id,
//       product_name: product.product_name,
//       expected_date: expected_date,
//       address: address,
//       city: city,
//       total_slots: totalSlots,
//       creator_slots_taken: creatorSlots,
//       slots_available: availableSlots,
//       price_per_slot: pricePerSlot,
//       creator_amount: creatorAmount,
//       total_product_price: product.product_price,
//       product_image: product.product_image,
//       product_description: product.description,
//       slot_status: activeStatus,
//       payment_status: "pending",
//       created_at: new Date(),
//       joined_users: [
//         {
//           user_id: user_id,
//           user_email: user_email,
//           slots_joined: creatorSlots,
//           amount_paid: 0,
//           is_paid: false,
//           joined_at: new Date(),
//           is_creator: true,
//         },
//       ],
//     };

//     const data = await insertOne("Farmeely", slotValue);

//     res.status(200).json({
//       status: true,
//       message: messages.slotCreated,
//       data: farmeely_id,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

const createFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { address, city, number_of_slot, expected_date } = req.body;

  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    const [product] = await findQuery("Products", {
      product_id: Number(product_id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const totalSlots = product.total_slots;
    const creatorSlots = parseInt(number_of_slot);

    if (creatorSlots <= 0 || creatorSlots > totalSlots) {
      return res.status(400).json({ message: "Invalid slot count" });
    }

    const pricePerSlot = Math.ceil(product.product_price / totalSlots);
    const creatorAmount = pricePerSlot * creatorSlots;

    const farmeely_id = uuidv4();
    const slot_id = uuidv4();

    await insertOne("Farmeely", {
      farmeely_id,
      slot_id,
      product_id,
      product_name: product.product_name,
      address,
      city,
      expected_date,
      total_slots: totalSlots,
      slots_available: totalSlots,
      price_per_slot: pricePerSlot,
      creator_amount: creatorAmount,
      slot_status: ACTIVE_SLOT_STATUS.inactive,
      payment_status: "pending",
      created_at: new Date(),
      joined_users: [
        {
          user_id,
          user_email,
          is_creator: true,
          slots_joined: 0,
          pending_slots: creatorSlots,
          amount_paid: 0,
          pending_amount: creatorAmount,
          is_paid: false,
          joined_at: new Date(),
        },
      ],
    });

    res.status(200).json({
      status: true,
      message: "Farmeely created. Complete payment to activate.",
      data: farmeely_id,
    });
  } catch (err) {
    next(err);
  }
};

const joinFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { city, number_of_slot } = req.body;

  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    const [farmeely] = await findQuery("Farmeely", {
      product_id,
      city,
      payment_status: "completed",
      slot_status: ACTIVE_SLOT_STATUS.active,
    });

    if (!farmeely) {
      return res.status(404).json({ message: "No active Farmeely found" });
    }
    const alreadyJoined = farmeely.joined_users.some(
      (u) => u.user_id === user_id,
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: "Already joined" });
    }
    const slotsToJoin = parseInt(number_of_slot);

    if (slotsToJoin <= 0 || slotsToJoin > farmeely.slots_available) {
      return res.status(400).json({ message: "Invalid slot amount" });
    }

    const amountToPay = slotsToJoin * farmeely.price_per_slot;

    await updateWithOperators(
      "Farmeely",
      { farmeely_id: farmeely.farmeely_id },
      {
        $push: {
          joined_users: {
            user_id,
            user_email,
            is_creator: false,
            slots_joined: 0,
            pending_slots: slotsToJoin,
            amount_paid: 0,
            pending_amount: amountToPay,
            is_paid: false,
            joined_at: new Date(),
          },
        },
      },
    );

    res.status(200).json({
      status: true,
      message: "Slots reserved. Complete payment.",
      data: {
        farmeely_id: farmeely.farmeely_id,
        pending_slots: slotsToJoin,
        amount: amountToPay,
      },
    });
  } catch (err) {
    next(err);
  }
};

const addMoreSlots = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const { additional_slots } = req.body;
  const user_id = req.params.customer_id;
  console.log("addMore SLots", additional_slots, typeof additional_slots);

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Check farmeely status
    if (farmeely.slot_status !== ACTIVE_SLOT_STATUS.active) {
      return res.status(400).json({
        message: "Cannot add slots to an inactive farmeely",
      });
    }

    // Find the user
    const user = farmeely.joined_users.find((u) => u.user_id === user_id);

    if (!user) {
      return res.status(403).json({
        message: "You are not part of this farmeely",
      });
    }

    // User must have already paid for their existing slots
    if (!user.is_paid) {
      return res.status(400).json({
        message: "Complete your initial payment before adding more slots",
      });
    }

    // Check if user already has pending additional slots
    if (
      (user.pending_additional_slots || 0) > 0 ||
      (user.pending_additional_amount || 0) > 0
    ) {
      return res.status(400).json({
        message:
          "You already have a pending slot addition. Complete that payment first.",
      });
    }

    const slotsToAdd = Number(additional_slots);
    console.log("Type of additional_slots:", typeof additional_slots);
    console.log("Slots to add:", typeof slotsToAdd, slotsToAdd);

    if (slotsToAdd <= 0) {
      return res.status(400).json({
        message: "Must add at least 1 slot",
      });
    }

    // Check availability
    if (slotsToAdd > farmeely.slots_available) {
      return res.status(400).json({
        message: `Only ${farmeely.slots_available} slots available`,
      });
    }

    const extraAmount = slotsToAdd * Number(farmeely.price_per_slot);
    console.log("Extra amount to pay:", typeof extraAmount, extraAmount);

    // Reserve slots temporarily by marking them as pending
    // DO NOT mark is_paid as false - user is still paid for existing slots
    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      {
        $set: {
          "joined_users.$.pending_additional_slots": slotsToAdd,
          "joined_users.$.pending_additional_amount": extraAmount,
          "joined_users.$.has_pending_addition": true,
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: "Additional slots reserved. Please complete payment.",
      data: {
        payment_type: "add_slots",
        farmeely_id: farmeely.farmeely_id,
        current_paid_slots: user.slots_joined,
        pending_additional_slots: slotsToAdd,
        total_slots_after_payment: user.slots_joined + slotsToAdd,
        amount_to_pay: extraAmount,
        user_type: user.is_creator ? "creator" : "member",
        current_payment_status: "paid", // For existing slots
        pending_payment_status: "pending", // For additional slots
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSingleFarmeely = async (req, res, next) => {
  const { slot_id } = req.params;

  try {
    const [farmeelySlot] = await findQuery("Farmeely", {
      slot_id: slot_id,
    });

    if (!farmeelySlot) {
      const err = new Error("Farmeely not found");
      err.status = 400;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: farmeelySlot,
    });
  } catch (err) {
    next(err);
  }
};

const getAllFarmeely = async (req, res, next) => {
  try {
    const farmeelySlots = await findQuery("Farmeely");

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: farmeelySlots,
    });
  } catch (err) {
    next(err);
  }
};

//get all farmeely of a user
const getFarmeelyOfUser = async (req, res, next) => {
  const user_id = req.params.customer_id;

  try {
    const farmeelySlots = await findQuery("Farmeely", {
      "joined_users.user_id": user_id,
    });

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: farmeelySlots,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFarmeely,
  joinFarmeely,
  addMoreSlots,
  getSingleFarmeely,
  getAllFarmeely,
  getFarmeelyOfUser,
};
