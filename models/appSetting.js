const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appSettingSchema = new Schema({
    // ============================================================
    // 🔥 HERO SECTION
    // ============================================================
    hero: {
        heading: {
            type: String,
            default: "Learn Skills That Actually Matter — Taught by Experts",
            trim: true
        },
        subheading: {
            type: String,
            default: "Master in-demand skills with structured, project-based courses in tech, design and business — built for real careers, not just certificates.",
            trim: true
        },
        badgeText: {
            type: String,
            default: "#1 Learning Platform",
            trim: true
        },
        badgeIcon: {
            type: String,
            default: "fa-graduation-cap"
        },
        backgroundImage: {
            url: {
                type: String,
                default: ""
            },
            filename: {
                type: String,
                default: ""
            }
        },
        showStats: {
            type: Boolean,
            default: true
        },
        ctaText: {
            type: String,
            default: "Explore Courses",
            trim: true
        },
        ctaLink: {
            type: String,
            default: "/courses",
            trim: true
        }
    },

    // ============================================================
    // 📞 CONTACT INFORMATION
    // ============================================================
    contact: {
        address: {
            type: String,
            default: "123, Tech Park, Sector 62, Noida, Uttar Pradesh 201301, India",
            trim: true
        },
        phone: {
            type: String,
            default: "+91 9310643303",
            trim: true
        },
        email: {
            type: String,
            default: "info@InstituteHub.org.in",
            trim: true
        },
        supportEmail: {
            type: String,
            default: "support@InstituteHub.org.in",
            trim: true
        },
        workingHours: {
            type: String,
            default: "Monday - Friday, 9:00 AM - 6:00 PM IST",
            trim: true
        },
        mapEmbedUrl: {
            type: String,
            default: "",
            trim: true
        },
        latitude: {
            type: Number,
            default: 28.6139
        },
        longitude: {
            type: Number,
            default: 77.2090
        }
    },

    // ============================================================
    // 🏢 OFFICE LOCATIONS
    // ============================================================
    offices: [{
        city: {
            type: String,
            required: true,
            default: "Noida",
            trim: true
        },
        address: {
            type: String,
            required: true,
            default: "123, Tech Park, Sector 62, Noida, UP 201301",
            trim: true
        },
        phone: {
            type: String,
            default: "",
            trim: true
        },
        email: {
            type: String,
            default: "",
            trim: true
        },
        isMain: {
            type: Boolean,
            default: false
        },
        latitude: {
            type: Number,
            default: 0
        },
        longitude: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // ⏰ SUPPORT HOURS
    // ============================================================
    supportHours: [{
        day: {
            type: String,
            required: true,
            default: "Monday - Friday",
            trim: true
        },
        hours: {
            type: String,
            required: true,
            default: "9:00 AM - 6:00 PM IST",
            trim: true
        },
        isClosed: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // 🔗 SOCIAL MEDIA LINKS
    // ============================================================
    socialLinks: [{
        name: {
            type: String,
            required: true,
            default: "LinkedIn",
            trim: true
        },
        icon: {
            type: String,
            required: true,
            default: "fa-linkedin-in",
            trim: true
        },
        url: {
            type: String,
            required: true,
            default: "https://linkedin.com/company/institutehub",
            trim: true
        },
        color: {
            type: String,
            default: "#0A66C2"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // ❓ FAQS
    // ============================================================
    faqs: [{
        question: {
            type: String,
            required: true,
            default: "How do I enroll in a course?",
            trim: true
        },
        answer: {
            type: String,
            required: true,
            default: "Simply browse our course catalog, choose your preferred course, and click the 'Enroll Now' button. You'll be guided through the payment process and get instant access to all course materials.",
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // 📊 STATISTICS (Homepage)
    // ============================================================
    stats: [{
        label: {
            type: String,
            required: true,
            default: "Courses",
            trim: true
        },
        value: {
            type: Number,
            required: true,
            default: 120
        },
        suffix: {
            type: String,
            default: "+"
        },
        icon: {
            type: String,
            default: "fa-graduation-cap"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // 🏷️ FEATURES (Why Choose Us)
    // ============================================================
    features: [{
        title: {
            type: String,
            required: true,
            default: "HD Video Lessons",
            trim: true
        },
        description: {
            type: String,
            required: true,
            default: "Crisp, structured video lectures you can learn from at your own pace, anytime.",
            trim: true
        },
        icon: {
            type: String,
            required: true,
            default: "fa-video"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],

    // ============================================================
    // 📝 SEARCH PLACEHOLDER TEXT
    // ============================================================
    searchPlaceholder: {
        type: String,
        default: "Search for courses, e.g. 'React'",
        trim: true
    },

    // ============================================================
    // ⚙️ SYSTEM FIELDS
    // ============================================================
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// ============================================================
// 🛠️ STATIC METHODS
// ============================================================

// Get singleton settings (only one document)
appSettingSchema.statics.getSettings = async function() {
    try {
        let settings = await this.findOne({ isActive: true });
        
        if (!settings) {
            // Create default settings with fallback data
            settings = await this.create({
                hero: {
                    heading: "Learn Skills That Actually Matter — Taught by Experts",
                    subheading: "Master in-demand skills with structured, project-based courses in tech, design and business — built for real careers, not just certificates.",
                    badgeText: "#1 Learning Platform",
                    badgeIcon: "fa-graduation-cap",
                    backgroundImage: { url: "", filename: "" },
                    showStats: true,
                    ctaText: "Explore Courses",
                    ctaLink: "/courses"
                },
                contact: {
                    address: "123, Tech Park, Sector 62, Noida, Uttar Pradesh 201301, India",
                    phone: "+91 9310643303",
                    email: "info@InstituteHub.org.in",
                    supportEmail: "support@InstituteHub.org.in",
                    workingHours: "Monday - Friday, 9:00 AM - 6:00 PM IST",
                    mapEmbedUrl: "",
                    latitude: 28.6139,
                    longitude: 77.2090
                },
                offices: [
                    {
                        city: "Noida",
                        address: "123, Tech Park, Sector 62, Noida, UP 201301",
                        phone: "+91 9310643303",
                        email: "noida@InstituteHub.org.in",
                        isMain: true,
                        isActive: true,
                        order: 0
                    },
                    {
                        city: "Bangalore",
                        address: "456, MG Road, Indiranagar, Bangalore, KA 560038",
                        phone: "+91 9876543210",
                        email: "bangalore@InstituteHub.org.in",
                        isMain: false,
                        isActive: true,
                        order: 1
                    },
                    {
                        city: "Mumbai",
                        address: "789, BKC, Bandra East, Mumbai, MH 400051",
                        phone: "+91 8765432109",
                        email: "mumbai@InstituteHub.org.in",
                        isMain: false,
                        isActive: true,
                        order: 2
                    }
                ],
                supportHours: [
                    { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM IST", isClosed: false, order: 0 },
                    { day: "Saturday", hours: "10:00 AM - 2:00 PM IST", isClosed: false, order: 1 },
                    { day: "Sunday", hours: "Closed", isClosed: true, order: 2 }
                ],
                socialLinks: [
                    { name: "LinkedIn", icon: "fa-linkedin-in", url: "https://linkedin.com/company/institutehub", color: "#0A66C2", isActive: true, order: 0 },
                    { name: "Twitter", icon: "fa-twitter", url: "https://twitter.com/institutehub", color: "#1DA1F2", isActive: true, order: 1 },
                    { name: "YouTube", icon: "fa-youtube", url: "https://youtube.com/@institutehub", color: "#FF0000", isActive: true, order: 2 },
                    { name: "GitHub", icon: "fa-github", url: "https://github.com/institutehub", color: "#333", isActive: true, order: 3 },
                    { name: "Instagram", icon: "fa-instagram", url: "https://instagram.com/institutehub", color: "#E4405F", isActive: true, order: 4 },
                    { name: "Facebook", icon: "fa-facebook-f", url: "https://facebook.com/institutehub", color: "#1877F2", isActive: true, order: 5 }
                ],
                faqs: [
                    {
                        question: "How do I enroll in a course?",
                        answer: "Simply browse our course catalog, choose your preferred course, and click the 'Enroll Now' button. You'll be guided through the payment process and get instant access to all course materials.",
                        isActive: true,
                        order: 0
                    },
                    {
                        question: "What payment methods do you accept?",
                        answer: "We accept all major credit/debit cards, UPI, net banking, and PayPal. We also offer EMI options for select courses through our banking partners.",
                        isActive: true,
                        order: 1
                    },
                    {
                        question: "Do you offer refunds?",
                        answer: "Yes! We offer a 7-day money-back guarantee on all courses. If you're not satisfied with a course, simply contact our support team within 7 days of enrollment for a full refund.",
                        isActive: true,
                        order: 2
                    },
                    {
                        question: "How do I access my purchased courses?",
                        answer: "Once you enroll in a course, you can access it anytime from your dashboard. Simply log in to your account and navigate to 'My Courses' to continue learning.",
                        isActive: true,
                        order: 3
                    },
                    {
                        question: "Do you provide certificates?",
                        answer: "Yes! Upon successful completion of any course, you'll receive a verified certificate that you can share on LinkedIn, add to your resume, or download and print.",
                        isActive: true,
                        order: 4
                    },
                    {
                        question: "Can I get corporate training for my team?",
                        answer: "Absolutely! We offer customized corporate training programs for teams of all sizes. Contact our enterprise sales team at enterprise@InstituteHub.org.in for a custom quote.",
                        isActive: true,
                        order: 5
                    }
                ],
                stats: [
                    { label: "Courses", value: 120, suffix: "+", icon: "fa-graduation-cap", isActive: true, order: 0 },
                    { label: "Students", value: 15000, suffix: "+", icon: "fa-users", isActive: true, order: 1 },
                    { label: "Mentors", value: 45, suffix: "+", icon: "fa-user-tie", isActive: true, order: 2 },
                    { label: "Satisfaction", value: 98, suffix: "%", icon: "fa-star", isActive: true, order: 3 }
                ],
                features: [
                    {
                        title: "HD Video Lessons",
                        description: "Crisp, structured video lectures you can learn from at your own pace, anytime.",
                        icon: "fa-video",
                        isActive: true,
                        order: 0
                    },
                    {
                        title: "Verified Certificates",
                        description: "Earn shareable certificates recognized by employers on completion.",
                        icon: "fa-certificate",
                        isActive: true,
                        order: 1
                    },
                    {
                        title: "Lifetime Access",
                        description: "Pay once, learn forever — including all future course updates.",
                        icon: "fa-infinity",
                        isActive: true,
                        order: 2
                    },
                    {
                        title: "Industry Mentors",
                        description: "Learn directly from working professionals and subject-matter experts.",
                        icon: "fa-user-tie",
                        isActive: true,
                        order: 3
                    },
                    {
                        title: "1:1 Doubt Support",
                        description: "Get your questions answered by mentors within 24 hours, guaranteed.",
                        icon: "fa-comments",
                        isActive: true,
                        order: 4
                    },
                    {
                        title: "Learn On Any Device",
                        description: "Seamless experience across desktop, tablet and mobile — even offline.",
                        icon: "fa-mobile-screen-button",
                        isActive: true,
                        order: 5
                    }
                ],
                searchPlaceholder: "Search for courses, e.g. 'React'",
                isActive: true,
                lastUpdatedAt: new Date()
            });
            
            console.log("✅ Default app settings created!");
        }
        
        return settings;
    } catch (error) {
        console.error("❌ Error getting settings:", error);
        // Return null instead of throwing
        return null;
    }
};

// ============================================================
// 🔄 MIDDLEWARE: Update timestamps
// ============================================================
appSettingSchema.pre('save', function(next) {
    this.lastUpdatedAt = new Date();
    next();
});

module.exports = mongoose.model("AppSetting", appSettingSchema);