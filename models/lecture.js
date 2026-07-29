const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lectureSchema = new Schema({
    // ===== BASIC INFORMATION =====
    title: {
        type: String,
        required: [true, "Lecture title is required"],
        trim: true,
        minlength: [3, "Title must be at least 3 characters"],
        maxlength: [200, "Title cannot exceed 200 characters"]
    },

    description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"],
        default: ""
    },

    // ===== TOPIC/CATEGORY =====
    // 🔓 No enum here on purpose — this app covers every kind of course
    // (tech, non-tech, civil, medical, arts, language, test-prep, etc.),
    // so admins can type whatever topic fits instead of being limited to a
    // fixed tech list. `subTopic` still exists for finer-grained tagging.
    topic: {
        type: String,
        required: [true, "Topic is required"],
        trim: true,
        maxlength: [100, "Topic cannot exceed 100 characters"],
        index: true
    },

    subTopic: {
        type: String,
        trim: true,
        index: true
    },

    difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner"
    },

    type: {
        type: String,
        enum: ['video', 'quiz', 'assignment', 'document', 'project', 'live', 'theory'],
        default: 'video'
    },

    // ===== VIDEO CONTENT =====
    video: {
        provider: {
            type: String,
            enum: ['vimeo', 'youtube', 'cloudinary', 'custom'],
            default: 'cloudinary'
        },
        // publicId is the ONLY thing we trust for cloudinary — raw/signed urls
        // are generated on-demand server-side, never stored as a permanent
        // public link, so a stolen link expires quickly and can't be re-shared.
        publicId: {
            type: String,
            trim: true
        },
        url: {
            type: String,
            trim: true
        },
        embedId: {
            type: String,
            trim: true
        },
        path: {
            type: String,
            trim: true
        },
        duration: {
            type: Number, // seconds — authoritative source of truth for completion checks
            min: 0,
            default: 0
        },
        size: {
            type: Number,
            default: 0
        },
        thumbnail: {
            url: String,
            filename: String
        },
        captions: [{
            language: { type: String, default: "en" },
            url: String,
            filename: String
        }]
    },

    // ===== RESOURCES =====
    resources: [{
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['pdf', 'ppt', 'doc', 'image', 'link', 'other'], default: 'other' },
        url: { type: String, trim: true },
        cloudinaryId: { type: String, trim: true },
        size: { type: Number, default: 0 },
        isDownloadable: { type: Boolean, default: false }
    }],

    attachments: [{
        title: String,
        file: { url: String, filename: String, publicId: String },
        watermarked: { type: Boolean, default: true },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ===== QUIZ (if applicable) =====
    quiz: {
        timeLimit: { type: Number, default: 0 },
        passingScore: { type: Number, min: 0, max: 100, default: 70 },
        questions: [{
            question: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctAnswer: { type: Number, required: true, min: 0 },
            explanation: { type: String, default: "" },
            points: { type: Number, default: 10 }
        }]
    },

    // ===== ACCESS CONTROL =====
    isFree: {
        type: Boolean,
        default: false
    },

    isPublished: {
        type: Boolean,
        default: true,
        index: true
    },

    // ===== COMPLETION RULES =====
    // A lecture only counts as "completed" once the learner has watched at
    // least this percentage of the video (or the native <video> `ended`
    // event has fired). Enforced server-side in lectureController — never
    // trust a client-sent `completed: true` flag on its own.
    minWatchPercentage: {
        type: Number,
        min: 50,
        max: 100,
        default: 95
    },

    // ===== COURSES USING THIS LECTURE =====
    courses: [{
        courseId: { type: Schema.Types.ObjectId, ref: "Cources", required: true },
        section: { type: String, trim: true, default: "General" },
        order: { type: Number, default: 0 },
        isPublished: { type: Boolean, default: true },
        addedAt: { type: Date, default: Date.now }
    }],

    // ===== DEPRECATED: Single course reference (kept for backward compatibility) =====
    course: { type: Schema.Types.ObjectId, ref: "Cources", index: true },
    section: { type: String, trim: true, default: "General" },
    order: { type: Number, default: 0 },

    // ===== DISCUSSION =====
    allowComments: { type: Boolean, default: true },
    comments: [{
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true, maxlength: 1000 },
        timestamp: { type: Date, default: Date.now },
        replies: [{
            user: { type: Schema.Types.ObjectId, ref: "User" },
            text: String,
            timestamp: { type: Date, default: Date.now }
        }],
        isPinned: { type: Boolean, default: false }
    }],

    // ===== SEO & METADATA =====
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    keywords: [String],
    tags: [String],

    // ===== TIMESTAMPS =====
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },

    // ===== CREATOR =====
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, {
    timestamps: true
});

// ========== INDEXES ==========
lectureSchema.index({ topic: 1, isPublished: 1 });
lectureSchema.index({ "courses.courseId": 1 });
lectureSchema.index({ "courses.section": 1 });
lectureSchema.index({ course: 1, order: 1 });

// ========== VIRTUAL FIELDS ==========
lectureSchema.virtual('durationFormatted').get(function () {
    if (!this.video?.duration) return '00:00';
    const mins = Math.floor(this.video.duration / 60);
    const secs = this.video.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
});

lectureSchema.virtual('courseCount').get(function () {
    return this.courses ? this.courses.length : (this.course ? 1 : 0);
});

// ========== INSTANCE METHODS ==========

lectureSchema.methods.isInCourse = function (courseId) {
    if (this.courses && this.courses.length > 0) {
        return this.courses.some(c => c.courseId.toString() === courseId.toString());
    }
    return this.course && this.course.toString() === courseId.toString();
};

lectureSchema.methods.getCourseDetails = function (courseId) {
    if (this.courses && this.courses.length > 0) {
        return this.courses.find(c => c.courseId.toString() === courseId.toString()) || null;
    }
    if (this.course && this.course.toString() === courseId.toString()) {
        return { courseId: this.course, section: this.section, order: this.order, isPublished: this.isPublished };
    }
    return null;
};

lectureSchema.methods.addToCourse = async function (courseId, section = "General", order = 0) {
    if (this.isInCourse(courseId)) {
        throw new Error("Lecture already added to this course");
    }
    this.courses.push({ courseId, section, order, isPublished: true, addedAt: new Date() });

    const Course = mongoose.model('Cources');
    await Course.findByIdAndUpdate(courseId, { $inc: { totalLectures: 1 } });

    await this.save();
    return this;
};

lectureSchema.methods.removeFromCourse = async function (courseId) {
    if (!this.isInCourse(courseId)) {
        throw new Error("Lecture not found in this course");
    }
    this.courses = this.courses.filter(c => c.courseId.toString() !== courseId.toString());

    const Course = mongoose.model('Cources');
    await Course.findByIdAndUpdate(courseId, { $inc: { totalLectures: -1 } });

    await this.save();
    return this;
};

lectureSchema.methods.updateOrderInCourse = async function (courseId, newOrder, newSection = null) {
    const courseData = this.courses.find(c => c.courseId.toString() === courseId.toString());
    if (!courseData) {
        throw new Error("Lecture not found in this course");
    }
    courseData.order = newOrder;
    if (newSection) courseData.section = newSection;

    await this.save();
    return this;
};

// ✅ Real, DB-backed enrollment check — the single source of truth used by
// every access-controlled endpoint (secure video URL, progress updates, etc.)
lectureSchema.methods.canAccess = async function (userId, courseId = null) {
    if (this.isFree) return true;
    if (!userId) return false;

    const Course = mongoose.model('Cources');

    const checkCourse = async (cid) => {
        const course = await Course.findById(cid).select('students').lean();
        if (!course) return false;
        return course.students.some(s => s.user.toString() === userId.toString());
    };

    if (courseId && this.isInCourse(courseId)) {
        return checkCourse(courseId);
    }

    for (const c of this.courses || []) {
        if (await checkCourse(c.courseId)) return true;
    }

    if (this.course) {
        return checkCourse(this.course);
    }

    return false;
};

// ========== STATIC METHODS ==========

lectureSchema.statics.getCourseLectures = async function (courseId, userId = null) {
    const lectures = await this.find({
        $or: [{ "courses.courseId": courseId }, { course: courseId }],
        isPublished: true
    })
        .sort({ "courses.order": 1, order: 1 })
        .lean();

    const grouped = {};
    lectures.forEach(lect => {
        const courseDetails = lect.courses?.find(c => c.courseId.toString() === courseId.toString()) ||
            { section: lect.section || "General", order: lect.order || 0 };

        const section = courseDetails.section || "General";
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push({ ...lect, section, order: courseDetails.order });
    });

    const sortedSections = {};
    Object.keys(grouped).sort().forEach(key => {
        sortedSections[key] = grouped[key].sort((a, b) => a.order - b.order);
    });

    return sortedSections;
};

lectureSchema.statics.getByTopic = async function (topic, limit = 20) {
    return await this.find({ topic, isPublished: true }).sort({ createdAt: -1 }).limit(limit).lean();
};

lectureSchema.statics.getPopularLectures = async function (limit = 10) {
    return await this.aggregate([
        { $match: { isPublished: true } },
        { $addFields: { courseCount: { $size: { $ifNull: ["$courses", []] } } } },
        { $sort: { courseCount: -1, views: -1 } },
        { $limit: limit }
    ]);
};

lectureSchema.statics.search = async function (query, options = {}) {
    const { limit = 20, skip = 0, topic = null } = options;

    let searchQuery = {
        isPublished: true,
        $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { topic: { $regex: query, $options: 'i' } },
            { subTopic: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    if (topic) searchQuery.topic = topic;

    return await this.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
};

lectureSchema.statics.getTopics = async function () {
    return await this.distinct('topic', { isPublished: true });
};

module.exports = mongoose.model("Lecture", lectureSchema);