const { findQuery, insertOne, updateOne, updateMany } = require("../repository")
const { v4: uuidv4 } = require("uuid")
const {
  isEmpty,
  hashMyPassword,
  generateReferralCode,
  generateOTP,
} = require("../utils")
const { redisClient } = require("../config/redis")
const { readFileAndSendEmail } = require("../services/email")

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
    })

    if (!isEmpty(checkIfUserExist)) {
      const err = new Error("User already exists, Kindly login")
      err.status = 400
      return next(err)
    }

    const HashedPasswordAndSalt = await hashMyPassword(password)
    const customer_id = uuidv4()

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
    })

    if (isEmpty(createCustomer)) {
      const err = new Error(
        "Cannot create customer this time. Please try again soon !"
      )
      err.status = 400
      return next(err)
    }

    const otpValue = generateOTP()

    redisClient.set(`otp_${email}`, otpValue, {
      EX: 60 * 5,
    })

    let dataReplacementForOtpVerification = {
      fullname: ` ${lastname}, ${othernames}`,
      otp: `${otpValue}`,
    }

    readFileAndSendEmail(
      email,
      "OTP VERIFICATION",
      dataReplacementForOtpVerification,
      "otp"
    )

    res.status(200).send({
      status: "success",
      message: "Account created successfully",
    })
  } catch (error) {
    console.log(error)
    return next(error)
  }
}

const resendOTP = async (req, res, next) => {
  const { email } = req.params;

  try {
    const checkFromRedis = await redisClient.get(`otp_${email}`)

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
    })
  } catch (error) {
    next(error)
  }
}

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
      const err = new Error("Invalid Otp and/or expired otp")
      err.status = 400
      return next(err)
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
    next(error)
  }
}

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
        fullname: ` ${userDetails[0].lastname}, ${userDetails[0].othernames}`,
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
}

const completeForgetPassword = async (req, res, next) => {
  const { email, otp } = req.params
  const { new_password } = req.body

  console.log("email", email)
  try {
    if (!email || !otp || !new_password) {
      const err = new Error("Bad request")
      err.status = 400
      return next(err)
    }

    const checkOtpFromRedis = await redisClient.get(`otp_${email}`)

    console.log("checkOtpFromRedis", checkOtpFromRedis)

    if (isEmpty(checkOtpFromRedis)) {
      const err = new Error("Invalid otp")
      err.status = 400
      return next(err)
    }

    if (otp != checkOtpFromRedis) {
      const err = new Error("Invalid Otp and/or expired otp")
      err.status = 400
      return next(err)
    }

    const newPasswordHashAndSalt = await hashMyPassword(new_password)

    await updateMany(
      "Users",
      { email: email },
      {
        $and: [
          { password_salt: newPasswordHashAndSalt[0] },
          { password_hash: newPasswordHashAndSalt[1] },
        ],
      }
    ) //update the password salt and has on database

    redisClient.del(`otp_${email}`)

    res.status(200).send({
      status: "success",
      message: "Your Password has been updated successfully",
    })
  } catch (error) {
    next(error)
  }
}

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
}
