const { v4: uuidv4 } = require("uuid")
const { isEmpty } = require("../utils")
const { messages } = require("../constants/messages")
const { findQuery, insertOne } = require("../repository")
const { ObjectId } = require("mongodb")
const {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
} = require("../enums/farmeely")

const createFarmeely = async (req, res, next) => {
  const { product_id } = req.params
  const { location, number_of_slot } = req.body
  try {
    const [products] = await findQuery("Products", {
      _id: new ObjectId(product_id),
    })

    if (products?.product_price < MINIMUM_FARMEELY_PRICE?.price) {
      const err = new Error(messages.unableToFarmeely)
      err.status = 400
      return next(err)
    }

    const [farmeelyData] = await findQuery("Farmeely", { location: location })
   
    if (
      farmeelyData?.location === location &&
      farmeelyData?.slot_status === ACTIVE_SLOT_STATUS.active
    ) {
      const err = new Error(messages.activeFarmeely)
      err.status = 400
      return next(err)
    }

    const divideToGiveNumberOfSlots = Math.ceil(
      parseInt(products?.product_price) *
        MINIMUM_FARMEELY_PRICE?.quarterOfTheProductPrice
    )

    const numberOfSlotsCreated =
      parseInt(products?.product_price) / parseInt(divideToGiveNumberOfSlots)

    const number_of_slot_selected = parseInt(number_of_slot)
    const number_of_slot_available =
      numberOfSlotsCreated - number_of_slot_selected
    const amount = number_of_slot_selected * divideToGiveNumberOfSlots

    if (number_of_slot_available < 0) {
      const err = new Error(messages.numberOfSlotExceeded)
      err.status = 400
      return next(err)
    }

    const activeStatus =
      number_of_slot_available === 0
        ? ACTIVE_SLOT_STATUS.inactive
        : ACTIVE_SLOT_STATUS.active

    const slot_id = uuidv4()

    const slotValue = {
      slot_id: slot_id,
      location: location,
      number_of_slot_selected: number_of_slot_selected,
      number_of_slot_available: number_of_slot_available,
      amount_to_pay: amount,
      product_price: products?.product_price,
      product_name: products?.product_name,
      product_image: products?.product_image,
      slot_status: activeStatus,
    }

    await insertOne("Farmeely", slotValue)

    res.status(200).json({
      status: true,
      message: messages.slotCreated,
      data: slotValue,
    })
  } catch (err) {
    next(err)
  }
}

const joinFarmeely = async (req, res) => {
    const { product_id } = req.params
  try {
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createFarmeely,
  joinFarmeely,
}
