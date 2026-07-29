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

// Course content page (sections + progress) for an enrolled student
router.get("/courses/:id/access", isLoggedIn, lectureController.renderCourseContent);

// ✅ The secure, signed, watermarked, short-lived video URL — this is what
// the player should call right before hitting play, never store the URL.
router.get("/api/lectures/:lectureId/course/:courseId/secure-video", isLoggedIn, lectureController.getSecureVideoUrl);

// Playback progress — called periodically (e.g. every 10-15s) by the player
router.post("/api/lectures/:lectureId/course/:courseId/progress", isLoggedIn, lectureController.updateProgress);

// ============================================================
// ADMIN / TEACHER ROUTES
// ============================================================

// Create lecture
router.post("/admin/lectures", isLoggedIn, isAdmin, lectureController.createLecture);

// Add lecture to course (AJAX) — lets one lecture live in multiple courses
router.post("/api/lectures/add-to-course", isLoggedIn, isAdmin, lectureController.addToCourse);

// Remove lecture from course (AJAX)
router.delete("/api/lectures/:lectureId/course/:courseId", isLoggedIn, isAdmin, lectureController.removeFromCourse);

// Manually mark a student's progress on a lecture (admin/teacher only)
router.post("/api/lectures/:lectureId/course/:courseId/override-complete", isLoggedIn, isAdmin, lectureController.adminOverrideComplete);

module.exports = router;