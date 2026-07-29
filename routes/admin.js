const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");
const teacherController = require("../controllers/teacherController.js");
const paymentController = require("../controllers/paymentController.js");
const lectureController = require("../controllers/lectureController.js");
const settingsController = require("../controllers/settingsController.js");
const multer = require("multer");

const { cloudinary, storage, videoStorage } = require("../Cloudconfig.js");
const upload = multer({ storage }); // images/thumbnails (public)
const uploadVideo = multer({
  storage: videoStorage, // private "authenticated" Cloudinary videos
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB — raise/lower to match your hosting's request-size limits
});

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

// ============ TEACHERS (NEW) ============
router.get("/teachers", isLoggedIn, isAdmin, teacherController.manageTeachers);
router.get("/teachers/:id", isLoggedIn, isAdmin, teacherController.teacherDetails);
router.patch("/teachers/:id/toggle-role", isLoggedIn, isAdmin, teacherController.makeTeacher);

// ============ PAYMENTS (NEW) ============
router.get("/payments", isLoggedIn, isAdmin, paymentController.managePayments);
router.get("/payments/:id", isLoggedIn, isAdmin, paymentController.paymentDetails);
router.get("/payments/export/csv", isLoggedIn, isAdmin, paymentController.exportPayments);


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

router.get("/lectures", isLoggedIn, isAdmin, lectureController.manageLectures);
router.get("/lectures/new", isLoggedIn, isAdmin, lectureController.renderNewLectureForm);

// Video upload happens in its own request (with progress bar on the client),
// BEFORE the lecture create/update form is submitted. Uploaded straight to
// Cloudinary as a private "authenticated" asset — see Cloudconfig.js.
router.post("/lectures/upload-video", isLoggedIn, isAdmin, uploadVideo.single("video"), lectureController.uploadLectureVideo);
router.post("/lectures/discard-video", isLoggedIn, isAdmin, lectureController.discardUploadedVideo);

router.post("/lectures", isLoggedIn, isAdmin, upload.single("videoThumbnail"), lectureController.createLecture);
router.get("/lectures/:id", isLoggedIn, isAdmin, lectureController.lectureDetails);
router.get("/lectures/:id/edit", isLoggedIn, isAdmin, lectureController.renderEditLectureForm);
router.put("/lectures/:id", isLoggedIn, isAdmin, upload.single("videoThumbnail"), lectureController.updateLecture);
router.delete("/lectures/:id", isLoggedIn, isAdmin, lectureController.deleteLecture);
router.patch("/lectures/:id/toggle-publish", isLoggedIn, isAdmin, lectureController.togglePublish);

///app settingd routes and APIs
router.get("/settings", isLoggedIn, isAdmin, settingsController.settingsPage);
router.post("/settings/hero", isLoggedIn, isAdmin, upload.single("backgroundImage"), settingsController.updateHero);
router.post("/settings/contact", isLoggedIn, isAdmin, settingsController.updateContact);
router.post("/settings/social-links", isLoggedIn, isAdmin, settingsController.updateSocialLinks);
router.post("/settings/offices", isLoggedIn, isAdmin, settingsController.updateOffices);
router.post("/settings/support-hours", isLoggedIn, isAdmin, settingsController.updateSupportHours);
router.post("/settings/faqs", isLoggedIn, isAdmin, settingsController.updateFaqs);
router.post("/settings/stats", isLoggedIn, isAdmin, settingsController.updateStats);
router.post("/settings/features", isLoggedIn, isAdmin, settingsController.updateFeatures);
router.post("/settings/search-placeholder", isLoggedIn, isAdmin, settingsController.updateSearchPlaceholder);

// AJAX Routes
router.post("/api/settings/social-links", isLoggedIn, isAdmin, settingsController.addSocialLink);
router.delete("/api/settings/social-links/:index", isLoggedIn, isAdmin, settingsController.removeSocialLink);
router.get("/api/settings", isLoggedIn, isAdmin, settingsController.getSettings);


module.exports = router;