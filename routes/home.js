const express = require("express");
const router = express.Router();
const homeController = require("../controllers/home.js");
const { isLoggedIn, isAdmin, saveRedirectUrl } = require("../middleware");
const multer = require("multer");
const { storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

function requireEnrollmentLogin(req, res, next) {
  if (req.isAuthenticated()) return next();

  const courseId = req.body?.courseId;
  const enrollmentUrl =
    typeof courseId === "string" && /^[0-9a-fA-F]{24}$/.test(courseId)
      ? `/enroll?courseId=${encodeURIComponent(courseId)}`
      : "/enroll";

  req.session.redirectUrl = enrollmentUrl;
  return res.status(401).json({
    success: false,
    loginRequired: true,
    redirectUrl: "/login",
    message: "Please log in to continue with enrollment.",
  });
}

router.route("/").get(homeController.homePage);
router.get("/profile", isLoggedIn, homeController.profile);

router.get("/about", homeController.about);
router.get("/privacy", homeController.privacy);
router.get("/terms", homeController.terms);
// router.get("/contact", homeController.contact);

// Courses
router
  .route("/courses")
  .get(homeController.allCourses)
  .post(
    upload.single("image"),
    isLoggedIn,
    isAdmin,
    homeController.createNewCourse,
  );

router.get(
  "/courses/new",
  isLoggedIn,
  isAdmin,
  homeController.renderNewCourseForm,
);

router.get(
  "/courses/:id/edit",
  isLoggedIn,
  isAdmin,
  homeController.renderEditCourseForm,
);

router
  .route("/courses/:id")
  .get(homeController.viewCourse)
  .put(upload.single("image"), isLoggedIn, isAdmin, homeController.updateCourse)
  .delete(isLoggedIn, isAdmin, homeController.deleteCourse)
  .patch(isLoggedIn, isAdmin, homeController.toggleActive);

// Course Content (for enrolled users)
router.get(
  "/courses/:id/access",
  isLoggedIn,
  homeController.getCourseContent
);

router.patch(
  "/courses/:id/lecture/:lectureId/complete",
  isLoggedIn,
  homeController.markLectureComplete
);

// Razorpay Routes
router.post("/create-order", isLoggedIn, homeController.createRazorpayOrder);
router.post("/verify-payment", isLoggedIn, homeController.verifyPayment);

router.patch(
  "/courses/:id/popular",
  isLoggedIn,
  isAdmin,
  homeController.togglePopular,
);

router.patch(
  "/courses/:id/toggle-navbar",
  isLoggedIn,
  isAdmin,
  homeController.toggleNavbarVisibility,
);

router.patch(
  "/courses/:id/navbar-order",
  isLoggedIn,
  isAdmin,
  homeController.toggleNavbarOrder
);

router.patch(
  "/courses/:id/toggle-homepage",
  isLoggedIn,
  isAdmin,
  homeController.toggleHomepageVisibility,
);

// ⚠️ Must come BEFORE "/enroll/:courseId", otherwise Express will
// treat "api" as the :courseId param and this route will never match.
router.get("/enroll/api/browse-courses", homeController.browseCoursesAjax);

router
  .route("/enroll")
  .get(isLoggedIn, saveRedirectUrl, homeController.enrollCourseForm)
  .post(isLoggedIn, saveRedirectUrl, homeController.enrollCourse);

router
  .route("/enroll/:courseId")
  .get(isLoggedIn, saveRedirectUrl, homeController.enrollCourseForm)
  .post(isLoggedIn, homeController.enrollInNewCource);

// Create Razorpay order for enrollment
router.post('/create-enrollment-order', requireEnrollmentLogin, homeController.createEnrollmentOrder);

// Verify enrollment payment
router.post('/verify-enrollment-payment', requireEnrollmentLogin, homeController.verifyEnrollmentPayment);

module.exports = router;