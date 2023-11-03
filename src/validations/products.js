const Joi = require('joi')

const createProducts = Joi.object({
    product_name: Joi.string().required(),
    product_price: Joi.string().required(),
    portion_price: Joi.string().required(),

})





module.exports = {
    createProducts
}