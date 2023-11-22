const express = require("express");
const router = express.Router();
const {
  startWalletFunding,
  completeWalletFunding,
  getWalletBalance,
  walletBalance,
  sendMoney,
} = require("../controllers/wallet");
const authorization = require("../middleware/authorization");

/**
 * start-fund-wallet
 * @swagger
 * /start-fund-wallet:
 *   post:
 *     summary: start wallet funding
 *     description: This start customer's wallet funding
 *     tags:
 *       - Wallet
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: amount
 *         in: path
 *         required: true
 *       - name: email
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: Transaction initialized successfully.
 *        422:
 *          Bad Request
 */
router.post("/start-fund-wallet/", authorization, startWalletFunding);

/**
 * complete-fund-wallet
 * @swagger
 * /complete-fund-wallet:
 *   post:
 *     summary: complete wallet funding
 *     description: This completes customer's wallet funding
 *     tags:
 *       - Wallet
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: reference
 *         in: path
 *         required: true
 *       - name: email
 *         in: path
 *         required: true
 *       - name: customer_id
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: Your Wallet has been funded successfully.
 *        422:
 *          Bad Request
 */
router.post(
  "/complete-fund-wallet/{reference}",
  authorization,
  completeWalletFunding
);

/**
 * get-wallet-balance
 * @swagger
 * /get-wallet-balance:
 *   get:
 *     summary: get wallet balance
 *     description: This get the customer's wallet balance
 *     tags:
 *       - Wallet
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: customer_id
 *         in: path
 *         required: true
 *     responses:
 *        200:
 *          description: Wallet balance fetched successfully.
 *        422:
 *          Bad Request
 */
router.get("/get-wallet-balance", authorization, getWalletBalance);

module.exports = router;
