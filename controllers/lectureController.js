const Lecture = require("../models/lecture");
const Course = require("../models/cources");
const LectureProgress = require("../models/lectureProgress");
const cloudinary = require("../Cloudconfig.js");
const crypto = require("crypto");

const VIDEO_TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || process.env.SECRET || "institutehub-secret-key";
const VIDEO_URL_TTL_SECONDS = 60 * 30; // 30 minutes

// ============================================================
// ADMIN FUNCTIONS - Manage Lectures
// ============================================================

// ===== 1. Manage Lectures (List with filters) =====
module.exports.manageLectures = async (req, res) => {
    try {
        const { search, topic, status, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        let query = {};

        // Search by title
        if (search) {
            query.title = { $regex: search, $options: "i" };
        }

        // Filter by topic
        if (topic) {
            query.topic = topic;
        }

        // Filter by status
        if (status === 'published') {
            query.isPublished = true;
        } else if (status === 'draft') {
            query.isPublished = false;
        }

        // Get total count
        const totalLectures = await Lecture.countDocuments(query);

        // Fetch lectures
        const lectures = await Lecture.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get all topics for filter dropdown
        const topics = await Lecture.distinct('topic');

        // Calculate pagination
        const totalPages = Math.ceil(totalLectures / limit);

        res.render("admin/lectures.ejs", {
            lectures,
            totalLectures,
            currentPage: parseInt(page),
            totalPages,
            search: search || '',
            topic: topic || '',
            status: status || '',
            topics: topics || [],
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Manage lectures error:", error);
        req.flash("error", "Failed to load lectures");
        res.redirect("/admin/dashboard");
    }
};

// ===== 2. Render New Lecture Form =====
module.exports.renderNewLectureForm = async (req, res) => {
    try {
        // Get all courses for dropdown
        const courses = await Course.find({ isActive: true })
            .select('title')
            .sort({ title: 1 })
            .lean();

        // Get all topics
        const topics = await Lecture.distinct('topic');

        res.render("admin/lectureForm.ejs", {
            lecture: {},
            courses,
            topics,
            isEdit: false,
            user: req.user
        });

    } catch (error) {
        console.error("Render new lecture form error:", error);
        req.flash("error", "Failed to load lecture form");
        res.redirect("/admin/lectures");
    }
};

// ===== 3. Create Lecture =====
module.exports.createLecture = async (req, res) => {
    try {
        const lectureData = req.body;
        lectureData.createdBy = req.user._id;

        // Process video data
        if (lectureData.video) {
            if (lectureData.video.provider === 'cloudinary' && req.file) {
                lectureData.video.publicId = req.file.filename;
                lectureData.video.url = req.file.path;
            }
        }

        // Create lecture
        const lecture = new Lecture(lectureData);
        await lecture.save();

        // Add to course if courseId provided
        if (lectureData.courseId && lectureData.courseId !== '') {
            await lecture.addToCourse(
                lectureData.courseId,
                lectureData.section || "General",
                parseInt(lectureData.order) || 0
            );
        }

        req.flash("success", "Lecture created successfully!");
        res.redirect("/admin/lectures");

    } catch (error) {
        console.error("Create lecture error:", error);
        req.flash("error", "Failed to create lecture: " + error.message);
        res.redirect("/admin/lectures/new");
    }
};

// ===== 4. Lecture Details =====
module.exports.lectureDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const lecture = await Lecture.findById(id)
            .populate('createdBy', 'name email')
            .populate('courses.courseId', 'title')
            .lean();

        if (!lecture) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        // Get all courses using this lecture
        const courseIds = lecture.courses?.map(c => c.courseId?._id) || [];
        const courses = await Course.find({ _id: { $in: courseIds } })
            .select('title')
            .lean();

        res.render("admin/lectureDetails.ejs", {
            lecture,
            courses,
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Lecture details error:", error);
        req.flash("error", "Failed to load lecture details");
        res.redirect("/admin/lectures");
    }
};

// ===== 5. Render Edit Lecture Form =====
module.exports.renderEditLectureForm = async (req, res) => {
    try {
        const { id } = req.params;

        const lecture = await Lecture.findById(id).lean();
        if (!lecture) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        // Get all courses for dropdown
        const courses = await Course.find({ isActive: true })
            .select('title')
            .sort({ title: 1 })
            .lean();

        // Get all topics
        const topics = await Lecture.distinct('topic');

        res.render("admin/lectureForm.ejs", {
            lecture,
            courses,
            topics,
            isEdit: true,
            user: req.user
        });

    } catch (error) {
        console.error("Render edit lecture form error:", error);
        req.flash("error", "Failed to load lecture form");
        res.redirect("/admin/lectures");
    }
};

// ===== 6. Update Lecture =====
module.exports.updateLecture = async (req, res) => {
    try {
        const { id } = req.params;
        const lectureData = req.body;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        // Update fields
        Object.assign(lecture, lectureData);
        lecture.updatedBy = req.user._id;

        // Update video if new file uploaded
        if (req.file) {
            // Delete old video from cloudinary if exists
            if (lecture.video?.publicId) {
                try {
                    await cloudinary.uploader.destroy(lecture.video.publicId, { resource_type: "video" });
                } catch (err) {
                    console.error("Cloudinary delete error:", err);
                }
            }
            lecture.video = {
                ...lecture.video,
                publicId: req.file.filename,
                url: req.file.path
            };
        }

        await lecture.save();

        // Handle course assignment
        if (lectureData.courseId && lectureData.courseId !== '') {
            // Check if already in course
            if (!lecture.isInCourse(lectureData.courseId)) {
                await lecture.addToCourse(
                    lectureData.courseId,
                    lectureData.section || "General",
                    parseInt(lectureData.order) || 0
                );
            } else {
                // Update section and order
                const courseData = lecture.courses.find(
                    c => c.courseId.toString() === lectureData.courseId
                );
                if (courseData) {
                    courseData.section = lectureData.section || "General";
                    courseData.order = parseInt(lectureData.order) || 0;
                    await lecture.save();
                }
            }
        }

        req.flash("success", "Lecture updated successfully!");
        res.redirect(`/admin/lectures/${id}`);

    } catch (error) {
        console.error("Update lecture error:", error);
        req.flash("error", "Failed to update lecture: " + error.message);
        res.redirect(`/admin/lectures/${req.params.id}/edit`);
    }
};

// ===== 7. Delete Lecture =====
module.exports.deleteLecture = async (req, res) => {
    try {
        const { id } = req.params;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found"
            });
        }

        // Delete video from cloudinary
        if (lecture.video?.publicId) {
            try {
                await cloudinary.uploader.destroy(lecture.video.publicId, { resource_type: "video" });
            } catch (err) {
                console.error("Cloudinary delete error:", err);
            }
        }

        await Lecture.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Lecture deleted successfully"
        });

    } catch (error) {
        console.error("Delete lecture error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete lecture"
        });
    }
};

// ===== 8. Toggle Publish Status =====
module.exports.togglePublish = async (req, res) => {
    try {
        const { id } = req.params;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        lecture.isPublished = !lecture.isPublished;
        await lecture.save();

        req.flash("success", `Lecture ${lecture.isPublished ? 'published' : 'unpublished'} successfully`);
        res.redirect("/admin/lectures");

    } catch (error) {
        console.error("Toggle publish error:", error);
        req.flash("error", "Failed to update lecture status");
        res.redirect("/admin/lectures");
    }
};

// ============================================================
// DUPLICATE LECTURE
// ============================================================
module.exports.duplicateLecture = async (req, res) => {
    try {
        const { id } = req.params;

        const original = await Lecture.findById(id);
        if (!original) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        // Create copy
        const copy = new Lecture({
            ...original.toObject(),
            _id: undefined,
            title: `${original.title} (Copy)`,
            createdAt: undefined,
            updatedAt: undefined,
            createdBy: req.user._id,
            isPublished: false,
            courses: []
        });

        await copy.save();

        req.flash("success", "Lecture duplicated successfully!");
        res.redirect(`/admin/lectures/${copy._id}/edit`);

    } catch (error) {
        console.error("Duplicate lecture error:", error);
        req.flash("error", "Failed to duplicate lecture");
        res.redirect("/admin/lectures");
    }
};

// ============================================================
// BULK ACTIONS
// ============================================================
module.exports.bulkAction = async (req, res) => {
    try {
        const { action, lectureIds } = req.body;

        if (!action || !lectureIds || lectureIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid request"
            });
        }

        switch (action) {
            case 'publish':
                await Lecture.updateMany(
                    { _id: { $in: lectureIds } },
                    { $set: { isPublished: true } }
                );
                break;
            case 'unpublish':
                await Lecture.updateMany(
                    { _id: { $in: lectureIds } },
                    { $set: { isPublished: false } }
                );
                break;
            case 'delete':
                await Lecture.deleteMany({ _id: { $in: lectureIds } });
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid action"
                });
        }

        res.json({
            success: true,
            message: "Bulk action completed successfully"
        });

    } catch (error) {
        console.error("Bulk action error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to perform bulk action"
        });
    }
};

// ============================================================
// HELPERS (Existing functions - keep as is)
// ============================================================

// ✅ Generate short-lived signed URL using crypto (no JWT needed!)
function generateSignedUrl(lectureId, userId) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + VIDEO_URL_TTL_SECONDS;
    
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
    
    if (signature !== expectedSignature) return false;
    
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expiresAt)) return false;
    
    return true;
}

// Confirms the lecture is actually part of the course AND the user is enrolled
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
// USER FACING FUNCTIONS (Existing)
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

        const videoDuration = duration || lecture.video?.duration || 0;
        if (currentTime && videoDuration > 0) {
            progress.lastPosition = currentTime;
            progress.watchTime = Math.max(progress.watchTime || 0, currentTime);
            progress.watchPercentage = Math.min(Math.round((currentTime / videoDuration) * 100), 100);
        }

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