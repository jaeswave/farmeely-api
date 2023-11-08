const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  wallet_id: {
    type: String,
    required: true,
    primaryKey: true,
  },
  customer_id: {
    type: String,
    required: true,
  },
  amount_before: {
    type: String,
    required: true,
    defaultValue: 0,
  },
  amount_after: {
    type: String,
    required: true,
    defaultValue: 0,
  },
},  { timestamps: true } 
);
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = { Wallet };
