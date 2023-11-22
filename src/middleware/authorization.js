require("dotenv").config();
const jwt = require("jsonwebtoken");
const { findQuery } = require("../repository");
const jwtSecret = process.env.JWT_SECRET || "keep-secret-secure123#";

const authorization = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    res.status(401).send({
      status: false,
      message: "Unauthorized Access",
    });
  } else {
    const tokenSplit = authorization.split(" ");
    jwt.verify(tokenSplit[1], jwtSecret, async (err, decoded) => {
      if (err) {
        res.status(401).send({
          status: false,
          message: "Unauthorized Acesss",
        });
        return;
      } else {
        const checkUserDetails = await findQuery("Users", {
          email: decoded.email,
        });
        req.params.email = checkUserDetails[0].email;
        req.params.customer_id = checkUserDetails[0].customer_id;
      }
      next();
    });
  }
};

module.exports = authorization;
