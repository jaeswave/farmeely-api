const express = require("express");
const { initializePayment, verifyPayment, joinInitializePayment , joinVerifyPayment} = require("../controllers/payment");
const authorization = require("../middleware/authorization");

const router = express.Router();


router.post("/initialize", authorization, initializePayment);
router.get("/verify/:reference", authorization, verifyPayment);
router.post("/join-initialize", authorization, joinInitializePayment);
router.get("/join-verify/:reference", authorization, joinVerifyPayment);

module.exports = router;
