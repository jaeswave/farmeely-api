// const { transaction_type } = require("../enums/index");
const { findQuery, insertOne } = require("../repository")
const { isEmpty } = require("../utils")
const { v4: uuidv4 } = require("uuid")

const createTransaction = (
  reference,
  amountPassed,
  transaction_status,
  customer_id,
  email,
  description
) => {
  const transaction_id = uuidv4()?.replaceAll("-", "")

  return insertOne("Transactions", {
    transaction_id: transaction_id,
    reference: reference,
    email: email || null,
    description: description || null,
    amountPassed: amountPassed,
    transaction_status: transaction_status,
    customer_id: customer_id,
  })
}

const getTransactions = async (req, res, next) => {
  const { customer_id } = req.params
  try {
    const getAllTransactions = await findQuery("Transactions", {
      customer_id: customer_id,
    })

    res.status(200).json({
      status: true,
      message: "Transaction fetched successfully",
      data: getAllTransactions,
    })
  } catch (error) {
    next(error)
  }
}

// const getUserTransaction = async (req, res, next) => {
//   const { customer_id } = req.params;
//   try {
//     const userTransaction = await findQuery("Transaction", {
//       customer_id: customer_id,
//     });
//     if (isEmpty(userTransaction)) {
//       const err = new Error("No customer transaction found !");
//       err.status = 400;
//       return next(err);
//     }
//     res.status(200).json({
//       status: true,
//       message: "Customer transactions fetched successfully",
//       data: userTransaction,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const filterTransactionsWithDate = async (req, res, next) => {
//   const { start_date, end_date } = req.body;

//   try {
//     if (!start_date || !end_date) {
//       res.status(404).json({
//         status: false,
//         message: "Fill the fields",
//       });
//       return;
//     }
//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     const getAllTransactionsViaDate = await findQuery("Transactions", [
//       { timestamp: { createdAt: start, updatedAt: end } },
//     ]);

//     if (isEmpty(getAllTransactionsViaDate)) {
//       const err = new Error("No transactions during this period.");
//       err.status = 400;
//       return next(err);
//     }

//     res.status(200).json({
//       status: true,
//       message: "Transaction fetched successfully",
//       data: getAllTransactionsViaDate,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const filterTransactionType = async (req, res, next) => {
//   try {
//     const { amount, transactionType } = req.query;

//     if (transactionType === transaction_type.credit) {
//       const creditTransactions = await findQuery("Transactions", {
//         transaction_type: transaction_type.credit,
//       });
//       if (isEmpty(creditTransactions)) {
//         const err = new Error("No credit transaction found !");
//         err.status = 400;
//         return next(err);
//       }
//       res.status(200).json({
//         status: true,
//         message: "All credit transactions fetched successfully",
//         data: creditTransactions,
//       });
//     } else if (transactionType === transaction_type.debit) {
//       const debitTransactions = await findQuery("Transactions", {
//         transaction_type: transaction_type.debit,
//       });

//       if (isEmpty(debitTransactions)) {
//         const err = new Error("No debit transaction found !");
//         err.status = 400;
//         return next(err);
//       }

//       res.status(200).json({
//         status: true,
//         message: "All debit transactions fetched successfully",
//         data: debitTransactions,
//       });
//     } else if (amount === amount) {
//       const transactionAmount = await findQuery("Transactions", {
//         amount: amount,
//       });
//       if (isEmpty(transactionAmount)) {
//         const err = new Error("No transaction of this amount !");
//         err.status = 400;
//         return next(err);
//       }
//       res.status(200).json({
//         status: true,
//         message: `All transactions of ${amount} fetched successfully`,
//         data: transactionAmount,
//       });
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// const dailyTransaction = (req, res, next) => {
//   const { transactionType } = req.query;
//   const { customer_id } = req.body;
// };
// const weeklyTransaction = (req, res, next) => {
//   const { transactionType } = req.query;
//   const { customer_id } = req.body;
// };
// const monthlyTransaction = async (req, res, next) => {
//   const { transactionType } = req.query;
//   const { customer_id } = req.body;
// };

module.exports = {
  getTransactions,
  createTransaction,
  // filterTransactionType,
  // filterTransactionsWithDate,
  // getUserTransaction,
  // dailyTransaction,
  // weeklyTransaction,
  // monthlyTransaction,
}
