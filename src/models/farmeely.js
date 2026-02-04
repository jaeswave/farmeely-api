const mongoose = require("mongoose")

const FarmeelySchema = new mongoose.Schema({
  farmeely_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  slot_id: {
    type: String,
    required: true,
  },
  product_id: {
    type: String,
    required: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  expected_date: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  total_slots: {
    type: Number,
    required: true,
  },
  creator_slots_taken: {
    type: Number,
    required: true,
  },
  slots_available: {
    type: Number,
    required: true,
  },
  price_per_slot: {
    type: Number,
    required: true,
  },
  creator_amount: {
    type: Number,
    required: true,
  },
  total_product_price: {
    type: Number,
    required: true,
  },
  product_image: {
    type: String,
    required: true,
  },
  product_description: {
    type: String,
    required: true,
  },
  slot_status: {
    type: String,
    enum: ["active", "inactive"],
    required: true,
  },

  payment_status: {
    type: String,
    enum: ["pending", "completed"],
    required: true,
  },
  joined_users: [
    {
      user_id: String,
      user_email: String,
      slots_joined: Number,
      amount_paid: Number,
      is_paid: Boolean,
      joined_at: Date,
      is_creator: Boolean,
    },
  ],
  created_at: { type: Date, default: Date.now },
});

const Farmeely = mongoose.model("Farmeely", FarmeelySchema);

module.exports = {Farmeely};