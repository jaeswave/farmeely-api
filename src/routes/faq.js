const express = require('express')
const router = express.Router()
const validationData = require('../validations/users')
const validationMiddleware = require('../middleware/validation')
const authorization  = require('../middleware/authorization')


//USERS ROUTES
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
router.get('/user/create', validationMiddleware(validationData.create), create)

module.exports = router