const express = require("express");
const router = express.Router();
const { submitCustomRequest } = require("../controllers/Expatriate");
const authorization = require("../middleware/authorization");

// Expatriate Group Routes

router.post("/submit-custom-request", authorization, submitCustomRequest);

module.exports = router;
