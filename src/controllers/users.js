const {
  findQuery,
  insertOne,
  updateOne,
  updateMany,
  updateWithOperators,
} = require("../repository");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const {
  isEmpty,
  hashMyPassword,
  generateReferralCode,
  generateOTP,
} = require("../utils");
const { redisClient } = require("../config/redis");
const { readFileAndSendEmail } = require("../services/email");
const { createWallet } = require("./wallet");
const { IS_EMAIL_VERIFIED } = require("../enums/users");
const { messages } = require("../constants/messages");

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
      const err = new Error(messages.userExists);
      err.status = 400;
      return next(err);
    }

    const HashedPasswordAndSalt = await hashMyPassword(password);
    const customer_id = uuidv4();

    const createCustomer = await insertOne("Users", {
      customer_id: customer_id,
      fullname: `${lastname} ${othernames}`,
      email: email,
      phone_number: phone_number,
      password_salt: HashedPasswordAndSalt[0],
      password_hash: HashedPasswordAndSalt[1],
      referrer_code: generateReferralCode(),
      who_referred_customer: who_referred_customer || null,
      signup_channel: signup_channel || "App",
      isOtpVerified: IS_EMAIL_VERIFIED.default,
    });

    if (isEmpty(createCustomer)) {
      const err = new Error(messages.cannotCreateUser);
      err.status = 400;
      return err;
    }

    await createWallet("spend", "NGN", customer_id);

    const otpValue = generateOTP();
    redisClient.set(`otp_${email}`, otpValue, {
      EX: 60 * 60,
    });

    console.log("otpValue:", otpValue);

    let dataReplacementForOtpVerification = {
      fullname: `${lastname} ${othernames}`,
      otp: `${otpValue}`,
    };

    console.log("hello world");

    readFileAndSendEmail(
      email,
      "OTP VERIFICATION",
      dataReplacementForOtpVerification,
      "otp",
    );

    res.status(200).send({
      status: true,
      message: messages.accountCreated,
    });
  } catch (error) {
    next(error);
  }
};

const resendOTP = async (req, res, next) => {
  const { email } = req.params;

  try {
    const userEmail = await findQuery("Users", { email: email });

    if (isEmpty(userEmail)) {
      const err = new Error(messages.provideEmail);
      err.status = 400;
      return next(err);
    }

    const checkFromRedis = await redisClient.get(`otp_${email}`);

    if (!isEmpty(checkFromRedis)) {
      readFileAndSendEmail(
        email,
        "Resend Otp",
        {
          fullname: `Buddy`,
          otp: `${checkFromRedis}`,
        },
        "otp",
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
        "otp",
      );
    }

    res.status(200).send({
      status: true,
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
      const err = new Error("Invalid Email Address");
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
    await updateOne("Users", { email: email }, { isOtpVerified: true }); //update the otp on redis

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
        "forget_password",
      );

      res.status(200).send({
        status: true,
        message: "Reset password otp code sent successfully",
      });
      return;
    }
  } catch (error) {
    return next(error);
  }
};

const completeForgetPassword = async (req, res, next) => {
  const { email, otp } = req.params;
  const { new_password } = req.body;

  console.log("email", email);
  try {
    if (!email || !otp || !new_password) {
      const err = new Error("Bad request");
      err.status = 400;
      return next(err);
    }

    const checkOtpFromRedis = await redisClient.get(`otp_${email}`);

    if (isEmpty(checkOtpFromRedis)) {
      const err = new Error("Invalid otp");
      err.status = 400;
      return next(err);
    }

    if (otp != checkOtpFromRedis) {
      const err = new Error("Invalid Otp and/or expired otp");
      err.status = 400;
      return next(err);
    }

    const checkDataBase = await findQuery("Users", { email: email });

    const { password_hash } = checkDataBase[0];

    const comparePassword = await bcrypt.compare(new_password, password_hash);

    if (comparePassword) {
      const err = new Error(
        "Use a different password as this is similar to the old password",
      );
      err.status = 400;
      return next(err);
    }

    const newPasswordHashAndSalt = await hashMyPassword(new_password);

    await updateMany(
      "Users",
      { email: email },
      {
        password_salt: newPasswordHashAndSalt[0],
        password_hash: newPasswordHashAndSalt[1],
      },
    );

    redisClient.del(`otp_${email}`);

    res.status(200).send({
      status: true,
      message: "Your Password has been updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const changeCustomersPassword = async (req, res, next) => {
  const { old_password, new_password } = req.body;
  const { customer_id } = req.params;

  try {
    const checkUserData = await findQuery("Users", {
      customer_id: customer_id,
    });
    if (isEmpty(checkUserData)) {
      const err = new Error("Access Denied !");
      err.status = 400;
      return next(err);
    }

    const comparePassword = await bcrypt.compare(
      old_password,
      checkUserData[0].password_hash,
    );
    if (!comparePassword) {
      const err = new Error("Old password is incorrect");
      err.status = 400;
      return next(err);
    }

    const comparePasswordOldAndNewPassword = await bcrypt.compare(
      new_password,
      checkUserData[0].password_hash,
    );

    console.log(
      "comparePasswordOldAndNewPassword:",
      comparePasswordOldAndNewPassword,
    );

    if (comparePasswordOldAndNewPassword) {
      const err = new Error(
        "Your new password cannot be the same as your old password.",
      );
      err.status = 400;
      return next(err);
    }

    const newPasswordHashAndSalt = await hashMyPassword(new_password);
    await updateOne(
      "Users",
      { customer_id: customer_id },
      {
        password_salt: newPasswordHashAndSalt[0],
        password_hash: newPasswordHashAndSalt[1],
      },
    );

    res.status(200).send({
      status: true,
      message: "Password successfully changed",
    });
  } catch (error) {
    next(error);
  }
};

const editProfile = async (req, res, next) => {
  const { customer_id } = req.params;

  try {
    // const checkUserData = await findQuery("Users", {
    //   customer_id: customer_id,
    // })

    // if (checkUserData[0].lastname === req.body.lastname) {
    //   const err = new Error("The previous name is the same as the current name")
    //   err.status = 400
    //   return next(err)
    // }

    await updateWithOperators("Users", { customer_id: customer_id }, req.body);

    res.status(200).send({
      status: true,
      message: "Your Profile details has been updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const getUserProfile = async (req, res, next) => {
  const { customer_id } = req.params;

  try {
    const [userDetails] = await findQuery("Users", {
      customer_id: customer_id,
    });

    if (isEmpty(userDetails)) {
      const err = new Error("Access Denied!");
      err.status = 400;
      return next(err);
    }

    const {
      password_salt,
      password_hash,
      isOtpVerified,
      _id,
      ...restUserDetails
    } = userDetails;

    res.status(200).send({
      status: true,
      message: "User details fetched successfully",
      data: restUserDetails,
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
  changeCustomersPassword,
  editProfile,
  getUserProfile,
};
