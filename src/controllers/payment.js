const { startPayment, completePayment } = require("../services/payment");
const {
  findQuery,
  insertOne,
  updateOne,
  updateMany,
  updateWithOperators,
} = require("../repository");
// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { amount, email } = req.body;
    const user_id = req.params.customer_id;

    if (!amount || !email) {
      return res.status(400).json({
        message: "Amount and email are required",
      });
    }

    const callback_url = `${process.env.APP_URL}/payment/callback`;

    const response = await startPayment(amount, email, callback_url);

    console.log("response", response.data.data);

    // Record transaction in the database
    const transaction = await insertOne("Transaction", {
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
