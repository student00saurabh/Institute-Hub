const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const reviewController = require("../controllers/review");

// ========== PUBLIC ROUTES ==========
router.get("/reviews", reviewController.publicReviews);
router.get("/review/:token", reviewController.renderReviewForm);
router.post("/review/:token", reviewController.submitReview);

// ========== ADMIN ROUTES ==========
router.get("/admin/reviews", isLoggedIn, isAdmin, reviewController.manageReviews);
router.post("/admin/reviews/:id/toggle", isLoggedIn, isAdmin, reviewController.toggleReviewStatus);
router.post("/admin/reviews/:id/response", isLoggedIn, isAdmin, reviewController.addAdminResponse);
router.post("/admin/send-review", isLoggedIn, isAdmin, reviewController.sendReviewInvitation);

module.exports = router;