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

const createFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { address, city, number_of_slot, expected_date } = req.body;

  // ✅ Access user data from req.params
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    // Find the product
    const [product] = await findQuery("Products", {
      product_id: Number(product_id),
    });

    // Check if there's already an active Farmeely in this location
    const [existingFarmeely] = await findQuery("Farmeely", {
      product_id,
      city: city,
      slot_status: "active",
    });

    if (existingFarmeely) {
      const err = new Error(
        "An active Farmeely already exists in this location",
      );
      err.status = 400;
      return next(err);
    }

    // Use product.total_slots from the product data
    const totalSlots = product.total_slots;
    const creatorSlots = parseInt(number_of_slot);
    const availableSlots = totalSlots - creatorSlots;

    // Validate slot selection
    if (creatorSlots > totalSlots) {
      const err = new Error(
        `This ${product.product_name} allows maximum ${totalSlots} slots`,
      );
      err.status = 400;
      return next(err);
    }

    if (creatorSlots <= 0) {
      const err = new Error("You must take at least 1 slot");
      err.status = 400;
      return next(err);
    }

    // Calculate price per slot
    const pricePerSlot = Math.ceil(
      parseInt(product.product_price) / totalSlots,
    );
    const creatorAmount = pricePerSlot * creatorSlots;

    const activeStatus = ACTIVE_SLOT_STATUS.inactive;

    const slot_id = uuidv4();
    const farmeely_id = uuidv4();

    const slotValue = {
      farmeely_id: farmeely_id,
      user_id: user_id,
      slot_id: slot_id,
      product_id: product_id,
      product_name: product.product_name,
      expected_date: expected_date,
      address: address,
      city: city,
      total_slots: totalSlots,
      creator_slots_taken: creatorSlots,
      slots_available: availableSlots,
      price_per_slot: pricePerSlot,
      creator_amount: creatorAmount,
      total_product_price: product.product_price,
      product_image: product.product_image,
      product_description: product.description,
      slot_status: activeStatus,
      payment_status: "pending",
      created_at: new Date(),
      joined_users: [
        {
          user_id: user_id,
          user_email: user_email,
          slots_joined: creatorSlots,
          amount_paid: 0,
          joined_at: new Date(),
          is_creator: true,
        },
      ],
    };

    const data =await insertOne("Farmeely", slotValue);

    res.status(200).json({
      status: true,
      message: messages.slotCreated,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

const joinFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { address, city, number_of_slot } = req.body;

  // ✅ Get user data from middleware
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    // 1. Find the active Farmeely slot for this product and location
    const [farmeelySlot] = await findQuery("Farmeely", {
      product_id: Number(product_id), // Convert product_id to number
      city: city,
      slot_status: "active",
      payment_status : "completed",
    });

    if (!farmeelySlot) {
      const err = new Error(
        "No active Farmeely found for this product and location",
      );
      err.status = 400;
      return next(err);
    }

    // 2. Check if user is already in this Farmeely
    const userAlreadyJoined = farmeelySlot.joined_users?.some(
      (user) => user.user_id === user_id,
    );

    if (userAlreadyJoined) {
      const err = new Error("You have already joined this Farmeely");
      err.status = 400;
      return next(err);
    }

    // 3. Check if enough slots are available
    const slotsToJoin = parseInt(number_of_slot);
    console.log("slotsToJoin", slotsToJoin);

    if (slotsToJoin > farmeelySlot.slots_available) {
      const err = new Error(
        `Only ${farmeelySlot.slots_available} slots available`,
      );
      err.status = 400;
      return next(err);
    }

    if (slotsToJoin <= 0) {
      const err = new Error("You must join at least 1 slot");
      err.status = 400;
      return next(err);
    }

    // 4. Calculate amount to pay
    const amountToPay = farmeelySlot.price_per_slot * slotsToJoin;

    // 5. Update available slots and add user to joined users
    const updatedSlotsAvailable = farmeelySlot.slots_available - slotsToJoin;

    const updatedSlotStatus =
      updatedSlotsAvailable === 0
        ? ACTIVE_SLOT_STATUS.inactive
        : ACTIVE_SLOT_STATUS.active;

    // 6. Update Farmeely slot
    await updateWithOperators(
      "Farmeely",
      { slot_id: farmeelySlot.slot_id },
      {
        $inc: { slots_available: -slotsToJoin },
        $push: {
          joined_users: {
            user_id: user_id,
            user_email: user_email,
            slots_joined: slotsToJoin,
            amount_paid: amountToPay,
            joined_at: new Date(),
            is_creator: false,
          },
        },
        $set: { slot_status: updatedSlotStatus },
      },
    );

    res.status(200).json({
      status: true,
      message: "Successfully joined Farmeely",
      data: {
        farmeely_id: farmeelySlot.slot_id,
        product: farmeelySlot.product_name,
        address: address,
        city: city,
        slots_joined: slotsToJoin,
        price_per_slot: farmeelySlot.price_per_slot,
        total_amount: amountToPay,
        slots_remaining: updatedSlotsAvailable,
        joined_at: new Date(),
      },
    });
  } catch (err) {
    console.log("❌ Error joining Farmeely:", err);
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
    const farmeelySlots = await findQuery("Farmeely", {});

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
  getSingleFarmeely,
  getAllFarmeely,
};
