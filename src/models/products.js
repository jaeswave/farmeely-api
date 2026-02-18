const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  product_id: {
    type: Number,
    required: true,
    unique: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  product_price: {
    type: Number, // 🔥 MUST be Number for calculations
    required: true,
  },
  portion_price: {
    type: Number,
    required: true,
  },
  total_slots: {
    type: Number,
    required: true,
  },
  product_image: {
    type: String,
  },
  description: {
    type: String,
  },
});

const Products = mongoose.model("Products", ProductSchema);

module.exports = { Products };
