const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lectureProgressSchema = new Schema({
    // ===== RELATIONSHIPS =====
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Cources",
        required: true,
        index: true
    },
    lecture: {
        type: Schema.Types.ObjectId,
        ref: "Lecture",
        required: true,
        index: true
    },
    
    // ===== PROGRESS TRACKING =====
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    
    // Watch time tracking
    watchTime: {
        type: Number, // in seconds
        default: 0
    },
    watchPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    lastPosition: {
        type: Number, // in seconds
        default: 0
    },
    
    // ===== QUIZ RESULTS =====
    quizScore: {
        type: Number,
        default: 0
    },
    quizCompleted: {
        type: Boolean,
        default: false
    },
    quizAttempts: {
        type: Number,
        default: 0
    },
    
    // ===== ACTIVITY =====
    lastAccessed: {
        type: Date,
        default: Date.now,
        index: true
    },
    firstAccessed: {
        type: Date,
        default: Date.now
    },
    
    // ===== NOTES =====
    notes: {
        type: String,
        trim: true,
        maxlength: 5000
    },
    bookmarks: [{
        timestamp: Number,
        note: String
    }],
    
    // ===== DEVICE INFO =====
    deviceInfo: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// ========== INDEXES ==========
lectureProgressSchema.index({ user: 1, course: 1, lecture: 1 }, { unique: true });
lectureProgressSchema.index({ user: 1, isCompleted: 1 });
lectureProgressSchema.index({ course: 1, isCompleted: 1 });

// ========== STATIC METHODS ==========
lectureProgressSchema.statics.getCourseProgress = async function(userId, courseId) {
    const progress = await this.find({
        user: userId,
        course: courseId
    });
    
    const total = progress.length;
    const completed = progress.filter(p => p.isCompleted).length;
    
    return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        lectures: progress
    };
};

lectureProgressSchema.statics.getCompletedLectures = async function(userId, courseId) {
    const progress = await this.find({
        user: userId,
        course: courseId,
        isCompleted: true
    }).select('lecture');
    
    return progress.map(p => p.lecture.toString());
};

// ========== INSTANCE METHODS ==========
lectureProgressSchema.methods.markComplete = async function() {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.watchPercentage = 100;
    await this.save();
    return this;
};

lectureProgressSchema.methods.updateWatchTime = async function(seconds) {
    this.watchTime += seconds;
    this.lastAccessed = new Date();
    // Update percentage based on lecture duration
    if (this.lecture?.video?.duration) {
        this.watchPercentage = Math.min(
            Math.round((this.watchTime / this.lecture.video.duration) * 100),
            100
        );
    }
    await this.save();
    return this;
};

module.exports = mongoose.model("LectureProgress", lectureProgressSchema);