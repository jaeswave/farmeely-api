const express = require("express")
const authorization = require("../middleware/authorization");

const { createFarmeely, joinFarmeely } = require("../controllers/farmeely")
const router = express.Router()

router.post("/create/farmeely/:product_id", authorization, createFarmeely)
router.patch("/join/farmeely/:product_id", authorization, joinFarmeely)

module.exports = router
