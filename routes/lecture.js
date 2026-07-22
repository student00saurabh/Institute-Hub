const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin, isTeacher } = require("../middleware");
const lectureController = require("../controllers/lectureController");

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get topics
router.get("/api/lectures/topics", lectureController.getTopics);

// Get lectures by topic
router.get("/api/lectures/by-topic", lectureController.getLecturesByTopic);

// Get course lectures
router.get("/api/courses/:courseId/lectures", lectureController.getCourseLectures);

// Get single lecture (with access check)
router.get("/api/lectures/:lectureId/course/:courseId", isLoggedIn, lectureController.getLecture);

// ============================================================
// ADMIN ROUTES
// ============================================================

// Create lecture
router.post("/admin/lectures", isLoggedIn, isAdmin, lectureController.createLecture);

// Add lecture to course (AJAX)
router.post("/api/lectures/add-to-course", isLoggedIn, isAdmin, lectureController.addToCourse);

// Remove lecture from course (AJAX)
router.delete("/api/lectures/:lectureId/course/:courseId", isLoggedIn, isAdmin, lectureController.removeFromCourse);

module.exports = router;