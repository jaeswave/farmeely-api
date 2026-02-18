const express = require("express");
const router = express.Router();
const {
  submitCustomRequest,
} = require("../controllers/Expatriate");
const { auth } = require("../middleware/auth");

// Expatriate Group Routes

router.post("/submit-custom-request", auth, submitCustomRequest);


module.exports = router;
