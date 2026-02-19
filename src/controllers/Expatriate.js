const {
  findQuery,
  insertOne,
  updateOne,
  updateWithOperators,
} = require("../repository");
const { messages } = require("../constants/messages");
const Expatriate = require("../models/Expatriate");

const { v4: uuidv4 } = require("uuid");

const submitCustomRequest = async (req, res, next) => {
  try {
    const {
      items,
      delivery_country,
      delivery_address,
      preferred_delivery_date,
    } = req.body;

    const user_id = req.params.customer_id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    const request_id = uuidv4();

    await insertOne("Expatriate", {
      request_id,
      customer_id: user_id,
      items: items.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        description: item.description || "",
        unit_price: 0,
        total_price: 0,
      })),
      currency: "NGN",
      subtotal: 0,
      shipping_fee: 0,
      total_amount: 0,
      delivery_country,
      delivery_address,
      preferred_delivery_date: preferred_delivery_date
        ? new Date(preferred_delivery_date)
        : null,
      status: "submitted",
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json({
      status: true,
      message: "Request submitted successfully",
      data: {
        request_id,
        status: "submitted",
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitCustomRequest,
};
