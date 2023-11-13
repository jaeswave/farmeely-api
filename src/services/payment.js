require("dotenv").config();
const axios = require("axios");

const startPayment = async (amount, email) => {
  const amountInKobo = amount * 100;
  return axios({
    method: "POST",
    url: `${process.env.PAYSTACK_BASEURL}/transaction/initialize`,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
    data: {
      amount: amountInKobo,
      email: email,
    },
    channels: ["card"],
  });
};

const completePayment = async (reference) => {
  return axios({
    method: "GET",
    url: `${process.env.PAYSTACK_BASEURL}/transaction/verify/${reference}`,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
  });
};
module.exports = {
  startPayment,
  completePayment,
};
