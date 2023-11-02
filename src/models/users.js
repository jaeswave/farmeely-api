const mongoose = require("mongoose")

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
    default:false,
    required: false,
},
});

const Users = mongoose.model("Users", UserSchema);

module.exports = {Users};