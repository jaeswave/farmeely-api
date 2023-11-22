const Joi = require("joi");

const validateAddCard = (data) => {
  const createAddCardSchema = Joi.object({
    email: Joi.string().email().required(),
    amount: Joi.number().required(),
  });
  return createAddCardSchema.validate(data);
};

const validateFindCard = (data) => {
  const createFindCardSchema = Joi.object({
    email: Joi.string().email().required(),
  });
  return createFindCardSchema.validate(data);
};
const validateDeleteCard = (data) => {
  const createDeleteCardSchema = Joi.object({
    email: Joi.string().email().required(),
    authorization_code: Joi.string().required(),
  });
  return createDeleteCardSchema.validate(data);
};
module.exports = {
  validateAddCard,
  validateFindCard,
  validateDeleteCard,
};
