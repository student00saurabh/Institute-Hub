const AppSetting = require("../models/appSetting");
const User = require("../models/user");
const cloudinary = require("../Cloudconfig.js");

// ============================================================
// SETTINGS PAGE (Render)
// ============================================================
module.exports.settingsPage = async (req, res) => {
    try {
        // Try to get settings from database
        let settings = await AppSetting.findOne({ isActive: true });
        
        // If no settings exist, use static default data
        if (!settings) {
            settings = getDefaultSettings();
        }

        // Get all users for dropdowns
        const users = await User.find({ role: { $in: ["admin", "teacher"] } })
            .select('name email')
            .lean();

        res.render("admin/settingspage.ejs", {
            appSettings: settings,
            users,
            moment: require("moment"),
        });

    } catch (error) {
        console.error("Settings page error:", error);
        req.flash("error", "Failed to load settings");
        res.redirect("/admin");
    }
};

// Helper function for default settings
function getDefaultSettings() {
    return {
        isActive: true,
        lastUpdatedAt: new Date(),
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
        searchPlaceholder: "Search for courses, e.g. 'React'"
    };
}

// ============================================================
// UPDATE HERO SECTION
// ============================================================
module.exports.updateHero = async (req, res) => {
    try {
        const { heading, subheading, badgeText, badgeIcon, ctaText, ctaLink, showStats } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        settings.hero = {
            heading: heading || settings.hero?.heading || "Learn Skills That Actually Matter — Taught by Experts",
            subheading: subheading || settings.hero?.subheading || "",
            badgeText: badgeText || settings.hero?.badgeText || "#1 Learning Platform",
            badgeIcon: badgeIcon || settings.hero?.badgeIcon || "fa-graduation-cap",
            ctaText: ctaText || settings.hero?.ctaText || "Explore Courses",
            ctaLink: ctaLink || settings.hero?.ctaLink || "/courses",
            showStats: showStats === "on",
            backgroundImage: settings.hero?.backgroundImage || { url: "", filename: "" }
        };

        // Handle background image upload
        if (req.file) {
            if (settings.hero?.backgroundImage?.filename) {
                try {
                    await cloudinary.uploader.destroy(settings.hero.backgroundImage.filename);
                } catch (err) {
                    console.error("Cloudinary delete error:", err);
                }
            }
            settings.hero.backgroundImage = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Hero section updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update hero error:", error);
        req.flash("error", "Failed to update hero section");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE CONTACT INFO
// ============================================================
module.exports.updateContact = async (req, res) => {
    try {
        const { address, phone, email, supportEmail, workingHours, mapEmbedUrl, latitude, longitude } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        settings.contact = {
            address: address || settings.contact?.address || "",
            phone: phone || settings.contact?.phone || "",
            email: email || settings.contact?.email || "",
            supportEmail: supportEmail || settings.contact?.supportEmail || "",
            workingHours: workingHours || settings.contact?.workingHours || "",
            mapEmbedUrl: mapEmbedUrl || settings.contact?.mapEmbedUrl || "",
            latitude: parseFloat(latitude) || settings.contact?.latitude || 28.6139,
            longitude: parseFloat(longitude) || settings.contact?.longitude || 77.2090
        };

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Contact information updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update contact error:", error);
        req.flash("error", "Failed to update contact information");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE SOCIAL LINKS
// ============================================================
module.exports.updateSocialLinks = async (req, res) => {
    try {
        const { socialLinks } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process social links from form
        if (socialLinks && Array.isArray(socialLinks)) {
            settings.socialLinks = socialLinks.map((link, index) => ({
                name: link.name || "",
                icon: link.icon || "fa-link",
                url: link.url || "",
                color: link.color || "#2563EB",
                isActive: link.isActive === "on",
                order: parseInt(link.order) || index
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Social links updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update social links error:", error);
        req.flash("error", "Failed to update social links");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE OFFICES
// ============================================================
module.exports.updateOffices = async (req, res) => {
    try {
        const { offices } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process offices from form
        if (offices && Array.isArray(offices)) {
            settings.offices = offices.map((office, index) => ({
                city: office.city || "",
                address: office.address || "",
                phone: office.phone || "",
                email: office.email || "",
                isMain: office.isMain === "on",
                isActive: office.isActive !== "off",
                order: parseInt(office.order) || index,
                latitude: parseFloat(office.latitude) || 0,
                longitude: parseFloat(office.longitude) || 0
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Office locations updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update offices error:", error);
        req.flash("error", "Failed to update office locations");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE SUPPORT HOURS
// ============================================================
module.exports.updateSupportHours = async (req, res) => {
    try {
        const { supportHours } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process support hours from form
        if (supportHours && Array.isArray(supportHours)) {
            settings.supportHours = supportHours.map((hour, index) => ({
                day: hour.day || "",
                hours: hour.hours || "",
                isClosed: hour.isClosed === "on",
                order: parseInt(hour.order) || index
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Support hours updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update support hours error:", error);
        req.flash("error", "Failed to update support hours");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE FAQS
// ============================================================
module.exports.updateFaqs = async (req, res) => {
    try {
        const { faqs } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process FAQs from form
        if (faqs && Array.isArray(faqs)) {
            settings.faqs = faqs.map((faq, index) => ({
                question: faq.question || "",
                answer: faq.answer || "",
                isActive: faq.isActive !== "off",
                order: parseInt(faq.order) || index
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "FAQs updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update faqs error:", error);
        req.flash("error", "Failed to update FAQs");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE STATS (Homepage)
// ============================================================
module.exports.updateStats = async (req, res) => {
    try {
        const { stats } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process stats from form
        if (stats && Array.isArray(stats)) {
            settings.stats = stats.map((stat, index) => ({
                label: stat.label || "",
                value: parseInt(stat.value) || 0,
                suffix: stat.suffix || "+",
                icon: stat.icon || "fa-chart-line",
                isActive: stat.isActive !== "off",
                order: parseInt(stat.order) || index
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Statistics updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update stats error:", error);
        req.flash("error", "Failed to update statistics");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE FEATURES (Why Choose Us)
// ============================================================
module.exports.updateFeatures = async (req, res) => {
    try {
        const { features } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        // Process features from form
        if (features && Array.isArray(features)) {
            settings.features = features.map((feature, index) => ({
                title: feature.title || "",
                description: feature.description || "",
                icon: feature.icon || "fa-check-circle",
                isActive: feature.isActive !== "off",
                order: parseInt(feature.order) || index
            }));
        }

        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Features updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update features error:", error);
        req.flash("error", "Failed to update features");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// UPDATE SEARCH PLACEHOLDER
// ============================================================
module.exports.updateSearchPlaceholder = async (req, res) => {
    try {
        const { searchPlaceholder } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        settings.searchPlaceholder = searchPlaceholder || "Search for courses, e.g. 'React'";
        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        req.flash("success", "Search placeholder updated successfully!");
        res.redirect("/admin/settings");

    } catch (error) {
        console.error("Update search placeholder error:", error);
        req.flash("error", "Failed to update search placeholder");
        res.redirect("/admin/settings");
    }
};

// ============================================================
// ADD SOCIAL LINK (AJAX)
// ============================================================
module.exports.addSocialLink = async (req, res) => {
    try {
        const { name, icon, url, color } = req.body;
        
        let settings = await AppSetting.getSettings();
        if (!settings) {
            settings = new AppSetting();
        }

        const newLink = {
            name: name || "New Link",
            icon: icon || "fa-link",
            url: url || "#",
            color: color || "#2563EB",
            isActive: true,
            order: settings.socialLinks?.length || 0
        };

        if (!settings.socialLinks) settings.socialLinks = [];
        settings.socialLinks.push(newLink);
        
        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        res.json({
            success: true,
            message: "Social link added successfully!",
            link: newLink
        });

    } catch (error) {
        console.error("Add social link error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add social link"
        });
    }
};

// ============================================================
// REMOVE SOCIAL LINK (AJAX)
// ============================================================
module.exports.removeSocialLink = async (req, res) => {
    try {
        const { index } = req.params;
        
        let settings = await AppSetting.getSettings();
        if (!settings || !settings.socialLinks) {
            return res.status(404).json({
                success: false,
                message: "No social links found"
            });
        }

        const idx = parseInt(index);
        if (idx < 0 || idx >= settings.socialLinks.length) {
            return res.status(400).json({
                success: false,
                message: "Invalid link index"
            });
        }

        settings.socialLinks.splice(idx, 1);
        settings.lastUpdatedBy = req.user._id;
        settings.lastUpdatedAt = new Date();
        await settings.save();

        res.json({
            success: true,
            message: "Social link removed successfully!"
        });

    } catch (error) {
        console.error("Remove social link error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove social link"
        });
    }
};

// ============================================================
// GET SETTINGS (API)
// ============================================================
module.exports.getSettings = async (req, res) => {
    try {
        const settings = await AppSetting.getSettings();
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error("Get settings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get settings"
        });
    }
};