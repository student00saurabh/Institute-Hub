const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");
const multer = require("multer");

const { cloudinary, storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

router.get("/dashboard", isLoggedIn, isAdmin, adminController.adminDashboard);

// Course Management
router.get("/courses", isLoggedIn, isAdmin, adminController.manageCourses);

// Blog Management
router.get("/blogs", isLoggedIn, isAdmin, adminController.manageBlogs);

// User Management
router.get("/users", isLoggedIn, isAdmin, adminController.manageUsers);

router.get("/users/:id", isLoggedIn, isAdmin, adminController.userDetails);
router.patch("/users/:id/toggle-block", isLoggedIn, isAdmin, adminController.toggleUserBlock);

// Toggle user role (PATCH)
router.patch("/users/:id/toggle-role", isLoggedIn, isAdmin, adminController.toggleUserRole);

// Delete user (DELETE)
router.delete("/users/:id", isLoggedIn, isAdmin, adminController.deleteUser);

router.post("/users/:id/reset-review", isLoggedIn, isAdmin, adminController.resetUserReview);

// router.route("/login").get(userController.renderLoginForm);
//router.get("/", isLoggedIn, isAdmin, adminController.index);
router.get(
  "/contacts",
  isLoggedIn,
  isAdmin,
  adminController.contactSubmissions,
);
router.get(
  "/contacts/:id/details",
  isLoggedIn,
  isAdmin,
  adminController.getContactDetails,
);
router.patch(
  "/contacts/:id/toggle-seen",
  isLoggedIn,
  isAdmin,
  adminController.toggleSeen,
);
router.delete(
  "/contacts/:id",
  isLoggedIn,
  isAdmin,
  adminController.deleteContact,
);

router.get("/subscribers", isLoggedIn, isAdmin, adminController.subscribers);
router.post(
  "/subscribers",
  isLoggedIn,
  isAdmin,
  adminController.createSubscriber,
);
router.post(
  "/subscribers/bulk-action",
  isLoggedIn,
  isAdmin,
  adminController.bulkAction,
);
router.get(
  "/subscribers/export",
  isLoggedIn,
  isAdmin,
  adminController.exportSubscribers,
);
router.patch(
  "/subscribers/:id/toggle-status",
  isLoggedIn,
  isAdmin,
  adminController.toggleStatus,
);
router.delete(
  "/subscribers/:id",
  isLoggedIn,
  isAdmin,
  adminController.deleteSubscriber,
);

router.get("/course-ratings", isLoggedIn, isAdmin, adminController.manageCourseRatings);
router.get("/course-ratings/:id/details", isLoggedIn, isAdmin, adminController.getCourseRatingDetails);
router.delete("/course-ratings/:id", isLoggedIn, isAdmin, adminController.deleteCourseRating);

module.exports = router;
