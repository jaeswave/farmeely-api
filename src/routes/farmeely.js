const express = require("express")
const authorization = require("../middleware/authorization");

const {
  createFarmeely,
  joinFarmeely,
  addMoreSlots,
  getSingleFarmeely,
  getAllFarmeely,
  getFarmeelyOfUser,
  getFeaturedFarmeelyByCity,
} = require("../controllers/farmeely");
const router = express.Router()

router.post("/create/farmeely/:product_id", authorization, createFarmeely)
router.patch("/join/farmeely/:product_id/:farmeely_id", authorization, joinFarmeely)
router.post("/add-slot/farmeely/:farmeely_id", authorization, addMoreSlots)
router.get("/farmeely/:slot_id", authorization, getSingleFarmeely)
router.get("/farmeely", authorization, getAllFarmeely)
router.get("/user/farmeely", authorization, getFarmeelyOfUser)
router.get("/featured/farmeely", authorization, getFeaturedFarmeelyByCity)

module.exports = router
