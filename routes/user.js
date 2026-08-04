const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const {
  saveRedirectUrl,
  isVerified,
  isLoggedIn,
  isAdmin,
} = require("../middleware.js");
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/users.js");

const LoginActivity = require("../models/loginActivity");
const { detectDevice, getClientIP, getIPLocation } = require("../utils/deviceDetector");


// signup GET
//Signup POST
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(wrapAsync(userController.signup));

//Login GET
//Login POST
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
  async (req, res, next) => {
    try {
            const { email } = req.body;
            const clientIP = getClientIP(req);
            const userAgent = req.headers['user-agent'] || '';
            
            // Check if user exists
            const user = await User.findOne({ email });
            
            if (user) {
                const deviceInfo = detectDevice(userAgent);
                const location = await getIPLocation(clientIP);

                const failedLogin = new LoginActivity({
                    user: user._id,
                    status: 'failed',
                    loginTime: new Date(),
                    ipAddress: clientIP,
                    location: location,
                    deviceType: deviceInfo.deviceType,
                    browser: deviceInfo.browser,
                    os: deviceInfo.os,
                    networkType: deviceInfo.networkType,
                    userAgent: userAgent,
                    failureReason: "invalid_credentials"
                });

                await failedLogin.save();
            }
        } catch (error) {
            console.error("Failed login tracking error:", error);
        }

        next();
    },
    isVerified,
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login,
  );

router.get("/logout", userController.logout);

router.post("/verify/:id/resend", userController.resendOtp);
router.get("/verify-email", userController.renderVerifyEmailForm);
router.post("/verify/:id", userController.verifyEmail);

router.get("/profile", isLoggedIn, userController.profile);
router.post(
  "/profile/update",
  upload.none(),
  isLoggedIn,
  userController.updateProfile,
);
router.post(
  "/profile/change-password",
  isLoggedIn,
  userController.changePassword,
);
router.get(
  "/profile/enrollments",
  isLoggedIn,
  userController.enrollmentHistory,
);


router.get(
  "/profile/stats",
  isLoggedIn,
  userController.getUserStats
);

// Get User Certificates (AJAX)
router.get(
  "/profile/certificates",
  isLoggedIn,
  userController.getUserCertificates
);

// Update Profile Picture
router.post(
  "/profile/upload-avatar",
  isLoggedIn,
  upload.single("avatar"),
  userController.uploadAvatar
);

// Delete Account (with confirmation)
router.delete(
  "/profile/delete-account",
  isLoggedIn,
  userController.deleteAccount
);

// Resend Verification Email
router.post(
  "/profile/resend-verification",
  isLoggedIn,
  userController.resendVerificationEmail
);

// My Courses Page
router.get("/my-courses", isLoggedIn, userController.myCourses);

// Course Progress (AJAX)
router.get(
  "/profile/course-progress/:courseId",
  isLoggedIn,
  userController.getCourseProgress
);

// Get User Reviews (AJAX)
router.get(
  "/profile/reviews",
  isLoggedIn,
  userController.getUserReviews
);


module.exports = router;
