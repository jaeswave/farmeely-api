const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema({
  name: String,
  cities: [
    {
      name: String,
      deliveryFee: Number,
    },
  ],
});

module.exports = mongoose.model("State", stateSchema);
