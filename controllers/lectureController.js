const Lecture = require("../models/lecture");
const Course = require("../models/cources");
const LectureProgress = require("../models/lectureProgress");
// ⚠️ Cloudconfig.js exports { cloudinary, storage, videoStorage } — destructure it.
// (Previously this file did `const cloudinary = require(...)`, which actually
// grabbed the whole { cloudinary, storage } object, so every
// `cloudinary.uploader.destroy(...)` call below was silently broken.)
const { cloudinary, videoStorage } = require("../Cloudconfig.js");
const crypto = require("crypto");

const VIDEO_TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || process.env.SECRET || "institutehub-secret-key";
const VIDEO_URL_TTL_SECONDS = 60 * 30; // 30 minutes

// Watermark text is burned directly into the video pixels (not just an
// overlay in the DOM), so even a screen recording carries the viewer's
// identity — this is what actually discourages someone from re-sharing
// a recording of the lecture.
function buildWatermarkText(user) {
    // Cloudinary's l_text overlay treats "," and "/" as transformation
    // delimiters, so we sanitize those out of the burned-in text.
    const safe = (str = "") => String(str).replace(/,/g, " ").replace(/\//g, "-");
    return `${safe(user.email)} | ${safe(user._id.toString())}`;
}

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
        const lectureData = { ...req.body };
        lectureData.createdBy = req.user._id;

        // HTML checkboxes send "on" when checked and no field at all when
        // unchecked — Mongoose's Boolean caster only understands
        // true/false/"true"/"false"/0/1, so "on" throws a CastError.
        lectureData.isPublished = lectureData.isPublished === 'on' || lectureData.isPublished === 'true';
        lectureData.isFree = lectureData.isFree === 'on' || lectureData.isFree === 'true';

        // courses[] comes from the multi-course rows in the form, e.g.
        // courses[0][courseId], courses[0][section], courses[0][order]...
        const courseAssignments = Array.isArray(lectureData.courses) ? lectureData.courses : [];
        delete lectureData.courses;
        // legacy single-course fields — no longer used directly on the lecture doc
        delete lectureData.courseId;
        delete lectureData.section;
        delete lectureData.order;

        // The video itself is uploaded separately via createLecture's sibling
        // endpoint (uploadLectureVideo) BEFORE the form is submitted, so
        // video[publicId] etc. already arrive correctly in req.body.
        // req.file here (if present) is only ever the optional thumbnail image.
        if (req.file) {
            lectureData.video = lectureData.video || {};
            lectureData.video.thumbnail = { url: req.file.path, filename: req.file.filename };
        }

        const lecture = new Lecture(lectureData);
        await lecture.save();

        // Attach to every selected course — this is what lets one lecture
        // live inside multiple courses at once.
        for (const assignment of courseAssignments) {
            if (!assignment?.courseId) continue;
            await lecture.addToCourse(
                assignment.courseId,
                assignment.section || "General",
                parseInt(assignment.order) || 0
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

// ===== 3b. Upload lecture video to Cloudinary (AJAX, called BEFORE create/update) =====
// This is the "upload karke, phir yahan add kar sake" step: the admin picks a
// video file, it streams straight to Cloudinary as a private ("authenticated")
// resource, and we hand back just the publicId + duration. The actual
// create/update form submit afterwards is now cheap (no big file in that
// request) and only ever references the publicId.
module.exports.uploadLectureVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No video file received" });
        }

        // multer-storage-cloudinary already streamed the file to Cloudinary
        // (as type: "authenticated", per Cloudconfig.js videoStorage).
        const publicId = req.file.filename;

        // Ask Cloudinary directly for the authoritative duration/format —
        // don't trust anything the client claims about the file.
        const resource = await cloudinary.api.resource(publicId, {
            resource_type: "video",
            type: "authenticated"
        });

        res.json({
            success: true,
            publicId,
            duration: Math.round(resource.duration || 0),
            format: resource.format,
            bytes: resource.bytes
        });
    } catch (error) {
        console.error("Upload lecture video error:", error);
        res.status(500).json({ success: false, message: "Video upload failed: " + error.message });
    }
};

// ===== 3c. Discard an uploaded-but-not-yet-saved video =====
// Called if the admin uploads a video, then cancels/changes their mind
// before hitting "Save" — otherwise it would sit orphaned in Cloudinary.
module.exports.discardUploadedVideo = async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) {
            return res.status(400).json({ success: false, message: "publicId is required" });
        }
        await cloudinary.uploader.destroy(publicId, { resource_type: "video", type: "authenticated" });
        res.json({ success: true });
    } catch (error) {
        console.error("Discard uploaded video error:", error);
        res.status(500).json({ success: false, message: "Failed to discard video" });
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
        const lectureData = { ...req.body };

        const courseAssignments = Array.isArray(lectureData.courses) ? lectureData.courses : [];
        delete lectureData.courses;
        delete lectureData.courseId;
        delete lectureData.section;
        delete lectureData.order;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            req.flash("error", "Lecture not found");
            return res.redirect("/admin/lectures");
        }

        // If admin uploaded a replacement video (different publicId), remove
        // the old one from Cloudinary so we don't leak/pay for orphaned videos.
        const newPublicId = lectureData.video?.publicId;
        if (newPublicId && lecture.video?.publicId && newPublicId !== lecture.video.publicId) {
            try {
                await cloudinary.uploader.destroy(lecture.video.publicId, { resource_type: "video", type: "authenticated" });
            } catch (err) {
                console.error("Cloudinary delete error:", err);
            }
        }

        // HTML checkboxes send "on" when checked, and no field at all when
        // unchecked — normalize both before they hit the schema's Boolean caster.
        lectureData.isPublished = lectureData.isPublished === 'on' || lectureData.isPublished === 'true';
        lectureData.isFree = lectureData.isFree === 'on' || lectureData.isFree === 'true';

        // Update fields
        Object.assign(lecture, lectureData);
        lecture.updatedBy = req.user._id;

        // Thumbnail image (separate from the video itself)
        if (req.file) {
            lecture.video = lecture.video || {};
            lecture.video.thumbnail = { url: req.file.path, filename: req.file.filename };
        }

        // ----- Sync multi-course assignment -----
        const requestedIds = courseAssignments.filter(c => c?.courseId).map(c => c.courseId.toString());
        const currentIds = (lecture.courses || []).map(c => c.courseId.toString());

        // Remove any course this lecture was in but is no longer assigned to
        for (const currentId of currentIds) {
            if (!requestedIds.includes(currentId)) {
                await lecture.removeFromCourse(currentId);
            }
        }

        // Add new ones / update section+order on existing ones
        for (const assignment of courseAssignments) {
            if (!assignment?.courseId) continue;
            if (lecture.isInCourse(assignment.courseId)) {
                await lecture.updateOrderInCourse(
                    assignment.courseId,
                    parseInt(assignment.order) || 0,
                    assignment.section || "General"
                );
            } else {
                await lecture.addToCourse(
                    assignment.courseId,
                    assignment.section || "General",
                    parseInt(assignment.order) || 0
                );
            }
        }

        await lecture.save();

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
                await cloudinary.uploader.destroy(lecture.video.publicId, { resource_type: "video", type: "authenticated" });
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

// Generates a short-lived, signed URL for the video — with the viewer's
// email + user id burned directly into the frames (not a DOM overlay a
// screen-recorder could strip out just by hiding an element first).
function generateSecureVideoUrl(lecture, user) {
    const { provider, publicId, url, embedId } = lecture.video || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + VIDEO_URL_TTL_SECONDS;

    if (provider === "cloudinary" && publicId) {
        const watermarkText = buildWatermarkText(user);

        const signedUrl = cloudinary.url(publicId, {
            resource_type: "video",
            type: "authenticated",
            sign_url: true,
            secure: true,
            expires_at: expiresAt,
            transformation: [
                // Bottom-right, semi-opaque
                {
                    overlay: {
                        font_family: "Arial",
                        font_size: 16,
                        font_weight: "bold",
                        text: watermarkText
                    },
                    color: "white",
                    opacity: 55,
                    gravity: "south_east",
                    x: 20,
                    y: 20
                },
                // Also top-left, fainter — makes it harder to crop out both
                {
                    overlay: {
                        font_family: "Arial",
                        font_size: 14,
                        text: watermarkText
                    },
                    color: "white",
                    opacity: 35,
                    gravity: "north_west",
                    x: 20,
                    y: 20
                }
            ]
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

// ✅ AJAX: attach an existing lecture to another course (many-to-many)
module.exports.addToCourse = async (req, res) => {
    try {
        const { lectureId, courseId, section, order } = req.body;
        if (!lectureId || !courseId) {
            return res.status(400).json({ success: false, message: "lectureId and courseId are required" });
        }

        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        if (lecture.isInCourse(courseId)) {
            return res.status(400).json({ success: false, message: "Lecture is already added to this course" });
        }

        await lecture.addToCourse(courseId, section || "General", parseInt(order) || 0);
        res.json({ success: true, message: "Lecture added to course", courses: lecture.courses });
    } catch (error) {
        console.error("Add to course error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to add lecture to course" });
    }
};

// ✅ AJAX: detach a lecture from one course (it stays in any others it's part of)
module.exports.removeFromCourse = async (req, res) => {
    try {
        const { lectureId, courseId } = req.params;

        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        if (!lecture.isInCourse(courseId)) {
            return res.status(400).json({ success: false, message: "Lecture is not part of this course" });
        }

        await lecture.removeFromCourse(courseId);
        res.json({ success: true, message: "Lecture removed from course" });
    } catch (error) {
        console.error("Remove from course error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to remove lecture from course" });
    }
};

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