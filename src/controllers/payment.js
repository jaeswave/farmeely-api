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
  FARMEELY_STATUS,
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
      farmeely_status: FARMEELY_STATUS.inProgress,
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
    `Creator payment processed: ${pendingSlots} slots, ${pendingAmount}`,
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



module.exports = {
  // Payment functions
  initializePayment,
  verifyPayment,
  handleCreatePayment,
  handleJoinPayment,
  handleAddSlotsPayment,
};
