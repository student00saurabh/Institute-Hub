// models/certificate.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const certificateSchema = new Schema(
  {
    certificateId: {
      type: String,
      unique: true,
      default: () => "CERT-" + uuidv4().substring(0, 8).toUpperCase(),
    },

    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Cources",
      required: false, // Made optional for non-course certificates
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    certificateType: {
      type: String,
      required: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    grade: {
      type: String,
      enum: [
        "COMPLETED",
        "EXCELLENT",
        "A+",
        "A",
        "B+",
        "B",
        "FIRST CLASS",
        "DISTINCTION",
      ],
      default: "COMPLETED",
    },

    note: {
      type: String,
      trim: true,
    },

    // Fields for different certificate types
    position: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    duration: {
      type: String,
      trim: true,
    },

    projectName: {
      type: String,
      trim: true,
    },

    downloadCount: {
      type: Number,
      default: 0,
    },

    verificationHash: {
      type: String,
      unique: true,
      default: () => require("crypto").randomBytes(16).toString("hex"),
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Partial unique index: only enforce uniqueness for documents where course exists
// This allows multiple null course values for non-course certificates
certificateSchema.index(
  { course: 1, student: 1 },
  {
    unique: true,
    partialFilterExpression: { course: { $exists: true, $ne: null } },
  },
);

module.exports = mongoose.model("Certificate", certificateSchema);
