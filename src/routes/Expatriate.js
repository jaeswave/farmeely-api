const express = require("express");
const router = express.Router();
const {
  createExpatriateGroup,
  joinExpatriateGroup,
  getSingleExpatriateGroup,
  getAllExpatriateGroups,
  leaveExpatriateGroup,
} = require("../controllers/Expatriate");
const { auth } = require("../middleware/auth");

// Expatriate Group Routes
router.post("/expatriate/groups", auth, createExpatriateGroup);
router.post("/expatriate/groups/:group_id/join", auth, joinExpatriateGroup);
router.post("/expatriate/groups/:group_id/leave", auth, leaveExpatriateGroup);
router.get("/expatriate/groups/:group_id", auth, getSingleExpatriateGroup);
router.get("/expatriate/groups", auth, getAllExpatriateGroups);

module.exports = router;
