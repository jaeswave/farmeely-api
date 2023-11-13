const { string } = require("joi");
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  lastname: {
    type: String,
    required: true,
  },
  othernames: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  isOtpVerified: {
    type: string,
    default: false,
  },
  gender: {
    type: String,
    values: ["male", "female", "others"],
    default: null,
    required: false,
  },
  phoneNumber: {
    type: Number,
    unique: true,
  },

  dob: {
    type: Date,
    default: null,
    required: false,
  },
  referral_code: {
    type: String,
    default: null,
    required: false,
  },
  address: {
    type: String,
    default: null,
    required: false,
  },
  password_hash: {
    type: String,
    required: false,
  },
  password_salt: {
    type: String,
    required: false,
  },

  timestamps: {
    createdAt: {
      timestamps: true,
    },
  },
  timestamps: {
    updatedAt: {
      timestamps: true,
    },
  },
});

const Users = mongoose.model("Users", UserSchema);

module.exports = { Users };
