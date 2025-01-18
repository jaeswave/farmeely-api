const express = require("express")
const { createFarmeely, joinFarmeely } = require("../controllers/farmeely")
const router = express.Router()

router.post("/create/farmeely/:product_id", createFarmeely)
router.patch("/join/farmeely/:product_id", joinFarmeely)

module.exports = router
