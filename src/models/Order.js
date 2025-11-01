const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image_url: { type: String },
  },
  { _id: false } // prevents auto _id for each item
);


const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
    },

    customer_id: {
      type: String,
      required: true,
    },

    items: {
      type: [itemSchema],
      required: true,
    },

    total_amount: {
      type: Number,
      required: true,
    },

    transaction_id: {
      type: String,
      required: true,
      ref: "Transactions",
    },

    order_status: {
      type: String,
      enum: ["pending", "in progress", "completed", "cancelled"],
      default: "pending",
    },

    shipping_address: {
      type: Object,
      required: false,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Orders = mongoose.model("Orders", orderSchema);
module.exports = { Orders };
