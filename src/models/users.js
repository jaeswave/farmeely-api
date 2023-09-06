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
});

const Users = mongoose.model("Users", UserSchema);

module.exports = {Users};