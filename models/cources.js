const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courcesSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  students: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
      paidPrice: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
      },
      isSeen: {
        type: Boolean,
        default: false,
      },
    },
  ],
  image: {
    url: String,
    filename: String,
  },

  title: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  discription: {
    type: String,
  },
  tableOfContent: [
    {
      tile: {
        type: String,
      },
      duration: {
        type: Number,
      },
    },
  ],
  price: {
    type: Number,
    required: true,
  },

  actualPrice: {
    type: Number,
    required: true,
  },
  courceType: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // hours
  },
  lounchedDate: {
    type: Date,
  },
  slider: {
    type: Boolean,
    default: false,
  },
  addInHomePage: {
    type: Boolean,
    default: false,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  showInNavbar: {
    type: Boolean,
    default: false,
  },
  navbarButtonText: {
    type: String,
    default: "",
    trim: true,
  },
  navbarButtonLink: {
    type: String,
    default: "",
    trim: true,
  },
  navbarButtonColor: {
    type: String,
    enum: ["blue", "cyan", "purple", "green", "red", "yellow"],
    default: "blue",
  },
  navbarButtonIcon: {
    type: String,
    default: "fa-arrow-right",
  },
  
  // For homepage sections
  showInHomepage: {
    type: Boolean,
    default: false,
  },
  homepageSection: {
    type: String,
    enum: ["hero", "featured", "popular", "new", "trending", "none"],
    default: "none",
  },
  homepageOrder: {
    type: Number,
    default: 0,
  },
  
  // Course metadata
  featuredImage: {
    url: String,
    filename: String,
  },
  courseLevel: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert"],
    default: "beginner",
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  prerequisites: [{
    type: String,
  }],
  learningOutcomes: [{
    type: String,
  }],
  includes: [{
    type: String,
  }],

  //add pre student
  preStudents: {
    type: Number,
    default: 0,
  },
  category: {
  type: Schema.Types.ObjectId,
  ref: "CourseCategory",
  required: false,
},
categoryName: {
  type: String,
  trim: true,
  },

  // Add these fields to your courcesSchema
totalRatings: {
  type: Number,
  default: 0
  },

  pdfDetails: {
      type: String,
      trim: true,
      default: ""
  },
  
// Store individual ratings as an array
ratings: [
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
],
  
  // SEO fields
  metaTitle: String,
  metaDescription: String,
  metaKeywords: String,
},
  {
  timestamps: true 
}
);

// Indexes
courcesSchema.index({ createdAt: -1 });
courcesSchema.index({ isActive: 1, createdAt: -1 });
courcesSchema.index({ rating: -1 });
courcesSchema.index({ reviewCount: -1 });

// ========== HELPER METHODS ==========

// Calculate average rating and update
courcesSchema.methods.updateRating = async function() {
  if (!this.ratings || this.ratings.length === 0) {
    this.rating = 0;
    this.reviewCount = 0;
    this.totalRatings = 0;
  } else {
    const total = this.ratings.reduce((sum, r) => sum + r.rating, 0);
    this.rating = Math.round((total / this.ratings.length) * 10) / 10;
    this.reviewCount = this.ratings.length;
    this.totalRatings = this.ratings.length;
  }
  await this.save();
  return this;
};

// Get user's rating for this course
courcesSchema.methods.getUserRating = function(userId) {
  const rating = this.ratings.find(r => r.user.toString() === userId.toString());
  return rating || null;
};

// Add or update user rating
courcesSchema.methods.addOrUpdateRating = function(userId, ratingValue, review = "") {
  const existingIndex = this.ratings.findIndex(r => r.user.toString() === userId.toString());
  
  if (existingIndex !== -1) {
    // Update existing
    this.ratings[existingIndex].rating = ratingValue;
    this.ratings[existingIndex].review = review;
    this.ratings[existingIndex].updatedAt = new Date();
  } else {
    // Add new
    this.ratings.push({
      user: userId,
      rating: ratingValue,
      review: review,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return this;
};

// Remove user rating
courcesSchema.methods.removeUserRating = function(userId) {
  this.ratings = this.ratings.filter(r => r.user.toString() !== userId.toString());
  return this;
};

module.exports = mongoose.model("Cources", courcesSchema);