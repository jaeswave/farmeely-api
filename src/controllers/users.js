const { findQuery, insertOne, updateOne } = require("../repository");
const { v4: uuidv4 } = require("uuid");
const {
  isEmpty,
  hashMyPassword,
  generateReferralCode,
  generateOTP,
} = require("../utils");
const { redisClient } = require("../config/redis");
const { readFileAndSendEmail } = require("../services/email");

const register = async (req, res, next) => {
  const {
    lastname,
    othernames,
    email,
    phone_number,
    password,
    who_referred_customer,
    signup_channel,
  } = req.body;

  try {
    const checkIfUserExist = await findQuery("Users", {
      $or: [{ email: email }, { phone_number: phone_number }],
    });

    if (!isEmpty(checkIfUserExist)) {
      const err = new Error("User already exists, Kindly login");
      err.status = 400;
      return next(err);
    }

    const HashedPasswordAndSalt = await hashMyPassword(password);
    const customer_id = uuidv4();

    const createCustomer = await insertOne("Users", {
      customer_id: customer_id,
      lastname: lastname,
      othernames: othernames,
      email: email,
      phone_number: phone_number,
      password_salt: HashedPasswordAndSalt[0],
      password_hash: HashedPasswordAndSalt[1],
      referrer_code: generateReferralCode(),
      who_referred_customer: who_referred_customer || null,
      signup_channel: signup_channel || "App",
    });

    if (isEmpty(createCustomer)) {
      const err = new Error(
        "Cannot create customer this time. Please try again soon !"
      );
      err.status = 400;
      return next(err);
    }

    const otpValue = generateOTP();

    redisClient.set(`otp_${email}`, otpValue, {
      EX: 60 * 5,
    });

    let dataReplacementForOtpVerification = {
      fullname: ` ${lastname}, ${othernames}`,
      otp: `${otpValue}`,
    };

    readFileAndSendEmail(
      email,
      "OTP VERIFICATION",
      dataReplacementForOtpVerification,
      "otp"
    );

    res.status(200).send({
      status: "success",
      message: "Account created successfully",
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

const resendOTP = async (req, res, next) => {
  const { email } = req.params;

  try {
    const checkFromRedis = await redisClient.get(`otp_${email}`);

    if (!isEmpty(checkFromRedis)) {
      readFileAndSendEmail(
        email,
        "Resend Otp",
        {
          fullname: `Buddy`,
          otp: `${checkFromRedis}`, //the otp value is not null from redis
        },
        "otp"
      );
    } else {
      const newOtp = generateOTP();
      redisClient.set(`otp_${email}`, newOtp, {
        EX: 60 * 5,
      });

      readFileAndSendEmail(
        email,
        "RESEND OTP",
        { fullname: `Buddy`, otp: `${newOtp}` },
        "otp"
      );
    }

    res.status(200).send({
      status: "success",
      message: "Otp Sent Successfully",
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  const { otp, email } = req.params;

  try {
    if (!otp || !email) {
      const err = new Error("Invalid Otp");
      err.status = 400;
      return next(err);
    }
    const verifyOtpFromRedis = await redisClient.get(`otp_${email}`);

    if (isEmpty(verifyOtpFromRedis)) {
      const err = new Error("Invalid Otp and/or expired otp");
      err.status = 400;
      return next(err);
    }

    if (otp != verifyOtpFromRedis) {
      const err = new Error("Invalid Otp and/or expired otp");
      err.status = 400;
      return next(err);
    }
    await updateOne("Users", { isOtpVerified: true }, { email: email }); //update the otp on redis

    redisClient.del(`otp_${email}`); //Delete the otp on redis

    res.status(200).json({
      status: true,
      message: "Otp verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

const startForgetPassword = async (req, res, next) => {
  const { email } = req.params;

  try {
    const userDetails = await findQuery("Users", { email: email });

    console.log(userDetails);

    if (isEmpty(userDetails)) {
      const err = new Error("Email does not exist");
      err.status = 400;
      return next(err);
    } else {
      const otpForForgetPassword = generateOTP();
      redisClient.set(`otp_${email}`, otpForForgetPassword, {
        EX: 60 * 5,
      });

      const dataReplacementForOtpEmailVerification = {
        fullname: ` ${userDetails[0].lastName}, ${userDetails[0].otherNames}`,
        otp: `${otpForForgetPassword}`,
      };

      readFileAndSendEmail(
        email,
        "FORGET PASSWORD",
        dataReplacementForOtpEmailVerification,
        "forget_password"
      );

      res.status(200).send({
        status: "success",
        message: "Reset password otp code sent successfully",
      });
      return;
    }
  } catch (error) {
    return next(error);
  }
};

const completeForgetPassword = async (req, res) => {
  const { email, hash } = req.params;
  const { new_password } = req.body;

  if (!email || !hash || !new_password) {
    res.status(400).json({
      status: false,
      message: "Bad request",
    });
    return;
  }
  try {
    const checkIfHashMatch = await findQuery(
      "Users",
      { email: email },
      { email_otp: hash }
    );
    if (isEmpty(checkIfHashMatch)) {
      const err = new Error(
        `Invalid link, please check your email again, details shared is ${JSON.stringify(
          req.params
        )}`
      );
      err.status = 400;
      return next(err);
    }
    if (
      checkIfHashMatch[0].phone_otp_created_at <
      new Date().getTime() - 360000 //1 hour
    ) {
      const err = new Error(
        `Link has expired, please request for a new one, details shared is ${JSON.stringify(
          req.params
        )}`
      );
      err.status = 400;
      return next(err);
    }
    const newPasswordHashAndSalt = await hashMyPassword(new_password);

    //updating the customer's password
    await Account.query()
      .update({
        password_salt: newPasswordHashAndSalt[0],
        password_hash: newPasswordHashAndSalt[1],
      })
      .where("email", email);

    //go ahead to delete otp to proceed the forget password
    await findOneAnd("email", email);

    res.status(200).send({
      status: "success",
      message: "Your Password has been updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  resendOTP,
  verifyOtp,
  startForgetPassword,
  completeForgetPassword,
  // updateCustomerData,
  // getCustomerCards,
  // startFundWalletWithNewCard,
  // changeCustomersPassword,
};
