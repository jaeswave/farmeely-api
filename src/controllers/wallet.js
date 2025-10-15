const { TransactionStatusEnum, TransactionTypeEnum } = require("../enums/index")
const { v4: uuidv4 } = require("uuid")
const {
  findQuery,
  insertOne,
  updateOne,
  updateWithOperators,
} = require("../repository/index");
const { isEmpty } = require("../utils/index")
const { startPayment, completePayment } = require("../services/payment")
const { createTransaction } = require("./transaction")


// const credit = async (amountPassed, customer_id) => {
//   try {
//     const amount = Math.abs(Number(amountPassed))
//     const userDetails = await getUserWallet(customer_id)
//     const initialbalance = Number(userDetails[0].balance)
//     const newbalance = initialbalance + amount

//     await updateWallet(customer_id, newbalance)

//     return
//   } catch (error) {
//     return error
//   }
// }




const credit = async (amountPassed, customer_id) => {
  try {
    const amount = Math.abs(Number(amountPassed));

    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const userDetails = await getUserWallet(customer_id);

  

    const initialbalance = Number(userDetails[0].balance);
    const newbalance = initialbalance + amount;

    const updateResult = await updateWallet(customer_id, newbalance);

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update wallet");
    }

    return {
      success: true,
      old_balance: initialbalance,
      new_balance: newbalance,
      amount_credited: amount,
    };
  } catch (error) {
    // ✅ Throw error so caller knows it failed
    throw error;
  }
};

const debit = async (amountPassed, description, customer_id) => {
  const amount = Math.abs(Number(amountPassed))
  const userDetails = await getUserWallet(customer_id)
  const initialbalance = Number(userDetails.amount_after)

  if (initialbalance < amount) {
    return [false, "Insufficient balance"]
  }
  const newbalance = initialbalance - amount
  await updateWallet(customer_id, initialbalance, newbalance)
  transaction(
    TransactionTypeEnum.DEBIT,
    description,
    amount,
    userDetails.customer_id,
    TransactionStatusEnum.SUCCESS
  )
  return true
}

const createWallet = async (wallet_type, currency = "NGN", customer_id) => {
  return await insertOne("Wallet", {
    wallet_id: uuidv4(),
    wallet_type: wallet_type, //1 = spend, 2 = save, 3 = borrow
    balance: 0,
    currency: currency,
    customer_id: customer_id,
  })
}

const getUserWallet = async (customer_id) => {
  return await findQuery("Wallet", { customer_id: customer_id })
}

// const updateWallet = async (customer_id, newbalance) => {
//   return await updateOne(
//     "Wallet",
//     {
//       customer_id: customer_id,
//     },
//     {
//       // balance: initial,
//       balance: newbalance,
//     }
//   )
// }


// ✅ FIXED (using updateWithOperators):
const updateWallet = async (customer_id, newbalance) => {
  
  return await updateWithOperators(
    "Wallet",
    { customer_id: customer_id },
    { 
      $set: { balance: newbalance }
    }
  )
}
const startWalletFunding = async (req, res, next) => {
  const { amount } = req.body
  const { email, customer_id } = req.params

  try {
    if (!amount) {
      res.status(400).json({
        status: false,
        message: "All fields are required",
      })
    }
    const userDetails = await findQuery("Wallet", { customer_id: customer_id })

    if (isEmpty(userDetails)) {
      const err = new Error("Wallet not found !")
      err.status = 400
      return next(err)
    }
    const initialiseTransaction = await startPayment(
      amount,
      email,
      "http://localhost:3000/payment-success"
    )
    console.log("initialiseTransaction:", initialiseTransaction)
    delete initialiseTransaction.data.data.access_code

    res.status(200).json({
      status: true,
      message: "Transaction initialized successfully",
      data: initialiseTransaction.data.data,
    })
  } catch (error) {
    next(error)
  }
}

const completeWalletFunding = async (req, res, next) => {
  const { reference, customer_id, email } = req.params
  console.log(reference,customer_id,email)

  try {
    const checkIfReferenceExist = await findQuery("Transactions", {
      reference: reference,
    })
    if (!isEmpty(checkIfReferenceExist)) {
      const err = new Error("transaction reference exist !")
      err.status = 400
      return next(err)
    }
    if (isEmpty(reference)) {
      res.status(400).json({
        status: false,
        message: "Transaction could not be completed!",
      })
    }

    const completeTransaction = await completePayment(reference)

    if (completeTransaction.data.data.status != "success") {
      const err = new Error("Invalid transaction reference !")
      err.status = 400
      return next(err)
    }
    const amountInNaira = completeTransaction.data.data.amount / 100
    const description = `Wallet funding of ${amountInNaira} was successful`

    await credit(amountInNaira, customer_id)

    await createTransaction(
      reference,
      amountInNaira,
      completeTransaction.data.data.status,
      customer_id,
      email,
      description
    )

    res.status(200).json({
      status: true,
      message: "Your Wallet has been funded successfully",
    })
  } catch (error) {
    next(error)
  }
}

const getWalletBalance = async (req, res, next) => {
  const { customer_id } = req.params
  try {
    const getcustomerWalletBalance = await findQuery("Wallet", {
      customer_id: customer_id,
    })
    if (isEmpty(getcustomerWalletBalance)) {
      const err = new Error("Error fetching wallet balance")
      err.status = 400
      return next(err)
    }
    return res.json({
      status: true,
      message: "wallet balance fetched successfully",
      balance: getcustomerWalletBalance[0].balance,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  credit,
  debit,
  createWallet,
  startWalletFunding,
  completeWalletFunding,
  getWalletBalance,
}
