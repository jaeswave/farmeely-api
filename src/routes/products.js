const express = require("express")
const router = express.Router()
const {
  getAllProducts,
  getSingleProduct,
  updateProduct,
} = require("../controllers/products")

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
 *          description: All products fetched.
 *        422:
 *          Bad Request
 */
router.get("/products/get/products", getAllProducts)

/**
 * create a new user record
 * @swagger
 * /product/get-single-product/:id:
 *   get:
 *     summary: get single product
 *     description: This gets a single product due to product id
 *     tags:
 *       - Products
 *     produces:
 *       - application/json
 *     responses:
 *        201:
 *          description: Single product fetched.
 *        422:
 *          Bad Request
 */
router.get("/product/get_single/product/:id", getSingleProduct)

/**
 * create a new user record
 * @swagger
 * /products/update/product/:id:
 *   patch:
 *     summary: update single product
 *     description: This allows admin to update the product using category id
 *     tags:
 *       - Products
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: product_name
 *         in: body
 *         required: false
 *       - name: product_price
 *         in: body
 *         required: false
 *       - name: portion_price
 *         in: body
 *         required: false
 *     responses:
 *        201:
 *          description: Product updated successfully.
 *        422:
 *          Bad Request
 */
router.patch("/products/update/product/:id", updateProduct)

module.exports = router
