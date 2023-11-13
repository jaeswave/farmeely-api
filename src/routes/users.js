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
} = require("../controllers/users");
const { login } = require("../controllers/auth");

//USERS ROUTES

// register
/**
 * create a new user record
 * @swagger
 * /user/create:
 *   post:
 *     summary: creates a new user
 *     description: This Creates a new record for the user
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: lastname
 *         in: body
 *         required: true
 *       - name: othernames
 *         in: body
 *         required: true
 *       - name: email
 *         in: body
 *         required: true
 *       - name: phone_number
 *         in: body
 *         required: true
 *       - name: password
 *         in: body
 *         required: true
 *       - name: referrer_code
 *         in: body
 *         required: false
 *     responses:
 *        201:
 *          description: Account created.
 *        422:
 *          Bad Request
 */
router.post(
  "/user/register",
  validationMiddleware(validationData.register),
  register
);

// login
/**
 * fetches a user record
 * @swagger
 * /user/login:
 *   post:
 *     summary: fetches a user record
 *     description: This fetches a user's record
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         in: body
 *         required: true
 *       - name: password
 *         in: body
 *         required: true
 *     responses:
 *        200:
 *          description: Login successful.
 *        422:
 *          Bad Request
 */
router.post("/user/login", validationMiddleware(validationData.login), login);

// verifyOtp
/**
 * verify customer's account
 * @swagger
 * /customer/verify-otp/{otp}/{email}:
 *   get:
 *     summary: verify account
 *     description: verify customer's account via otp sent to customer
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: otp
 *         in: path
 *         required: true
 *       - name: email
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: Account verification successfully
 *        422:
 *          Bad Request
 */
router.patch("/verify/:otp/:email", verifyOtp);

// resendSMSOTP
/**
 * Resend otp to customer phone
 * @swagger
 * /customer/resend-otp/{email}:
 *   get:
 *     summary: resend otp to customer phone
 *     description: This resend otp to customer phone
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: otp resent successfully to your phone
 *        422:
 *          Bad Request
 */
router.get("/resend-otp/:email", resendOTP);

// startForgetPassword
/**
 * start forget password
 * @swagger
 * /customer/forget-password/start/{email}:
 *   get:
 *     summary: start forget password
 *     description: This starts forget password for the customer via their email
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: An Otp code has been sent to email
 *        422:
 *          Bad Request
 */
router.get("/forget-password/start/:email", startForgetPassword);

// completeForgotPassword
/**
 * complete forget password
 * @swagger
 * /customer/forget-password/complete:
 *   post:
 *     summary: complete forget password
 *     description: This completes customer forget password, setting a new password
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *       - name: otp
 *         in: path
 *         required: true
 *       - name: new_password
 *         in: body
 *         required: true
 *     responses:
 *        200:
 *          description: Password changes successfully.
 *        422:
 *          Bad Request
 */
router.post(
  "/forget-password/complete/:email/:otp",
  validationMiddleware(validationData.completeForgotPassword),
  completeForgetPassword
);

/**
 * change customers password
 * @swagger
 * /customer/change-password:
 *   patch:
 *     summary: Change password
 *     description: This changes the customers password
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: old_password
 *         in: body
 *         required: true
 *       - name: new_password
 *         in: body
 *         required: true
 *       - name: confirm_new_password
 *         in: body
 *         required: true
 *     responses:
 *        200:
 *          description: Password successfully updated.
 *        422:
 *          Bad Request
 */
router.patch(
  "/change-password/",
  authorization,
  validationMiddleware(validationData.changePassword),
  changeCustomersPassword
);

module.exports = router;
