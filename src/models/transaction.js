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
      allowNull: false,
    },
    amount: {
      type: String,
      allowNull: false,
    },
    comments: {
      type: String,
      required: true,
    },
    transaction_status: {
      type: String,
      values: ["pending", "completed", "failed"],
      required: true,
      defaultValue: "pending",
    },
    customer_id: {
      type: String,
      required: false,
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
