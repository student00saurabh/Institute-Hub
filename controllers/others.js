const User = require("../models/user");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");
const AppSetting = require("../models/appSetting");

// ========== SECURITY CONFIGURATION ==========
const BLOCKED_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
  'nigger', 'faggot', 'retard', 'whore', 'slut', 'bastard',
  'motherfucker', 'bullshit', 'dumbass', 'prick', 'chutiya', 'madarchod',
  'bhenchod', 'lund', 'gandu', 'harami'
];

const SPAM_PATTERNS = [
  /<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i,
  /document\./i, /window\./i, /alert\s*\(/i, /confirm\s*\(/i,
  /prompt\s*\(/i, /<[^>]*>/i, /%3C/i, /%3E/i, /%22/i, /%27/i,
  /\\x[0-9a-f]{2}/i, /\\u[0-9a-f]{4}/i, /(--|\#|\/\*)/,
  /(\bSELECT\b.*\bFROM\b)/i, /(\bINSERT\b.*\bINTO\b)/i,
  /(\bUPDATE\b.*\bSET\b)/i, /(\bDROP\b.*\bTABLE\b)/i,
  /(\bUNION\b.*\bSELECT\b)/i, /(\bOR\b.*=.*=)/i,
  /\$gt|\$lt|\$eq|\$ne|\$in|\$nin|\$or|\$and|\$not|\$where|\$regex/i,
];

const RATE_LIMIT = { MAX_REQUESTS: 5, TIME_WINDOW: 15 * 60 };

// ========== FALLBACK DATA ==========
const FALLBACK_CONTACT = {
  address: "123, Tech Park, Sector 62, Noida, Uttar Pradesh 201301, India",
  phone: "+91 9310643303",
  email: "info@InstituteHub.org.in",
  supportEmail: "support@InstituteHub.org.in",
  workingHours: "Monday - Friday, 9:00 AM - 6:00 PM IST"
};

const FALLBACK_OFFICES = [
  { city: "Noida", address: "123, Tech Park, Sector 62, Noida, UP 201301", phone: "+91 9310643303", email: "noida@InstituteHub.org.in", isMain: true, isActive: true, order: 0 },
  { city: "Bangalore", address: "456, MG Road, Indiranagar, Bangalore, KA 560038", phone: "+91 9876543210", email: "bangalore@InstituteHub.org.in", isMain: false, isActive: true, order: 1 },
  { city: "Mumbai", address: "789, BKC, Bandra East, Mumbai, MH 400051", phone: "+91 8765432109", email: "mumbai@InstituteHub.org.in", isMain: false, isActive: true, order: 2 }
];

const FALLBACK_SUPPORT_HOURS = [
  { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM IST", isClosed: false, order: 0 },
  { day: "Saturday", hours: "10:00 AM - 2:00 PM IST", isClosed: false, order: 1 },
  { day: "Sunday", hours: "Closed", isClosed: true, order: 2 }
];

const FALLBACK_SOCIAL_LINKS = [
  { name: "LinkedIn", icon: "fa-linkedin-in", url: "https://linkedin.com/company/institutehub", color: "#0A66C2", isActive: true, order: 0 },
  { name: "Twitter", icon: "fa-twitter", url: "https://twitter.com/institutehub", color: "#1DA1F2", isActive: true, order: 1 },
  { name: "YouTube", icon: "fa-youtube", url: "https://youtube.com/@institutehub", color: "#FF0000", isActive: true, order: 2 },
  { name: "GitHub", icon: "fa-github", url: "https://github.com/institutehub", color: "#333", isActive: true, order: 3 },
  { name: "Instagram", icon: "fa-instagram", url: "https://instagram.com/institutehub", color: "#E4405F", isActive: true, order: 4 },
  { name: "Facebook", icon: "fa-facebook-f", url: "https://facebook.com/institutehub", color: "#1877F2", isActive: true, order: 5 }
];

const FALLBACK_FAQS = [
  { question: "How do I enroll in a course?", answer: "Simply browse our course catalog, choose your preferred course, and click the 'Enroll Now' button. You'll be guided through the payment process and get instant access to all course materials.", isActive: true, order: 0 },
  { question: "What payment methods do you accept?", answer: "We accept all major credit/debit cards, UPI, net banking, and PayPal. We also offer EMI options for select courses through our banking partners.", isActive: true, order: 1 },
  { question: "Do you offer refunds?", answer: "Yes! We offer a 7-day money-back guarantee on all courses. If you're not satisfied with a course, simply contact our support team within 7 days of enrollment for a full refund.", isActive: true, order: 2 },
  { question: "How do I access my purchased courses?", answer: "Once you enroll in a course, you can access it anytime from your dashboard. Simply log in to your account and navigate to 'My Courses' to continue learning.", isActive: true, order: 3 },
  { question: "Do you provide certificates?", answer: "Yes! Upon successful completion of any course, you'll receive a verified certificate that you can share on LinkedIn, add to your resume, or download and print.", isActive: true, order: 4 },
  { question: "Can I get corporate training for my team?", answer: "Absolutely! We offer customized corporate training programs for teams of all sizes. Contact our enterprise sales team at enterprise@InstituteHub.org.in for a custom quote.", isActive: true, order: 5 }
];

// ========== HELPER FUNCTIONS ==========
function containsSpam(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word)) return true;
  }
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function sanitizeInput(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '')
    .replace(/[&<>"']/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '"') return '&quot;';
      if (m === "'") return '&#x27;';
      return m;
    })
    .trim();
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.socket?.remoteAddress || 
         req.ip || 
         'unknown';
}

// ============================================================
// CONTACT PAGE (Render)
// ============================================================
module.exports.contactPage = async (req, res) => {
  try {
    let settings = null;
    try {
      settings = await AppSetting.getSettings();
    } catch (err) {
      console.error("Error fetching settings:", err);
    }

    // ✅ Contact Info - DB se ya fallback
    const contactInfo = {
      address: settings?.contact?.address || FALLBACK_CONTACT.address,
      phone: settings?.contact?.phone || FALLBACK_CONTACT.phone,
      email: settings?.contact?.email || FALLBACK_CONTACT.email,
      supportEmail: settings?.contact?.supportEmail || FALLBACK_CONTACT.supportEmail,
      workingHours: settings?.contact?.workingHours || FALLBACK_CONTACT.workingHours
    };

    // ✅ Offices - DB se ya fallback
    let offices = settings?.offices?.filter(o => o.isActive !== false) || [];
    if (offices.length === 0) offices = FALLBACK_OFFICES;
    offices.sort((a, b) => (a.order || 0) - (b.order || 0));

    // ✅ FAQs - DB se ya fallback
    let faqs = settings?.faqs?.filter(f => f.isActive !== false) || [];
    if (faqs.length === 0) faqs = FALLBACK_FAQS;
    faqs.sort((a, b) => (a.order || 0) - (b.order || 0));

    // ✅ Support Hours - DB se ya fallback
    let supportHours = settings?.supportHours || [];
    if (supportHours.length === 0) supportHours = FALLBACK_SUPPORT_HOURS;
    supportHours.sort((a, b) => (a.order || 0) - (b.order || 0));

    // ✅ Social Links - DB se ya fallback
    let socialLinks = settings?.socialLinks?.filter(s => s.isActive !== false) || [];
    if (socialLinks.length === 0) socialLinks = FALLBACK_SOCIAL_LINKS;
    socialLinks.sort((a, b) => (a.order || 0) - (b.order || 0));

    // ✅ User data (logged in user ke liye)
    let userData = null;
    if (req.user) {
      userData = {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.mobile || ''
      };
    }

    // ✅ Sirf wahi data pass karo jo EJS mein directly available nahi hai
    res.render("others/contact.ejs", {
      contactInfo,
      offices,
      faqs,
      supportHours,
      socialLinks,
      userData,
      totalContacts: await Contact.countDocuments(),
      recentContacts: await Contact.find().sort({ createdAt: -1 }).limit(5).lean(),
      moment: require("moment")
      // ⚠️ currentUser MAT BHEJO - yeh app.js se res.locals.currUser ke through available hai
    });

  } catch (error) {
    console.error("Contact page error:", error);
    req.flash("error", "Unable to load contact page. Please try again.");
    res.redirect("/");
  }
};

// ============================================================
// CONTACT API (JSON Response)
// ============================================================
module.exports.contactAPI = async (req, res) => {
  try {
    const { name, email, mobile, subject, message, userId, type } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!name || !email || !mobile || !subject || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobile.replace(/[^0-9]/g, ''))) {
      return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
    }

    if (message.length < 5) {
      return res.status(400).json({ success: false, message: "Message must be at least 5 characters." });
    }

    if (message.length > 1000) {
      return res.status(400).json({ success: false, message: "Message cannot exceed 1000 characters." });
    }

    if (containsSpam(message) || containsSpam(subject) || containsSpam(name)) {
      console.warn(`⚠️ Security: Spam blocked from ${clientIp}`, { email });
      return res.status(403).json({ success: false, message: "Your message contains inappropriate content. Please rephrase and try again." });
    }

    const now = new Date();
    const timeWindow = new Date(now.getTime() - RATE_LIMIT.TIME_WINDOW * 1000);
    const recentSubmissions = await Contact.countDocuments({
      $or: [{ email: email.toLowerCase() }, { ipAddress: clientIp }],
      createdAt: { $gte: timeWindow }
    });
    
    if (recentSubmissions >= RATE_LIMIT.MAX_REQUESTS) {
      return res.status(429).json({ success: false, message: "Too many requests. Please try again after some time." });
    }

    const sanitizedName = sanitizeInput(name);
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedMobile = mobile.replace(/[^0-9]/g, '');

    let user = null;
    if (userId) user = await User.findById(userId);
    if (!user) user = await User.findOne({ email: sanitizedEmail });

    await Contact.create({
      user: user?._id || null,
      name: sanitizedName,
      email: sanitizedEmail,
      mobile: sanitizedMobile,
      subject: sanitizedSubject,
      message: sanitizedMessage,
      msgDate: new Date(),
      ipAddress: clientIp,
      userAgent: userAgent,
      contactType: type || 'general'
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully! Our team will get back to you within 24 hours."
    });

  } catch (error) {
    console.error("Contact API Error:", error);
    return res.status(500).json({ success: false, message: "Unable to send your message. Please try again later." });
  }
};

// ============================================================
// CONTACT (Web - redirect with flash)
// ============================================================
module.exports.contact = async (req, res) => {
    try {
        const { name, email, mobile, subject, message } = req.body;

        // ========== 1. REQUIRED FIELDS VALIDATION ==========
        if (!name || !email || !subject || !message) {
            req.flash("warning", "Please fill in all required fields to send your message.");
            return res.redirect("/contact");
        }

        // ========== 2. NAME VALIDATION ==========
        if (name.length < 2 || name.length > 100) {
            req.flash("warning", "Name must be between 2 and 100 characters.");
            return res.redirect("/contact");
        }

        // ========== 3. EMAIL VALIDATION ==========
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash("warning", "Please enter a valid email address.");
            return res.redirect("/contact");
        }

        // ========== 4. MOBILE VALIDATION (if provided) ==========
        if (mobile && mobile.trim() !== "") {
            const phoneRegex = /^[0-9]{10}$/;
            const cleanMobile = mobile.replace(/[^0-9]/g, '');
            if (!phoneRegex.test(cleanMobile)) {
                req.flash("warning", "Please enter a valid 10-digit mobile number.");
                return res.redirect("/contact");
            }
        }

        // ========== 5. SUBJECT VALIDATION ==========
        const validSubjects = [
            "General Inquiry",
            "Course Information",
            "Certification Support",
            "Corporate Training",
            "Technical Support",
            "Partnership Opportunities",
            "Demo Request",
            "Career Opportunities",
            "Feedback",
            "other"
        ];
        if (!validSubjects.includes(subject)) {
            req.flash("warning", "Please select a valid subject.");
            return res.redirect("/contact");
        }

        // ========== 6. MESSAGE VALIDATION ==========
        if (message.length < 5) {
            req.flash("warning", "Message must be at least 5 characters.");
            return res.redirect("/contact");
        }
        if (message.length > 1000) {
            req.flash("warning", "Message cannot exceed 1000 characters.");
            return res.redirect("/contact");
        }

        // ========== 7. SPAM CHECK ==========
        if (containsSpam(message) || containsSpam(subject) || containsSpam(name)) {
            req.flash("error", "Your message contains inappropriate content. Please rephrase and try again.");
            return res.redirect("/contact");
        }

        // ========== 8. SAVE CONTACT ==========
        await Contact.create({
            user: req.user?._id || null,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile?.trim() || '',
            subject: subject,
            message: message.trim(),
            msgDate: new Date(),
            isSeen: false,
            contactType: "contact"
        });

        req.flash("success", "Your message has been sent successfully! Our team will get back to you within 24 hours.");
        res.redirect("/contact");

    } catch (error) {
        console.error("Contact form error:", error);
        
        // Check if it's a validation error
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(err => err.message);
            req.flash("error", messages.join(". "));
        } else {
            req.flash("error", "Unable to send your message. Please try again.");
        }
        res.redirect("/contact");
    }
};

// ============================================================
// SUBSCRIBE
// ============================================================
module.exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      req.flash("warning", "Email address is required to subscribe.");
      return res.redirect("/contact");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      req.flash("warning", "Please enter a valid email address.");
      return res.redirect("/contact");
    }

    const existingUser = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash("info", "This email is already subscribed.");
      return res.redirect("/contact");
    }

    await Subscriber.create({
      email: email.toLowerCase(),
      subscribedAt: new Date(),
      isActive: true
    });

    req.flash("success", "Successfully subscribed to our newsletter!");
    res.redirect("/contact");

  } catch (error) {
    console.error("Newsletter Error:", error);
    req.flash("error", "Unable to process your subscription. Please try again later.");
    res.redirect("/contact");
  }
};

// ============================================================
// CAREERS PAGE
// ============================================================
module.exports.carriers = async (req, res) => {
  res.render("others/careers.ejs");
};