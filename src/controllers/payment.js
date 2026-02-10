const { startPayment, completePayment } = require("../services/payment");
const {
  findQuery,
  insertOne,
  updateOne,
  updateMany,
  updateWithOperators,
} = require("../repository");
const {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
} = require("../enums/farmeely");

// Unified payment initialization
const initializePayment = async (req, res) => {
  try {
    const { farmeely_id, payment_type } = req.body; // 'create', 'join', 'add_slots'
    const user_id = req.params.customer_id;
    const email = req.params.email;

    // Get farmeely details
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Find the user
    const user = farmeely.joined_users.find((u) => u.user_id === user_id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in this farmeely" });
    }

    let amount = 0;
    let pendingSlots = 0;
    let pendingAmount = 0;
    let description = "";

    // Determine amount and details based on payment type
    switch (payment_type) {
      case "create":
        // Creator's initial payment
        amount = user.pending_amount || 0;
        pendingSlots = user.pending_slots || 0;
        pendingAmount = user.pending_amount || 0;
        description = `Initial payment for ${pendingSlots} slot(s) as creator`;

        if (amount <= 0) {
          return res
            .status(400)
            .json({ message: "No pending payment found for creation" });
        }
        break;

      case "join":
        // New member joining
        amount = user.pending_amount || 0;
        pendingSlots = user.pending_slots || 0;
        pendingAmount = user.pending_amount || 0;
        description = `Joining farmeely with ${pendingSlots} slot(s)`;

        if (amount <= 0) {
          return res
            .status(400)
            .json({ message: "No pending payment found for joining" });
        }
        break;

      case "add_slots":
        // Adding more slots (creator or member)
        amount = user.pending_additional_amount || 0;
        pendingSlots = user.pending_additional_slots || 0;
        pendingAmount = user.pending_additional_amount || 0;
        description = `Adding ${pendingSlots} additional slot(s) to existing ${user.slots_joined} slot(s)`;

        if (amount <= 0) {
          return res
            .status(400)
            .json({ message: "No pending additional slots to pay for" });
        }

        // User must be already paid for existing slots
        if (!user.is_paid) {
          return res.status(400).json({
            message: "Complete your initial payment before adding more slots",
          });
        }
        break;

      default:
        return res.status(400).json({ message: "Invalid payment type" });
    }

    const callback_url = `${process.env.APP_URL}/payment/callback`;

    const response = await startPayment(
      amount,
      email,
      callback_url,
      description,
    );

    console.log("Payment response:", response.data.data);

    // Record transaction with clear metadata
    const transaction = await insertOne("Transaction", {
      farmeely_id: farmeely_id,
      customer_id: user_id,
      amount: amount,
      reference: response.data.data.reference,
      transaction_status: "pending",
      payment_type: payment_type,
      metadata: {
        current_slots: user.slots_joined,
        current_amount_paid: user.amount_paid,
        pending_slots: pendingSlots,
        pending_amount: pendingAmount,
        user_type: user.is_creator ? "creator" : "member",
        current_payment_status: user.is_paid ? "paid" : "pending",
        description: description,
      },
      created_at: new Date(),
    });

    return res.status(200).json({
      status: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
        amount: amount,
        payment_type: payment_type,
        farmeely_id: farmeely_id,
        metadata: {
          pending_slots: pendingSlots,
          pending_amount: pendingAmount,
          description: description,
        },
      },
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return res.status(500).json({
      message: "Payment initialization failed",
      error: error.response?.data?.message || error.message,
    });
  }
};

// Unified payment verification
const verifyPayment = async (req, res) => {
  const { reference } = req.params;
  const user_id = req.params.customer_id;

  try {
    // Verify payment with payment service
    const response = await completePayment(reference);

    if (response.data.data.status !== "success") {
      throw new Error("Payment verification failed - payment not successful");
    }

    // Get transaction details
    const [transaction] = await findQuery("Transaction", { reference });
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const { farmeely_id, payment_type, amount } = transaction;

    // Get farmeely details
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely) {
      throw new Error("Farmeely not found");
    }

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user) {
      throw new Error("User not found in farmeely");
    }

    // Handle different payment types
    switch (payment_type) {
      case "create":
        await handleCreatePayment(farmeely, user, transaction);
        break;
      case "join":
        await handleJoinPayment(farmeely, user, transaction);
        break;
      case "add_slots":
        await handleAddSlotsPayment(farmeely, user, transaction);
        break;
      default:
        throw new Error("Unknown payment type");
    }

    // Update transaction status
    await updateOne(
      "Transaction",
      { reference },
      {
        $set: {
          transaction_status: "completed",
          verified_at: new Date(),
          payment_details: response.data.data,
        },
      },
    );

    res.status(200).json({
      status: true,
      message: "Payment verified successfully",
      data: {
        payment_type: payment_type,
        amount: amount,
        farmeely_id: farmeely_id,
        reference: reference,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("Payment verification error:", err);

    // Update transaction as failed
    if (reference) {
      await updateOne(
        "Transaction",
        { reference },
        {
          $set: {
            transaction_status: "failed",
            error_message: err.message,
            failed_at: new Date(),
          },
        },
      );
    }

    res.status(500).json({
      status: false,
      message: "Payment verification failed",
      error: err.message,
    });
  }
};

// ========== PAYMENT HANDLERS ==========

// Handler for creator's initial payment
const handleCreatePayment = async (farmeely, user, transaction) => {
  const pendingSlots = user.pending_slots || 0;
  const pendingAmount = user.pending_amount || 0;

  if (pendingSlots <= 0 || pendingAmount <= 0) {
    throw new Error("No pending slots or amount found for creation payment");
  }

  const updateOperations = {
    $inc: {
      slots_available: -pendingSlots,
      "joined_users.$.slots_joined": pendingSlots,
      "joined_users.$.amount_paid": pendingAmount,
    },
    $set: {
      "joined_users.$.pending_slots": 0,
      "joined_users.$.pending_amount": 0,
      "joined_users.$.is_paid": true,
      payment_status: "completed",
      slot_status: ACTIVE_SLOT_STATUS.active,
      activated_at: new Date(),
    },
  };

  await updateOne(
    "Farmeely",
    { farmeely_id: farmeely.farmeely_id, "joined_users.user_id": user.user_id },
    updateOperations,
  );

  console.log(
    `Creator payment processed: ${pendingSlots} slots, $${pendingAmount}`,
  );
};

// Handler for new member joining payment
const handleJoinPayment = async (farmeely, user, transaction) => {
  const pendingSlots = user.pending_slots || 0;
  const pendingAmount = user.pending_amount || 0;

  if (pendingSlots <= 0 || pendingAmount <= 0) {
    throw new Error("No pending slots or amount found for join payment");
  }

  const newAvailableSlots = farmeely.slots_available - pendingSlots;
  const newSlotStatus =
    newAvailableSlots === 0
      ? ACTIVE_SLOT_STATUS.inactive
      : ACTIVE_SLOT_STATUS.active;

  const updateOperations = {
    $inc: {
      slots_available: -pendingSlots,
      "joined_users.$.slots_joined": pendingSlots,
      "joined_users.$.amount_paid": pendingAmount,
    },
    $set: {
      "joined_users.$.pending_slots": 0,
      "joined_users.$.pending_amount": 0,
      "joined_users.$.is_paid": true,
      slot_status: newSlotStatus,
    },
  };

  await updateOne(
    "Farmeely",
    { farmeely_id: farmeely.farmeely_id, "joined_users.user_id": user.user_id },
    updateOperations,
  );

  console.log(
    `Join payment processed: ${pendingSlots} slots, $${pendingAmount}`,
  );
};

// Handler for adding more slots (creator or member)
const handleAddSlotsPayment = async (farmeely, user, transaction) => {
  const pendingAdditionalSlots = user.pending_additional_slots || 0;
  const pendingAdditionalAmount = user.pending_additional_amount || 0;

  if (pendingAdditionalSlots <= 0 || pendingAdditionalAmount <= 0) {
    throw new Error("No pending additional slots or amount found");
  }

  // Verify user is already paid for existing slots
  if (!user.is_paid) {
    throw new Error("User must be paid for existing slots before adding more");
  }

  const newAvailableSlots = farmeely.slots_available - pendingAdditionalSlots;
  const newSlotStatus =
    newAvailableSlots === 0
      ? ACTIVE_SLOT_STATUS.inactive
      : ACTIVE_SLOT_STATUS.active;

  const updateOperations = {
    $inc: {
      slots_available: -pendingAdditionalSlots,
      "joined_users.$.slots_joined": pendingAdditionalSlots,
      "joined_users.$.amount_paid": pendingAdditionalAmount,
    },
    $set: {
      "joined_users.$.pending_additional_slots": 0,
      "joined_users.$.pending_additional_amount": 0,
      "joined_users.$.has_pending_addition": false,
      slot_status: newSlotStatus,
    },
  };

  await updateOne(
    "Farmeely",
    { farmeely_id: farmeely.farmeely_id, "joined_users.user_id": user.user_id },
    updateOperations,
  );

  console.log(
    `Additional slots payment processed: ${pendingAdditionalSlots} slots, $${pendingAdditionalAmount}`,
  );
};

// ========== FARMEELY CONTROLLER FUNCTIONS ==========

const { v4: uuidv4 } = require("uuid");
const { isEmpty } = require("../utils");
const { messages } = require("../constants/messages");
const { ObjectId } = require("mongodb");

// Create Farmeely (Creator)
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

    if (creatorSlots <= 0) {
      return res.status(400).json({ message: "Must take at least 1 slot" });
    }

    if (creatorSlots > totalSlots) {
      return res.status(400).json({
        message: `Maximum ${totalSlots} slots available for this product`,
      });
    }

    // Check for existing active farmeely in same location
    const [existingFarmeely] = await findQuery("Farmeely", {
      product_id,
      city,
      slot_status: ACTIVE_SLOT_STATUS.active,
    });

    if (existingFarmeely) {
      return res.status(400).json({
        message: "Active Farmeely already exists in this location",
      });
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
      expected_date: new Date(expected_date),
      total_slots: totalSlots,
      slots_available: totalSlots,
      price_per_slot: pricePerSlot,
      creator_amount: creatorAmount,
      total_product_price: product.product_price,
      product_image: product.product_image,
      product_description: product.description,
      slot_status: ACTIVE_SLOT_STATUS.inactive,
      payment_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      joined_users: [
        {
          user_id,
          user_email,
          is_creator: true,

          // Current paid slots
          slots_joined: 0,
          amount_paid: 0,
          is_paid: false,

          // Pending initial slots (for first payment)
          pending_slots: creatorSlots,
          pending_amount: creatorAmount,

          // Pending additional slots (for future additions)
          pending_additional_slots: 0,
          pending_additional_amount: 0,
          has_pending_addition: false,

          joined_at: new Date(),
        },
      ],
    });

    res.status(200).json({
      status: true,
      message: "Farmeely created successfully. Complete payment to activate.",
      data: {
        farmeely_id,
        pending_slots: creatorSlots,
        amount_to_pay: creatorAmount,
        payment_type: "create",
      },
    });
  } catch (err) {
    console.error("Create farmeely error:", err);
    next(err);
  }
};

// Join Farmeely (Member)
const joinFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { city, number_of_slot } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    // Find active farmeely
    const [farmeely] = await findQuery("Farmeely", {
      product_id,
      city,
      slot_status: ACTIVE_SLOT_STATUS.active,
      payment_status: "completed", // Creator has paid
    });

    if (!farmeely) {
      return res.status(404).json({
        message: "No active Farmeely found for this product and location",
      });
    }

    const slotsToJoin = parseInt(number_of_slot);

    if (slotsToJoin <= 0) {
      return res.status(400).json({ message: "Must join at least 1 slot" });
    }

    if (slotsToJoin > farmeely.slots_available) {
      return res.status(400).json({
        message: `Only ${farmeely.slots_available} slots available`,
      });
    }

    const alreadyJoined = farmeely.joined_users.some(
      (u) => u.user_id === user_id,
    );

    if (alreadyJoined) {
      return res
        .status(400)
        .json({ message: "You have already joined this Farmeely" });
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

            // Current paid slots
            slots_joined: 0,
            amount_paid: 0,
            is_paid: false,

            // Pending initial slots
            pending_slots: slotsToJoin,
            pending_amount: amountToPay,

            // Pending additional slots
            pending_additional_slots: 0,
            pending_additional_amount: 0,
            has_pending_addition: false,

            joined_at: new Date(),
          },
        },
      },
    );

    res.status(200).json({
      status: true,
      message: "Slots reserved successfully. Complete payment to join.",
      data: {
        farmeely_id: farmeely.farmeely_id,
        pending_slots: slotsToJoin,
        amount_to_pay: amountToPay,
        payment_type: "join",
      },
    });
  } catch (err) {
    console.error("Join farmeely error:", err);
    next(err);
  }
};

// Add More Slots (Creator or Member)
const addMoreSlots = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const { additional_slots } = req.body;
  const user_id = req.params.customer_id;

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Check farmeely is active
    if (farmeely.slot_status !== ACTIVE_SLOT_STATUS.active) {
      return res.status(400).json({
        message: "Cannot add slots to an inactive farmeely",
      });
    }

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user) {
      return res
        .status(403)
        .json({ message: "You are not part of this farmeely" });
    }

    // User must have paid for existing slots
    if (!user.is_paid) {
      return res.status(400).json({
        message: "Complete your initial payment before adding more slots",
      });
    }

    // Check if user already has pending additional slots
    if (user.has_pending_addition) {
      return res.status(400).json({
        message:
          "You already have a pending slot addition. Complete that payment first.",
      });
    }

    const slotsToAdd = parseInt(additional_slots);
    if (slotsToAdd <= 0) {
      return res.status(400).json({ message: "Must add at least 1 slot" });
    }

    if (slotsToAdd > farmeely.slots_available) {
      return res.status(400).json({
        message: `Only ${farmeely.slots_available} slots available`,
      });
    }

    const extraAmount = slotsToAdd * farmeely.price_per_slot;

    // Reserve slots temporarily
    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      {
        $inc: {
          "joined_users.$.pending_additional_slots": slotsToAdd,
          "joined_users.$.pending_additional_amount": extraAmount,
        },
        $set: {
          "joined_users.$.has_pending_addition": true,
        },
      },
    );

    res.status(200).json({
      status: true,
      message: "Additional slots reserved. Complete payment to confirm.",
      data: {
        farmeely_id: farmeely.farmeely_id,
        current_slots: user.slots_joined,
        additional_slots: slotsToAdd,
        total_slots_after: user.slots_joined + slotsToAdd,
        amount_to_pay: extraAmount,
        payment_type: "add_slots",
        user_type: user.is_creator ? "creator" : "member",
      },
    });
  } catch (err) {
    console.error("Add slots error:", err);
    next(err);
  }
};

// Get Single Farmeely
const getSingleFarmeely = async (req, res, next) => {
  const { slot_id } = req.params;

  try {
    const [farmeely] = await findQuery("Farmeely", { slot_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    res.status(200).json({
      status: true,
      message: "Farmeely details retrieved successfully",
      data: farmeely,
    });
  } catch (err) {
    console.error("Get single farmeely error:", err);
    next(err);
  }
};

// Get All Farmeely
const getAllFarmeely = async (req, res, next) => {
  try {
    const farmeelyList = await findQuery("Farmeely");

    res.status(200).json({
      status: true,
      message: "Farmeely list retrieved successfully",
      data: farmeelyList,
      count: farmeelyList.length,
    });
  } catch (err) {
    console.error("Get all farmeely error:", err);
    next(err);
  }
};

// Get User's Farmeely Payments Summary
const getUserFarmeelySummary = async (req, res, next) => {
  const user_id = req.params.customer_id;

  try {
    const userFarmeelies = await findQuery("Farmeely", {
      "joined_users.user_id": user_id,
    });

    const summary = userFarmeelies.map((farmeely) => {
      const user = farmeely.joined_users.find((u) => u.user_id === user_id);
      return {
        farmeely_id: farmeely.farmeely_id,
        product_name: farmeely.product_name,
        city: farmeely.city,
        expected_date: farmeely.expected_date,
        user_type: user.is_creator ? "creator" : "member",
        current_slots: user.slots_joined,
        current_amount_paid: user.amount_paid,
        is_paid: user.is_paid,
        pending_additional_slots: user.pending_additional_slots,
        pending_additional_amount: user.pending_additional_amount,
        has_pending_addition: user.has_pending_addition,
        farmeely_status: farmeely.slot_status,
      };
    });

    res.status(200).json({
      status: true,
      message: "User farmeely summary retrieved",
      data: summary,
      count: summary.length,
    });
  } catch (err) {
    console.error("Get user summary error:", err);
    next(err);
  }
};

// Cancel Pending Slot Addition
const cancelPendingAddition = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const user_id = req.params.customer_id;

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user) {
      return res
        .status(403)
        .json({ message: "You are not part of this farmeely" });
    }

    if (!user.has_pending_addition) {
      return res.status(400).json({
        message: "No pending slot addition to cancel",
      });
    }

    // Release the reserved slots
    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      {
        $set: {
          "joined_users.$.pending_additional_slots": 0,
          "joined_users.$.pending_additional_amount": 0,
          "joined_users.$.has_pending_addition": false,
        },
      },
    );

    res.status(200).json({
      status: true,
      message: "Pending slot addition cancelled successfully",
      data: {
        released_slots: user.pending_additional_slots,
        released_amount: user.pending_additional_amount,
      },
    });
  } catch (err) {
    console.error("Cancel pending addition error:", err);
    next(err);
  }
};

module.exports = {
  // Payment functions
  initializePayment,
  verifyPayment,

  // Farmeely functions
  createFarmeely,
  joinFarmeely,
  addMoreSlots,
  getSingleFarmeely,
  getAllFarmeely,
  getUserFarmeelySummary,
  cancelPendingAddition,

  // Payment handlers (optional exports if needed elsewhere)
  handleCreatePayment,
  handleJoinPayment,
  handleAddSlotsPayment,
};
