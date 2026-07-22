const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lectureProgressSchema = new Schema({
    // ===== RELATIONSHIPS =====
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Cources", required: true, index: true },
    lecture: { type: Schema.Types.ObjectId, ref: "Lecture", required: true, index: true },

    // ===== PROGRESS TRACKING =====
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: { type: Date },

    // ✅ Set only when the native <video> `ended` event actually fired.
    // This is the strongest signal we have that the learner watched the
    // lecture start-to-finish, and is checked server-side before allowing
    // isCompleted to flip to true.
    videoEnded: {
        type: Boolean,
        default: false
    },

    watchTime: { type: Number, default: 0 }, // cumulative seconds actually played
    watchPercentage: { type: Number, min: 0, max: 100, default: 0 },
    lastPosition: { type: Number, default: 0 }, // seconds — used to resume playback

    // ===== QUIZ RESULTS =====
    quizScore: { type: Number, default: 0 },
    quizCompleted: { type: Boolean, default: false },
    quizAttempts: { type: Number, default: 0 },

    // ===== ACTIVITY =====
    lastAccessed: { type: Date, default: Date.now, index: true },
    firstAccessed: { type: Date, default: Date.now },

    // ===== NOTES =====
    notes: { type: String, trim: true, maxlength: 5000 },
    bookmarks: [{ timestamp: Number, note: String }],

    // ===== DEVICE / SESSION INFO (useful for abuse detection) =====
    deviceInfo: { type: String, default: "" },
    lastIp: { type: String, default: "" }
}, {
    timestamps: true
});

// ========== INDEXES ==========
lectureProgressSchema.index({ user: 1, course: 1, lecture: 1 }, { unique: true });
lectureProgressSchema.index({ user: 1, isCompleted: 1 });
lectureProgressSchema.index({ course: 1, isCompleted: 1 });

// ========== STATIC METHODS ==========
lectureProgressSchema.statics.getCourseProgress = async function (userId, courseId) {
    const progress = await this.find({ user: userId, course: courseId });

    const total = progress.length;
    const completed = progress.filter(p => p.isCompleted).length;

    return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        lectures: progress
    };
};

lectureProgressSchema.statics.getCompletedLectures = async function (userId, courseId) {
    const progress = await this.find({ user: userId, course: courseId, isCompleted: true }).select('lecture');
    return progress.map(p => p.lecture.toString());
};

// ✅ Find-or-create helper so controllers never have to worry about the
// unique-index race condition on first access.
lectureProgressSchema.statics.getOrCreate = async function (userId, courseId, lectureId) {
    let progress = await this.findOne({ user: userId, course: courseId, lecture: lectureId });
    if (!progress) {
        progress = await this.create({
            user: userId,
            course: courseId,
            lecture: lectureId,
            firstAccessed: new Date(),
            lastAccessed: new Date()
        });
    }
    return progress;
};

// ========== INSTANCE METHODS ==========

// ⚠️ Deprecated direct-complete — kept for backward compatibility with admin
// tools, but the student-facing flow should always go through
// `applyPlaybackUpdate`, which enforces the actual watch-through rule.
lectureProgressSchema.methods.markComplete = async function () {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.watchPercentage = 100;
    this.videoEnded = true;
    await this.save();
    return this;
};

lectureProgressSchema.methods.markIncomplete = async function () {
    this.isCompleted = false;
    this.completedAt = undefined;
    await this.save();
    return this;
};

// ✅ The ONLY method the public progress-tracking API should call.
// `currentTime`/`duration` come from the actual <video> element on the
// client; `ended` reflects the native `ended` event. We recompute the
// percentage ourselves rather than trusting a client-sent percentage,
// and only flip isCompleted when the learner has genuinely watched
// through (ended === true) OR crossed the lecture's minWatchPercentage.
lectureProgressSchema.methods.applyPlaybackUpdate = async function ({
    currentTime = 0,
    duration = 0,
    ended = false,
    minWatchPercentage = 95
}) {
    const safeDuration = Math.max(Number(duration) || 0, 1);
    const safeCurrentTime = Math.max(Number(currentTime) || 0, 0);

    const computedPercentage = Math.min(
        Math.round((safeCurrentTime / safeDuration) * 100),
        100
    );

    // watchTime only ever grows — never let a rewind reduce recorded progress
    this.watchTime = Math.max(this.watchTime, safeCurrentTime);
    this.watchPercentage = Math.max(this.watchPercentage, computedPercentage);
    this.lastPosition = safeCurrentTime;
    this.lastAccessed = new Date();

    if (ended) this.videoEnded = true;

    const qualifiesAsComplete =
        this.videoEnded || this.watchPercentage >= minWatchPercentage;

    if (qualifiesAsComplete && !this.isCompleted) {
        this.isCompleted = true;
        this.completedAt = new Date();
    }

    await this.save();
    return this;
};

module.exports = mongoose.model("LectureProgress", lectureProgressSchema);