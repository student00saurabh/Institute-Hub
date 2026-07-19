const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
  },
  subject: {
    type: String,
    enum: [
      "General Inquiry",
      "Course Information",
      "Certification Support",
      "Security Services",
      "Corporate Training",
      "Technical Support",
      "Partnership Opportunities",
      "Service",
      "Demo Request",        // ✅ ADDED
      "Course Inquiry",
      "Career Guidance",
      "Partnership",
      "other",
    ],
    required: true,
  },

  message: {
    type: String,
  },
  msgDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },

  ipAddress: {
    type: String,
    default: null,
  },
  
  userAgent: {
    type: String,
    default: null,
  },
  
  contactType: {
    type: String,
    enum: ['general', 'demo', 'course_inquiry', 'quick_contact'],
    default: 'general'
  },
  contactType: {
    type: String,
    enum: [
        "contact",
        "feedback",
        "support",
      "complaint",
        "chatbot"
    ]
}

}, {
  timestamps: true  // ✅ ADDED: Auto adds createdAt & updatedAt
});

contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ ipAddress: 1, createdAt: -1 });
contactSchema.index({ isSeen: 1 });          
contactSchema.index({ contactType: 1 });  
contactSchema.index({ createdAt: -1 });  

module.exports = mongoose.model("Contact", contactSchema);
