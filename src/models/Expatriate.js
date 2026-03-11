const { string } = require("joi");
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

      unit_price: Number,
      total_price: Number,
    },
  ],
requestStatus: {
  type: String,
  enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
  required: true,
},
  shipping_fee: Number, // admin sets
  total_amount: Number, // subtotal + shipping

  delivery_country: String,
  delivery_address: String,
  preferred_delivery_date: Date,

  status: String,

  payment_reference: String,

  created_at: Date,
  quoted_at: Date,
  paid_at: Date,
  updated_at: Date,
});

module.exports = mongoose.model("Expatriate", expatriateSchema);
