const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [100, "Name cannot exceed 100 characters"]
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"]
    },

    mobile: {
        type: String,
        trim: true,
        default: "",
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"]
    },

    subject: {
        type: String,
        enum: [
            "General Inquiry",
            "Course Information",
            "Certification Support",
            "Corporate Training",
            "Technical Support",
            "Partnership Opportunities",
            "Demo Request",
            "Career Opportunities",
            "Feedback",
            "other"
        ],
        required: [true, "Subject is required"]
    },

    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true,
        minlength: [5, "Message must be at least 5 characters"],
        maxlength: [1000, "Message cannot exceed 1000 characters"]
    },

    msgDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    isSeen: {
        type: Boolean,
        default: false
    },

    ipAddress: {
        type: String,
        default: null
    },

    userAgent: {
        type: String,
        default: null
    },

    // ✅ FIXED: Only ONE contactType field
    contactType: {
        type: String,
        enum: [
            "general",
            "contact",
            "feedback",
            "support",
            "complaint",
            "chatbot",
            "demo",
            "course_inquiry",
            "quick_contact"
        ],
        default: "general"
    }

}, {
    timestamps: true
});

// ========== INDEXES ==========
contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ ipAddress: 1, createdAt: -1 });
contactSchema.index({ isSeen: 1 });
contactSchema.index({ contactType: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Contact", contactSchema);