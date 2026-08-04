const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const loginActivitySchema = new Schema({
    // User reference
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Login/Logout times
    loginTime: {
        type: Date,
        default: Date.now
    },
    logoutTime: {
        type: Date,
        default: null
    },
    sessionDuration: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ["success", "failed", "locked"],
        default: "success"
    },

    // ========== DEVICE INFORMATION ==========
    deviceType: {
        type: String,
        enum: ["desktop", "mobile", "tablet", "other"],
        default: "other"
    },
    deviceModel: {
        type: String,
        default: "Unknown"
    },
    deviceVendor: {
        type: String,
        default: "Unknown"
    },
    browser: {
        type: String,
        default: "Unknown"
    },
    browserVersion: {
        type: String,
        default: "Unknown"
    },
    os: {
        type: String,
        default: "Unknown"
    },
    osVersion: {
        type: String,
        default: "Unknown"
    },

    // ========== NETWORK INFORMATION ==========
    networkType: {
        type: String,
        enum: ["WiFi", "Ethernet", "cellular", "4G", "5G", "3G", "unknown"],
        default: "unknown"
    },
    ipAddress: {
        type: String,
        default: "Unknown"
    },

    // ========== LOCATION INFORMATION ==========
    location: {
        city: { type: String, default: "Unknown" },
        country: { type: String, default: "Unknown" },
        countryCode: { type: String, default: "XX" },
        region: { type: String, default: "Unknown" },
        postalCode: { type: String, default: "Unknown" },
        timezone: { type: String, default: "UTC" },
        isp: { type: String, default: "Unknown" },
        asn: { type: String, default: "Unknown" },
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
        accuracy: { 
            type: String, 
            enum: ["high", "medium", "low", "unknown"],
            default: "unknown"
        }
    },

    // ========== SECURITY INFORMATION ==========
    security: {
        isProxy: { type: Boolean, default: false },
        isHosting: { type: Boolean, default: false },
        isMobileNetwork: { type: Boolean, default: false },
        isNewDevice: { type: Boolean, default: false },
        isNewLocation: { type: Boolean, default: false },
        riskScore: { type: Number, default: 0, min: 0, max: 100 }
    },

    // Raw data
    userAgent: {
        type: String,
        default: ""
    },

    // Failure reason
    failureReason: {
        type: String,
        default: null
    },

    // Logout reason
    logoutReason: {
        type: String,
        enum: ["user_logout", "session_expired", "forced_logout", "inactivity"],
        default: null
    },

    // Session ID reference
    sessionId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// ========== INDEXES ==========
loginActivitySchema.index({ user: 1, loginTime: -1 });
loginActivitySchema.index({ sessionId: 1 });
loginActivitySchema.index({ "location.country": 1 });
loginActivitySchema.index({ "security.riskScore": -1 });

// ========== VIRTUAL FIELDS ==========
loginActivitySchema.virtual('isActive').get(function() {
    return !this.logoutTime;
});

loginActivitySchema.virtual('durationFormatted').get(function() {
    if (!this.sessionDuration) return '0s';
    const hours = Math.floor(this.sessionDuration / 3600);
    const minutes = Math.floor((this.sessionDuration % 3600) / 60);
    const seconds = this.sessionDuration % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
});

loginActivitySchema.virtual('locationDisplay').get(function() {
    const parts = [];
    if (this.location?.city && this.location?.city !== 'Unknown') {
        parts.push(this.location.city);
    }
    if (this.location?.region && this.location?.region !== 'Unknown') {
        parts.push(this.location.region);
    }
    if (this.location?.country && this.location?.country !== 'Unknown') {
        parts.push(this.location.country);
    }
    return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
});

loginActivitySchema.virtual('deviceDisplay').get(function() {
    const parts = [];
    if (this.deviceVendor && this.deviceVendor !== 'Unknown') {
        parts.push(this.deviceVendor);
    }
    if (this.deviceModel && this.deviceModel !== 'Unknown') {
        parts.push(this.deviceModel);
    }
    if (this.deviceType && this.deviceType !== 'other') {
        parts.push(`(${this.deviceType})`);
    }
    return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
});

loginActivitySchema.virtual('browserDisplay').get(function() {
    const parts = [];
    if (this.browser && this.browser !== 'Unknown') {
        parts.push(this.browser);
    }
    if (this.browserVersion && this.browserVersion !== 'Unknown') {
        parts.push(`v${this.browserVersion}`);
    }
    if (this.os && this.os !== 'Unknown') {
        parts.push(`on ${this.os}`);
        if (this.osVersion && this.osVersion !== 'Unknown') {
            parts.push(this.osVersion);
        }
    }
    return parts.join(' ');
});

// ========== STATIC METHODS ==========

loginActivitySchema.statics.getActiveSessions = async function(userId) {
    return await this.find({
        user: userId,
        logoutTime: null
    }).sort({ loginTime: -1 });
};

loginActivitySchema.statics.getHistory = async function(userId, limit = 20) {
    return await this.find({ user: userId })
        .sort({ loginTime: -1 })
        .limit(limit);
};

loginActivitySchema.statics.getStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: null,
                totalLogins: { $sum: 1 },
                successfulLogins: {
                    $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
                },
                failedLogins: {
                    $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
                },
                activeSessions: {
                    $sum: { $cond: [{ $eq: ["$logoutTime", null] }, 1, 0] }
                },
                uniqueDevices: { $addToSet: "$deviceType" },
                uniqueCountries: { $addToSet: "$location.country" },
                lastLogin: { $max: "$loginTime" }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalLogins: 0,
            successfulLogins: 0,
            failedLogins: 0,
            activeSessions: 0,
            uniqueDevices: 0,
            uniqueCountries: 0,
            lastLogin: null
        };
    }

    return {
        ...stats[0],
        uniqueDevices: stats[0].uniqueDevices.length,
        uniqueCountries: stats[0].uniqueCountries.length
    };
};

// ========== INSTANCE METHODS ==========

loginActivitySchema.methods.endSession = async function(reason = "user_logout") {
    this.logoutTime = new Date();
    this.logoutReason = reason;
    if (this.loginTime) {
        this.sessionDuration = Math.floor(
            (this.logoutTime - this.loginTime) / 1000
        );
    }
    await this.save();
    return this;
};

loginActivitySchema.methods.calculateRiskScore = function() {
    let score = 0;
    
    if (this.security?.isProxy) score += 20;
    if (this.security?.isHosting) score += 15;
    if (this.security?.isNewDevice) score += 25;
    if (this.security?.isNewLocation) score += 20;
    if (this.status === 'failed') score += 10;
    
    // Cap at 100
    this.security.riskScore = Math.min(score, 100);
    return this.security.riskScore;
};

module.exports = mongoose.model("LoginActivity", loginActivitySchema);