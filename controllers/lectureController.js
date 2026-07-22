const Lecture = require("../models/lecture");
const Course = require("../models/cources");
const LectureProgress = require("../models/lectureProgress");
const cloudinary = require("../Cloudconfig.js");
const crypto = require("crypto"); // ✅ Built-in - no extra package needed!

const VIDEO_TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || process.env.SECRET || "institutehub-secret-key";
const VIDEO_URL_TTL_SECONDS = 60 * 30; // 30 minutes

// ============================================================
// HELPERS
// ============================================================

// ✅ Generate short-lived signed URL using crypto (no JWT needed!)
function generateSignedUrl(lectureId, userId) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + VIDEO_URL_TTL_SECONDS;
    
    // Create signature
    const data = `${lectureId}:${userId}:${expiresAt}`;
    const signature = crypto
        .createHmac('sha256', VIDEO_TOKEN_SECRET)
        .update(data)
        .digest('hex');
    
    return {
        token: signature,
        expiresAt: expiresAt,
        data: data
    };
}

// ✅ Verify signed URL
function verifySignedUrl(lectureId, userId, expiresAt, signature) {
    const data = `${lectureId}:${userId}:${expiresAt}`;
    const expectedSignature = crypto
        .createHmac('sha256', VIDEO_TOKEN_SECRET)
        .update(data)
        .digest('hex');
    
    // Check signature
    if (signature !== expectedSignature) {
        return false;
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expiresAt)) {
        return false;
    }
    
    return true;
}

// Confirms the lecture is actually part of the course AND the user is
// genuinely enrolled (paid & verified) or the lecture is marked free.
async function assertLectureAccess({ lectureId, courseId, userId }) {
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
        const err = new Error("Lecture not found");
        err.status = 404;
        throw err;
    }

    if (courseId && !lecture.isInCourse(courseId)) {
        const err = new Error("This lecture does not belong to the specified course");
        err.status = 400;
        throw err;
    }

    const hasAccess = await lecture.canAccess(userId, courseId);
    if (!hasAccess) {
        const err = new Error("You don't have access to this lecture. Please enroll in the course first.");
        err.status = 403;
        throw err;
    }

    return lecture;
}

// Generates a short-lived, signed URL for the video
function generateSecureVideoUrl(lecture, user) {
    const { provider, publicId, url, embedId } = lecture.video || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + VIDEO_URL_TTL_SECONDS;

    if (provider === "cloudinary" && publicId) {
        const signedUrl = cloudinary.url(publicId, {
            resource_type: "video",
            type: "authenticated",
            sign_url: true,
            secure: true,
            expires_at: expiresAt
        });
        return { playbackUrl: signedUrl, type: "direct", expiresAt };
    }

    if (provider === "youtube" && embedId) {
        return { playbackUrl: `https://www.youtube.com/embed/${embedId}`, type: "embed-unprotected", expiresAt: null };
    }

    if (provider === "vimeo" && embedId) {
        return { playbackUrl: `https://player.vimeo.com/video/${embedId}`, type: "embed-unprotected", expiresAt: null };
    }

    // ✅ Custom / self-hosted file — signed URL using crypto (no JWT!)
    if (url) {
        const signed = generateSignedUrl(lecture._id.toString(), user._id.toString());
        const separator = url.includes("?") ? "&" : "?";
        return { 
            playbackUrl: `${url}${separator}token=${signed.token}&expires=${signed.expiresAt}&lecture=${lecture._id}&user=${user._id}`, 
            type: "direct", 
            expiresAt: signed.expiresAt 
        };
    }

    return { playbackUrl: null, type: "none", expiresAt: null };
}

// ============================================================
// CREATE NEW LECTURE (Reusable)
// ============================================================
module.exports.createLecture = async (req, res) => {
    try {
        const lectureData = req.body;
        lectureData.createdBy = req.user._id;

        const lecture = new Lecture(lectureData);
        await lecture.save();

        if (lectureData.courseId) {
            await lecture.addToCourse(
                lectureData.courseId,
                lectureData.section || "General",
                lectureData.order || 0
            );
        }

        req.flash("success", "Lecture created successfully!");
        res.redirect("/admin/lectures");
    } catch (error) {
        console.error("Create lecture error:", error);
        req.flash("error", "Failed to create lecture");
        res.redirect("/admin/lectures/new");
    }
};

// ============================================================
// ADD / REMOVE LECTURE <-> COURSE
// ============================================================
module.exports.addToCourse = async (req, res) => {
    try {
        const { lectureId, courseId, section, order } = req.body;

        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        await lecture.addToCourse(courseId, section || "General", order || 0);

        res.json({ success: true, message: "Lecture added to course successfully", lecture });
    } catch (error) {
        console.error("Add to course error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to add lecture to course" });
    }
};

module.exports.removeFromCourse = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;

        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        await lecture.removeFromCourse(courseId);

        res.json({ success: true, message: "Lecture removed from course successfully" });
    } catch (error) {
        console.error("Remove from course error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to remove lecture from course" });
    }
};

// ============================================================
// TOPIC / SEARCH HELPERS
// ============================================================
module.exports.getLecturesByTopic = async (req, res) => {
    try {
        const { topic, q } = req.query;
        let query = { isPublished: true };

        if (topic) query.topic = topic;
        if (q) query.title = { $regex: q, $options: "i" };

        const lectures = await Lecture.find(query)
            .select("title topic description createdAt")
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({ success: true, lectures, count: lectures.length });
    } catch (error) {
        console.error("Get lectures by topic error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch lectures" });
    }
};

module.exports.getTopics = async (req, res) => {
    try {
        const topics = await Lecture.getTopics();
        res.json({ success: true, topics });
    } catch (error) {
        console.error("Get topics error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch topics" });
    }
};

// ============================================================
// GET COURSE LECTURES (JSON — for admin dashboards)
// ============================================================
module.exports.getCourseLectures = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId).select("title sections").lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        const lectures = await Lecture.getCourseLectures(courseId);

        res.json({ success: true, course, lectures });
    } catch (error) {
        console.error("Get course lectures error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch course lectures" });
    }
};

// ============================================================
// GET SINGLE LECTURE (JSON, with access check)
// ============================================================
module.exports.getLecture = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;
        const userId = req.user?._id;

        const lecture = await assertLectureAccess({ lectureId, courseId, userId });
        const populated = await Lecture.findById(lecture._id).populate("createdBy", "name email").lean();

        res.json({ success: true, lecture: populated });
    } catch (error) {
        console.error("Get lecture error:", error);
        res.status(error.status || 500).json({ success: false, message: error.message || "Failed to fetch lecture" });
    }
};

// ============================================================
// ★ RENDER COURSE CONTENT PAGE
// ============================================================
module.exports.renderCourseContent = async (req, res) => {
    try {
        const { id: courseId } = req.params;

        if (!req.user) {
            req.flash("warning", "Please login to access course content");
            return res.redirect(`/login?redirect=/courses/${courseId}/access`);
        }

        const course = await Course.findById(courseId)
            .populate("teacher", "name email")
            .lean();

        if (!course) {
            req.flash("error", "Course not found");
            return res.redirect("/courses");
        }

        const isEnrolled = (course.students || []).some(
            (s) => s.user.toString() === req.user._id.toString()
        );

        if (!isEnrolled) {
            req.flash("warning", "Please enroll in this course to access content");
            return res.redirect(`/courses/${courseId}`);
        }

        const sections = await Lecture.getCourseLectures(courseId);
        const allLectureIds = Object.values(sections).flat().map((l) => l._id);

        const progressDocs = await LectureProgress.find({
            user: req.user._id,
            course: courseId,
            lecture: { $in: allLectureIds }
        }).lean();

        const progressMap = new Map(progressDocs.map((p) => [p.lecture.toString(), p]));

        let totalLectures = 0;
        let completedLectures = 0;

        Object.keys(sections).forEach((sectionName) => {
            sections[sectionName] = sections[sectionName].map((lecture) => {
                const progress = progressMap.get(lecture._id.toString());
                totalLectures += 1;
                if (progress?.isCompleted) completedLectures += 1;

                return {
                    ...lecture,
                    isCompleted: !!progress?.isCompleted,
                    watchPercentage: progress?.watchPercentage || 0,
                    lastPosition: progress?.lastPosition || 0
                };
            });
        });

        const progressPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

        res.render("institutehub/course-content.ejs", {
            course,
            sections,
            progress: progressPercentage,
            totalLectures,
            completedLectures,
            currentUser: req.user
        });
    } catch (error) {
        console.error("Course content error:", error);
        req.flash("error", "Unable to load course content");
        res.redirect("/courses");
    }
};

// ============================================================
// ★ SECURE, SHORT-LIVED VIDEO URL (using crypto, no JWT!)
// ============================================================
module.exports.getSecureVideoUrl = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to watch this lecture" });
        }

        const lecture = await assertLectureAccess({ lectureId, courseId, userId });
        const { playbackUrl, type, expiresAt } = generateSecureVideoUrl(lecture, req.user);

        if (!playbackUrl) {
            return res.status(404).json({ success: false, message: "No video is attached to this lecture yet" });
        }

        // Get or create progress
        let progress = await LectureProgress.findOne({ user: userId, course: courseId, lecture: lectureId });
        if (!progress) {
            progress = new LectureProgress({
                user: userId,
                course: courseId,
                lecture: lectureId,
                lastAccessed: new Date()
            });
            await progress.save();
        }

        res.json({
            success: true,
            playbackUrl,
            playerType: type,
            expiresAt,
            duration: lecture.video?.duration || 0,
            resumeAt: progress.lastPosition || 0,
            isCompleted: progress.isCompleted,
            watermark: {
                email: req.user.email,
                name: req.user.name
            }
        });
    } catch (error) {
        console.error("Get secure video URL error:", error);
        res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load video" });
    }
};

// ============================================================
// ★ PLAYBACK PROGRESS
// ============================================================
module.exports.updateProgress = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;
        const { currentTime, duration, ended } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login" });
        }

        const lecture = await assertLectureAccess({ lectureId, courseId, userId });

        let progress = await LectureProgress.findOne({ user: userId, course: courseId, lecture: lectureId });
        if (!progress) {
            progress = new LectureProgress({
                user: userId,
                course: courseId,
                lecture: lectureId,
                lastAccessed: new Date()
            });
        }

        // Update watch time
        const videoDuration = duration || lecture.video?.duration || 0;
        if (currentTime && videoDuration > 0) {
            progress.lastPosition = currentTime;
            progress.watchTime = Math.max(progress.watchTime || 0, currentTime);
            progress.watchPercentage = Math.min(Math.round((currentTime / videoDuration) * 100), 100);
        }

        // Mark complete if ended or reached threshold
        const minWatchPercentage = lecture.minWatchPercentage || 95;
        if (ended || progress.watchPercentage >= minWatchPercentage) {
            progress.isCompleted = true;
            progress.completedAt = new Date();
        }

        progress.lastAccessed = new Date();
        await progress.save();

        res.json({
            success: true,
            isCompleted: progress.isCompleted,
            watchPercentage: progress.watchPercentage,
            lastPosition: progress.lastPosition
        });
    } catch (error) {
        console.error("Update progress error:", error);
        res.status(error.status || 500).json({ success: false, message: error.message || "Failed to update progress" });
    }
};

// ============================================================
// ADMIN OVERRIDE
// ============================================================
module.exports.adminOverrideComplete = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;
        const { userId, completed } = req.body;

        if (!req.user || !["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        let progress = await LectureProgress.findOne({ user: userId, course: courseId, lecture: lectureId });
        if (!progress) {
            progress = new LectureProgress({
                user: userId,
                course: courseId,
                lecture: lectureId
            });
        }

        if (completed) {
            progress.isCompleted = true;
            progress.completedAt = new Date();
            progress.watchPercentage = 100;
        } else {
            progress.isCompleted = false;
            progress.completedAt = null;
            progress.watchPercentage = 0;
        }

        await progress.save();

        res.json({ 
            success: true, 
            message: "Progress updated by admin", 
            isCompleted: progress.isCompleted 
        });
    } catch (error) {
        console.error("Admin override complete error:", error);
        res.status(500).json({ success: false, message: "Failed to override progress" });
    }
};