// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuthorization = require("../middleware/adminAuth");

// Public routes
router.post("/login", adminController.adminLogin);

// Protected routes (all require admin authentication)
router.use(adminAuthorization);

// Admin management (super admin only)
router.post("/create", adminController.createAdmin);
router.get("/all-admins", adminController.getAllAdmins);

// Dashboard
router.get("/dashboard", adminController.getDashboardStats);

// User management
router.get("/users", adminController.getAllUsers);
router.get("/users/:user_id", adminController.getUserDetails);
router.put("/users/:user_id/status", adminController.updateUserStatus);

// Farmeely management
router.get("/farmeely", adminController.getAllFarmeelyGroups);
router.get("/farmeely/:farmeely_id", adminController.getFarmeelyGroupDetails);

// Product management
router.get("/products", adminController.getAllProductsAdmin);

// Expatriate request management
router.get("/expatriate-requests", adminController.getAllExpatriateRequests);
router.put(
  "/expatriate-requests/:request_id/status",
  adminController.updateExpatriateRequestStatus,
);

// Admin profile
router.get("/profile", adminController.getAdminProfile);

module.exports = router;
