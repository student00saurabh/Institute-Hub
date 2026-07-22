const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lectureSchema = new Schema({
    // ===== COURSE RELATIONSHIP =====
    course: {
        type: Schema.Types.ObjectId,
        ref: "Cources",
        required: true,
        index: true
    },
    
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
    
    // ===== ORDERING =====
    section: {
        type: String,
        trim: true,
        default: "General"
    },
    
    order: {
        type: Number,
        required: true,
        default: 0,
        index: true
    },
    
    // ===== VIDEO CONTENT (SECURE) =====
    video: {
        // For Vimeo/YouTube - secure embed
        provider: {
            type: String,
            enum: ['vimeo', 'youtube', 'cloudinary', 'custom'],
            default: 'cloudinary'
        },
        // Cloudinary public ID (for secure streaming)
        publicId: {
            type: String,
            trim: true
        },
        // Full URL for video
        url: {
            type: String,
            trim: true
        },
        // Vimeo/YouTube embed ID
        embedId: {
            type: String,
            trim: true
        },
        // For self-hosted video
        path: {
            type: String,
            trim: true
        },
        // Video metadata
        duration: {
            type: Number, // in seconds
            min: 0,
            default: 0
        },
        size: {
            type: Number, // in bytes
            default: 0
        },
        thumbnail: {
            url: String,
            filename: String
        },
        // Captions/subtitles
        captions: [{
            language: {
                type: String,
                default: "en"
            },
            url: String,
            filename: String
        }]
    },
    
    // ===== RESOURCES =====
    resources: [{
        title: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['pdf', 'ppt', 'doc', 'image', 'link', 'other'],
            default: 'other'
        },
        url: {
            type: String,
            trim: true
        },
        cloudinaryId: {
            type: String,
            trim: true
        },
        size: {
            type: Number,
            default: 0
        },
        isDownloadable: {
            type: Boolean,
            default: false // Watermarked/secure download
        }
    }],
    
    // ===== ATTACHMENTS (Watermarked) =====
    attachments: [{
        title: String,
        file: {
            url: String,
            filename: String,
            publicId: String
        },
        watermarked: {
            type: Boolean,
            default: true // Watermarked with user ID/course name
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // ===== ACCESS CONTROL =====
    isFree: {
        type: Boolean,
        default: false // Preview lecture for non-enrolled users
    },
    
    isPublished: {
        type: Boolean,
        default: true
    },
    
    requiresQuiz: {
        type: Boolean,
        default: false
    },
    
    // ===== CONTENT TYPES =====
    type: {
        type: String,
        enum: ['video', 'quiz', 'assignment', 'document', 'project', 'live'],
        default: 'video'
    },
    
    // ===== QUIZ (if applicable) =====
    quiz: {
        timeLimit: {
            type: Number, // in minutes
            default: 0 // 0 = no limit
        },
        passingScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 70
        },
        questions: [{
            question: {
                type: String,
                required: true
            },
            options: [{
                type: String,
                required: true
            }],
            correctAnswer: {
                type: Number,
                required: true,
                min: 0
            },
            explanation: {
                type: String,
                default: ""
            },
            points: {
                type: Number,
                default: 10
            }
        }]
    },
    
    // ===== DISCUSSION =====
    allowComments: {
        type: Boolean,
        default: true
    },
    
    comments: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        replies: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: "User"
            },
            text: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
        isPinned: {
            type: Boolean,
            default: false
        }
    }],
    
    // ===== SEO & METADATA =====
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    keywords: [String],
    tags: [String],
    
    // ===== TIMESTAMPS =====
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    publishedAt: {
        type: Date
    },
    
    // ===== CREATOR =====
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true // Auto manages createdAt, updatedAt
});

// ========== INDEXES ==========
lectureSchema.index({ course: 1, order: 1 });
lectureSchema.index({ course: 1, section: 1, order: 1 });
lectureSchema.index({ isPublished: 1 });
lectureSchema.index({ type: 1 });
lectureSchema.index({ "video.provider": 1 });

// ========== VIRTUAL FIELDS ==========
lectureSchema.virtual('durationFormatted').get(function() {
    if (!this.video.duration) return '00:00';
    const mins = Math.floor(this.video.duration / 60);
    const secs = this.video.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
});

// ========== INSTANCE METHODS ==========
lectureSchema.methods.isEnrolled = async function(userId) {
    const Course = mongoose.model('Cources');
    const course = await Course.findById(this.course);
    if (!course) return false;
    return course.students.some(s => s.user.toString() === userId.toString());
};

lectureSchema.methods.canAccess = async function(userId) {
    if (this.isFree) return true;
    return await this.isEnrolled(userId);
};

// Get secure streaming URL (with token)
lectureSchema.methods.getSecureStreamUrl = function(userId) {
    if (!this.video.publicId) return null;
    
    // For Cloudinary with signed URLs
    const cloudinary = require('../Cloudconfig');
    const timestamp = Math.floor(Date.now() / 1000);
    const token = cloudinary.utils.sign_request({
        public_id: this.video.publicId,
        timestamp: timestamp,
        source: 'lecture'
    });
    
    return {
        url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/fl_attachment/${this.video.publicId}.mp4`,
        token: token,
        expiresIn: 3600 // 1 hour
    };
};

// ========== STATIC METHODS ==========
lectureSchema.statics.getCourseLectures = async function(courseId, userId = null) {
    const query = { course: courseId, isPublished: true };
    const lectures = await this.find(query)
        .sort({ section: 1, order: 1 })
        .lean();
    
    // Group by section
    const grouped = {};
    lectures.forEach(lect => {
        if (!grouped[lect.section]) {
            grouped[lect.section] = [];
        }
        grouped[lect.section].push(lect);
    });
    
    return grouped;
};

lectureSchema.statics.getNextLecture = async function(courseId, currentOrder) {
    return await this.findOne({
        course: courseId,
        order: { $gt: currentOrder },
        isPublished: true
    }).sort({ order: 1 });
};

module.exports = mongoose.model("Lecture", lectureSchema);