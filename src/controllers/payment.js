const { startPayment, completePayment } = require("../services/payment");

// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || !email) {
      return res.status(400).json({
        message: "Amount and email are required",
      });
    }

    const callback_url = `${process.env.APP_URL}/payment/callback`;

    const response = await startPayment(amount, email, callback_url);

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
    if (response.data.status !== "success") {
      return res.status(400).json({
        message: "Payment verification failed",
        data: response.data,
      });
    }

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
