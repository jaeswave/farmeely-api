const router = require('express').Router();
const {getTransactions,debitWallet } = require('../controllers/transaction');
const authorization = require('../middleware/authorization');


/**
 * get all Transactions
 * @swagger
 * /get-transactions:
 *   get:
 *     summary: get all customer transactions
 *     description: This get all customer's transactions and filter (amount)
 *     tags:
 *       - Transaction
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
router.get('/get-all-transactions',authorization, getTransactions );
router.post("/wallet/debit",authorization, debitWallet);




module.exports = router;