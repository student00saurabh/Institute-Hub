const express = require("express");
const router = express.Router();
const othersController = require("../controllers/others");

router.get("/contact", othersController.contactPage);
router.post("/contact", othersController.contact);
router.post("/api/contact", othersController.contactAPI);


// SUBSCRIBE ROUTES (API Only)
router.post("/api/subscribe", othersController.subscribe);           // Send OTP
router.post("/api/verify-otp", othersController.verifyOTP);         // Verify OTP
router.post("/api/resend-otp", othersController.resendOTP);         // Resend OTP
router.get("/api/subscription-status", othersController.checkSubscriptionStatus); // Check status

router.get("/careers", othersController.carriers);

module.exports = router;
