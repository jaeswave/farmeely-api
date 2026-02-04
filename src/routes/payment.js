const express = require("express");
const { initializePayment, verifyPayment } = require("../controllers/payment");
const authorization = require("../middleware/authorization");

const router = express.Router();


router.post("/initialize", authorization, initializePayment);
router.get("/verify/:reference", authorization, verifyPayment);

module.exports = router;
