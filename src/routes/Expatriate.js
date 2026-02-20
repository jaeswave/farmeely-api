const express = require("express");
const router = express.Router();
const {
  submitCustomRequest,
  getExpatriate,
} = require("../controllers/Expatriate");
const authorization = require("../middleware/authorization");

// Expatriate Group Routes

router.post("/submit-custom-request", authorization, submitCustomRequest);
router.get("/get-expatriate", authorization, getExpatriate);

module.exports = router;
