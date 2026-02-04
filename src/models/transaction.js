const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      // required: true,
      // unique: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    reference: {
      type: String,
      required: true,
    },


    transaction_status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
