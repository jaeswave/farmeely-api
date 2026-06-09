const { v4: uuidv4 } = require("uuid");
const { isEmpty } = require("../utils");
const { messages } = require("../constants/messages");
const {
  findQuery,
  insertOne,
  updateOne,
  updateWithOperators,
} = require("../repository");
const { ObjectId } = require("mongodb");
const {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
  FARMEELY_STATUS,
} = require("../enums/farmeely");
const hello = 11111;
const PLATFORM_FEE_PERCENT = 0.1; // 10%

// const createFarmeely = async (req, res, next) => {
//   const { product_id } = req.params;
//   const { address, city, number_of_slot, expected_date } = req.body;

//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     const [product] = await findQuery("Products", {
//       product_id: Number(product_id),
//     });

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // ========== DUPLICATE CHECKS ==========

//     // Check 1: Does user already have a PENDING farmeely in staging for this product/city?
//     const [existingStaging] = await findQuery("FarmeelyStaging", {
//       product_id: Number(product_id),
//       city: city,
//       "creator.user_id": user_id,
//       status: "pending_payment",
//     });

//     if (existingStaging) {
//       return res.status(400).json({
//         message:
//           "You already have a pending farmeely group for this product in this city. Complete payment first.",
//         data: {
//           farmeely_id: existingStaging.farmeely_id,
//           status: "pending_payment",
//         },
//       });
//     }

//     // Check 2: Does user already have an ACTIVE farmeely in main collection for this product/city?
//     const [existingActive] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       city: city,
//       "joined_users.user_id": user_id,
//       "joined_users.is_creator": true,
//       farmeely_status: {
//         $in: [FARMEELY_STATUS.inProgress, FARMEELY_STATUS.groupCompleted],
//       },
//     });

//     if (existingActive) {
//       return res.status(400).json({
//         message:
//           "You already have an active farmeely group for this product in this city",
//         data: {
//           farmeely_id: existingActive.farmeely_id,
//           status: existingActive.farmeely_status,
//         },
//       });
//     }

//     // Check 3: Is there already an ACTIVE farmeely for this product/city that's accepting members?
//     // (Optional - depends on your business logic. Do you want to prevent multiple groups for same product/city?)
//     const [otherActiveFarmeely] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       city: city,
//       farmeely_status: FARMEELY_STATUS.inProgress,
//       slot_status: ACTIVE_SLOT_STATUS.active,
//     });

//     if (otherActiveFarmeely) {
//       // You can either block or just warn. Here we'll block to prevent fragmentation
//       return res.status(400).json({
//         message:
//           "An active farmeely group already exists for this product in this city. You can join that one instead.",
//         data: {
//           farmeely_id: otherActiveFarmeely.farmeely_id,
//         },
//       });
//     }

//     // ========== END DUPLICATE CHECKS ==========

//     // Check the city in the State db and get the delivery fee
//     const states = await findQuery("States");

//     const normalizedCity = city.toLowerCase();

//     const deliveryFee =
//       states
//         .flatMap((s) => s.cities)
//         .find((c) => c.name.toLowerCase() === normalizedCity)?.deliveryFee ?? 0;

//     const totalSlots = product.total_slots;
//     const creatorSlots = parseInt(number_of_slot);

//     if (creatorSlots <= 0 || creatorSlots > totalSlots) {
//       return res.status(400).json({ message: "Invalid slot count" });
//     }

//     const basePricePerSlot = Math.ceil(product.product_price / totalSlots);

//     const pricePerSlot = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );
//     const creatorAmount = pricePerSlot * creatorSlots + deliveryFee;

//     const farmeely_id = uuidv4();
//     const slot_id = uuidv4();

//     // Store in staging collection
//     await insertOne("FarmeelyStaging", {
//       farmeely_id,
//       slot_id,
//       product_id,
//       product_name: product.product_name,
//       address,
//       city,
//       expected_date,
//       total_slots: totalSlots,
//       delivery_fee: deliveryFee,
//       slots_available: totalSlots,
//       price_per_slot: pricePerSlot,
//       creator_amount: creatorAmount,
//       status: "pending_payment",
//       created_at: new Date(),
//       expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),

//       // Creator info
//       creator: {
//         user_id,
//         user_email,
//         pending_slots: creatorSlots,
//         pending_amount: creatorAmount,
//         joined_at: new Date(),
//       },

//       // Track people who want to join (before payment)
//       pending_joins: [],

//       // Track if creator has paid
//       is_creator_paid: false,
//     });

//     res.status(200).json({
//       status: true,
//       message: "Farmeely created. Complete payment to activate.",
//       data: {
//         farmeely_id: farmeely_id,
//         delivery_fee: deliveryFee,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// const joinFarmeely = async (req, res, next) => {
//   const { product_id, farmeely_id } = req.params;
//   const { city, number_of_slot } = req.body;

//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     // ========== DUPLICATE CHECKS FOR JOINING ==========

//     // Check if user already has a pending join in staging
//     const [existingStagingJoin] = await findQuery("FarmeelyStaging", {
//       product_id: Number(product_id),
//       city: city,
//       "pending_joins.user_id": user_id,
//       status: "pending_payment",
//     });

//     if (existingStagingJoin) {
//       return res.status(400).json({
//         message:
//           "You already have a pending join request for a farmeely in this city",
//         data: {
//           farmeely_id: existingStagingJoin.farmeely_id,
//         },
//       });
//     }

//     // Check if user has already joined a main farmeely for this product/city
//     const [existingMainJoin] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       farmeely_id: farmeely_id,
//       "joined_users.user_id": user_id,
//     });

//     if (existingMainJoin) {
//       return res.status(400).json({
//         message:
//           "You have already joined a farmeely group for this product in this city",
//         data: {
//           farmeely_id: existingMainJoin.farmeely_id,
//         },
//       });
//     }

//     // ========== END DUPLICATE CHECKS ==========

//     // First check if there's an active main farmeely
//     let [mainFarmeely] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       farmeelt_id: farmeely_id,
//       payment_status: "completed",
//       slot_status: ACTIVE_SLOT_STATUS.active,
//       farmeely_status: FARMEELY_STATUS.inProgress,
//     });

//     // If main farmeely exists, handle join directly to main
//     if (mainFarmeely) {
//       return await handleDirectJoinToMain(
//         mainFarmeely,
//         user_id,
//         user_email,
//         number_of_slot,
//         city,
//         res,
//       );
//     }

//     // If no main farmeely, check staging for pending farmeely
//     const [stagingFarmeely] = await findQuery("FarmeelyStaging", {
//       product_id: Number(product_id),
//       farmeely_id,
//       status: "pending_payment",
//     });

//     if (!stagingFarmeely) {
//       return res.status(404).json({
//         message:
//           "No active or pending farmeely group found in this city. You can create one!",
//       });
//     }

//     // Calculate available slots in staging
//     const creatorSlots = stagingFarmeely.creator.pending_slots;
//     const pendingJoinsTotal =
//       stagingFarmeely.pending_joins?.reduce(
//         (sum, join) => sum + (join.pending_slots || 0),
//         0,
//       ) || 0;

//     const availableSlots =
//       stagingFarmeely.total_slots - (creatorSlots + pendingJoinsTotal);

//     const slotsToJoin = parseInt(number_of_slot);

//     if (slotsToJoin <= 0 || slotsToJoin > availableSlots) {
//       return res.status(400).json({
//         message: `Invalid slot amount. Available slots: ${availableSlots}`,
//       });
//     }

//     const states = await findQuery("States");

//     const deliveryFee =
//       states
//         .flatMap((s) => s.cities)
//         .find((c) => c.name.toLowerCase() === city.toLowerCase())
//         ?.deliveryFee || 0;

//     const amountToPay =
//       slotsToJoin * stagingFarmeely.price_per_slot + deliveryFee;

//     // Add to pending_joins in staging
//     await updateWithOperators(
//       "FarmeelyStaging",
//       { farmeely_id: stagingFarmeely.farmeely_id },
//       {
//         $push: {
//           pending_joins: {
//             user_id,
//             user_email,
//             pending_slots: slotsToJoin,
//             pending_amount: amountToPay,
//             is_paid: false,
//             joined_at: new Date(),
//             delivery_city: city,
//             delivery_fee: deliveryFee,
//           },
//         },
//       },
//     );

//     return res.status(200).json({
//       status: true,
//       message: "Slots reserved. Complete payment to join.",
//       data: {
//         farmeely_id: stagingFarmeely.farmeely_id,
//         delivery_fee: DeliveryGee,
//         pending_slots: slotsToJoin,
//         amount: amountToPay,
//         note: "This farmeely is pending creator payment. You'll be added once creator pays.",
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// const createFarmeely = async (req, res, next) => {
//   const { product_id } = req.params;
//   const { address, city, number_of_slot, expected_date } = req.body;
//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     const [product] = await findQuery("Products", {
//       product_id: Number(product_id),
//     });
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     // DUPLICATE CHECKS
//     const [existingActive] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       city: city,
//       "joined_users.user_id": user_id,
//       "joined_users.is_creator": true,
//       farmeely_status: {
//         $in: [FARMEELY_STATUS.pending, FARMEELY_STATUS.inProgress],
//       },
//     });

//     if (existingActive) {
//       return res.status(400).json({
//         message: "You already have an active or pending farmeely",
//         data: { farmeely_id: existingActive.farmeely_id },
//       });
//     }

//     // Calculate fees
//     const states = await findQuery("States");
//     const normalizedCity = city.toLowerCase();
//     const deliveryFee =
//       states
//         .flatMap((s) => s.cities)
//         .find((c) => c.name.toLowerCase() === normalizedCity)?.deliveryFee ?? 0;

//     const totalSlots = product.total_slots;
//     const creatorSlots = parseInt(number_of_slot);

//     if (creatorSlots <= 0 || creatorSlots > totalSlots) {
//       return res.status(400).json({ message: "Invalid slot count" });
//     }

//     const basePricePerSlot = Math.ceil(product.product_price / totalSlots);
//     const pricePerSlot = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );
//     const creatorAmount = pricePerSlot * creatorSlots + deliveryFee;

//     const farmeely_id = uuidv4();
//     const slot_id = uuidv4();

//     // STORE DIRECTLY IN MAIN COLLECTION with pending status
//     await insertOne("Farmeely", {
//       farmeely_id,
//       slot_id,
//       product_id: Number(product_id),
//       product_name: product.product_name,
//       farmeely_status: FARMEELY_STATUS.pending,
//       address,
//       city,
//       expected_date,
//       total_slots: totalSlots,
//       delivery_fee: deliveryFee,
//       slots_available: totalSlots,
//       price_per_slot: pricePerSlot,
//       creator_amount: creatorAmount,

//       // Critical: Payment status tracking
//       payment_status: "pending", // 'pending' or 'completed'
//       farmeely_status: FARMEELY_STATUS.pending, // 'pending', 'inProgress', 'groupCompleted'
//       slot_status: ACTIVE_SLOT_STATUS.inactive, // Inactive until creator pays

//       created_at: new Date(),
//       expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h to pay

//       joined_users: [
//         {
//           user_id,
//           user_email,
//           is_creator: true,
//           slots_joined: 0, // Not confirmed until payment
//           pending_slots: creatorSlots,
//           amount_paid: 0,
//           pending_amount: creatorAmount,
//           is_paid: false,
//           delivery_city: city,
//           delivery_fee: deliveryFee,
//           joined_at: new Date(),
//         },
//       ],
//     });

//     res.status(200).json({
//       status: true,
//       message: "Farmeely created. Complete payment to activate.",
//       data: {
//         farmeely_id: farmeely_id,
//         amount_to_pay: creatorAmount,

//         // Send breakdown for frontend display
//         breakdown: {
//           product_name: product.product_name,
//           product_price: product.product_price,
//           total_slots: totalSlots,
//           your_slots: creatorSlots,
//           price_per_slot: pricePerSlot,
//           platform_fee_percentage: `${PLATFORM_FEE_PERCENT * 100}%`,
//           subtotal: pricePerSlot * creatorSlots,
//           delivery_fee: deliveryFee,
//           total: creatorAmount,
//         },
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

const createFarmeely = async (req, res, next) => {
  const { product_id } = req.params;
  const { address, city, number_of_slot, expected_date } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    const [product] = await findQuery("Products", {
      product_id: Number(product_id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check for existing farmeely (same as before)
    const [existingFarmeely] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      city: city,
      "joined_users.user_id": user_id,
      "joined_users.is_creator": true,
      farmeely_status: {
        $in: [FARMEELY_STATUS.pending, FARMEELY_STATUS.inProgress],
      },
    });

    if (existingFarmeely) {
      if (existingFarmeely.farmeely_status === FARMEELY_STATUS.inProgress) {
        return res.status(400).json({
          message: "You already have an ACTIVE farmeely in this city.",
          data: {
            farmeely_id: existingFarmeely.farmeely_id,
            status: "inProgress",
          },
        });
      } else if (existingFarmeely.farmeely_status === FARMEELY_STATUS.pending) {
        const isExpired =
          existingFarmeely.expires_at &&
          new Date() > new Date(existingFarmeely.expires_at);

        if (!isExpired) {
          const hoursLeft = Math.ceil(
            (new Date(existingFarmeely.expires_at) - new Date()) /
              (1000 * 60 * 60),
          );
          return res.status(400).json({
            message: `You have a PENDING farmeely. Please complete payment or wait ${hoursLeft} hours.`,
            data: {
              farmeely_id: existingFarmeely.farmeely_id,
              status: "pending",
            },
          });
        }
      }
    }

    // Check if user is already a MEMBER
    const [existingMemberFarmeely] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      city: city,
      "joined_users.user_id": user_id,
      "joined_users.is_creator": false,
      farmeely_status: FARMEELY_STATUS.inProgress,
    });

    if (existingMemberFarmeely) {
      return res.status(400).json({
        message: "You are already a MEMBER in an active farmeely in this city.",
      });
    }

    // Get delivery fee
    const states = await findQuery("States");
    const normalizedCity = city.toLowerCase();
    const cityData = states
      .flatMap((s) => s.cities)
      .find((c) => c.name.toLowerCase() === normalizedCity);

    const deliveryFee = cityData?.deliveryFee ?? 0;

    const totalSlots = product.total_slots;
    const creatorSlots = parseInt(number_of_slot);

    if (creatorSlots <= 0 || creatorSlots > totalSlots) {
      return res.status(400).json({
        message: `Invalid slot count. Must be between 1 and ${totalSlots}`,
      });
    }

    // ========== CALCULATIONS ==========

    // ========== CALCULATIONS ==========

    // 1. Base price per slot
    const basePricePerSlot = Math.ceil(product.product_price / totalSlots);

    // 2. FEE PERCENTAGE: 10% of the total price for ALL slots you're taking
    const totalSlotPrice = basePricePerSlot * creatorSlots; // Total price of all slots you're taking
    const feeAmount = Math.ceil(totalSlotPrice * 0.1); // 10% fee on total slot price

    // 3. OWNERSHIP PERCENTAGE: Based on slots out of total slots
    const ownershipPercentage = (creatorSlots / totalSlots) * 100;

    // 4. Calculate amounts
    const baseSubtotal = totalSlotPrice;
    const percentageFeeAmount = feeAmount; // This is now 10% of total slot price
    const creatorAmount = baseSubtotal + percentageFeeAmount + deliveryFee;

    // Log for debugging
    console.log(`=== CREATOR CALCULATION ===`);
    console.log(`Slots taken: ${creatorSlots} of ${totalSlots}`);
    console.log(
      `Fee percentage: ${feePercentagePerSlot}% per slot = ${totalFeePercentage}% total fee`,
    );
    console.log(
      `Ownership percentage: ${ownershipPercentage}% (${creatorSlots}/${totalSlots} slots)`,
    );
    console.log(`Base subtotal: ${baseSubtotal}`);
    console.log(`Fee amount (${totalFeePercentage}%): ${percentageFeeAmount}`);
    console.log(`Delivery fee: ${deliveryFee}`);
    console.log(`TOTAL: ${creatorAmount}`);

    const farmeely_id = uuidv4();
    const slot_id = uuidv4();

    await insertOne("Farmeely", {
      farmeely_id,
      slot_id,
      product_id: Number(product_id),
      product_name: product.product_name,
      product_price: product.product_price,
      product_image: product.product_image,
      description: product.description,
      category: product.category,

      // Percentage tracking
      fee_percentage_per_slot: product.percentage, // 10% fee per slot
      total_fee_percentage: totalFeePercentage, // 20% total fee for creator

      // Ownership tracking
      total_slots: totalSlots,
      ownership_percentage: ownershipPercentage, // 10% ownership for creator

      // Status fields
      farmeely_status: FARMEELY_STATUS.pending,
      payment_status: "pending",
      slot_status: ACTIVE_SLOT_STATUS.inactive,

      // Location and delivery
      address,
      city,
      delivery_fee: deliveryFee,

      // Slot and date information
      expected_date,
      slots_available: totalSlots - creatorSlots,

      // Price breakdown
      base_price_per_slot: basePricePerSlot,
      creator_amount: creatorAmount,

      // Fee breakdown
      fee_breakdown: {
        base_subtotal: baseSubtotal,
        fee_percentage_applied: totalFeePercentage,
        fee_amount: percentageFeeAmount,
        delivery_fee: deliveryFee,
        total: creatorAmount,
        calculation_formula: `(${basePricePerSlot} × ${creatorSlots}) + (${baseSubtotal} × ${totalFeePercentage}%) + ${deliveryFee} = ${creatorAmount}`,
      },

      // Timestamps
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      updated_at: new Date(),

      joined_users: [
        {
          user_id,
          user_email,
          is_creator: true,

          // Slot tracking
          slots_joined: 0,
          pending_slots: creatorSlots,

          // Payment tracking
          amount_paid: 0,
          pending_amount: creatorAmount,
          is_paid: false,

          // Percentage tracking (separate fee vs ownership)
          fee_percentage_charged: totalFeePercentage, // 20% fee
          ownership_percentage: ownershipPercentage, // 10% actual ownership

          // Fee breakdown for this user
          user_fee_breakdown: {
            base_amount: baseSubtotal,
            fee_percentage: totalFeePercentage,
            fee_amount: percentageFeeAmount,
            delivery_fee: deliveryFee,
            total: creatorAmount,
          },

          // Delivery
          delivery_city: city,
          delivery_fee: deliveryFee,

          // Timestamps
          joined_at: new Date(),

          // Additional slots tracking
          pending_additional_slots: 0,
          pending_additional_amount: 0,
          pending_additional_fee_percentage: 0,
          pending_additional_ownership: 0,
          has_pending_addition: false,
        },
      ],
    });

    res.status(200).json({
      status: true,
      message:
        "Farmeely created successfully! Complete payment within 24 hours to activate your group.",
      data: {
        farmeely_id: farmeely_id,
        amount_to_pay: creatorAmount,
        farmeely_status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),

        // Percentages breakdown
        percentages: {
          fee_per_slot: product.percentage, // 10%
          total_fee_percentage: totalFeePercentage, // 20%
          ownership_percentage: ownershipPercentage, // 10%
          slots_breakdown: `${creatorSlots} of ${totalSlots} slots (${ownershipPercentage}% ownership)`,
        },

        // Financial breakdown
        financial_breakdown: {
          product_name: product.product_name,
          your_slots: creatorSlots,
          base_price_per_slot: basePricePerSlot,
          base_subtotal: baseSubtotal,
          fee_percentage_applied: `${totalFeePercentage}%`,
          fee_amount: percentageFeeAmount,
          delivery_fee: deliveryFee,
          total: creatorAmount,
          calculation: `${baseSubtotal} + ${percentageFeeAmount} (${totalFeePercentage}% fee) + ${deliveryFee} = ${creatorAmount}`,
        },

        slots_remaining: totalSlots - creatorSlots,
      },
    });
  } catch (err) {
    console.error("Error creating farmeely:", err);
    next(err);
  }
};

// ========== JOIN FARMEELY ==========
const joinFarmeely = async (req, res, next) => {
  const { product_id, farmeely_id } = req.params;
  const { city, number_of_slot } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    // Find the farmeely (only allow joining if status is 'inProgress')
    const [farmeely] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      farmeely_id: farmeely_id,
      farmeely_status: FARMEELY_STATUS.inProgress, // Only active groups
    });

    if (!farmeely) {
      return res.status(404).json({
        message:
          "No active farmeely group found. Creator must complete payment first.",
      });
    }

    // Check if user already joined
    const alreadyJoined = farmeely.joined_users.some(
      (u) => u.user_id === user_id,
    );
    if (alreadyJoined) {
      return res.status(400).json({
        message: "You have already joined this farmeely",
      });
    }

    // Calculate available slots
    const slotsToJoin = parseInt(number_of_slot);
    const availableSlots = farmeely.slots_available;

    if (slotsToJoin <= 0 || slotsToJoin > availableSlots) {
      return res.status(400).json({
        message: `Invalid slot amount. Available: ${availableSlots}`,
      });
    }

    // Get delivery fee for joiner's city
    const states = await findQuery("States");
    const normalizedCity = city.toLowerCase();
    const cityData = states
      .flatMap((s) => s.cities)
      .find((c) => c.name.toLowerCase() === normalizedCity);

    const deliveryFee = cityData?.deliveryFee ?? 0;

    // ========== CALCULATIONS (Same pattern as create) ==========

    // 1. Base price per slot (from farmeely)
    // ========== CALCULATIONS (Same pattern as create) ==========

    // 1. Base price per slot (from farmeely)
    const basePricePerSlot = farmeely.base_price_per_slot;

    // 2. FEE PERCENTAGE: 10% of the total price for ALL slots you're taking
    const totalSlotPrice = basePricePerSlot * slotsToJoin; // Total price of all slots you're taking
    const feeAmount = Math.ceil(totalSlotPrice * 0.1); // 10% fee on total slot price

    // 3. OWNERSHIP PERCENTAGE: Based on slots out of total slots
    const ownershipPercentage = (slotsToJoin / farmeely.total_slots) * 100;

    // 4. Calculate amounts
    const baseSubtotal = totalSlotPrice;
    const percentageFeeAmount = feeAmount; // This is now 10% of total slot price
    const amountToPay = baseSubtotal + percentageFeeAmount + deliveryFee;

    // Log for debugging
    console.log(`=== JOINER CALCULATION ===`);
    console.log(`Slots joining: ${slotsToJoin} of ${farmeely.total_slots}`);
    console.log(
      `Fee percentage: ${feePercentagePerSlot}% per slot = ${totalFeePercentage}% total fee`,
    );
    console.log(
      `Ownership percentage: ${ownershipPercentage}% (${slotsToJoin}/${farmeely.total_slots} slots)`,
    );
    console.log(`Base subtotal: ${baseSubtotal}`);
    console.log(`Fee amount (${totalFeePercentage}%): ${percentageFeeAmount}`);
    console.log(`Delivery fee: ${deliveryFee}`);
    console.log(`TOTAL: ${amountToPay}`);

    // Calculate new slots available after join
    const newSlotsAvailable = farmeely.slots_available - slotsToJoin;
    const isFullyBooked = newSlotsAvailable === 0;

    // Add as pending member
    await updateWithOperators(
      "Farmeely",
      { farmeely_id },
      {
        $push: {
          joined_users: {
            user_id,
            user_email,
            is_creator: false,

            // Slot tracking
            slots_joined: 0,
            pending_slots: slotsToJoin,

            // Payment tracking
            amount_paid: 0,
            pending_amount: amountToPay,
            is_paid: false,

            // Percentage tracking (separate fee vs ownership)
            fee_percentage_charged: totalFeePercentage,
            ownership_percentage: ownershipPercentage,

            // Fee breakdown for this user
            user_fee_breakdown: {
              base_amount: baseSubtotal,
              fee_percentage: totalFeePercentage,
              fee_amount: percentageFeeAmount,
              delivery_fee: deliveryFee,
              total: amountToPay,
            },

            // Delivery
            delivery_city: city,
            delivery_fee: deliveryFee,

            // Timestamps
            joined_at: new Date(),

            // Additional slots tracking
            pending_additional_slots: 0,
            pending_additional_amount: 0,
            pending_additional_fee_percentage: 0,
            pending_additional_ownership: 0,
            has_pending_addition: false,
          },
        },
        $inc: {
          slots_available: -slotsToJoin, // Decrease available slots
        },
        $set: {
          // If fully booked, update slot status
          ...(isFullyBooked && {
            slot_status: ACTIVE_SLOT_STATUS.fullyBooked,
            farmeely_status: FARMEELY_STATUS.fullyBooked,
          }),
        },
      },
    );

    // If fully booked, also send notification (optional)
    if (isFullyBooked) {
      console.log(`🎉 Farmeely ${farmeely_id} is now FULLY BOOKED!`);
      // You can add notification logic here
    }

    res.status(200).json({
      status: true,
      message: isFullyBooked
        ? "You took the last slots! Group is now fully booked."
        : "Slots reserved. Complete payment to join.",
      data: {
        farmeely_id: farmeely_id,
        pending_slots: slotsToJoin,
        amount_to_pay: amountToPay,

        // Percentages breakdown
        percentages: {
          fee_per_slot: feePercentagePerSlot,
          total_fee_percentage: totalFeePercentage,
          ownership_percentage: ownershipPercentage,
          slots_breakdown: `${slotsToJoin} of ${farmeely.total_slots} slots (${ownershipPercentage}% ownership)`,
        },

        // Financial breakdown
        financial_breakdown: {
          product_name: farmeely.product_name,
          slots_requested: slotsToJoin,
          base_price_per_slot: basePricePerSlot,
          base_subtotal: baseSubtotal,
          fee_percentage_applied: `${totalFeePercentage}%`,
          fee_amount: percentageFeeAmount,
          delivery_fee: deliveryFee,
          total: amountToPay,
          calculation: `${baseSubtotal} + ${percentageFeeAmount} (${totalFeePercentage}% fee) + ${deliveryFee} = ${amountToPay}`,
        },

        // Group status after join
        group_status: {
          slots_remaining: newSlotsAvailable,
          is_fully_booked: isFullyBooked,
          farmeely_status: isFullyBooked ? "fullyBooked" : "inProgress",
          slot_status: isFullyBooked ? "fullyBooked" : "active",
        },
      },
    });
  } catch (err) {
    console.error("Error joining farmeely:", err);
    next(err);
  }
};

// ========== ADD MORE SLOTS (Same pattern) ==========
const addMoreSlots = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const { additional_slots } = req.body;
  const user_id = req.params.customer_id;

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Check if farmeely is active and not fully booked
    if (farmeely.farmeely_status !== FARMEELY_STATUS.inProgress) {
      return res.status(400).json({
        message: `Cannot add slots. Farmeely status: ${farmeely.farmeely_status}`,
      });
    }

    // Check if farmeely is fully booked
    if (farmeely.slots_available === 0) {
      return res.status(400).json({
        message: "Cannot add slots. Farmeely is fully booked.",
      });
    }

    // Find the user
    const userIndex = farmeely.joined_users.findIndex(
      (u) => u.user_id === user_id,
    );
    if (userIndex === -1) {
      return res
        .status(403)
        .json({ message: "You are not part of this farmeely" });
    }

    const user = farmeely.joined_users[userIndex];

    // User must have already paid for their existing slots
    if (!user.is_paid) {
      return res.status(400).json({
        message: "Complete your initial payment before adding more slots",
      });
    }

    // Check if user already has pending additional slots
    if (user.has_pending_addition) {
      return res.status(400).json({
        message:
          "You already have pending slot additions. Complete that payment first.",
      });
    }

    const slotsToAdd = Number(additional_slots);
    if (slotsToAdd <= 0) {
      return res.status(400).json({ message: "Must add at least 1 slot" });
    }

    // Check availability
    if (slotsToAdd > farmeely.slots_available) {
      return res.status(400).json({
        message: `Only ${farmeely.slots_available} slots available`,
      });
    }

    // ========== CALCULATIONS (Same pattern) ==========
    // ========== CALCULATIONS (Same pattern) ==========
    const basePricePerSlot = farmeely.base_price_per_slot;

    // 2. FEE PERCENTAGE: 10% of the total price for ADDITIONAL slots
    const totalSlotPrice = basePricePerSlot * slotsToAdd; // Total price of additional slots
    const feeAmount = Math.ceil(totalSlotPrice * 0.1); // 10% fee on total slot price

    // 3. Calculate amounts
    const baseSubtotal = totalSlotPrice;
    const percentageFeeAmount = feeAmount; // This is now 10% of total slot price
    const extraAmount = baseSubtotal + percentageFeeAmount; // No delivery fee for additional slotsadditional slots

    const newTotalSlots = user.slots_joined + slotsToAdd;
    const newTotalOwnership = (newTotalSlots / farmeely.total_slots) * 100;
    const newSlotsAvailable = farmeely.slots_available - slotsToAdd;
    const willBeFullyBooked = newSlotsAvailable === 0;

    // Reserve slots and update pending amounts
    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      {
        $set: {
          [`joined_users.${userIndex}.pending_additional_slots`]: slotsToAdd,
          [`joined_users.${userIndex}.pending_additional_amount`]: extraAmount,
          [`joined_users.${userIndex}.pending_additional_fee_percentage`]:
            totalFeePercentage,
          [`joined_users.${userIndex}.pending_additional_ownership`]:
            additionalOwnership,
          [`joined_users.${userIndex}.has_pending_addition`]: true,
        },
        $inc: {
          slots_available: -slotsToAdd,
        },
        $set: {
          ...(willBeFullyBooked && {
            slot_status: ACTIVE_SLOT_STATUS.fullyBooked,
            farmeely_status: FARMEELY_STATUS.fullyBooked,
          }),
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: willBeFullyBooked
        ? "Additional slots reserved! This will complete the group."
        : "Additional slots reserved. Please complete payment.",
      data: {
        payment_type: "add_slots",
        farmeely_id: farmeely.farmeely_id,

        // Current vs new
        current: {
          slots: user.slots_joined,
          ownership: user.ownership_percentage,
          amount_paid: user.amount_paid,
        },

        pending: {
          additional_slots: slotsToAdd,
          additional_fee_percentage: totalFeePercentage,
          additional_ownership: additionalOwnership,
          amount_to_pay: extraAmount,
        },

        after_payment: {
          total_slots: newTotalSlots,
          total_ownership: newTotalOwnership,
          total_amount: user.amount_paid + extraAmount,
        },

        // Percentages breakdown
        percentages: {
          fee_per_slot: feePercentagePerSlot,
          total_fee_percentage: totalFeePercentage,
          ownership_gain: additionalOwnership,
          total_ownership: newTotalOwnership,
        },

        // Financial breakdown
        financial_breakdown: {
          additional_slots: slotsToAdd,
          base_price_per_slot: basePricePerSlot,
          base_subtotal: baseSubtotal,
          fee_percentage_applied: `${totalFeePercentage}%`,
          fee_amount: percentageFeeAmount,
          total: extraAmount,
          calculation: `${baseSubtotal} + ${percentageFeeAmount} (${totalFeePercentage}% fee) = ${extraAmount}`,
        },

        group_status: {
          slots_remaining: newSlotsAvailable,
          will_be_fully_booked: willBeFullyBooked,
          farmeely_status: "pending",
        },
      },
    });
  } catch (err) {
    console.error("Error adding more slots:", err);
    next(err);
  }
};

// ========== CHECK SLOT COMPLETION/STATUS HELPER ==========
const checkFarmeelyCompletion = async (farmeely_id) => {
  const [farmeely] = await findQuery("Farmeely", { farmeely_id });

  if (!farmeely) return null;

  const totalSlots = farmeely.total_slots;
  const confirmedSlots = farmeely.joined_users
    .filter((u) => u.is_paid)
    .reduce((sum, u) => sum + u.slots_joined, 0);

  const pendingSlots = farmeely.joined_users
    .filter((u) => !u.is_paid)
    .reduce((sum, u) => sum + (u.pending_slots || 0), 0);

  const availableSlots = farmeely.slots_available;
  const totalReservedOrBooked = confirmedSlots + pendingSlots;

  const status = {
    farmeely_id,
    total_slots: totalSlots,
    confirmed_slots: confirmedSlots,
    pending_slots: pendingSlots,
    available_slots: availableSlots,
    total_reserved: totalReservedOrBooked,
    is_completed: confirmedSlots === totalSlots,
    is_fully_booked: totalReservedOrBooked === totalSlots,
    percentage_complete: (confirmedSlots / totalSlots) * 100,
    farmeely_status: farmeely.farmeely_status,
    slot_status: farmeely.slot_status,
  };

  // Auto-update status if completed
  if (
    confirmedSlots === totalSlots &&
    farmeely.farmeely_status !== FARMEELY_STATUS.completed
  ) {
    await updateOne(
      "Farmeely",
      { farmeely_id },
      {
        $set: {
          farmeely_status: FARMEELY_STATUS.completed,
          slot_status: ACTIVE_SLOT_STATUS.completed,
          completed_at: new Date(),
        },
      },
    );
    status.farmeely_status = FARMEELY_STATUS.completed;
    status.slot_status = ACTIVE_SLOT_STATUS.completed;
  }

  return status;
};

// ========== GET FARMEELY STATUS ENDPOINT ==========
const getFarmeelyStatus = async (req, res, next) => {
  const { farmeely_id } = req.params;

  try {
    const status = await checkFarmeelyCompletion(farmeely_id);

    if (!status) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    res.status(200).json({
      status: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
};

// const joinFarmeely = async (req, res, next) => {
//   const { product_id, farmeely_id } = req.params;
//   const { city, number_of_slot } = req.body;
//   const user_id = req.params.customer_id;
//   const user_email = req.params.email;

//   try {
//     // Find the farmeely (only active ones)
//     const [farmeely] = await findQuery("Farmeely", {
//       product_id: Number(product_id),
//       farmeely_id: farmeely_id,
//       farmeely_status: FARMEELY_STATUS.inProgress,
//     });

//     if (!farmeely) {
//       return res
//         .status(404)
//         .json({ message: "No active farmeely group found" });
//     }

//     // Check if user already joined
//     const alreadyJoined = farmeely.joined_users.some(
//       (u) => u.user_id === user_id,
//     );
//     if (alreadyJoined) {
//       return res
//         .status(400)
//         .json({ message: "You have already joined this farmeely" });
//     }

//     // Calculate available slots
//     const confirmedSlots = farmeely.joined_users
//       .filter((u) => u.is_paid)
//       .reduce((sum, u) => sum + u.slots_joined, 0);

//     const pendingSlotsTotal = farmeely.joined_users
//       .filter((u) => !u.is_paid)
//       .reduce((sum, u) => sum + (u.pending_slots || 0), 0);

//     const availableSlots =
//       farmeely.total_slots - (confirmedSlots + pendingSlotsTotal);
//     const slotsToJoin = parseInt(number_of_slot);

//     if (slotsToJoin <= 0 || slotsToJoin > availableSlots) {
//       return res
//         .status(400)
//         .json({ message: `Invalid slot amount. Available: ${availableSlots}` });
//     }

//     // Get delivery fee for their city
//     const states = await findQuery("States");
//     const deliveryFee =
//       states
//         .flatMap((s) => s.cities)
//         .find((c) => c.name.toLowerCase() === city.toLowerCase())
//         ?.deliveryFee || 0;

//     // Calculate base price per slot from original product price
//     const basePricePerSlot =
//       farmeely.total_product_price / farmeely.total_slots;

//     // Add platform fee for joiner
//     const pricePerSlotWithFee = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );

//     // Calculate total amount for joiner
//     const amountToPay = slotsToJoin * pricePerSlotWithFee + deliveryFee;

//     // Add as pending member
//     await updateWithOperators(
//       "Farmeely",
//       { farmeely_id },
//       {
//         $push: {
//           joined_users: {
//             user_id,
//             user_email,
//             is_creator: false,
//             slots_joined: 0,
//             pending_slots: slotsToJoin,
//             amount_paid: 0,
//             pending_amount: amountToPay,
//             is_paid: false,
//             delivery_city: city,
//             delivery_fee: deliveryFee,
//             joined_at: new Date(),
//           },
//         },
//       },
//     );

//     res.status(200).json({
//       status: true,
//       message: "Slots reserved. Complete payment to join.",
//       data: {
//         farmeely_id,
//         pending_slots: slotsToJoin,
//         amount_to_pay: amountToPay,
//         delivery_fee: deliveryFee,
//         breakdown: {
//           product_name: farmeely.product_name,
//           slots_requested: slotsToJoin,
//           base_price_per_slot: basePricePerSlot,
//           platform_fee_percent: PLATFORM_FEE_PERCENT * 100,
//           platform_fee_amount:
//             basePricePerSlot * PLATFORM_FEE_PERCENT * slotsToJoin,
//           price_per_slot_with_fee: pricePerSlotWithFee,
//           subtotal: slotsToJoin * pricePerSlotWithFee,
//           delivery_fee: deliveryFee,
//           total: amountToPay,
//         },
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// const addMoreSlots = async (req, res, next) => {
//   const { farmeely_id } = req.params;
//   const { additional_slots } = req.body;
//   const user_id = req.params.customer_id;
//   console.log("addMore Slots", additional_slots, typeof additional_slots);

//   try {
//     const [farmeely] = await findQuery("Farmeely", { farmeely_id });

//     if (!farmeely) {
//       return res.status(404).json({ message: "Farmeely not found" });
//     }

//     // Check farmeely status
//     if (farmeely.slot_status !== ACTIVE_SLOT_STATUS.active) {
//       return res.status(400).json({
//         message: "Cannot add slots to an inactive farmeely",
//       });
//     }

//     // Find the user
//     const user = farmeely.joined_users.find((u) => u.user_id === user_id);

//     if (!user) {
//       return res.status(403).json({
//         message: "You are not part of this farmeely",
//       });
//     }

//     // User must have already paid for their existing slots
//     if (!user.is_paid) {
//       return res.status(400).json({
//         message: "Complete your initial payment before adding more slots",
//       });
//     }

//     // Check if user already has pending additional slots
//     if (
//       (user.pending_additional_slots || 0) > 0 ||
//       (user.pending_additional_amount || 0) > 0
//     ) {
//       return res.status(400).json({
//         message:
//           "You already have a pending slot addition. Complete that payment first.",
//       });
//     }

//     const slotsToAdd = Number(additional_slots);
//     console.log("Type of additional_slots:", typeof additional_slots);
//     console.log("Slots to add:", typeof slotsToAdd, slotsToAdd);

//     if (slotsToAdd <= 0) {
//       return res.status(400).json({
//         message: "Must add at least 1 slot",
//       });
//     }

//     // Check availability
//     if (slotsToAdd > farmeely.slots_available) {
//       return res.status(400).json({
//         message: `Only ${farmeely.slots_available} slots available`,
//       });
//     }

//     // Calculate base price per slot from original product price
//     const basePricePerSlot =
//       farmeely.total_product_price / farmeely.total_slots;

//     // Add platform fee for additional slots
//     const pricePerSlotWithFee = Math.ceil(
//       basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
//     );

//     // Calculate extra amount with platform fee
//     const extraAmount = slotsToAdd * pricePerSlotWithFee;
//     console.log("Extra amount to pay:", typeof extraAmount, extraAmount);

//     // Reserve slots temporarily by marking them as pending
//     await updateOne(
//       "Farmeely",
//       { farmeely_id, "joined_users.user_id": user_id },
//       {
//         $set: {
//           "joined_users.$.pending_additional_slots": slotsToAdd,
//           "joined_users.$.pending_additional_amount": extraAmount,
//           "joined_users.$.has_pending_addition": true,
//         },
//       },
//     );

//     return res.status(200).json({
//       status: true,
//       message: "Additional slots reserved. Please complete payment.",
//       data: {
//         payment_type: "add_slots",
//         farmeely_id: farmeely.farmeely_id,
//         current_paid_slots: user.slots_joined,
//         pending_additional_slots: slotsToAdd,
//         total_slots_after_payment: user.slots_joined + slotsToAdd,
//         amount_to_pay: extraAmount,
//         user_type: user.is_creator ? "creator" : "member",
//         current_payment_status: "paid",
//         pending_payment_status: "pending",
//         breakdown: {
//           additional_slots: slotsToAdd,
//           base_price_per_slot: basePricePerSlot,
//           platform_fee_percent: PLATFORM_FEE_PERCENT * 100,
//           platform_fee_amount:
//             basePricePerSlot * PLATFORM_FEE_PERCENT * slotsToAdd,
//           price_per_slot_with_fee: pricePerSlotWithFee,
//           subtotal: slotsToAdd * pricePerSlotWithFee,
//           total: extraAmount,
//         },
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

const getSingleFarmeely = async (req, res, next) => {
  const { slot_id } = req.params;

  try {
    const [farmeelySlot] = await findQuery("Farmeely", {
      slot_id: slot_id,
    });

    if (!farmeelySlot) {
      const err = new Error("Farmeely not found");
      err.status = 400;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: farmeelySlot,
    });
  } catch (err) {
    next(err);
  }
};

const getAllFarmeely = async (req, res, next) => {
  try {
    const farmeelySlots = await findQuery("Farmeely");

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: farmeelySlots,
    });
  } catch (err) {
    next(err);
  }
};

const getFarmeelyOfUser = async (req, res, next) => {
  const user_id = req.params.customer_id;

  try {
    const farmeelySlots = await findQuery("Farmeely", {
      "joined_users.user_id": user_id,
    });

    const updatedFarmeely = await Promise.all(
      farmeelySlots.map(async (slot) => {
        const product = await findQuery("Products", {
          product_id: Number(slot.product_id),
        });

        const productImage = product[0].product_image;

        return {
          ...slot,
          product_image: productImage,
        };
      }),
    );

    res.status(200).json({
      status: true,
      message: "Successfully fetched Farmeely",
      data: updatedFarmeely,
    });
  } catch (err) {
    next(err);
  }
};

const getFeaturedFarmeelyByCity = async (req, res, next) => {
  try {
    const user_id = req.params.customer_id;

    const [userDetails] = await findQuery("Users", {
      customer_id: user_id,
    });

    if (!userDetails || userDetails.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1️⃣ Get user's city
    const userCities = userDetails.address.map((a) => a.city);

    const allFarmeely = await findQuery("Farmeely", {
      slot_status: "active",
      farmeely_status: FARMEELY_STATUS.inProgress,
    });

    console.log("User Cities:", userCities);
    console.log("Total active farmeely groups:", allFarmeely);

    const sameCity = [];
    const otherCities = [];

    allFarmeely.forEach((farmeely) => {
      if (userCities.includes(farmeely.city)) {
        sameCity.push(farmeely);
      } else {
        otherCities.push(farmeely);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        sameCity: sameCity,
        otherCities: otherCities,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllCities = async (req, res, next) => {
  try {
    const states = await findQuery("States");

    return res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFarmeely,
  joinFarmeely,
  addMoreSlots,
  getSingleFarmeely,
  getAllFarmeely,
  getFarmeelyOfUser,
  getFeaturedFarmeelyByCity,
  getAllCities,
};
