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

const initializePayment = async (req, res) => {
  try {
    const { farmeely_id, reference } = req.body;
    const user_id = req.params.customer_id;

    if (!reference || reference.length < 10) {
      return res
        .status(400)
        .json({ message: "Valid payment reference is required from frontend" });
    }

    const [existingTransaction] = await findQuery("Transaction", { reference });
    if (existingTransaction) {
      return res.status(409).json({
        message: "Payment reference already exists. Please generate a new one.",
      });
    }

    const [staging] = await findQuery(
      "FarmeelyStaging",
      {
        farmeely_id,
        user_id,
        status: "awaiting_payment",
      },
      {
        sort: { created_at: -1 }, 
        limit: 1,
      },
    );
    if (!staging) {
      return res
        .status(404)
        .json({ message: "No pending staged action found for this farmeely" });
    }

    await insertOne("Transaction", {
      farmeely_id,
      customer_id: user_id,
      amount: staging.amount_to_pay,
      reference,
      transaction_status: "pending",
      action_type: staging.action_type,
      staging_id: staging.staging_id,
      created_at: new Date(),
      expires_at: staging.expires_at,
    });

    await updateOne(
      "FarmeelyStaging",
      { staging_id: staging.staging_id },
      { $set: { reference } },
    );

    return res.status(200).json({
      status: true,
      message: "Payment initialized. Waiting for verification.",
      data: { reference, amount: staging.amount_to_pay, farmeely_id },
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return res
      .status(500)
      .json({ message: "Payment initialization failed", error: error.message });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    const [transaction] = await findQuery("Transaction", { reference });
    if (!transaction) {
      return res.status(404).json({
        status: false,
        message:
          "Transaction reference not found. Please initialize payment first.",
      });
    }
    if (transaction.transaction_status === "completed") {
      return res.status(400).json({
        status: false,
        message: "Transaction already verified and completed",
        data: { verified_at: transaction.verified_at },
      });
    }

    const response = await completePayment(reference);
    if (response.data.data.status !== "success") {
      await updateOne(
        "Transaction",
        { reference },
        {
          $set: {
            transaction_status: "failed",
            failure_reason: response.data.data.gateway_response,
            failed_at: new Date(),
          },
        },
      );
      return res
        .status(400)
        .json({ status: false, message: "Payment verification failed" });
    }

    const verifiedAmount = response.data.data.amount / 100;
    if (verifiedAmount !== transaction.amount) {
      await updateOne(
        "Transaction",
        { reference },
        {
          $set: {
            transaction_status: "amount_mismatch",
            failed_at: new Date(),
          },
        },
      );
      return res
        .status(400)
        .json({ status: false, message: "Payment amount mismatch" });
    }

    const [staging] = await findQuery("FarmeelyStaging", {
      staging_id: transaction.staging_id,
    });
    if (!staging) throw new Error("Staged request not found");

    let result;
    if (staging.action_type === "create") {
      result = await activateCreatedFarmeely(staging, reference);
    } else if (staging.action_type === "join") {
      result = await activateJoin(staging, reference);
    } else if (staging.action_type === "add_slots") {
      result = await activateAddSlots(staging, reference);
    } else {
      throw new Error("Unknown staged action type");
    }

    await updateOne(
      "FarmeelyStaging",
      { staging_id: staging.staging_id },
      {
        $set: {
          status: "paid",
          paid_at: new Date(),
          moved_to_main: true,
          moved_to_main_at: new Date(),
        },
      },
    );
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

    return res.status(200).json({
      status: true,
      message: "Payment verified successfully",
      data: result,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    if (req.params.reference) {
      await updateOne(
        "Transaction",
        { reference: req.params.reference },
        {
          $set: {
            transaction_status: "verification_error",
            error_message: err.message,
            failed_at: new Date(),
          },
        },
      );
    }
    return res.status(500).json({
      status: false,
      message: "Payment verification failed",
      error: err.message,
    });
  }
};

// ========== The only three places that ever write confirmed data ==========

const activateCreatedFarmeely = async (staging, reference) => {
  const remainingSlots = staging.total_slots - staging.slots_requested;

  await insertOne("Farmeely", {
    farmeely_id: staging.farmeely_id,
    slot_id: staging.slot_id,
    product_id: staging.product_id,
    product_name: staging.product_name,
    product_price: staging.product_price,
    product_image: staging.product_image,
    address: staging.address,
    city: staging.city,
    expected_date: staging.expected_date,
    total_slots: staging.total_slots,
    slots_available: remainingSlots,
    base_price_per_slot: staging.base_price_per_slot,
    fee_percentage_per_slot: staging.fee_percentage,
    delivery_fee: staging.delivery_fee,
    farmeely_status:
      remainingSlots === 0
        ? FARMEELY_STATUS.fullyBooked
        : FARMEELY_STATUS.inProgress,
    slot_status:
      remainingSlots === 0
        ? ACTIVE_SLOT_STATUS.fullyBooked
        : ACTIVE_SLOT_STATUS.active,
    payment_status: "completed",
    created_at: new Date(),
    activated_at: new Date(),
    joined_users: [
      {
        user_id: staging.user_id,
        user_email: staging.user_email,
        is_creator: true,
        slots_joined: staging.slots_requested,
        amount_paid: staging.amount_to_pay,
        ownership_percentage: staging.ownership_percentage,
        fee_percentage_charged: staging.fee_percentage,
        delivery_city: staging.city,
        delivery_fee: staging.delivery_fee,
        payment_reference: reference,
        joined_at: staging.created_at,
        paid_at: new Date(),
      },
    ],
  });

  return {
    farmeely_id: staging.farmeely_id,
    payment_type: "create",
    slots_joined: staging.slots_requested,
    amount_paid: staging.amount_to_pay,
  };
};

const activateJoin = async (staging, reference) => {
  const [farmeely] = await findQuery("Farmeely", {
    farmeely_id: staging.farmeely_id,
  });
  if (!farmeely) throw new Error("Farmeely no longer exists");

  // Re-check availability at the moment of payment, in case two people
  // were racing for the last slots.
  if (staging.slots_requested > farmeely.slots_available) {
    throw new Error(
      `Not enough slots left (only ${farmeely.slots_available} available). Payment succeeded but could not be applied — refund required.`,
    );
  }

  const newSlotsAvailable = farmeely.slots_available - staging.slots_requested;
  const isFullyBooked = newSlotsAvailable === 0;

  await updateWithOperators(
    "Farmeely",
    { farmeely_id: staging.farmeely_id },
    {
      $push: {
        joined_users: {
          user_id: staging.user_id,
          user_email: staging.user_email,
          is_creator: false,
          slots_joined: staging.slots_requested,
          amount_paid: staging.amount_to_pay,
          ownership_percentage: staging.ownership_percentage,
          fee_percentage_charged: staging.fee_percentage,
          delivery_city: staging.city,
          delivery_fee: staging.delivery_fee,
          payment_reference: reference,
          joined_at: staging.created_at,
          paid_at: new Date(),
        },
      },
      $inc: { slots_available: -staging.slots_requested },
      $set: {
        ...(isFullyBooked && {
          slot_status: ACTIVE_SLOT_STATUS.fullyBooked,
          farmeely_status: FARMEELY_STATUS.fullyBooked,
        }),
      },
    },
  );

  return {
    farmeely_id: staging.farmeely_id,
    payment_type: "join",
    slots_joined: staging.slots_requested,
    amount_paid: staging.amount_to_pay,
    is_fully_booked: isFullyBooked,
  };
};

const activateAddSlots = async (staging, reference) => {
  const [farmeely] = await findQuery("Farmeely", {
    farmeely_id: staging.farmeely_id,
  });
  if (!farmeely) throw new Error("Farmeely no longer exists");

  if (staging.slots_requested > farmeely.slots_available) {
    throw new Error(
      `Not enough slots left (only ${farmeely.slots_available} available). Payment succeeded but could not be applied — refund required.`,
    );
  }

  const userIndex = farmeely.joined_users.findIndex(
    (u) => u.user_id === staging.user_id,
  );
  if (userIndex === -1) throw new Error("User not found in farmeely");

  const newSlotsAvailable = farmeely.slots_available - staging.slots_requested;
  const isFullyBooked = newSlotsAvailable === 0;

  await updateOne(
    "Farmeely",
    { farmeely_id: staging.farmeely_id },
    {
      $inc: {
        slots_available: -staging.slots_requested,
        [`joined_users.${userIndex}.slots_joined`]: staging.slots_requested,
        [`joined_users.${userIndex}.amount_paid`]: staging.amount_to_pay,
        [`joined_users.${userIndex}.ownership_percentage`]:
          staging.ownership_percentage,
      },
      $set: {
        ...(isFullyBooked && {
          slot_status: ACTIVE_SLOT_STATUS.fullyBooked,
          farmeely_status: FARMEELY_STATUS.fullyBooked,
        }),
      },
    },
  );

  return {
    farmeely_id: staging.farmeely_id,
    payment_type: "add_slots",
    additional_slots: staging.slots_requested,
    amount_paid: staging.amount_to_pay,
    is_fully_booked: isFullyBooked,
  };
};

module.exports = { initializePayment, verifyPayment };
