const Joi = require('joi')

const createFaqAndUpdate = Joi.object({
    faq_body: Joi.string().required(),
    title: Joi.string().required(),
})



module.exports = {
    createFaqAndUpdate

}