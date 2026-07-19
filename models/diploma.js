/**
 * Diploma Enrollment Model
 * Stores all enrollment applications for the Advanced Diploma program
 * Created: 2026-01-15
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Diploma Enrollment Schema
const diplomaSchema = new Schema({
    // Personal Information
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
        minlength: [3, "Name must be at least 3 characters"],
        maxlength: [100, "Name cannot exceed 100 characters"]
    },
    
    email: {
        type: String,
        required: [true, "Email address is required"],
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
    },
    
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"]
    },
    
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        minlength: [2, "City name must be at least 2 characters"]
    },
    
    // Educational Information
    qualification: {
        type: String,
        required: [true, "Qualification is required"],
        enum: ["Graduate", "Post Graduate", "Pursuing Graduation", "Diploma", "Other"],
        default: "Graduate"
    },
    
    // Program Preferences
    preferredMode: {
        type: String,
        required: [true, "Preferred mode is required"],
        enum: ["online", "classroom", "hybrid"],
        default: "online"
    },
    
    preferredBatch: {
        type: String,
        required: [true, "Preferred batch is required"],
        enum: ["weekend", "weekday"],
        default: "weekend"
    },
    
    // Additional Information
    message: {
        type: String,
        trim: true,
        maxlength: [500, "Message cannot exceed 500 characters"]
    },
    
    // System Fields
    program: {
        type: String,
        default: "Advanced Diploma in Cybersecurity & Intelligent Defense Systems"
    },
    
    status: {
        type: String,
        enum: ["pending", "contacted", "enrolled", "rejected"],
        default: "pending"
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // Admin Notes
    adminNotes: {
        type: String,
        default: ""
    },
    
    // Contacted By (Admin Name/ID)
    contactedBy: {
        type: String,
        default: ""
    }
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

// Index for faster searches
diplomaSchema.index({ email: 1 });
diplomaSchema.index({ status: 1 });
diplomaSchema.index({ createdAt: -1 });

// Virtual field for display
diplomaSchema.virtual("displayMode").get(function() {
    const modes = {
        online: "🌐 Online",
        classroom: "🏛️ Classroom (New Delhi)",
        hybrid: "💻 Hybrid"
    };
    return modes[this.preferredMode] || this.preferredMode;
});

diplomaSchema.virtual("displayBatch").get(function() {
    const batches = {
        weekend: "📅 Weekend Batch (Sat-Sun)",
        weekday: "📅 Weekday Batch (Mon-Fri)"
    };
    return batches[this.preferredBatch] || this.preferredBatch;
});

// Instance method to update status
diplomaSchema.methods.updateStatus = async function(newStatus, adminName = "") {
    this.status = newStatus;
    this.updatedAt = Date.now();
    if (adminName) this.contactedBy = adminName;
    await this.save();
    return this;
};

// Static method to get statistics
diplomaSchema.statics.getStatistics = async function() {
    return await this.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: null,
                stats: {
                    $push: { status: "$_id", count: "$count" }
                },
                total: { $sum: "$count" }
            }
        }
    ]);
};

module.exports = mongoose.model("Diploma", diplomaSchema);