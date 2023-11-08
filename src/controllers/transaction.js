const { TRANSACTION_STATUS } = require("../constants/enums");
const { findQuery } = require("../repository");
const { isEmpty } = require("../utils");

const getTransactions = async (req, res, next) => {
  const { page } = req.query;
  const limit = 5;
  const pages = page - 1 || 0;
  //   const offset = pages * limit;

  try {
    const getAllTransactions = await findQuery("Transactions", {});
    if (isEmpty(getAllTransactions)) {
      const err = new Error("Not found !");
      err.status = 400;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Transaction fetched successfully",
      data: getAllTransactions,
    });
  } catch (error) {
    next(error);
  }
};

const filterTransactionsWithDate = async (req, res, next) => {
  const { start_date, end_date } = req.body;

  try {
    if (!start_date || !end_date) {
      res.status(404).json({
        status: false,
        message: "Fill the fields",
      });
      return;
    }
    const start = new Date(start_date);
    const end = new Date(end_date);

    const getAllTransactionsViaDate = await findQuery("Transactions", [
      { timestamp: { createdAt: start, updatedAt: end } },
    ]);

    console.log("findTransaction: ", getAllTransactionsViaDate);

    if (isEmpty(getAllTransactionsViaDate)) {
      const err = new Error("NNo transactions during this period.");
      err.status = 400;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Transaction fetched successfully",
      data: getAllTransactionsViaDate,
    });
  } catch (error) {
    next(error);
  }
};

const filterTransactionType = async (req, res, next) => {
  try {
    const { filter_by } = req.query;
    let amount = filter_by;

    if (filter_by === transactionTypeEnum.CREDIT) {
      const creditTransactions = await findQuery("Transactions", {
        transaction_type: transactionTypeEnum.CREDIT,
      });
      if (isEmpty(creditTransactions)) {
        const err = new Error("No credit transaction found !");
        err.status = 400;
        return next(err);
      }
      res.status(200).json({
        status: true,
        message: "All credit transactions fetched successfully",
        data: creditTransactions,
      });
    } else if (filter_by === transactionTypeEnum.DEBIT) {
      const debitTransactions = await transactionModel.findAll("Transactions", {
        transaction_type: TRANSACTION_STATUS.DEBIT,
      });

      if (isEmpty(debitTransactions)) {
        const err = new Error("No debit transaction found !");
        err.status = 400;
        return next(err);
      }

      res.status(200).json({
        status: true,
        message: "All debit transactions fetched successfully",
        data: debitTransactions,
      });
    } else if (filter_by === amount) {
      const transactionAmount = await findQuery("Transactions", {
        amount: amount,
      });
      if (isEmpty(transactionAmount)) {
        const err = new Error("No transaction of this amount !");
        err.status = 400;
        return next(err);
      }
      res.status(200).json({
        status: true,
        message: `All transactions of ${amount} fetched successfully`,
        data: transactionAmount,
      });
    }
  } catch (error) {
    next(error);
  }
};

const dailyTransaction = (req, res, next) => {
  const { transactionType } = req.query;
  const { user_id } = req.body;
};
const weeklyTransaction = (req, res, next) => {
  const { transactionType } = req.query;
  const { user_id } = req.body;
};
const monthlyTransaction = async (req, res, next) => {
  const { transactionType } = req.query;
  const { user_id } = req.body;
};
const getUserTransaction = (user_id) => {
  return transactionModel.findAll({
    where: {
      user_id: user_id,
    },
  });
};

module.exports = {
  getTransactions,
  filterTransaction,
  filterTransactionsWithDate,
  dailyTransaction,
  weeklyTransaction,
  monthlyTransaction,
};
