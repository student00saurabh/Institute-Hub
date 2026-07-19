const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  // User Information
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  // Review Content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Token System
  token: {
    type: String,
    unique: true,
    required: true
  },
  
  tokenExpires: {
    type: Date,
    required: true
  },
  
  // Status
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isApproved: {
    type: Boolean,
    default: false
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  showOnHomepage: {
    type: Boolean,
    default: false
  },
  
  // Review Source
  reviewSource: {
    type: String,
    enum: ['email_invite', 'public', 'admin_added'],
    default: 'public'
  },
  
  // Admin Fields
  adminNote: {
    type: String,
    trim: true
  },
  
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  
  approvedAt: {
    type: Date
  },
  
  // Response from Admin
  adminResponse: {
    type: String,
    trim: true
  },
  
  adminResponseAt: {
    type: Date
  }

}, {
  timestamps: true
});

// Indexes for performance
reviewSchema.index({ email: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ showOnHomepage: 1 });
reviewSchema.index({ createdAt: -1 });

// Static method to check if email already reviewed
reviewSchema.statics.hasReviewed = async function(email) {
  const count = await this.countDocuments({ 
    email: email.toLowerCase(),
    isApproved: true
  });
  return count > 0;
};

// Method to generate token
reviewSchema.statics.generateToken = function() {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = mongoose.model("Review", reviewSchema);