const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscriberSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    trim: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },

  // OTP Fields
  otp: {
    type: String,
  },
  otpToken: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  
  // Rate Limiting
  resendCount: {
    type: Number,
    default: 0,
  },
  lastOtpSent: {
    type: Date,
  },
  resendCooldownUntil: {
    type: Date,
  },
  
  // IP Tracking
  ipAddress: {
    type: String,
  },
  verificationIp: {
    type: String,
  },
  
  // Unsubscribe
  unsubscribedAt: {
    type: Date,
  },
  unsubscribeReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
subscriberSchema.index({ email: 1 });
subscriberSchema.index({ isVerified: 1 });
subscriberSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Subscriber", subscriberSchema);
