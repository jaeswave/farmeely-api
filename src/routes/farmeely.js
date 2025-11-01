const express = require("express")
const authorization = require("../middleware/authorization");

const { createFarmeely, joinFarmeely,getSingleFarmeely,getAllFarmeely } = require("../controllers/farmeely")
const router = express.Router()

router.post("/create/farmeely/:product_id", authorization, createFarmeely)

router.patch("/join/farmeely/:product_id", authorization, joinFarmeely)
router.get("/farmeely/:slot_id", authorization, getSingleFarmeely)
router.get("/farmeely", authorization, getAllFarmeely)

module.exports = router
