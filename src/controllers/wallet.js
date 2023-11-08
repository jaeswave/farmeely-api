// const WalletModel = require('../models/walletModel')
// const UserModel = require('../models/userModels')
// const transactionModel = require('../models/transactionModel')
const {
  TransactionStatusEnum,
  TransactionTypeEnum,
} = require("../constants/enums");
const { v4: uuidv4 } = require("uuid");
const { findQuery } = require("../repository");
const { isEmpty } = require("../utils");
// const { startPayment, completePayment } = require('../services/payment')

const credit = async (amountPassed, user_id, comments) => {
  const amount = Math.abs(Number(amountPassed));
  const userDetails = await getUserWallet(user_id);
  const initialbalance = Number(userDetails.amount_after);
  const newbalance = initialbalance + amount; //amount_after
  await updateWallet(user_id, initialbalance, newbalance);
  transaction(
    TransactionTypeEnum.CREDIT,
    comments,
    amount,
    userDetails.user_id,
    TransactionStatusEnum.SUCCESS
  );
  return;
};

const debit = async (amountPassed, user_id, comments) => {
  const amount = Math.abs(Number(amountPassed));
  const userDetails = await getUserWallet(user_id);
  const initialbalance = Number(userDetails.amount_after);
  if (initialbalance < amount) {
    return [false, "Insufficient balance"];
  }
  const newbalance = initialbalance - amount; //amount_after
  await updateWallet(user_id, initialbalance, newbalance);
  transaction(
    TransactionTypeEnum.DEBIT,
    comments,
    amount,
    userDetails.user_id,
    TransactionStatusEnum.SUCCESS
  );
  return true;
};

const transaction = async () => {
  const { customer_id } = req.params;
  const { type, description, amount, transaction_status } = req.body;

  try {
    const checkIfUserexist = await findQuery("Users", {
      customer_id: customer_id,
    });
    if (isEmpty(checkIfUserexist)) {
      const err = new Error("Access Denied");
      err.status = 400;
      return next(err);
    } else {
    }

    const transaction_id = uuidv4();

    return create("Transaction", {
      transaction_id: transaction_id,
      customer_id: userdata.customer_id,
      transaction_type: type,
      amount: amount,
      comments: description,
      transaction_status: TransactionStatusEnum.transaction_status,
    });
  } catch (error) {}
};

const getUserWallet = async () => {
  const { customer_id } = req.params;

  try {
    const checkIfUserexist = await findQuery("Wallet", {
      customer_id: customer_id,
    });
    if (isEmpty(checkIfUserexist)) {
      const err = new Error("Access Denied !");
      err.status = 400;
      return next(err);
    }
    const customerWalletData = await findQuery({ customer_id: customer_id });
    console.log("check: ", customerWalletData);
    return customerWalletData[0];
  } catch (error) {
    next(error);
  }
};

const updateWallet = async (user_id, initial, after) => {
  return await updateOne(
    "Wallet",
    {
      amount_before: initial,
      amount_after: after,
    },
    {
      customer_id: customElements,
    }
  );
};

const startWalletFunding = async (req, res) => {
  const { amount, email } = req.body;
  try {
    if (!amount || !email) {
      res.status(400).json({
        status: false,
        message: "Amount and email are required",
      });
    }
    const userDetails = await findOne("", { email });
    if (!userDetails) {
      const err = new Error("Access Denied");
      err.status = 400;
      return next(err);
    }
    const initialiseTransaction = await startPayment(amount, email);
    delete initialiseTransaction.data.data.access_code;
    
    res.status(200).json({
      status: true,
      message: "Transaction initialized successfully",
      data: initialiseTransaction.data.data,
    });


  } catch (error) {
    next(error);
  }
};

const completeWalletFunding = async (req, res) => {
  const { reference, user_id } = req.body;
  if (!reference || !user_id) {
    res.status(400).json({
      status: false,
      message: "All fields are required",
    });
    return;
  }
  const completeTransaction = await completePayment(reference);
  if (completeTransaction.data.data.status != "success") {
    res.status(400).json({
      status: false,
      message: "Invalid transaction reference",
    });
  }
  const amountInNaira = completeTransaction.data.data.amount / 100;
  const comments = `Wallet funding of ${amountInNaira} was successful`;
  credit(amountInNaira, user_id, comments);
  res.status(200).json({
    status: true,
    message: "Your Wallet has been funded successfully",
  });
};

const getWalletBalance = async (req, res) => {
  const user_id = "29bb056b-8193-4682-bedb-4fbd5c5cac9d"; //req.params
  try {
    const getWallet = await getUserWallet(user_id);
    const walletBalance = getWallet.amount_after;
    return res.json({
      status: true,
      balance: walletBalance,
      message: "wallet balance fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching wallet balance",
    });
  }
};

const sendMoney = async (req, res) => {
  let { amount, phone, user_id } = req.body;
  amount = Number(amount);
  if (!phone || !amount)
    return res.json({
      status: false,
      message: "amount or phone number is required",
    });
  if (amount > 50000) {
    return res.json({
      status: true,
      message: "your transfer limit has been exceeded",
    });
  }
  try {
    const userDetails = await getUserWallet(user_id);
    const recipientDetails = await getUserWithPhone(phone);
    if (!recipientDetails) {
      return res.json({
        status: false,
        message: "user not found",
      });
    }
    if (userDetails.amount_after < amount)
      return res.json({
        status: false,
        message: "insufficient balance. Please top-up your wallet",
      });
    const debitComments = `you have successfully tranferred ${amount} to ${recipientDetails.surname}${recipientDetails.othernames}`;
    await debit(amount, user_id, debitComments);
    const creditComments = `your account has been credited with ${amount} from ${userDetails.othernames} ${userDetails.surname}`;
    await credit(amount, recipientDetails.user_id, creditComments);
    return res.json({
      status: true,
      message: "Transaction completed successfully",
    });
  } catch (error) {
    return res.json({
      status: false,
      message: error.message,
    });
  }
};

const walletBalance = async (fullname, balance, date) => {
  const userSurname = await UserModel.surname;
  const userOthernames = await UserModel.othernames;
  fullname = userSurname + userOthernames;
  const userBalance = await updateWallet(user_id, initial, after);
  balance = userBalance.amount_after;
  const presentDate = Date.now();
  date = presentDate;
  return;
};

module.exports = {
  credit,
  debit,
  transaction,
  startWalletFunding,
  completeWalletFunding,
  getWalletBalance,
  sendMoney,
  walletBalance,
};
