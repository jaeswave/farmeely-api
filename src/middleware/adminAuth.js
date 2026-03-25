// middleware/adminAuth.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { findQuery } = require("../repository");
const jwtSecret = process.env.JWT_SECRET || "keep-secret-secure123#";

const adminAuthorization = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).send({
      status: false,
      message: "Unauthorized Access - No token provided",
    });
  }

  const tokenSplit = authorization.split(" ");

  if (tokenSplit.length !== 2 || tokenSplit[0] !== "Bearer") {
    return res.status(401).send({
      status: false,
      message: "Unauthorized Access - Invalid token format",
    });
  }

  jwt.verify(tokenSplit[1], jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized Access - Invalid or expired token",
      });
    }

    try {
      // Check if admin exists in Admin collection
      const checkAdminDetails = await findQuery("Admins", {
        email: decoded.email,
      });

      if (!checkAdminDetails || checkAdminDetails.length === 0) {
        return res.status(401).send({
          status: false,
          message: "Unauthorized Access - Admin not found",
        });
      }

      const admin = checkAdminDetails[0];

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).send({
          status: false,
          message: "Account deactivated. Contact super admin.",
        });
      }

      // Attach admin data to request
      req.admin = {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        fullname: admin.fullname,
      };

      req.params.admin_email = admin.email;
      req.params.admin_id = admin._id;
      req.params.admin_role = admin.role;

      next();
    } catch (error) {
      return res.status(500).send({
        status: false,
        message: "Internal server error during authentication",
      });
    }
  });
};

module.exports = adminAuthorization;
