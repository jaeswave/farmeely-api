const Joi = require('joi')

const create = Joi.object({
    lastname: Joi.string().required(),
    othernames: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }),
    phone_number: Joi.string().min(11).required()
    .label('Phone number')
    .messages({
    'string.empty': `"Phone Number" cannot be an empty`,
    'string.min': `"Phone Number should have length of 11 digits`,
    'any.required': `"hone Number" is a required field`,
     }),
    password:  Joi.string().min(8).regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/).required()
    .label('Password')
    .messages({
    'string.empty': `"Password" cannot be an empty`,
    'string.min': `"Password" should have a minimum length of {#limit}`,
    'any.required': `"Password" is a required field`,
    'object.regex' : `Must have at least 8 characters`,
    'string.pattern.base': `Password must contain at least a number, letter and special characters`
    }), 
    referrer_code: Joi.string().optional(),
    who_referred_customer: Joi.string().optional(),
    signup_channel: Joi.string().optional()

})

const completeForgotPassword = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }),
    newPassword: Joi.string().min(8).regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/).required()
        .label('Password')
        .messages({
        'string.empty': `"Password" cannot be an empty`,
        'string.min': `"Password" should have a minimum length of {#limit}`,
        'any.required': `"Password" is a required field`,
        'object.regex' : `Must have at least 8 characters`,
        'string.pattern.base': `Password must contain at least a number, letter and special characters`
    }),
    confirmNewPassword: Joi.string().required().valid(Joi.ref('newPassword'))
    .label('Confirm password')
    .messages({ 'any.only': '{{#label}} does not match password' })
    
})

const changePassword = Joi.object({
    newPassword: Joi.string().required(),
    confirmNewPassword: Joi.string().required()
})

const updateUserInfo = Joi.object({
    bankCode: Joi.string().required(),
    accountNumber: Joi.string().required(),
    bankName: Joi.string().required()
})




module.exports = {
    create, completeForgotPassword,
    changePassword, updateUserInfo,
    
}