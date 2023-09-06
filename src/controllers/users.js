const { findQuery } = require('../repository')

const create = async (req, res, next) => {
    const { lastname, othernames, email, phone_number, password, referrer_code } = req.body
    try {
        
        const user = await findQuery("Users", { email: email })
        if (user.length > 0) {
            const err = new Error("User already exists")
            err.status = 400
            return next(err)
        }
    
        
        res.status(201).json({
            status: true,
            message: "Account created",
            data: user
        })
    } catch (error) {
        
        next(error)
    }
    
   
}


module.exports = {
    create
}