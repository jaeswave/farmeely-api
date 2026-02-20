const express = require("express");
const router = express.Router();
const validationData = require("../validations/usersValidation");
const validationMiddleware = require("../middleware/validation");
const authorization = require("../middleware/authorization");
const {
  register,
  resendOTP,
  startForgetPassword,
  completeForgetPassword,
  changeCustomersPassword,
  editProfile,
  startFundWallet,
  verifyOtp,
  getUserProfile,
  addAddress,
  getAddresses,
  deleteAddress,
  savePreferences,
  registerPushToken,
  sendPushNotification,
  getAvailablePreferences,
} = require("../controllers/users");
const { login } = require("../controllers/auth");

router.post(
  "/user/register",
  validationMiddleware(validationData.register),
  register,
);

router.post("/user/login", validationMiddleware(validationData.login), login);

router.patch("/verify/:otp/:email", verifyOtp);

router.get("/resend-otp/:email", resendOTP);

router.get("/forget-password/start/:email", startForgetPassword);

router.post(
  "/forget-password/complete/:email/:otp",
  validationMiddleware(validationData.completeForgotPassword),
  completeForgetPassword,
);

router.patch(
  "/change-password/",
  authorization,
  validationMiddleware(validationData.changePassword),
  changeCustomersPassword,
);

router.patch(
  "/user/edit-profile",
  authorization,
  // validationMiddleware(validationData.edit),
  editProfile,
);

router.get("/user/get-profile", authorization, getUserProfile);
router.post("/addresses", authorization, addAddress);
router.get("/addresses", authorization, getAddresses);
router.delete("/addresses", authorization, deleteAddress);
router.post("/preferences", authorization, savePreferences);
router.get("/preferences", authorization, getAvailablePreferences);
router.post("/register-push-token", authorization, registerPushToken);
router.post("/send-push-notification", authorization, sendPushNotification);

module.exports = router;
