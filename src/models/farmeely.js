const mongoose = require("mongoose")

const FarmeelySchema = new mongoose.Schema({

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

const Farmeely = mongoose.model("Farmeely", FarmeelySchema);

module.exports = {Farmeely};