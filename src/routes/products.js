const express = require('express')
const router = express.Router()
const {
    getAllProducts,updateProduct
}  = require('../controllers/products')


/**
 * create a new user record
 * @swagger
 * /products/get-products:
 *   get:
 *     summary: get all products
 *     description: This gets all products and filter due to category id
 *     tags:
 *       - Products
 *     produces:	 
 *       - application/json	 
 *     responses:
 *        201:
 *          description: Account created.
 *        422:
 *          Bad Request
*/
router.get('/products/get-products', getAllProducts)

module.exports = router