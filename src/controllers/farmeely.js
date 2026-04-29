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

    // ========== DUPLICATE CHECKS ==========

    // Check 1: Does user already have a PENDING farmeely in staging for this product/city?
    const [existingStaging] = await findQuery("FarmeelyStaging", {
      product_id: Number(product_id),
      city: city,
      "creator.user_id": user_id,
      status: "pending_payment",
    });

    if (existingStaging) {
      return res.status(400).json({
        message:
          "You already have a pending farmeely group for this product in this city. Complete payment first.",
        data: {
          farmeely_id: existingStaging.farmeely_id,
          status: "pending_payment",
        },
      });
    }

    // Check 2: Does user already have an ACTIVE farmeely in main collection for this product/city?
    const [existingActive] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      city: city,
      "joined_users.user_id": user_id,
      "joined_users.is_creator": true,
      farmeely_status: {
        $in: [FARMEELY_STATUS.inProgress, FARMEELY_STATUS.groupCompleted],
      },
    });

    if (existingActive) {
      return res.status(400).json({
        message:
          "You already have an active farmeely group for this product in this city",
        data: {
          farmeely_id: existingActive.farmeely_id,
          status: existingActive.farmeely_status,
        },
      });
    }

    // Check 3: Is there already an ACTIVE farmeely for this product/city that's accepting members?
    // (Optional - depends on your business logic. Do you want to prevent multiple groups for same product/city?)
    const [otherActiveFarmeely] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      city: city,
      farmeely_status: FARMEELY_STATUS.inProgress,
      slot_status: ACTIVE_SLOT_STATUS.active,
    });

    if (otherActiveFarmeely) {
      // You can either block or just warn. Here we'll block to prevent fragmentation
      return res.status(400).json({
        message:
          "An active farmeely group already exists for this product in this city. You can join that one instead.",
        data: {
          farmeely_id: otherActiveFarmeely.farmeely_id,
        },
      });
    }

    // ========== END DUPLICATE CHECKS ==========

    // Check the city in the State db and get the delivery fee
    const states = await findQuery("States");

    const normalizedCity = city.toLowerCase();

    const deliveryFee =
      states
        .flatMap((s) => s.cities)
        .find((c) => c.name.toLowerCase() === normalizedCity)?.deliveryFee ?? 0;

    const totalSlots = product.total_slots;
    const creatorSlots = parseInt(number_of_slot);

    if (creatorSlots <= 0 || creatorSlots > totalSlots) {
      return res.status(400).json({ message: "Invalid slot count" });
    }

    const basePricePerSlot = Math.ceil(product.product_price / totalSlots);

    const pricePerSlot = Math.ceil(
      basePricePerSlot * (1 + PLATFORM_FEE_PERCENT),
    );
    const creatorAmount = pricePerSlot * creatorSlots + deliveryFee;

    const farmeely_id = uuidv4();
    const slot_id = uuidv4();

    // Store in staging collection
    await insertOne("FarmeelyStaging", {
      farmeely_id,
      slot_id,
      product_id,
      product_name: product.product_name,
      address,
      city,
      expected_date,
      total_slots: totalSlots,
      delivery_fee: deliveryFee,
      slots_available: totalSlots,
      price_per_slot: pricePerSlot,
      creator_amount: creatorAmount,
      status: "pending_payment",
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),

      // Creator info
      creator: {
        user_id,
        user_email,
        pending_slots: creatorSlots,
        pending_amount: creatorAmount,
        joined_at: new Date(),
      },

      // Track people who want to join (before payment)
      pending_joins: [],

      // Track if creator has paid
      is_creator_paid: false,
    });

    res.status(200).json({
      status: true,
      message: "Farmeely created. Complete payment to activate.",
      data: {
        farmeely_id: farmeely_id,
        delivery_fee: deliveryFee,
      },
    });
  } catch (err) {
    next(err);
  }
};

const joinFarmeely = async (req, res, next) => {
  const { farmeely_id,product_id } = req.params;
  const { city, number_of_slot } = req.body;

  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    // ========== DUPLICATE CHECKS FOR JOINING ==========

    // Check if user already has a pending join in staging
    const [existingStagingJoin] = await findQuery("FarmeelyStaging", {
      product_id: Number(product_id),
      city: city,
      "pending_joins.user_id": user_id,
      status: "pending_payment",
    });

    if (existingStagingJoin) {
      return res.status(400).json({
        message:
          "You already have a pending join request for a farmeely in this city",
        data: {
          farmeely_id: existingStagingJoin.farmeely_id,
        },
      });
    }

    // Check if user has already joined a main farmeely for this product/city
    const [existingMainJoin] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      farmeely_id: farmeely_id,
      "joined_users.user_id": user_id,
    });

    if (existingMainJoin) {
      return res.status(400).json({
        message:
          "You have already joined a farmeely group for this product in this city",
        data: {
          farmeely_id: existingMainJoin.farmeely_id,
        },
      });
    }

    // ========== END DUPLICATE CHECKS ==========

    // First check if there's an active main farmeely
    let [mainFarmeely] = await findQuery("Farmeely", {
      product_id: Number(product_id),
      farmeelt_id: farmeely_id,
      payment_status: "completed",
      slot_status: ACTIVE_SLOT_STATUS.active,
      farmeely_status: FARMEELY_STATUS.inProgress,
    });

    // If main farmeely exists, handle join directly to main
    if (mainFarmeely) {
      return await handleDirectJoinToMain(
        mainFarmeely,
        user_id,
        user_email,
        number_of_slot,
        city,
        res,
      );
    }

    // If no main farmeely, check staging for pending farmeely
    const [stagingFarmeely] = await findQuery("FarmeelyStaging", {
      product_id: Number(product_id),
      farmeely_id,
      status: "pending_payment",
    });

    if (!stagingFarmeely) {
      return res.status(404).json({
        message:
          "No active or pending farmeely group found in this city. You can create one!",
      });
    }

    // Calculate available slots in staging
    const creatorSlots = stagingFarmeely.creator.pending_slots;
    const pendingJoinsTotal =
      stagingFarmeely.pending_joins?.reduce(
        (sum, join) => sum + (join.pending_slots || 0),
        0,
      ) || 0;

    const availableSlots =
      stagingFarmeely.total_slots - (creatorSlots + pendingJoinsTotal);

    const slotsToJoin = parseInt(number_of_slot);

    if (slotsToJoin <= 0 || slotsToJoin > availableSlots) {
      return res.status(400).json({
        message: `Invalid slot amount. Available slots: ${availableSlots}`,
      });
    }

    const states = await findQuery("States");

    const deliveryFee =
      states
        .flatMap((s) => s.cities)
        .find((c) => c.name.toLowerCase() === city.toLowerCase())
        ?.deliveryFee || 0;

    const amountToPay =
      slotsToJoin * stagingFarmeely.price_per_slot +
      deliveryFee;

    // Add to pending_joins in staging
    await updateWithOperators(
      "FarmeelyStaging",
      { farmeely_id: stagingFarmeely.farmeely_id },
      {
        $push: {
          pending_joins: {
            user_id,
            user_email,
            pending_slots: slotsToJoin,
            pending_amount: amountToPay,
            is_paid: false,
            joined_at: new Date(),
            delivery_city: city,
            delivery_fee: deliveryFee,
          },
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: "Slots reserved. Complete payment to join.",
      data: {
        farmeely_id: stagingFarmeely.farmeely_id,
        delivery_fee: DeliveryGee,
        pending_slots: slotsToJoin,
        amount: amountToPay,
        note: "This farmeely is pending creator payment. You'll be added once creator pays.",
      },
    });
  } catch (err) {
    next(err);
  }
};

const addMoreSlots = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const { additional_slots } = req.body;
  const user_id = req.params.customer_id;
  console.log("addMore SLots", additional_slots, typeof additional_slots);

  try {
    const [farmeely] = await findQuery("Farmeely", { farmeely_id });

    if (!farmeely) {
      return res.status(404).json({ message: "Farmeely not found" });
    }

    // Check farmeely status
    if (farmeely.slot_status !== ACTIVE_SLOT_STATUS.active) {
      return res.status(400).json({
        message: "Cannot add slots to an inactive farmeely",
      });
    }

    // Find the user
    const user = farmeely.joined_users.find((u) => u.user_id === user_id);

    if (!user) {
      return res.status(403).json({
        message: "You are not part of this farmeely",
      });
    }

    // User must have already paid for their existing slots
    if (!user.is_paid) {
      return res.status(400).json({
        message: "Complete your initial payment before adding more slots",
      });
    }

    // Check if user already has pending additional slots
    if (
      (user.pending_additional_slots || 0) > 0 ||
      (user.pending_additional_amount || 0) > 0
    ) {
      return res.status(400).json({
        message:
          "You already have a pending slot addition. Complete that payment first.",
      });
    }

    const slotsToAdd = Number(additional_slots);
    console.log("Type of additional_slots:", typeof additional_slots);
    console.log("Slots to add:", typeof slotsToAdd, slotsToAdd);

    if (slotsToAdd <= 0) {
      return res.status(400).json({
        message: "Must add at least 1 slot",
      });
    }

    // Check availability
    if (slotsToAdd > farmeely.slots_available) {
      return res.status(400).json({
        message: `Only ${farmeely.slots_available} slots available`,
      });
    }

    const extraAmount = slotsToAdd * Number(farmeely.price_per_slot);
    console.log("Extra amount to pay:", typeof extraAmount, extraAmount);

    // Reserve slots temporarily by marking them as pending
    // DO NOT mark is_paid as false - user is still paid for existing slots
    await updateOne(
      "Farmeely",
      { farmeely_id, "joined_users.user_id": user_id },
      {
        $set: {
          "joined_users.$.pending_additional_slots": slotsToAdd,
          "joined_users.$.pending_additional_amount": extraAmount,
          "joined_users.$.has_pending_addition": true,
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: "Additional slots reserved. Please complete payment.",
      data: {
        payment_type: "add_slots",
        farmeely_id: farmeely.farmeely_id,
        current_paid_slots: user.slots_joined,
        pending_additional_slots: slotsToAdd,
        total_slots_after_payment: user.slots_joined + slotsToAdd,
        amount_to_pay: extraAmount,
        user_type: user.is_creator ? "creator" : "member",
        current_payment_status: "paid", // For existing slots
        pending_payment_status: "pending", // For additional slots
      },
    });
  } catch (err) {
    next(err);
  }
};

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

//end point for loading state and city
const getAllStates = async (req, res, next) => {
  try {
    // const states = await findQuery("States");
    // const cities = await findQuery("Cities");

    const data = {
      lagos: [{ city: "ikeja", delivery: 5000 }],
      abuja: ["Garki", "Wuse", "Maitama"],
      kano: ["Nassarawa", "Fagge", "Gwale"],
    };

    res.status(200).json({
      status: true,
      message: "Successfully fetched states and cities",
      data: {
        states: states,
        cities: cities,
      },
    });
  } catch (err) {
    next(err);
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
  getAllStates,
};
