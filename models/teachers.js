const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teacherSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  courses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Cources",
    },
  ],
  description: {
    type: String,
    required: true,
  },
  rattingByStudents: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      required: true,
    },
    feedback: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profession: {
    type: String,
  },
  about: {
    type: String,
  },
  experiance: {
    type: String,
  },
  priviousOrganisation: {
    type: String,
  },
  pSalary: {
    type: Number,
  },
  currentSalary: {
    type: Number,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Teacher", teacherSchema);
