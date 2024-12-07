const Joi = require("joi")

const register = Joi.object({
  lastname: Joi.string().required().messages({
    "string.empty": `"Lastname" cannot be an empty`,
    "any.required": `"Lastname" is a required field`,
  }),
  othernames: Joi.string().required().messages({
    "string.empty": `"Othernames" cannot be an empty`,
    "any.required": `"Othernames" is a required field`,
  }),
  email: Joi.string().email({ minDomainSegments: 2 }).required().messages({
    "string.empty": `"Email" cannot be an empty`,
    "any.required": `"Email" is a required field`,
  }),
  phone_number: Joi.string().min(11).required().label("Phone number").messages({
    "string.empty": `"Phone Number" cannot be an empty`,
    "string.min": `"Phone Number should have length of 11 digits`,
    "any.required": `"Phone Number" is a required field`,
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
})

const login = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required().messages({
    "string.empty": `"Email" cannot be an empty`,
    "any.required": `"Email" is a required field`,
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
})

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
})

const changePassword = Joi.object({
  old_password: Joi.string().required().messages({
    "string.empty": `"Old password field" cannot be an empty`,
    "string.min": `"Old password field" should have a minimum length of {#limit}`,
    "any.required": `"Old password field" is a required field`,
    "object.regex": `Must have at least 8 characters`,
    "string.pattern.base": `Old password field must contain at least a number, letter and special characters`,
  }),
  new_password: Joi.string()
    .min(8)
    .regex(/^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,30}$/)
    .required()
    .label("New password")
    .messages({
      "string.empty": `"New password field" cannot be an empty`,
      "string.min": `"New password field" should have a minimum length of {#limit}`,
      "any.required": `"New password field" is a required field`,
      "object.regex": `Must have at least 8 characters`,
      "string.pattern.base": `New password field must contain at least a number, letter and special characters`,
    }),
})

const updateUserInfo = Joi.object({
  bankCode: Joi.string().required(),
  accountNumber: Joi.string().required(),
  bankName: Joi.string().required(),
})

const edit = Joi.object({
  lastname: Joi.string().required().messages({
    "string.empty": `"Lastname" cannot be an empty`,
    "any.required": `"Lastname" is a required field`,
  }),
  othernames: Joi.string().required().messages({
    "string.empty": `"Othernames" cannot be an empty`,
    "any.required": `"Othernames" is a required field`,
  }),
  email: Joi.string().required().messages({
    "string.empty": `"Email" cannot be an empty`,
    "any.required": `"Email" is a required field`,
  }),
  phone_number: Joi.string().min(11).required().label("Phone number").messages({
    "string.empty": `"Phone Number" cannot be an empty`,
    "string.min": `"Phone Number should have length of 11 digits`,
    "any.required": `"Phone Number" is a required field`,
  }),
  address: Joi.string().optional().allow(null,""),
  gender: Joi.string().optional().allow(null,""),
  // dob: Joi.string().optional(),
})

module.exports = {
  register,
  login,
  completeForgotPassword,
  changePassword,
  updateUserInfo,
  edit,
}
