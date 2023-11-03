const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  lastname: {
    type: String,
    required: true,
  },
  othername: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  isOtpVerified: {
    type: boolean,
    default: false,
    required: false,
  },

  gender: {
    type: String,
    values: ["male", "female"],
    allowNull: false,
  },
  dob: {
    type: Date,
    required: false,
  },
  referral_code: {
    type: String,
    default: true,
    required: false,
  },
  address_number: {
    type: String,
    required: false,
  },
  address_street: {
    type: String,
    required: false,
  },
  address_city: {
    type: String,
    required: false,
  },
  address_state: {
    type: String,
    required: false,
  },
  localgovt: {
    type: String,
    required: false,
  },
  state_of_origin: {
    type: String,
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
  bvn: {
    type: String,
    required: false,
  },
  isBvnVerified: {
    type: String,
    required: false,
  },
  isPasswordChangeRequired: {
    type: String,
    required: false,
  },
});

const Users = mongoose.model("Users", UserSchema);

module.exports = { Users };
