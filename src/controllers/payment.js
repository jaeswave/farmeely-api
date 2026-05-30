const { startPayment, completePayment } = require("../services/payment");
const {
  findQuery,
  insertOne,
  updateOne,
  updateMany,
  updateWithOperators,
} = require("../repository");
const {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
  FARMEELY_STATUS,
} = require("../enums/farmeely");

// Unified payment initialization
// const initializePayment = async (req, res) => {
//   try {
//     const { farmeely_id, payment_type } = req.body; // 'create', 'join', 'add_slots'
//     const user_id = req.params.customer_id;
//     const email = req.params.email;

//     // Try to get from main Farmeely first, then staging
//     let [farmeely] = await findQuery("Farmeely", { farmeely_id });
//     let isStaging = false;

//     if (!farmeely) {
//       [farmeely] = await findQuery("FarmeelyStaging", { farmeely_id });
//       isStaging = true;
//     }

//     if (!farmeely) {
//       return res.status(404).json({ message: "Farmeely not found" });
//     }

//     // Find the user based on where they are
//     let user = null;

//     if (isStaging) {
//       // Check if user is creator in staging
//       if (farmeely.creator?.user_id === user_id) {
//         user = {
//           ...farmeely.creator,
//           is_creator: true,
//           user_id: farmeely.creator.user_id,
//           user_email: farmeely.creator.user_email,
//           slots_joined: 0,
//           amount_paid: 0,
//           is_paid: farmeely.is_creator_paid || false,
//         };
//       } else {
//         // Check pending_joins
//         user = farmeely.pending_joins?.find((u) => u.user_id === user_id);
//         if (user) {
//           user.is_creator = false;
//           user.slots_joined = 0;
//           user.amount_paid = 0;
//           user.is_paid = user.is_paid || false;
//         }
//       }
//     } else {
//       // Main farmeely - find in joined_users
//       user = farmeely.joined_users?.find((u) => u.user_id === user_id);
//     }

//     if (!user) {
//       return res
//         .status(404)
//         .json({ message: "User not found in this farmeely" });
//     }

//     let amount = 0;
//     let pendingSlots = 0;
//     let pendingAmount = 0;
//     let description = "";

//     // Determine amount and details based on payment type
//     switch (payment_type) {
//       case "create":
//         // Only creator can do this
//         if (!user.is_creator) {
//           return res
//             .status(403)
//             .json({ message: "Only creator can make creation payment" });
//         }

//         // Check if creator already paid
//         if (user.is_paid) {
//           return res
//             .status(400)
//             .json({ message: "Creator payment already completed" });
//         }

//         amount = user.pending_amount || 0;
//         pendingSlots = user.pending_slots || 0;
//         pendingAmount = user.pending_amount || 0;
//         description = `Initial payment for ${pendingSlots} slot(s) as creator`;

//         if (amount <= 0) {
//           return res
//             .status(400)
//             .json({ message: "No pending payment found for creation" });
//         }
//         break;

//       case "join":
//         // Check if user already paid
//         if (user.is_paid) {
//           return res
//             .status(400)
//             .json({ message: "Join payment already completed" });
//         }

//         amount = user.pending_amount || 0;
//         pendingSlots = user.pending_slots || 0;
//         pendingAmount = user.pending_amount || 0;
//         description = `Joining farmeely with ${pendingSlots} slot(s)`;

//         if (amount <= 0) {
//           return res
//             .status(400)
//             .json({ message: "No pending payment found for joining" });
//         }
//         break;

//       case "add_slots":
//         // Adding more slots - only for main farmeely users
//         if (isStaging) {
//           return res.status(400).json({
//             message: "Cannot add slots until farmeely is activated",
//           });
//         }

//         amount = user.pending_additional_amount || 0;
//         pendingSlots = user.pending_additional_slots || 0;
//         pendingAmount = user.pending_additional_amount || 0;
//         description = `Adding ${pendingSlots} additional slot(s) to existing ${user.slots_joined} slot(s)`;

//         if (amount <= 0) {
//           return res
//             .status(400)
//             .json({ message: "No pending additional slots to pay for" });
//         }

//         // User must be already paid for existing slots
//         if (!user.is_paid) {
//           return res.status(400).json({
//             message: "Complete your initial payment before adding more slots",
//           });
//         }
//         break;

//       default:
//         return res.status(400).json({ message: "Invalid payment type" });
//     }

//     const callback_url = `${process.env.APP_URL}/payment/callback`;

//     const response = await startPayment(
//       amount,
//       email,
//       callback_url,
//       description,
//     );

//     console.log("Payment response:", response.data.data);

//     // Record transaction with metadata including staging flag
//     const transaction = await insertOne("Transaction", {
//       farmeely_id: farmeely_id,
//       customer_id: user_id,
//       amount: amount,
//       reference: response.data.data.reference,
//       transaction_status: "pending",
//       payment_type: payment_type,
//       is_staging: isStaging, // Add flag to know if this was from staging
//       metadata: {
//         current_slots: user.slots_joined || 0,
//         current_amount_paid: user.amount_paid || 0,
//         pending_slots: pendingSlots,
//         pending_amount: pendingAmount,
//         user_type: user.is_creator ? "creator" : "member",
//         current_payment_status: user.is_paid ? "paid" : "pending",
//         description: description,
//         // Store staging specific data if needed
//         ...(isStaging && {
//           staging_creator: farmeely.creator,
//           staging_pending_joins: farmeely.pending_joins,
//         }),
//       },
//       created_at: new Date(),
//     });

//     return res.status(200).json({
//       status: true,
//       message: "Payment initialized successfully",
//       data: {
//         authorization_url: response.data.data.authorization_url,
//         reference: response.data.data.reference,
//         amount: amount,
//         payment_type: payment_type,
//         farmeely_id: farmeely_id,
//         metadata: {
//           pending_slots: pendingSlots,
//           pending_amount: pendingAmount,
//           description: description,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Payment initialization error:", error);
//     return res.status(500).json({
//       message: "Payment initialization failed",
//       error: error.response?.data?.message || error.message,
//     });
//   }
// };

// // Unified payment verification
// const verifyPayment = async (req, res) => {
//   const { reference } = req.params;
//   const user_id = req.params.customer_id;

//   try {
//     // Verify payment with payment service
//     const response = await completePayment(reference);

//     if (response.data.data.status !== "success") {
//       throw new Error("Payment verification failed - payment not successful");
//     }

//     // Get transaction details
//     const [transaction] = await findQuery("Transaction", { reference });
//     if (transaction) {
//       throw new Error("Transaction not found");
//     }

//     const { farmeely_id, payment_type, amount, is_staging } = transaction;

//     // Handle different payment types with staging awareness
//     switch (payment_type) {
//       case "create":
//         await handleCreatePayment(
//           farmeely_id,
//           user_id,
//           transaction,
//           is_staging,
//         );
//         break;
//       case "join":
//         await handleJoinPayment(farmeely_id, user_id, transaction, is_staging);
//         break;
//       case "add_slots":
//         await handleAddSlotsPayment(
//           farmeely_id,
//           user_id,
//           transaction,
//           is_staging,
//         );
//         break;
//       default:
//         throw new Error("Unknown payment type");
//     }

//     // Update transaction status
//     await updateOne(
//       "Transaction",
//       { reference },
//       {
//         $set: {
//           transaction_status: "completed",
//           verified_at: new Date(),
//           payment_details: response.data.data,
//         },
//       },
//     );

//     res.status(200).json({
//       status: true,
//       message: "Payment verified successfully",
//       data: {
//         payment_type: payment_type,
//         amount: amount,
//         farmeely_id: farmeely_id,
//         reference: reference,
//         timestamp: new Date(),
//       },
//     });
//   } catch (err) {
//     console.error("Payment verification error:", err);

//     // Update transaction as failed
//     if (reference) {
//       await updateOne(
//         "Transaction",
//         { reference },
//         {
//           $set: {
//             transaction_status: "failed",
//             error_message: err.message,
//             failed_at: new Date(),
//           },
//         },
//       );
//     }

//     res.status(500).json({
//       status: false,
//       message: "Payment verification failed",
//       error: err.message,
//     });
//   }
// };


// ========== UPDATED initializePayment (receives reference from frontend) ==========
const initializePayment = async (req, res) => {
  try {
    const { farmeely_id, user_type, reference } = req.body; // reference comes from frontend
    const user_id = req.params.customer_id;
    const user_email = req.params.email;

    // Validate reference format (Paystack references are usually alphanumeric)
    if (!reference || reference.length < 10) {
      return res.status(400).json({ 
        message: "Valid payment reference is required from frontend" 
      });
    }

    // CRITICAL: Check if reference already exists in DB (prevent duplicate)
    const [existingTransaction] = await findQuery("Transaction", { reference });
    if (existingTransaction) {
      return res.status(409).json({ 
        message: "Payment reference already exists. Please generate a new one.",
        data: { existing_status: existingTransaction.transaction_status }
      });
    }

    // Get farmeely from main collection
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Find user in joined_users
    const userIndex = farmeely.joined_users.findIndex(u => u.user_id === user_id);
    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found in farmeely" });
    }

    const user = farmeely.joined_users[userIndex];
    
    // Check if already paid
    if (user.is_paid) {
      return res.status(400).json({ message: "Payment already completed" });
    }

    const amount = user.pending_amount;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "No pending payment found" });
    }

    // IMPORTANT: DO NOT call Paystack here
    // Just store the transaction with the reference frontend provided
    const transaction = await insertOne("Transaction", {
      farmeely_id,
      customer_id: user_id,
      customer_email: user_email,
      amount,
      reference: reference, // Store frontend-generated reference
      transaction_status: "pending", // Will be verified later
      payment_type: user_type, // 'creator' or 'member'
      metadata: {
        user_index: userIndex,
        pending_slots: user.pending_slots,
        user_type: user_type,
        delivery_city: user.delivery_city,
        delivery_fee: user.delivery_fee
      },
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to complete payment
    });

    return res.status(200).json({
      status: true,
      message: "Payment initialized. Waiting for verification.",
      data: {
        reference: reference,
        amount: amount,
        farmeely_id: farmeely_id,
        transaction_id: transaction.insertedId
      }
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return res.status(500).json({ 
      message: "Payment initialization failed", 
      error: error.message 
    });
  }
};

// ========== UPDATED verifyPayment (checks DB first, then Paystack) ==========
const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    // STEP 1: Check if reference exists in database
    const [transaction] = await findQuery("Transaction", { reference });
    
    if (!transaction) {
      return res.status(404).json({ 
        status: false,
        message: "Transaction reference not found. Please initialize payment first." 
      });
    }

    // STEP 2: Check if already verified
    if (transaction.transaction_status === "completed") {
      return res.status(400).json({ 
        status: false,
        message: "Transaction already verified and completed",
        data: { verified_at: transaction.verified_at }
      });
    }

    // STEP 3: Check if transaction expired
    if (transaction.expires_at && new Date() > new Date(transaction.expires_at)) {
      await updateOne("Transaction", { reference }, {
        $set: { 
          transaction_status: "expired",
          expired_at: new Date()
        }
      });
      
      return res.status(400).json({ 
        status: false,
        message: "Transaction has expired. Please create a new one." 
      });
    }

    // STEP 4: Verify with Paystack
    const response = await completePayment(reference);
    
    if (response.data.data.status !== "success") {
      // Update transaction as failed
      await updateOne("Transaction", { reference }, {
        $set: {
          transaction_status: "failed",
          failure_reason: response.data.data.gateway_response || "Payment not successful",
          failed_at: new Date(),
          payment_details: response.data.data
        }
      });
      
      return res.status(400).json({ 
        status: false,
        message: "Payment verification failed",
        data: { gateway_response: response.data.data.gateway_response }
      });
    }

    // STEP 5: Verify amount matches (security check)
    const verifiedAmount = response.data.data.amount / 100; // Convert from kobo
    if (verifiedAmount !== transaction.amount) {
      await updateOne("Transaction", { reference }, {
        $set: {
          transaction_status: "amount_mismatch",
          failure_reason: `Amount mismatch: Expected ${transaction.amount}, Got ${verifiedAmount}`,
          failed_at: new Date()
        }
      });
      
      return res.status(400).json({ 
        status: false,
        message: "Payment amount mismatch" 
      });
    }

    // STEP 6: Update the farmeely based on payment type
    const { farmeely_id, customer_id, metadata } = transaction;
    
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely) {
      throw new Error("Farmeely not found");
    }

    const user = farmeely.joined_users[metadata.user_index];
    if (!user || user.is_paid) {
      throw new Error("User already paid or not found");
    }

    // Update user as paid
    const updateOps = {
      $set: {
        [`joined_users.${metadata.user_index}.is_paid`]: true,
        [`joined_users.${metadata.user_index}.slots_joined`]: user.pending_slots,
        [`joined_users.${metadata.user_index}.amount_paid`]: user.pending_amount,
        [`joined_users.${metadata.user_index}.pending_slots`]: 0,
        [`joined_users.${metadata.user_index}.pending_amount`]: 0,
        [`joined_users.${metadata.user_index}.paid_at`]: new Date(),
        [`joined_users.${metadata.user_index}.payment_reference`]: reference
      },
      $inc: {
        slots_available: -user.pending_slots
      }
    };

    // If this is creator payment, activate the farmeely
    if (metadata.user_type === 'creator') {
      updateOps.$set.farmeely_status = FARMEELY_STATUS.inProgress;
      updateOps.$set.slot_status = ACTIVE_SLOT_STATUS.active;
      updateOps.$set.payment_status = "completed";
      updateOps.$set.activated_at = new Date();
    }

    await updateOne("Farmeely", { farmeely_id }, updateOps);

    // Update transaction as completed
    await updateOne("Transaction", { reference }, {
      $set: {
        transaction_status: "completed",
        verified_at: new Date(),
        payment_details: response.data.data
      }
    });

    // Check if farmeely is fully booked
    const [updatedFarmeely] = await findQuery("Farmeely", { farmeely_id });
    if (updatedFarmeely.slots_available === 0) {
      await updateOne("Farmeely", { farmeely_id }, {
        $set: { slot_status: ACTIVE_SLOT_STATUS.inactive }
      });
    }

    res.status(200).json({
      status: true,
      message: "Payment verified successfully",
      data: {
        farmeely_id,
        reference,
        amount: transaction.amount,
        payment_type: transaction.payment_type,
        verified_at: new Date()
      }
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    
    // Update transaction as failed if reference exists
    if (req.params.reference) {
      await updateOne("Transaction", { reference: req.params.reference }, {
        $set: {
          transaction_status: "verification_error",
          error_message: err.message,
          failed_at: new Date()
        }
      });
    }
    
    res.status(500).json({
      status: false,
      message: "Payment verification failed",
      error: err.message
    });
  }
};

// ========== NEW: Check transaction status endpoint ==========
const checkTransactionStatus = async (req, res) => {
  const { reference } = req.params;
  
  try {
    const [transaction] = await findQuery("Transaction", { reference });
    
    if (!transaction) {
      return res.status(404).json({ 
        status: false,
        message: "Transaction not found" 
      });
    }
    
    res.status(200).json({
      status: true,
      data: {
        reference: transaction.reference,
        status: transaction.transaction_status,
        amount: transaction.amount,
        payment_type: transaction.payment_type,
        created_at: transaction.created_at,
        verified_at: transaction.verified_at,
        farmeely_id: transaction.farmeely_id
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ========== UPDATED PAYMENT HANDLERS ==========

// Handler for creator's initial payment (now handles both staging and main)
const handleCreatePayment = async (
  farmeely_id,
  user_id,
  transaction,
  is_staging,
) => {
  if (is_staging) {
    // Handle staging creator payment - move from staging to main
    const [stagingFarmeely] = await findQuery("FarmeelyStaging", {
      farmeely_id,
    });

    if (!stagingFarmeely) {
      throw new Error("Staging farmeely not found");
    }

    const pendingSlots = stagingFarmeely.creator.pending_slots;
    const pendingAmount = stagingFarmeely.creator.pending_amount;

    if (pendingSlots <= 0 || pendingAmount <= 0) {
      throw new Error("No pending slots or amount found for creation payment");
    }

    // Calculate total slots taken after creator payment
    const totalSlotsTaken = pendingSlots;

    // Prepare main farmeely document
    const mainFarmeely = {
      farmeely_id: stagingFarmeely.farmeely_id,
      slot_id: stagingFarmeely.slot_id,
      product_id: stagingFarmeely.product_id,
      product_name: stagingFarmeely.product_name,
      address: stagingFarmeely.address,
      city: stagingFarmeely.city,
      expected_date: stagingFarmeely.expected_date,
      total_slots: stagingFarmeely.total_slots,
      delivery_fee: stagingFarmeely.delivery_fee,
      slots_available: stagingFarmeely.total_slots - totalSlotsTaken,
      price_per_slot: stagingFarmeely.price_per_slot,
      creator_amount: stagingFarmeely.creator_amount,
      slot_status:
        stagingFarmeely.total_slots - totalSlotsTaken === 0
          ? ACTIVE_SLOT_STATUS.inactive
          : ACTIVE_SLOT_STATUS.active,
      payment_status: "completed",
      farmeely_status: FARMEELY_STATUS.inProgress,
      created_at: new Date(),
      activated_at: new Date(),
      joined_users: [
        {
          user_id: stagingFarmeely.creator.user_id,
          user_email: stagingFarmeely.creator.user_email,
          is_creator: true,
          slots_joined: pendingSlots,
          pending_slots: 0,
          amount_paid: pendingAmount,
          pending_amount: 0,
          is_paid: true,
          joined_at: stagingFarmeely.creator.joined_at,
        },
      ],
      // Store reference to any pending joins for later processing
      pending_joins: stagingFarmeely.pending_joins || [],
    };

    // Insert into main Farmeely collection
    await insertOne("Farmeely", mainFarmeely);

    // Mark staging as completed (don't delete, just mark for history)
    await updateOne(
      "FarmeelyStaging",
      { farmeely_id },
      {
        $set: {
          status: "completed",
          completed_at: new Date(),
          main_farmeely_id: farmeely_id,
          is_creator_paid: true,
        },
      },
    );

    console.log(
      `✅ Creator payment processed: Farmeely ${farmeely_id} moved from staging to main`,
    );
  } else {
    // Handle existing main farmeely creator payment (though this shouldn't happen normally)
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely) throw new Error("Farmeely not found");

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user) throw new Error("User not found");

    const pendingSlots = user.pending_slots || 0;
    const pendingAmount = user.pending_amount || 0;

    const updateOperations = {
      $inc: {
        slots_available: -pendingSlots,
        "joined_users.$.slots_joined": pendingSlots,
        "joined_users.$.amount_paid": pendingAmount,
      },
      $set: {
        farmeely_status: FARMEELY_STATUS.inProgress,
        "joined_users.$.pending_slots": 0,
        "joined_users.$.pending_amount": 0,
        "joined_users.$.is_paid": true,
        payment_status: "completed",
        slot_status: ACTIVE_SLOT_STATUS.active,
        activated_at: new Date(),
      },
    };

    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      updateOperations,
    );
  }

  console.log(`✅ Create payment processed for farmeely ${farmeely_id}`);
};

// Handler for new member joining payment (handles both staging and main)
const handleJoinPayment = async (
  farmeely_id,
  user_id,
  transaction,
  is_staging,
) => {
  const { metadata } = transaction;

  if (is_staging) {
    // Case 1: User is joining a staging farmeely
    const [stagingFarmeely] = await findQuery("FarmeelyStaging", {
      farmeely_id,
      "pending_joins.user_id": user_id,
    });

    if (!stagingFarmeely) {
      throw new Error("Pending join not found in staging");
    }

    const pendingJoin = stagingFarmeely.pending_joins.find(
      (pj) => pj.user_id === user_id,
    );

    // Mark this pending join as paid in staging
    await updateOne(
      "FarmeelyStaging",
      {
        farmeely_id,
        "pending_joins.user_id": user_id,
      },
      {
        $set: {
          "pending_joins.$.is_paid": true,
          "pending_joins.$.paid_at": new Date(),
          "pending_joins.$.payment_reference": transaction.reference,
        },
      },
    );

    // Check if creator has already paid
    const updatedStaging = await findQuery("FarmeelyStaging", { farmeely_id });
    const isCreatorPaid = updatedStaging[0].is_creator_paid;

    if (isCreatorPaid) {
      // Creator already paid, move this user to main farmeely immediately
      const [mainFarmeely] = await findQuery("Farmeely", { farmeely_id });

      if (!mainFarmeely) {
        throw new Error(
          "Main farmeely not found - creator should have paid first",
        );
      }

      // Add user to main farmeely
      const newAvailableSlots =
        mainFarmeely.slots_available - pendingJoin.pending_slots;
      const newSlotStatus =
        newAvailableSlots === 0
          ? ACTIVE_SLOT_STATUS.inactive
          : ACTIVE_SLOT_STATUS.active;

      await updateWithOperators(
        "Farmeely",
        { farmeely_id },
        {
          $push: {
            joined_users: {
              user_id: pendingJoin.user_id,
              user_email: pendingJoin.user_email,
              is_creator: false,
              slots_joined: pendingJoin.pending_slots,
              pending_slots: 0,
              amount_paid: pendingJoin.pending_amount,
              pending_amount: 0,
              is_paid: true,
              joined_at: pendingJoin.joined_at,
              paid_at: new Date(),
            },
          },
          $inc: {
            slots_available: -pendingJoin.pending_slots,
          },
          $set: {
            slot_status: newSlotStatus,
          },
        },
      );

      // Remove from staging pending_joins
      await updateOne(
        "FarmeelyStaging",
        { farmeely_id },
        {
          $pull: {
            pending_joins: { user_id: user_id },
          },
        },
      );

      console.log(
        `✅ User ${user_id} moved from staging to main farmeely after payment`,
      );
    } else {
      console.log(
        `✅ User ${user_id} payment recorded in staging, waiting for creator payment`,
      );
    }
  } else {
    // Case 2: User is joining an existing main farmeely
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });
    if (!farmeely) throw new Error("Farmeely not found");

    const user = farmeely.joined_users.find((u) => u.user_id === user_id);
    if (!user) throw new Error("User not found in farmeely");

    const pendingSlots = user.pending_slots || 0;
    const pendingAmount = user.pending_amount || 0;

    const newAvailableSlots = farmeely.slots_available - pendingSlots;
    const newSlotStatus =
      newAvailableSlots === 0
        ? ACTIVE_SLOT_STATUS.inactive
        : ACTIVE_SLOT_STATUS.active;

    const updateOperations = {
      $inc: {
        slots_available: -pendingSlots,
        "joined_users.$.slots_joined": pendingSlots,
        "joined_users.$.amount_paid": pendingAmount,
      },
      $set: {
        "joined_users.$.pending_slots": 0,
        "joined_users.$.pending_amount": 0,
        "joined_users.$.is_paid": true,
        "joined_users.$.paid_at": new Date(),
        slot_status: newSlotStatus,
      },
    };

    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      updateOperations,
    );
  }

  console.log(
    `✅ Join payment processed for user ${user_id} in farmeely ${farmeely_id}`,
  );
};

// Handler for adding more slots (no changes needed - only applies to main farmeely)
const handleAddSlotsPayment = async (
  farmeely_id,
  user_id,
  transaction,
  is_staging,
) => {
  if (is_staging) {
    throw new Error("Cannot add slots to a staging farmeely");
  }

  const [farmeely] = await findQuery("Farmeely", { farmeely_id });
  if (!farmeely) throw new Error("Farmeely not found");

  const user = farmeely.joined_users.find((u) => u.user_id === user_id);
  if (!user) throw new Error("User not found in farmeely");

  const pendingAdditionalSlots = user.pending_additional_slots || 0;
  const pendingAdditionalAmount = user.pending_additional_amount || 0;

  if (pendingAdditionalSlots <= 0 || pendingAdditionalAmount <= 0) {
    throw new Error("No pending additional slots or amount found");
  }

  if (!user.is_paid) {
    throw new Error("User must be paid for existing slots before adding more");
  }

  const newAvailableSlots = farmeely.slots_available - pendingAdditionalSlots;
  const newSlotStatus =
    newAvailableSlots === 0
      ? ACTIVE_SLOT_STATUS.inactive
      : ACTIVE_SLOT_STATUS.active;

  const updateOperations = {
    $inc: {
      slots_available: -pendingAdditionalSlots,
      "joined_users.$.slots_joined": pendingAdditionalSlots,
      "joined_users.$.amount_paid": pendingAdditionalAmount,
    },
    $set: {
      "joined_users.$.pending_additional_slots": 0,
      "joined_users.$.pending_additional_amount": 0,
      "joined_users.$.has_pending_addition": false,
      slot_status: newSlotStatus,
    },
  };

  await updateOne(
    "Farmeely",
    { farmeely_id, "joined_users.user_id": user_id },
    updateOperations,
  );

  console.log(
    `✅ Additional slots payment processed: ${pendingAdditionalSlots} slots for user ${user_id}`,
  );
};

// Helper function to check if a staging farmeely is ready to be fully activated
const checkAndActivateStagingFarmeely = async (farmeely_id) => {
  const [staging] = await findQuery("FarmeelyStaging", { farmeely_id });

  if (!staging) return false;

  // Check if creator is paid
  if (!staging.is_creator_paid) return false;

  // Check if all pending joins are paid
  const allPendingJoinsPaid =
    staging.pending_joins?.every((pj) => pj.is_paid) ?? true;

  if (allPendingJoinsPaid && staging.pending_joins?.length > 0) {
    // Move all pending joins to main farmeely
    const [mainFarmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!mainFarmeely) return false;

    for (const pendingJoin of staging.pending_joins) {
      if (pendingJoin.is_paid) {
        const newAvailableSlots =
          mainFarmeely.slots_available - pendingJoin.pending_slots;

        await updateWithOperators(
          "Farmeely",
          { farmeely_id },
          {
            $push: {
              joined_users: {
                user_id: pendingJoin.user_id,
                user_email: pendingJoin.user_email,
                is_creator: false,
                slots_joined: pendingJoin.pending_slots,
                pending_slots: 0,
                amount_paid: pendingJoin.pending_amount,
                pending_amount: 0,
                is_paid: true,
                joined_at: pendingJoin.joined_at,
                paid_at: pendingJoin.paid_at,
              },
            },
            $inc: {
              slots_available: -pendingJoin.pending_slots,
            },
            $set: {
              slot_status:
                newAvailableSlots === 0
                  ? ACTIVE_SLOT_STATUS.inactive
                  : ACTIVE_SLOT_STATUS.active,
            },
          },
        );
      }
    }

    // Clear pending_joins from staging
    await updateOne(
      "FarmeelyStaging",
      { farmeely_id },
      {
        $set: { pending_joins: [] },
      },
    );
  }

  return true;
};

module.exports = {
  initializePayment,
  verifyPayment,
  handleCreatePayment,
  handleJoinPayment,
  handleAddSlotsPayment,
};



