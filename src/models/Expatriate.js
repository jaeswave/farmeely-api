const mongoose = require("mongoose");

const expatriateSchema = new mongoose.Schema({
  request_id: String,

  customer_id: String,
  customer_email: String,
  customer_name: String,

  items: [
    {
      item_name: String,
      quantity: Number,
      description: String,

      // Admin fills these later
      unit_price: Number,
      total_price: Number,
    },
  ],

  currency: "NGN",

  subtotal: Number, // calculated after quote
  shipping_fee: Number, // admin sets
  total_amount: Number, // subtotal + shipping

  delivery_country: String,
  delivery_address: String,
  preferred_delivery_date: Date,

  status: String,
  /*
    submitted
    quoted
    awaiting_payment
    paid
    processing
    shipped
    completed
    rejected
  */

  payment_reference: String,

  created_at: Date,
  quoted_at: Date,
  paid_at: Date,
  updated_at: Date,
});

module.exports = mongoose.model("Expatriate", expatriateSchema);
