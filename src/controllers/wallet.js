const {
  TransactionStatusEnum,
  TransactionTypeEnum,
} = require("../enums/index");
const { v4: uuidv4 } = require("uuid");
const { findQuery } = require("../repository/index");
const { isEmpty } = require("../utils/index");

const credit = async (req, res, next) => {
  const { amountPassed, comments } = req.body;
  const { customer_id } = req.params;
  try {
    const checkUser = await findQuery("Transactions", {
      customer_id: customer_id,
    });
    if (isEmpty(checkUser)) {
      const err = new Error("Access Denied");
      err.status = 400;
      return next(err);
    }
  } catch (error) {}
  const amount = Math.abs(Number(amountPassed));
  const userDetails = await getUserWallet(customer_id);
  const initialbalance = Number(userDetails.amount_after);
  const newbalance = initialbalance + amount;
  await updateWallet(customer_id, initialbalance, newbalance);
  transaction(
    TransactionTypeEnum.CREDIT,
    description,
    amount,
    userDetails.customer_id,
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
  await updateWallet(customer_id, initialbalance, newbalance);
  transaction(
    TransactionTypeEnum.DEBIT,
    description,
    amount,
    userDetails.customer_id,
    TransactionStatusEnum.SUCCESS
  );
  return true;
};

const createTransaction = async () => {
  const { customer_id } = req.params;
  const { transType, description, amount, transaction_status } = req.body;

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
      transaction_type: transType,
      amount: amount,
      description: description,
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
      //Do i need to check for this since the auth will validate if the user is logged in
      const err = new Error("Access Denied !");
      err.status = 400;
      return next(err);
    }
    const customerWalletData = await findQuery({ customer_id: customer_id });

    res.status(200).json({
      status: true,
      message: "Invalid transaction reference",
      data: customerWalletData[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateWallet = async (req, res, next) => {
  const { customer_id, initial, current } = req.body;

  try {
    const checkToUpdateUserWallet = await updateOne(
      "Wallet",
      {
        amount_before: initial,
        amount_after: current,
      },
      {
        customer_id: customer_id,
      }
    );
    res.status(200).json({
      status: true,
      message: "Customer's wallet updated successfully",
      data: checkToUpdateUserWallet,
    });
  } catch (error) {
    next(error);
  }
};

const startWalletFunding = async (req, res) => {
  const { amount, email } = req.body;
  try {
    if (!amount || !email) {
      res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }
    const userDetails = await findQuery("Wallet", { email:email });
    if (isEmpty(userDetails)) {
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
  const {customer_id} =  req.params
  try {
    const getcustomerWalletBalance = await findQuery("Wallet",{customer_id:customer_id}).amount_after;
    // console.log('getCustomerWallet', getcustomerWalletBalance);
    if (isEmpty(getcustomerWalletBalance)) {
      const err = new Error("Error fetching wallet balance");
      err.status = 400;
      return next(err);
    }
    return res.json({
      status: true,
      message: "wallet balance fetched successfully",
      balance: getcustomerWalletBalance,
    });
  } catch (error) {
    next(error)
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

module.exports = {
  credit,
  debit,
  createTransaction,
  startWalletFunding,
  completeWalletFunding,
  getWalletBalance,
  sendMoney,
};
