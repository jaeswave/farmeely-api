const express = require("express")
const router = express.Router()
const validationData = require("../validations/faq")
const validationMiddleware = require("../middleware/validation")
const authorization = require("../middleware/authorization")
const {
  createFaq,
  getFaq,
  updateFaq,
  deleteFaq,
} = require("../controllers/faq")

/**
 * create a new user record
 * @swagger
 * /faq/create:
 *   post:
 *     summary: post frequently asked questions
 *     description: This allow admin to post frequently asked questions for customers to see
 *     tags:
 *       - FAQ
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: title
 *         in: body
 *         required: true
 *       - name: body
 *         in: body
 *         required: true
 *     responses:
 *        201:
 *          description: Question added successfully.
 *        422:
 *          Bad Request
 */
router.post(
  "/faq/create",
  validationMiddleware(validationData.createFaqAndUpdate),
  createFaq
)

/**
 * create a new user record
 * @swagger
 * /faq/get:
 *   get:
 *     summary: displays the faq to the users
 *     description: This allow users to see recently asked questions
 *     tags:
 *       - FAQ
 *     produces:
 *       - application/json
 *     responses:
 *        201:
 *          description: Questions successfully retrieved.
 *        422:
 *          Bad Request
 */
router.get("/faq/get", getFaq)

/**
 * create a new user record
 * @swagger
 * /faq/create:
 *   put:
 *     summary: update frequently asked questions
 *     description: This allow admin to update frequently asked questions for customers to see
 *     tags:
 *       - FAQ
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: title
 *         in: body
 *         required: true
 *       - name: body
 *         in: body
 *         required: true
 *     responses:
 *        201:
 *          description: FAQ updated successfully successfully.
 *        422:
 *          Bad Request
 */
router.put(
  "/faq/update/:id",
  validationMiddleware(validationData.createFaqAndUpdate),
  updateFaq
)

/**
 * create a new user record
 * @swagger
 * /faq/get:
 *   delete:
 *     summary: delete frequently asked questions
 *     description: This allow admin to delete frequently asked questions for customers to see
 *     tags:
 *       - FAQ
 *     produces:
 *       - application/json
 *     responses:
 *        201:
 *          description: FAQ deleted successfully.
 *        422:
 *          Bad Request
 */
router.delete("/faq/delete/:id", deleteFaq)

module.exports = router
