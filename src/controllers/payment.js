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
// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { farmeely_id } = req.body;
    const user_id = req.params.customer_id;
    const email = req.params.email;

    const [intent] = await findQuery("Farmeely", {
      farmeely_id,
      payment_status: "pending",
    });

    if (!intent) {
      return res.status(404).json({
        message: "Farmeely intent not found",
      });
    }

    const amount = intent.creator_amount;

    const callback_url = `${process.env.APP_URL}/payment/callback`;

    const response = await startPayment(amount, email, callback_url);

    console.log("response", response.data.data);

    // Record transaction in the database
    const transaction = await insertOne("Transaction", {
      farmeely_id: farmeely_id,
      customer_id: user_id,
      amount: amount,
      reference: response.data.data.reference,
      transaction_status: "pending",
    });

    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({
      message: "Payment initialization failed",
      error: error.response?.data || error.message,
    });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const user_id = req.params.customer_id;

    if (!reference) {
      return res.status(400).json({
        message: "Transaction reference is required",
      });
    }

    const response = await completePayment(reference);
    console.log("response", response.data.data);

    if (response.data.data.status !== "success") {
      throw new Error("Payment verification failed");
    }
    const getfarmeely = await findQuery("Transaction", {
      reference: reference,
      customer_id: user_id,
    });
    const farmeely_id = getfarmeely[0].farmeely_id;

    await updateOne(
      "Farmeely",
      { farmeely_id },
      {
        $set: {
          payment_status: "completed",
          slot_status: ACTIVE_SLOT_STATUS.active,
        },
      },
    );

    await updateOne(
      "Transaction",
      { reference: reference },
      { $set: { transaction_status: "completed" } },
    );

    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({
      message: "Payment verification failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
};
