const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [400, "Description cannot exceed 200 characters"],
      default: "",
    },
    icon: {
      type: String,
      default: "fa-shield-alt", // Font Awesome icon class
    },
    color: {
      type: String,
      enum: ["blue", "indigo", "purple", "pink", "red", "orange", "yellow", "green", "teal", "cyan", "gray"],
      default: "blue",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving
courseCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

module.exports = mongoose.model("CourseCategory", courseCategorySchema);