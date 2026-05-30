const { findQuery, updateOne } = require("../repository");
const { isEmpty } = require("../utils");
const { PRODUCT_CATEGORY_ID } = require("../enums/products");

//create product

const getAllProducts = async (req, res, next) => {
  try {
    const products = await findQuery("Products", {});

    res.status(201).json({
      status: true,
      message: "Products fetched successfully ",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};
const getSingleProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const getProduct = await findQuery("Products", { product_id: id });
    if (isEmpty(getProduct)) {
      const err = new Error("Product not found");
      err.status = 400;
      return next(err);
    }

    res.status(201).json({
      status: true,
      message: "Product fetched successfully",
      product: getProduct,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await updateOne("Products", { product_id: id }, req.body);

    if (product.modifiedCount == 0 || product.matchedCount == 0) {
      const err = new Error("Product has not been updated");
      err.status = 400;
      return next(err);
    }

    res.status(201).json({
      status: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const products = await findQuery("Products", {});

    // Hardcoded descriptions for now (you can move to database later)
    const categoryDescriptions = {
      livestock: "Cattle, goats, and other animals",
      "farm-produce": "Fruits, vegetables, and crops",
      poultry: "Chicken, turkey, and eggs",
      fish: "Fresh and frozen seafood",
      grains: "Rice, beans, and grains",
      Uncategorized: "Other products",
    };

    // Group products by category
    const categoryMap = new Map();

    products.forEach((product) => {
      const categoryName = product.category || "Uncategorized";

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }

      categoryMap.get(categoryName).push(product);
    });

    // Transform into the format with title and description
    const categories = Array.from(categoryMap, ([title, products]) => ({
      title: title,
      description: categoryDescriptions[title] || "Various products available",
      products: products,
    }));

    res.status(200).json({
      status: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getSingleProduct,
  updateProduct,
  getCategory,
};
