const Joi = require('joi')

const validationMiddleware = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body)
        const valid = error == null
      
        if (valid) {
            next()

        } else {

            const { details } = error
            const message = details.map(i => i.message).join(',')
            const err = new Error(message)
            err.status = 400
            return next(err)
           

        }

    }
}

module.exports = validationMiddleware