const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  wallet_id: {
    type: String,
    required: true,
    primaryKey: true,
  },

  wallet_type: {
    type: String,
    value: ['spend', 'save', 'borrow'], //1-spend, 2-save, 3-borrow
    required: true,
  },

  currency: {
    type: String,
    values:['NGN', 'USD'],
    required: true,
    primaryKey: true,
  },

  customer_id: {
    type: String,
    required: true,
  },
  balance_before: {
    type: String,
    required: true,
  },
  balance_after: {
    type: String,
    required: true,
  },
},  { timestamps: true } 
);
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = { Wallet };
