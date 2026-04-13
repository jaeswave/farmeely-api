// controllers/adminController.js
const { findQuery, updateOne, insertOne } = require("../repository");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { isEmpty } = require("../utils");
const { messages } = require("../constants/messages");
const { sendNotificationToAllCustomers } = require("../services/push");



// Admin login
const adminLogin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if admin exists in Admins collection
    const admin = await findQuery("Admins", { email: email });

    if (isEmpty(admin)) {
      const err = new Error(messages.invalidLogin);
      err.status = 400;
      return next(err);
    }

    const adminData = admin[0];

    // Verify admin is active
    if (!adminData.isActive) {
      const err = new Error("Account deactivated. Contact super admin.");
      err.status = 403;
      return next(err);
    }

    // Compare password
    const comparePassword = await bcrypt.compare(
      password,
      adminData.password_hash,
    );

    if (!comparePassword) {
      const err = new Error(messages.invalidLogin);
      err.status = 400;
      return next(err);
    }

    // Create payload for JWT
    const payload = {
      id: adminData._id,
      email: adminData.email,
      role: adminData.role,
      fullname: adminData.fullname,
    };

    // Update last login
    await updateOne(
      "Admins",
      { email: email },
      { $set: { last_login: new Date() } }, // Added $set
    );

    // Generate token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || "keep-secret-secure123#",
      { expiresIn: process.env.JWT_EXPIRES_TIME || "24h" },
      (err, token) => {
        if (err) {
          return next(err);
        }

        // Remove sensitive data
        delete adminData.password_hash;

        res.status(200).json({
          status: true,
          message: "Admin login successful",
          token: token,
          data: {
            id: adminData._id,
            fullname: adminData.fullname,
            email: adminData.email,
            role: adminData.role,
          },
        });
      },
    );
  } catch (err) {
    next(err);
  }
};

// Create admin user (super admin only)
const createAdmin = async (req, res, next) => {
  const { fullname, email, password, role = "admin" } = req.body;

  // Check if requesting user is super_admin
  if (req.admin.role !== "super_admin") {
    return res.status(403).json({
      status: false,
      message: "Only super admin can create new admins",
    });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await findQuery("Admins", { email: email });

    if (!isEmpty(existingAdmin)) {
      return res.status(400).json({
        status: false,
        message: "Admin with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const adminData = {
      fullname,
      email,
      password_hash,
      role: role,
      isActive: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await insertOne("Admins", adminData);

    res.status(201).json({
      status: true,
      message: "Admin user created successfully",
      data: {
        id: result.insertedId,
        email: email,
        role: role,
        fullname: fullname,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all admins (super admin only)
const getAllAdmins = async (req, res, next) => {
  if (req.admin.role !== "super_admin") {
    return res.status(403).json({
      status: false,
      message: "Only super admin can view all admins",
    });
  }

  try {
    const admins = await findQuery("Admins", {});

    // Remove sensitive data
    const safeAdmins = admins.map((admin) => {
      delete admin.password_hash;
      return admin;
    });

    res.status(200).json({
      status: true,
      message: "Admins retrieved successfully",
      data: safeAdmins,
    });
  } catch (err) {
    next(err);
  }
};

// Dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    // Get all collections counts
    const users = await findQuery("Users", {});
    const products = await findQuery("Products", {});
    const farmeelyGroups = await findQuery("Farmeely", {});
    const farmeelyStaging = await findQuery("FarmeelyStaging", {});
    const expatriateRequests = await findQuery("Expatriate", {});

    // Get pending farmeely groups
    const pendingFarmeely = farmeelyStaging.filter(
      (f) => f.status === "pending_payment",
    ).length;

    // Get active farmeely groups
    const activeFarmeely = farmeelyGroups.filter(
      (f) => f.farmeely_status === "inProgress" && f.slot_status === "active",
    ).length;

    // Get completed farmeely groups
    const completedFarmeely = farmeelyGroups.filter(
      (f) => f.farmeely_status === "groupCompleted",
    ).length;

    // Calculate total revenue
    const totalRevenue = farmeelyGroups
      .filter((f) => f.farmeely_status === "groupCompleted")
      .reduce((sum, group) => sum + (group.total_amount || 0), 0);

    // Get recent users (last 5)
    const recentUsers = users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((user) => ({
        id: user.customer_id || user._id,
        email: user.email,
        fullname: user.fullname,
        created_at: user.created_at,
        isOtpVerified: user.isOtpVerified,
        phoneNumber: user.phoneNumber,
      }));

    res.status(200).json({
      status: true,
      message: "Dashboard statistics retrieved successfully",
      data: {
        overview: {
          total_users: users.length,
          total_products: products.length,
          total_farmeely_groups: farmeelyGroups.length,
          total_expatriate_requests: expatriateRequests.length,
          pending_farmeely: pendingFarmeely,
          active_farmeely: activeFarmeely,
          completed_farmeely: completedFarmeely,
          total_revenue: totalRevenue,
        },
        recent_users: recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isVerified } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullname: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (isVerified !== undefined) {
      filter.isOtpVerified = isVerified === "true";
    }

    const users = await findQuery("Users", filter);

    // Apply pagination
    const paginatedUsers = users.slice(skip, skip + parseInt(limit));

    // Remove sensitive data
    const safeUsers = paginatedUsers.map((user) => {
      delete user.password_hash;
      delete user.password_salt;
      return user;
    });

    res.status(200).json({
      status: true,
      message: "Users retrieved successfully",
      data: {
        users: safeUsers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(users.length / parseInt(limit)),
          total_users: users.length,
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get single user details
const getUserDetails = async (req, res, next) => {
  const { user_id } = req.params;

  try {
    const user = await findQuery("Users", { customer_id: user_id });

    if (isEmpty(user)) {
      const err = new Error("User not found");
      err.status = 404;
      return next(err);
    }

    const userData = user[0];

    // Get user's farmeely groups
    const farmeelyGroups = await findQuery("Farmeely", {
      "joined_users.user_id": user_id,
    });

    // Get user's expatriate requests
    const expatriateRequests = await findQuery("Expatriate", {
      customer_id: user_id,
    });

    // Calculate total spent
    const totalSpent = farmeelyGroups.reduce((sum, group) => {
      const userInGroup = group.joined_users.find((u) => u.user_id === user_id);
      return sum + (userInGroup?.total_paid || 0);
    }, 0);

    res.status(200).json({
      status: true,
      message: "User details retrieved successfully",
      data: {
        user: {
          ...userData,
          password_hash: undefined,
          password_salt: undefined,
        },
        stats: {
          total_farmeely_joined: farmeelyGroups.length,
          total_expatriate_requests: expatriateRequests.length,
          total_spent: totalSpent,
        },
        farmeely_groups: farmeelyGroups,
        expatriate_requests: expatriateRequests,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Update user status
const updateUserStatus = async (req, res, next) => {
  const { user_id } = req.params;
  const { isVerified, isBlocked } = req.body;

  try {
    const updateData = {};
    if (isVerified !== undefined) updateData.isOtpVerified = isVerified;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    const result = await updateOne(
      "Users",
      { customer_id: user_id },
      updateData,
    );

    if (result.modifiedCount === 0 && result.matchedCount === 0) {
      const err = new Error("User not found or no changes made");
      err.status = 404;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "User status updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Get all farmeely groups
const getAllFarmeelyGroups = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, city } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (status) filter.farmeely_status = status;
    if (city) filter.city = { $regex: city, $options: "i" };

    const farmeelyGroups = await findQuery("Farmeely", filter);

    // Sort by created_at desc
    const sortedGroups = farmeelyGroups.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    // Apply pagination
    const paginatedGroups = sortedGroups.slice(skip, skip + parseInt(limit));

    // Add stats for each group
    const groupsWithStats = paginatedGroups.map((group) => ({
      ...group,
      total_slots_filled:
        group.joined_users?.reduce(
          (sum, user) => sum + (user.slots_joined || 0),
          0,
        ) || 0,
      total_participants: group.joined_users?.length || 0,
    }));

    const pendingStaging = await findQuery("FarmeelyStaging", {
      status: "pending_payment",
    });

    res.status(200).json({
      status: true,
      message: "Farmeely groups retrieved successfully",
      data: {
        groups: groupsWithStats,
        pending_staging_count: pendingStaging.length,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(farmeelyGroups.length / parseInt(limit)),
          total_groups: farmeelyGroups.length,
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get single farmeely group details
const getFarmeelyGroupDetails = async (req, res, next) => {
  const { farmeely_id } = req.params;

  try {
    const farmeely = await findQuery("Farmeely", { farmeely_id });

    if (isEmpty(farmeely)) {
      const err = new Error("Farmeely group not found");
      err.status = 404;
      return next(err);
    }

    const farmeelyData = farmeely[0];

    // Get product details
    const product = await findQuery("Products", {
      product_id: Number(farmeelyData.product_id),
    });

    res.status(200).json({
      status: true,
      message: "Farmeely group details retrieved successfully",
      data: {
        ...farmeelyData,
        product_details: product[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all products (admin view)
const getAllProductsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await findQuery("Products", filter);

    // Apply pagination
    const paginatedProducts = products.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: true,
      message: "Products retrieved successfully",
      data: {
        products: paginatedProducts,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(products.length / parseInt(limit)),
          total_products: products.length,
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all expatriate requests
const getAllExpatriateRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, customer_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (status) filter.status = status;
    if (customer_id) filter.customer_id = customer_id;

    const requests = await findQuery("Expatriate", filter);

    // Sort by created_at desc
    const sortedRequests = requests.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    // Apply pagination
    const paginatedRequests = sortedRequests.slice(
      skip,
      skip + parseInt(limit),
    );

    res.status(200).json({
      status: true,
      message: "Expatriate requests retrieved successfully",
      data: {
        requests: paginatedRequests,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(requests.length / parseInt(limit)),
          total_requests: requests.length,
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Update expatriate request status
const updateExpatriateRequestStatus = async (req, res, next) => {
  const { request_id } = req.params;
  const { status, notes } = req.body;

  try {
    const result = await updateOne(
      "Expatriate",
      { request_id: request_id },
      {
        status: status,
        admin_notes: notes,
        updated_at: new Date(),
      },
    );

    if (result.modifiedCount === 0 && result.matchedCount === 0) {
      const err = new Error("Request not found");
      err.status = 404;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Request status updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Get admin profile
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await findQuery("Admins", {
      email: req.admin.email,
    });

    if (isEmpty(admin)) {
      const err = new Error("Admin not found");
      err.status = 404;
      return next(err);
    }

    const adminData = admin[0];
    delete adminData.password_hash;

    res.status(200).json({
      status: true,
      message: "Admin profile retrieved successfully",
      data: adminData,
    });
  } catch (err) {
    next(err);
  }
};

// Get OTP Verified Enum
const getOtpVerifiedEnums = async (req, res, next) => {
  try {
    res.status(200).json({
      status: true,
      message: "OTP verified enums retrieved successfully",
      data: [true, false],
    });
  } catch (err) {
    next(err);
  }
};

// Farmeely
const getFarmeelyStatusEnums = (req, res) => {
  res.json({
    status: true,
    data: ["in_progress", "group_completed", "processing", "completed"],
  });
};

const getSlotStatusEnums = (req, res) => {
  res.json({ status: true, data: ["active", "inactive"] });
};

const getPaymentStatusEnums = (req, res) => {
  res.json({ status: true, data: ["pending", "completed"] });
};

// Expatriate
const getExpatriateStatusEnums = (req, res) => {
  res.json({
    status: true,
    data: ["pending", "paid", "shipped", "delivered", "cancelled"],
  });
};

// Orders
const getOrderStatusEnums = (req, res) => {
  res.json({
    status: true,
    data: ["pending", "in progress", "completed", "cancelled"],
  });
};

// Users


const updateOtpVerifiedStatus = async (req, res, next) => {
  const { user_id } = req.params;

  const { isOtpVerified } = req.body;

  try {
    // ✅ Validate input
    if (typeof isOtpVerified !== "boolean") {
      return res.status(400).json({
        status: false,
        message: "isOtpVerified must be true or false",
      });
    }

    // ✅ Pass $set operator explicitly if your wrapper expects it
    const result = await updateOne(
      "Users",
      { customer_id: user_id },
      { $set: { isOtpVerified } }, // This should work
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: `User OTP verification set to ${isOtpVerified}`,
    });
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const { order_id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "in progress", "completed", "cancelled"];

  try {
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid order status" });
    }

    await updateOne("Orders", { order_id }, { $set: { order_status: status } });

    res.json({ status: true, message: "Order status updated" });
  } catch (err) {
    next(err);
  }
};

const updateFarmeelyStatus = async (req, res, next) => {
  const { farmeely_id } = req.params;
  const { status } = req.body;

  const allowed = ["in_progress", "group_completed", "processing", "completed"];

  try {
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid farmeely status" });
    }

    await updateOne(
      "Farmeely",
      { farmeely_id },
      { $set: { farmeely_status: status } },
    );

    res.json({ status: true, message: "Farmeely status updated" });
  } catch (err) {
    next(err);
  }
};



const updateExpatriateStatus = async (req, res, next) => {
  const { request_id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];

  try {
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid expatriate status" });
    }

    await updateOne(
      "Expatriate",
      { request_id },
      { $set: { requestStatus: status } },
    );

    res.json({ status: true, message: "Expatriate status updated" });
  } catch (err) {
    next(err);
  }
};
const createProduct = async (req, res, next) => {
  const {
    product_name,
    product_price,
    portion_price,
    total_slots,
    product_image,
    description,
  } = req.body;

  try {
    const products = await findQuery("Products", {});
    const product_id = products.length + 1;

    const newProduct = {
      product_id,
      product_name,
      product_price,
      portion_price,
      total_slots,
      product_image,
      description,
    };

    await insertOne("Products", newProduct);

    res.status(201).json({
      status: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (err) {
    next(err);
  }
};

// Admin Send Notification
// Your controller - REPLACE with this
const sendNotification = async (req, res, next) => {
  const { title, body } = req.body;  // No customer_id needed

  try {
    // Basic validation
    if (!title || !body) {
      return res.status(400).json({
        status: false,
        message: "title and body are required",
      });
    }

    // Send to ALL customers
    const result = await sendNotificationToAllCustomers(title, body);

    if (result.success) {
      res.status(200).json({
        status: true,
        message: "Notification sent to all customers successfully",
        devices: result.totalDevices,
        succeeded: result.totalSuccess,
        failed: result.totalFailure
      });
    } else {
      res.status(200).json({
        status: false,
        message: result.message,
      });
    }
  } catch (err) {
    next(err);
  }
};


module.exports = {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllFarmeelyGroups,
  getFarmeelyGroupDetails,
  getAllProductsAdmin,
  getAllExpatriateRequests,
  updateExpatriateRequestStatus,
  getAdminProfile,
  getOtpVerifiedEnums,
  updateOtpVerifiedStatus,
  getFarmeelyStatusEnums,
  getSlotStatusEnums,
  getPaymentStatusEnums,
  getExpatriateStatusEnums,
  getOrderStatusEnums,
  updateOrderStatus,
  updateFarmeelyStatus,
  createProduct,
  updateExpatriateStatus,
  sendNotification
};
