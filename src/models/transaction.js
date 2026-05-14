const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    farmeely_id: {
      type: String,
      required: true,
    },

    customer_id: {
      type: String,
      required: true,
    },

    customer_email: {
      type: String,
      required: true,
    },

    payment_type: {
      type: String,
      enum: ["create", "join", "add_slots"],
      required: true,
    },

    transaction_status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ======================
    // PRODUCT DATA
    // ======================

    product_id: {
      type: String,
    },

    product_name: {
      type: String,
    },

    product_image: {
      type: String,
    },

    product_description: {
      type: String,
    },

    // ======================
    // FARMEELY DATA
    // ======================

    city: {
      type: String,
    },

    address: {
      type: String,
    },

    expected_date: {
      type: Date,
    },

    total_slots: {
      type: Number,
      min: 0,
    },

    slots_requested: {
      type: Number,
      min: 0,
    },

    slots_available: {
      type: Number,
      min: 0,
    },

    price_per_slot: {
      type: Number,
      min: 0,
    },

    total_product_price: {
      type: Number,
      min: 0,
    },

    delivery_fee: {
      type: Number,
      default: 0,
    },

    // ======================
    // PAYMENT METADATA
    // ======================

    payment_method: {
      type: String,
    },

    payment_details: {
      type: Object,
    },

    error_message: {
      type: String,
    },

    // ======================
    // STAGING FLAG
    // ======================

    is_staging: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Object,
      default: {},
    },

    // ======================
    // VERIFICATION
    // ======================

    verified_at: {
      type: Date,
    },

    expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  },
);

// Index for cleanup jobs
transactionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Transaction", transactionSchema);
