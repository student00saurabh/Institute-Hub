const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const ratingController = require("../controllers/rating");

// ========== USER ROUTES ==========
router.get("/api/course/:courseId/rating", isLoggedIn, ratingController.getUserRating);
router.post("/api/course/:courseId/rating", isLoggedIn, ratingController.submitRating);
router.delete("/api/course/:courseId/rating", isLoggedIn, ratingController.deleteUserRating);

// ========== ADMIN ROUTES ==========
router.get("/admin/ratings", isLoggedIn, isAdmin, ratingController.adminGetRatings);
router.get("/admin/course/:courseId/ratings", isLoggedIn, isAdmin, ratingController.adminGetCourseRatings);
router.delete("/admin/ratings/:id", isLoggedIn, isAdmin, ratingController.adminDeleteRating);

module.exports = router;