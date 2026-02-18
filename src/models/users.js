const { string, preferences } = require("joi");
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  fullname: {
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
    values: ["male", "female"],
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

  //address
  address: [
    {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
    },
  ],

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

  preferences: [
    {
      type: String,
      required: false,
    },
  ],

  fcmToken: {
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
