const express = require("express")
const router = express.Router()
const validationData = require("../validations/usersValidation")
const validationMiddleware = require("../middleware/validation")
const authorization = require("../middleware/authorization")
const {
  register,
  resendOTP,
  startForgetPassword,
  completeForgetPassword,
  editProfile,
  startFundWallet,
  verifyOtp
} = require("../controllers/users")
const { login } = require("../controllers/auth")

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
)

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
router.post("/user/login", validationMiddleware(validationData.login), login)

// resendSMSOTP
/**
 * Resend otp to customer phone
 * @swagger
 * /customer/resend-otp/{token}:
 *   get:
 *     summary: resend otp to customer phone
 *     description: This resend otp to customer phone
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: otp resent successfully to your phone
 *        422:
 *          Bad Request
 */
router.get("/resend-otp/:email", resendOTP)

// startForgetPassword
/**
 * start forget password
 * @swagger
 * /customer/forget-password/start/{email}:
 *   get:
 *     summary: start forget password
 *     description: This starts forget password for the customer via their email
 *     tags:
 *       - Account
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

router.get("/user/verify-otp/:otp/:email", verifyOtp)
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
)

/**
 * update user profile
 * @swagger
 * /user/edit-profile:
 *   post:
 *     summary: update user profile
 *     description: This updates the profile of the user 
 *     tags:
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: dob
 *         in: body
 *         required: false
 *       - name: address
 *         in: body
 *         required: false
 *       - name: gender
 *         in: body
 *         required: false
 *     responses:
 *        200:
 *          description: User profile updated successfully.
 *        422:
 *          Bad Request
 */
router.patch('/user/edit-profile', authorization,validationMiddleware(validationData.edit), editProfile)

// StartfundWallet
/**
 * start fund wallet with new card
 * @swagger
 * /customer/fund-wallet-with-new-card/start:
 *   post:
 *     summary: Start Fund wallet with new card
 *     description: This add bank account to the customers account
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: amount
 *         in: body
 *         required: true
 *       - name: saveCard
 *         in: body
 *         required: true
 *     responses:
 *        200:
 *          description: Wallet Funded.
 *        422:
 *          Bad Request
 */
router.post("/fund-wallet-with-new-card/start",startFundWallet);

// CompletefundWallet
/**
 * complete fund wallet with new card
 * @swagger
 * /customer/fund-wallet-with-new-card/complete:
 *   post:
 *     summary: Verify Fund wallet with new card
 *     description: This Verifies Fund wallet with new card
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: transactionReference
 *         in: body
 *         required: true
 *     responses:
 *        200:
 *          description: Wallet Funded.
 *        422:
 *          Bad Request
 */
// router.post(
//   "/fund-wallet-with-new-card/complete",
//   validationData.fundWalletWithNewCard,
//   startFundWalletWithNewCard
// );

// Dashboard
/**
 * get customer dashboard details
 * @swagger
 * /customer/dashboard:
 *   get:
 *     summary: get a customer's dashboard
 *     description: This get all the dashboard details
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     responses:
 *        200:
 *          description: Dashboard successfully fetched
 *        422:
 *          Bad Request
 */
// router.get("/dashboard", dashboard);

//  Get bank list
/**
 * get bank list
 * @swagger
 * /customer/bank/lists:
 *   get:
 *     summary: get bank lists
 *     description: This get all the bank lists
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     responses:
 *        200:
 *          description: Bank successfully fetched.
 *        422:
 *          Bad Request
 */
// router.get("/bank/lists", getBankLists);

// Get customer cards details
/**
 * get customer card
 * @swagger
 * /customer/get-cards:
 *   get:
 *     summary: get  customer's card
 *     description: This get a customer's all card
 *     tags:
 *       - Account
 *     produces:
 *       - application/json
 *     responses:
 *        200:
 *          description: Customer Cards fetched
 *        422:
 *          Bad Request
 */
// router.get("/get-cards", getCustomerCards);

module.exports = router
