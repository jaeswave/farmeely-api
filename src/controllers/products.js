const { findQuery, updateOne, insertOne } = require("../repository");
const { isEmpty } = require("../utils");
const { PRODUCT_CATEGORY_ID } = require("../enums/products");
const { v4: uuidv4 } = require("uuid");

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

const createProductRequest = async (req, res, next) => {
  const { product_name, note } = req.body;
  const user_id = req.params.customer_id;
  const user_email = req.params.email;

  try {
    if (!product_name || !product_name.trim()) {
      return res
        .status(400)
        .json({ message: "Please tell us what product you're looking for" });
    }

    const request_id = uuidv4();

    await insertOne("ProductRequests", {
      request_id,
      user_id,
      user_email,
      product_name: product_name.trim(),
      note: note?.trim() || null,
      status: "pending", // pending | reviewed | added
      created_at: new Date(),
    });

    return res.status(200).json({
      status: true,
      message: "Thanks! We've noted your request and will look into adding it.",
      data: { request_id },
    });
  } catch (err) {
    next(err);
  }
};

const getMyProductRequests = async (req, res, next) => {
  const user_id = req.params.customer_id;

  try {
    const requests = await findQuery("ProductRequests", { user_id });
    return res.status(200).json({
      status: true,
      data: requests.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getSingleProduct,
  updateProduct,
  getCategory,
  createProductRequest,
  getMyProductRequests,
};
