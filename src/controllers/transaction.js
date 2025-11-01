const { findQuery, insertOne } = require("../repository");
const { isEmpty } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const { debit } = require("./wallet");


// const createTransaction = (
//   reference,
//   amountPassed,
//   transaction_status,
//   customer_id,
//   email,
//   description
// ) => {
//   const transaction_id = uuidv4()?.replaceAll("-", "");

//   return insertOne("Transactions", {
//     transaction_id: transaction_id,
//     reference: reference,
//     email: email || null,
//     description: description || null,
//     amountPassed: amountPassed,
//     transaction_status: transaction_status,
//     customer_id: customer_id,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   });
// };

const getTransactions = async (req, res, next) => {
  const { customer_id } = req.params;
  try {
    const getAllTransactions = await findQuery("Transactions", {
      customer_id: customer_id,
    });

    res.status(200).json({
      status: true,
      message: "Transaction fetched successfully",
      data: getAllTransactions,
    });
  } catch (error) {
    next(error);
  }
};



const debitWallet = async (req, res, next) => {
  try {
    const { amount, description, items, shipping_address } =
      req.body;

    const { customer_id } = req.params;


    const [success, result] = await debit(
      amount,
      description,
      customer_id,
      items,
      shipping_address
    );

    console.log("result", result);
    console.log("success", success);

    if (!success) {
      throw new Error(result);
    }

    return res.status(200).json({
      success: true,
      message: "Wallet debited & order created successfully",
      order: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  debitWallet,
};
