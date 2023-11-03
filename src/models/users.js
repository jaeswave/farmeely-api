const mongoose = require("mongoose")

const ProductSchema = new mongoose.Schema({

  product_name: {
    type: String,
    required: true,
  },
  product_price: {
      type: String,
      required: true,
  },
  portion_price: {
      type: String,
      required: true,
  }, 
})

const Products = mongoose.model("Products", ProductSchema);

module.exports = {Products};