const Joi = require('joi')

const createFaq = Joi.object({
    tite: Joi.string().required(),
    faq_body: Joi.string().required()
})



module.exports = {
    createFaq
}