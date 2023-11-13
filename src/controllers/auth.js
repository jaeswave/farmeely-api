const { findQuery } = require("../repository");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { isEmpty } = require("../utils");

const login = async (req, res, next) => {
  let payload;
  const { email, password } = req.body;

  try {
    const checkIfUserExist = await findQuery("Users", { email: email });
    if (isEmpty(checkIfUserExist)) {
      const err = new Error(
        "Customer credentials doesn't exist, please sign up !"
      );
      err.status = 400;
      return next(err);
    }

    payload = checkIfUserExist[0];

    const comparePassword = await bcrypt.compare(
      password,
      payload.password_hash
    );

    if (!comparePassword) {
      const err = new Error("Invalid login credentials");
      err.status = 400;
      return next(err);
    }

    const addedDataToPayload = {
      id: payload.id,
      lastname: payload.lastname,
      othernames: payload.othernames,
      email: payload.email,
      phone_number: payload.phone_number,
    };

    jwt.sign(
      addedDataToPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_TIME },
      (err, token) => {
        if (err) {
          return next(err);
        } else {
          delete payload.password_hash;
          delete payload.password_salt;
          delete payload.created_at;
          delete payload.modified_at;

          res.setHeader("authorization", token);
          res.status(200).json({
            status: true,
            message: "Login successful"
          });
        }
      }
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};