const Joi = require("joi");

const register = Joi.object({
  lastname: Joi.string().required(),
  othernames: Joi.string().required(),
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  phone_number: Joi.string().min(11).required().label("Phone number").messages({
    "string.empty": `"Phone Number" cannot be an empty`,
    "string.min": `"Phone Number should have length of 11 digits`,
    "any.required": `"hone Number" is a required field`,
  }),
  password: Joi.string()
    .min(8)
    .regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/)
    .required()
    .label("Password")
    .messages({
      "string.empty": `"Password" cannot be an empty`,
      "string.min": `"Password" should have a minimum length of {#limit}`,
      "any.required": `"Password" is a required field`,
      "object.regex": `Must have at least 8 characters`,
      "string.pattern.base": `Password must contain at least a number, letter and special characters`,
    }),
  referrer_code: Joi.string().optional(),
  who_referred_customer: Joi.string().optional(),
  signup_channel: Joi.string().optional(),
});

const login = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }),
  password: Joi.string()
    .min(8)
    .regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/)
    .required()
    .label("Password")
    .messages({
      "string.empty": `"Password" cannot be an empty`,
      "string.min": `"Password" should have a minimum length of {#limit}`,
      "any.required": `"Password" is a required field`,
      "object.regex": `Must have at least 8 characters`,
      "string.pattern.base": `Password must contain at least a number, letter and special characters`,
    }),
});

const completeForgotPassword = Joi.object({
  new_password: Joi.string()
    .min(8)
    .regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/)
    .required()
    .label("Password")
    .messages({
      "string.empty": `"Password" cannot be an empty`,
      "string.min": `"Password" should have a minimum length of {#limit}`,
      "any.required": `"Password" is a required field`,
      "object.regex": `Must have at least 8 characters`,
      "string.pattern.base": `Password must contain at least a number, letter and special characters`,
    }),
});

const changePassword = Joi.object({
  old_password: Joi.string().required(),
  new_password: Joi.string()
    .min(8)
    .regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/)
    .required()
    .label("New password")
    .messages({
      "string.empty": `"Password" cannot be an empty`,
      "string.min": `"Password" should have a minimum length of {#limit}`,
      "any.required": `"Password" is a required field`,
      "object.regex": `Must have at least 8 characters`,
      "string.pattern.base": `Password must contain at least a number, letter and special characters`,
    }),
    confirm_new_password: Joi.string().required().valid(Joi.ref('new_password'))
    .label('confirm new password')
    .messages({ 'any.only': '{{#label}} does not match password' })
})

const updateUserInfo = Joi.object({
  bankCode: Joi.string().required(),
  accountNumber: Joi.string().required(),
  bankName: Joi.string().required()
})

const edit = Joi.object({
  lastname: Joi.string().optional(),
  othernames: Joi.string().optional(),
  address: Joi.string().optional(),
  gender: Joi.string().optional(),
  dob: Joi.string().optional(),

})

module.exports = {
  register,
  login,
  completeForgotPassword,
  changePassword,
  updateUserInfo,
  edit,
};
