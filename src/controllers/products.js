const { findQuery, updateOne } = require("../repository")
const { isEmpty } = require("../utils")
const { PRODUCT_CATEGORY_ID } = require("../enums/products")

const getAllProducts = async (req, res, next) => {

  try {
    const products = await findQuery("Products", {})

    const liveStock = products.filter(
      (product) =>
        product.category === PRODUCT_CATEGORY_ID.livestock_category
    )
    const farmProduce = products.filter(
      (product) =>
        product.category === PRODUCT_CATEGORY_ID.farmProduct_category
    )

    res.status(201).json({
      status: true,
      message: "Products fetched successfully ",
      products: {
        liveStock: liveStock,
        farmPrduce: farmProduce,
      },
    })
  } catch (error) {
    next(error)
  }
}
const getSingleProduct = async (req, res, next) => {
  const { id } = req.params

  try {
    const getProduct = await findQuery("Products", { product_id: id })
    if (isEmpty(getProduct)) {
      const err = new Error("Product not found")
      err.status = 400
      return next(err)
      }
      
      res.status(201).json({
        status: true,
        message: "Product fetched successfully",
        product: getProduct,
      })
  } catch (error) {
    next(error)
  }
}

const updateProduct = async (req, res, next) => {
  const { id } = req.params
   

  try {
    const product = await updateOne( "Products", { product_id: id }, req.body  )

    if (product.modifiedCount == 0 || product.matchedCount == 0) {
      const err = new Error("Product has not been updated")
      err.status = 400
      return next(err)
    }

    res.status(201).json({
      status: true,
      message: "Account updated successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllProducts,
  getSingleProduct,
  updateProduct,
}
