const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      primaryKey: true,
    },
    
    customer_id: {
      type: String,
      required: false,
    },

    order_id: {
      type: String,
      required: false,
    },

    transaction_type: {
      type: String,
      values: ["credit", "debit"],
    },
    amount: {
      type: String,
      required: false,
      defaultValue: null

    },
    description: {
      type: String,
      required: true,
      defaultValue: null

    },
    reference: {
      type: String,
      required: true,
      defaultValue: null
    },

    transaction_status: {
      type: String,
      values: ["pending", "completed", "failed"],
      required: true,
      defaultValue: "pending",
    },

    createdAt: {
      type: Timestamp(),
      default: new Date(),
      required: true,
    },
    updatedAt: {
      type: Timestamp(),
      default: new Date(),
      required: true,
    },
  },
  { timestamps: true }
);

const Transactions = mongoose.model("Transactions", transactionSchema);

module.exports = { Transactions };
