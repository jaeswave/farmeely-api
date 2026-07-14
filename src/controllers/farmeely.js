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
  FARMEELY_STATUS,
} = require("../enums/farmeely");
const hello = 11111;
const PLATFORM_FEE_PERCENT = 0.1; // 10%




const createFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { address, city, number_of_slot, expected_date } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    const [product] = await findQuery("Products", {
      product_id: Number(product_id),
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Block duplicate unpaid "create" attempts
    const [existingStaging] = await findQuery("FarmeelyStaging", {
      action_type: "create",
      product_id: Number(product_id),
      city,
      user_id,
      status: "awaiting_payment",
    });
    if (existingStaging && new Date() < new Date(existingStaging.expires_at)) {
      return res.status(400).json({
        message:
          "You already have a pending farmeely creation. Complete payment or wait for it to expire.",
        data: { farmeely_id: existingStaging.farmeely_id },
      });
    }

    // Block if user already has a PAID, active farmeely as creator here
    const [existingActive] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      city,
      "joined_users.user_id": user_id,
      "joined_users.is_creator": true,
      farmeely_status: {
        $in: [FARMEELY_STATUS.inProgress, FARMEELY_STATUS.fullyBooked],
      },
    });
    if (existingActive) {
      return res.status(400).json({
        message:
          "You already have an active farmeely for this product in this city",
        data: { farmeely_id: existingActive.farmeely_id },
      });
    }

    const states = await findQuery("States");
    const deliveryFee =
      states
        .flatMap((s) => s.cities)
        .find((c) => c.name.toLowerCase() === city.toLowerCase())
        ?.deliveryFee ?? 0;

    const totalSlots = product.total_slots;
    const creatorSlots = parseInt(number_of_slot);
    if (creatorSlots <= 0 || creatorSlots > totalSlots) {
      return res
        .status(400)
        .json({
          message: `Invalid slot count. Must be between 1 and ${totalSlots}`,
        });
    }

    const FEE_PERCENTAGE = product.percentage || 10;
    const basePricePerSlot = Math.ceil(product.product_price / totalSlots);
    const baseSubtotal = basePricePerSlot * creatorSlots;
    const feeAmount = Math.ceil(baseSubtotal * (FEE_PERCENTAGE / 100));
    const ownershipPercentage = (creatorSlots / totalSlots) * 100;
    const amountToPay = baseSubtotal + feeAmount + deliveryFee;

    const farmeely_id = uuidv4();
    const slot_id = uuidv4();

    await insertOne("FarmeelyStaging", {
      staging_id: uuidv4(),
      action_type: "create",
      farmeely_id,
      slot_id,
      product_id: Number(product_id),
      product_name: product.product_name,
      product_price: product.product_price,
      product_image: product.product_image,
      user_id,
      user_email,
      address,
      city,
      expected_date,
      total_slots: totalSlots,
      slots_requested: creatorSlots,
      base_price_per_slot: basePricePerSlot,
      fee_percentage: FEE_PERCENTAGE,
      ownership_percentage: ownershipPercentage,
      delivery_fee: deliveryFee,
      base_subtotal: baseSubtotal,
      fee_amount: feeAmount,
      amount_to_pay: amountToPay,
      reference: null,
      status: "awaiting_payment",
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      status: true,
      message: "Farmeely staged. Complete payment within 24 hours to activate.",
      data: {
        farmeely_id,
        amount_to_pay: amountToPay,
        breakdown: {
          product_name: product.product_name,
          your_slots: creatorSlots,
          base_subtotal: baseSubtotal,
          fee_amount: feeAmount,
          delivery_fee: deliveryFee,
          total: amountToPay,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const joinFarmeely = async (req, res, next) => {
  const { product_id, farmeely_id } = req.params;
  const { city, number_of_slot } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    const [farmeely] = await findQuery("Farmeely", {
      farmeely_id,
      farmeely_status: FARMEELY_STATUS.inProgress,
    });
    if (!farmeely) {
      return res
        .status(404)
        .json({ message: "No active farmeely group found to join." });
    }

    const alreadyJoined = farmeely.joined_users.some(
      (u) => u.user_id === user_id,
    );
    if (alreadyJoined) {
      return res
        .status(400)
        .json({ message: "You have already joined this farmeely" });
    }

    const [existingStaging] = await findQuery("FarmeelyStaging", {
      action_type: "join",
      farmeely_id,
      user_id,
      status: "awaiting_payment",
    });
    if (existingStaging && new Date() < new Date(existingStaging.expires_at)) {
      return res.status(400).json({
        message:
          "You already have a pending join request. Complete payment to join.",
        data: { farmeely_id },
      });
    }

    const slotsToJoin = parseInt(number_of_slot);
    if (slotsToJoin <= 0 || slotsToJoin > farmeely.slots_available) {
      return res
        .status(400)
        .json({
          message: `Invalid slot amount. Available: ${farmeely.slots_available}`,
        });
    }

    const states = await findQuery("States");
    const deliveryFee =
      states
        .flatMap((s) => s.cities)
        .find((c) => c.name.toLowerCase() === city.toLowerCase())
        ?.deliveryFee ?? 0;

    const FEE_PERCENTAGE = farmeely.fee_percentage_per_slot || 10;
    const basePricePerSlot = farmeely.base_price_per_slot;
    const baseSubtotal = basePricePerSlot * slotsToJoin;
    const feeAmount = Math.ceil(baseSubtotal * (FEE_PERCENTAGE / 100));
    const ownershipPercentage = (slotsToJoin / farmeely.total_slots) * 100;
    const amountToPay = baseSubtotal + feeAmount + deliveryFee;

    await insertOne("FarmeelyStaging", {
      staging_id: uuidv4(),
      action_type: "join",
      farmeely_id,
      product_id: Number(product_id),
      user_id,
      user_email,
      city,
      slots_requested: slotsToJoin,
      base_price_per_slot: basePricePerSlot,
      fee_percentage: FEE_PERCENTAGE,
      ownership_percentage: ownershipPercentage,
      delivery_fee: deliveryFee,
      base_subtotal: baseSubtotal,
      fee_amount: feeAmount,
      amount_to_pay: amountToPay,
      reference: null,
      status: "awaiting_payment",
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      status: true,
      message: "Slots staged. Complete payment to join.",
      data: {
        farmeely_id,
        slots_requested: slotsToJoin,
        amount_to_pay: amountToPay,
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

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely)
      return res.status(404).json({ message: "Farmeely not found" });

    if (farmeely.farmeely_status !== FARMEELY_STATUS.inProgress) {
      return res
        .status(400)
        .json({
          message: `Cannot add slots. Farmeely status: ${farmeely.farmeely_status}`,
        });
    }

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user)
      return res
        .status(403)
        .json({ message: "You are not part of this farmeely" });
    // Note: everyone in joined_users is by definition already paid now, so no is_paid check needed.

    const [existingStaging] = await findQuery("FarmeelyStaging", {
      action_type: "add_slots",
      farmeely_id,
      user_id,
      status: "awaiting_payment",
    });
    if (existingStaging && new Date() < new Date(existingStaging.expires_at)) {
      return res
        .status(400)
        .json({
          message:
            "You already have a pending slot addition. Complete that payment first.",
        });
    }

    const slotsToAdd = Number(additional_slots);
    if (slotsToAdd <= 0)
      return res.status(400).json({ message: "Must add at least 1 slot" });
    if (slotsToAdd > farmeely.slots_available) {
      return res
        .status(400)
        .json({ message: `Only ${farmeely.slots_available} slots available` });
    }

    const FEE_PERCENTAGE = farmeely.fee_percentage_per_slot || 10;
    const basePricePerSlot = farmeely.base_price_per_slot;
    const baseSubtotal = basePricePerSlot * slotsToAdd;
    const feeAmount = Math.ceil(baseSubtotal * (FEE_PERCENTAGE / 100));
    const additionalOwnership = (slotsToAdd / farmeely.total_slots) * 100;
    const amountToPay = baseSubtotal + feeAmount; // no delivery fee on additions

    await insertOne("FarmeelyStaging", {
      staging_id: uuidv4(),
      action_type: "add_slots",
      farmeely_id,
      user_id,
      slots_requested: slotsToAdd,
      base_price_per_slot: basePricePerSlot,
      fee_percentage: FEE_PERCENTAGE,
      ownership_percentage: additionalOwnership,
      base_subtotal: baseSubtotal,
      fee_amount: feeAmount,
      amount_to_pay: amountToPay,
      reference: null,
      status: "awaiting_payment",
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      status: true,
      message: "Additional slots staged. Complete payment to confirm.",
      data: {
        farmeely_id,
        slots_requested: slotsToAdd,
        amount_to_pay: amountToPay,
      },
    });
  } catch (err) {
    next(err);
  }
};




// ========== GET FARMEELY STATUS ENDPOINT ==========
const getFarmeelyStatus = async (req, res, next) => {
  const { farmeely_id } = req.params;

  try {
    const status = await checkFarmeelyCompletion(farmeely_id);

    if (!status) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    res.status(200).json({
      status: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
};

// const joinFarmeely = async (req, res, next) => {
//   const { product_id, farmeely_id } = req.params;
//   const { city, number_of_slot } = req.body;
//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     // Find the farmeely (only active ones)
//     const [farmeely] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       farmeely_id: farmeely_id,
//       farmeely_status: FARMEELY_STATUS.inProgress,
//     });

//     if (!farmeely) {
//       return res
//         .status(404)
//         .json({ message: "No active farmeely group found" });
//     }

//     // Check if user already joined
//     const alreadyJoined = farmeely.joined_users.some(
//       (u) => u.user_id === user_id,
//     );
//     if (alreadyJoined) {
//       return res
//         .status(400)
//         .json({ message: "You have already joined this farmeely" });
//     }

//     // Calculate available slots
//     const confirmedSlots = farmeely.joined_users
//       .filter((u) => u.is_paid)
//       .reduce((sum, u) => sum + u.slots_joined, 0);

//     const pendingSlotsTotal = farmeely.joined_users
//       .filter((u) => !u.is_paid)
//       .reduce((sum, u) => sum + (u.pending_slots || 0), 0);

//     const availableSlots =
//       farmeely.total_slots - (confirmedSlots + pendingSlotsTotal);
//     const slotsToJoin = parseInt(number_of_slot);

//     if (slotsToJoin <= 0 || slotsToJoin > availableSlots) {
//       return res
//         .status(400)
//         .json({ message: `Invalid slot amount. Available: ${availableSlots}` });
//     }

//     // Get delivery fee for their city
//     const states = await findQuery("States");
//     const deliveryFee =
//       states
//         .flatMap((s) => s.cities)
//         .find((c) => c.name.toLowerCase() === city.toLowerCase())
//         ?.deliveryFee || 0;

//     // Calculate base price per slot from original product price
//     const basePricePerSlot =
//       farmeely.total_product_price / farmeely.total_slots;

//     // Add platform fee for joiner
//     const pricePerSlotWithFee = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );

//     // Calculate total amount for joiner
//     const amountToPay = slotsToJoin * pricePerSlotWithFee + deliveryFee;

//     // Add as pending member
//     await updateWithOperators(
//       "Farmeely",
//       { farmeely_id },
//       {
//         $push: {
//           joined_users: {
//             user_id,
//             user_email,
//             is_creator: false,
//             slots_joined: 0,
//             pending_slots: slotsToJoin,
//             amount_paid: 0,
//             pending_amount: amountToPay,
//             is_paid: false,
//             delivery_city: city,
//             delivery_fee: deliveryFee,
//             joined_at: new Date(),
//           },
//         },
//       },
//     );

//     res.status(200).json({
//       status: true,
//       message: "Slots reserved. Complete payment to join.",
//       data: {
//         farmeely_id,
//         pending_slots: slotsToJoin,
//         amount_to_pay: amountToPay,
//         delivery_fee: deliveryFee,
//         breakdown: {
//           product_name: farmeely.product_name,
//           slots_requested: slotsToJoin,
//           base_price_per_slot: basePricePerSlot,
//           platform_fee_percent: PLATFORM_FEE_PERCENT * 100,
//           platform_fee_amount:
//             basePricePerSlot * PLATFORM_FEE_PERCENT * slotsToJoin,
//           price_per_slot_with_fee: pricePerSlotWithFee,
//           subtotal: slotsToJoin * pricePerSlotWithFee,
//           delivery_fee: deliveryFee,
//           total: amountToPay,
//         },
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// const addMoreSlots = async (req, res, next) => {
//   const { farmeely_id } = req.params;
//   const { additional_slots } = req.body;
//   const user_id = req.params.customer_id;
//   console.log("addMore Slots", additional_slots, typeof additional_slots);

//   try {
//     const [farmeely] = await findQuery("Farmeely", { farmeely_id });

//     if (!farmeely) {
//       return res.status(404).json({ message: "Farmeely not found" });
//     }

//     // Check farmeely status
//     if (farmeely.slot_status !== ACTIVE_SLOT_STATUS.active) {
//       return res.status(400).json({
//         message: "Cannot add slots to an inactive farmeely",
//       });
//     }

//     // Find the user
//     const user = farmeely.joined_users.find((u) => u.user_id === user_id);

//     if (!user) {
//       return res.status(403).json({
//         message: "You are not part of this farmeely",
//       });
//     }

//     // User must have already paid for their existing slots
//     if (!user.is_paid) {
//       return res.status(400).json({
//         message: "Complete your initial payment before adding more slots",
//       });
//     }

//     // Check if user already has pending additional slots
//     if (
//       (user.pending_additional_slots || 0) > 0 ||
//       (user.pending_additional_amount || 0) > 0
//     ) {
//       return res.status(400).json({
//         message:
//           "You already have a pending slot addition. Complete that payment first.",
//       });
//     }

//     const slotsToAdd = Number(additional_slots);
//     console.log("Type of additional_slots:", typeof additional_slots);
//     console.log("Slots to add:", typeof slotsToAdd, slotsToAdd);

//     if (slotsToAdd <= 0) {
//       return res.status(400).json({
//         message: "Must add at least 1 slot",
//       });
//     }

//     // Check availability
//     if (slotsToAdd > farmeely.slots_available) {
//       return res.status(400).json({
//         message: `Only ${farmeely.slots_available} slots available`,
//       });
//     }

//     // Calculate base price per slot from original product price
//     const basePricePerSlot =
//       farmeely.total_product_price / farmeely.total_slots;

//     // Add platform fee for additional slots
//     const pricePerSlotWithFee = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );

//     // Calculate extra amount with platform fee
//     const extraAmount = slotsToAdd * pricePerSlotWithFee;
//     console.log("Extra amount to pay:", typeof extraAmount, extraAmount);

//     // Reserve slots temporarily by marking them as pending
//     await updateOne(
//       "Farmeely",
//       { farmeely_id, "joined_users.user_id": user_id },
//       {
//         $set: {
//           "joined_users.$.pending_additional_slots": slotsToAdd,
//           "joined_users.$.pending_additional_amount": extraAmount,
//           "joined_users.$.has_pending_addition": true,
//         },
//       },
//     );

//     return res.status(200).json({
//       status: true,
//       message: "Additional slots reserved. Please complete payment.",
//       data: {
//         payment_type: "add_slots",
//         farmeely_id: farmeely.farmeely_id,
//         current_paid_slots: user.slots_joined,
//         pending_additional_slots: slotsToAdd,
//         total_slots_after_payment: user.slots_joined + slotsToAdd,
//         amount_to_pay: extraAmount,
//         user_type: user.is_creator ? "creator" : "member",
//         current_payment_status: "paid",
//         pending_payment_status: "pending",
//         breakdown: {
//           additional_slots: slotsToAdd,
//           base_price_per_slot: basePricePerSlot,
//           platform_fee_percent: PLATFORM_FEE_PERCENT * 100,
//           platform_fee_amount:
//             basePricePerSlot * PLATFORM_FEE_PERCENT * slotsToAdd,
//           price_per_slot_with_fee: pricePerSlotWithFee,
//           subtotal: slotsToAdd * pricePerSlotWithFee,
//           total: extraAmount,
//         },
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

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

const getFarmeelyOfUser = async (req, res, next) => {
  const user_id = req.params.customer_id;

  try {
    const farmeelySlots = await findQuery("Farmeely", {
      "joined_users.user_id": user_id,
    });

    const updatedFarmeely = await Promise.all(
      farmeelySlots.map(async (slot) => {
        const product = await findQuery("Products", {
          product_id: Number(slot.product_id),
        });

        const productImage = product[0].product_image;

        return {
          ...slot,
          product_image: productImage,
        };
      }),
    );

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: updatedFarmeely,
    });
  } catch (err) {
    next(err);
  }
};

const getFeaturedFarmeelyByCity = async (req, res, next) => {
  try {
    const user_id = req.params.customer_id;

    const [userDetails] = await findQuery("Users", {
      customer_id: user_id,
    });

    if (!userDetails || userDetails.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1️⃣ Get user's city
    const userCities = userDetails.address.map((a) => a.city);

    const allFarmeely = await findQuery("Farmeely", {
      slot_status: "active",
      farmeely_status: FARMEELY_STATUS.inProgress,
    });

    console.log("User Cities:", userCities);
    console.log("Total active farmeely groups:", allFarmeely);

    const sameCity = [];
    const otherCities = [];

    allFarmeely.forEach((farmeely) => {
      if (userCities.includes(farmeely.city)) {
        sameCity.push(farmeely);
      } else {
        otherCities.push(farmeely);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        sameCity: sameCity,
        otherCities: otherCities,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllCities = async (req, res, next) => {
  try {
    const states = await findQuery("States");

    return res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFarmeely,
  joinFarmeely,
  addMoreSlots,
  getSingleFarmeely,
  getAllFarmeely,
  getFarmeelyOfUser,
  getFeaturedFarmeelyByCity,
  getAllCities,
};
