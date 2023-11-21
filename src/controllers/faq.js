const { findQuery, insertOne, updateOne, deleteOne } = require("../repository")
const { isEmpty } = require("../utils")
const { v4: uuidv4 } = require("uuid")

const createFaq = async (req, res, next) => {
  const { faq_body, title } = req.body
  try {
    const checkLengthOfFaq = await findQuery("Faq", {})
    if (faq_body.length > 50) {
      const err = new Error("The number of characters must no be more than 50")
      err.status = 400
      return next(err)
    } else if (checkLengthOfFaq.length >= 5) {
      const err = new Error("Faq cannot add more than 5 tables")
      err.status = 400
      return next(err)
    }
    await insertOne("Faq", {
      faq_id: uuidv4(),
      faq_body: faq_body,
      title: title,
    })

    res.status(201).json({
      status: true,
      message: "Question added successfully",
    })
  } catch (error) {
    next(error)
  }
}

const getFaq = async (req, res, next) => {
  try {
    const faq = await findQuery("Faq", {})

    res.status(201).json({
      status: true,
      message: "Questions successfully retrieved",
      data: faq,
    })
  } catch (error) {
    next(error)
  }
}

const updateFaq = async (req, res, next) => {
  const { id } = req.params
  try {
    const faqUpdate = await updateOne("Faq", { faq_id: id }, req.body)
    if (isEmpty(faqUpdate)) {
      const err = new Error("No Faq found")
      err.status = 400
      return next(err)
    }

    res.status(201).json({
      status: true,
      message: "FAQ updated successfully successfully",
    })
  } catch (error) {
    next(error)
  }
}

const deleteFaq = async (req, res, next) => {
  const { id } = req.params
  try {
    await deleteOne("Faq", { faq_id: id })
    res.status(201).json({
      status: true,
      message: "FAQ deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createFaq,
  getFaq,
  updateFaq,
  deleteFaq,
}
