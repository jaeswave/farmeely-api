const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("crypto");

const isEmpty = (val) => {
  return val === undefined ||
    val == null ||
    val.length == 0 ||
    Object.keys(val).length === 0
    ? true
    : false;
};

const asyncErrorManager = (promise, errorExt) => {
  return promise
    .then(function (data) {
      return [null, data];
    })
    .catch(function (err) {
      if (errorExt) {
        var parsedError = Object.assign({}, err, errorExt);
        return [parsedError, undefined];
      }
      return [err, undefined];
    });
};

const makePhoneNumberInternational = (phoneNumber) => {
  if (phoneNumber.substr(0, 1) === "0") {
    let internationalPrefix = "+234";
    let num10Digits = phoneNumber.substr(1);
    return internationalPrefix + num10Digits;
  } else if (phoneNumber.substr(1, 3) == "234") {
    return phoneNumber;
  } else {
    return phoneNumber;
  }
};

const hashMyPassword = async (mypassword) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
      bcrypt.hash(mypassword, salt, (err, hash) => {
        if (err) {
          reject(err);
        }
        resolve([salt, hash]);
      });
    });
  });
};

const generateOTP = () => {
  let digits = "123456789";
  let _otp = "";
  for (let i = 0; i < 6; i++) {
    let generatedRandom = Math.floor(Math.random() * 10);
    //did this check to cater for undefined that might be returned
    // form accessing the digit as an array
    if (generatedRandom < 0 || generatedRandom > 8) {
      generatedRandom = 0;
    }
    _otp += digits[generatedRandom];
  }
  return _otp;
};

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const generateChecksum = (
  transId,
  sellingCurrencyAmount,
  accountingCurrencyAmount,
  status,
  rkey,
  key,
) => {
  const str = `${transId}|${sellingCurrencyAmount}|${accountingCurrencyAmount}|${status}|${rkey}|${key}`;
  const generatedCheckSum = crypto.createHash("md5").update(str).digest("hex");
  return generatedCheckSum;
};

const verifyChecksum = (
  paymentTypeId,
  transId,
  userId,
  userType,
  transactionType,
  invoiceIds,
  debitNoteIds,
  description,
  sellingCurrencyAmount,
  accountingCurrencyAmount,
  key,
  checksum,
) => {
  const str = `${paymentTypeId}|${transId}|${userId}|${userType}|${transactionType}|${invoiceIds}|${debitNoteIds}|${description}|${sellingCurrencyAmount}|${accountingCurrencyAmount}|${key}`;
  const generatedCheckSum = crypto.createHash("md5").update(str).digest("hex");

  return generatedCheckSum == checksum ? true : false;
};

module.exports = {
  asyncErrorManager,
  isEmpty,
  makePhoneNumberInternational,
  hashMyPassword,
  generateOTP,
  generateReferralCode,
  generateChecksum,
  verifyChecksum,
};
