const User = require("../models/user");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");
const AppSetting = require("../models/appSetting");
const crypto = require("crypto");

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

// ========== SUBSCRIBE OTP CONFIGURATION ==========
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute
const MAX_RESEND_PER_EMAIL = 3;

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

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
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

    const contactInfo = {
      address: settings?.contact?.address || FALLBACK_CONTACT.address,
      phone: settings?.contact?.phone || FALLBACK_CONTACT.phone,
      email: settings?.contact?.email || FALLBACK_CONTACT.email,
      supportEmail: settings?.contact?.supportEmail || FALLBACK_CONTACT.supportEmail,
      workingHours: settings?.contact?.workingHours || FALLBACK_CONTACT.workingHours
    };

    let offices = settings?.offices?.filter(o => o.isActive !== false) || [];
    if (offices.length === 0) offices = FALLBACK_OFFICES;
    offices.sort((a, b) => (a.order || 0) - (b.order || 0));

    let faqs = settings?.faqs?.filter(f => f.isActive !== false) || [];
    if (faqs.length === 0) faqs = FALLBACK_FAQS;
    faqs.sort((a, b) => (a.order || 0) - (b.order || 0));

    let supportHours = settings?.supportHours || [];
    if (supportHours.length === 0) supportHours = FALLBACK_SUPPORT_HOURS;
    supportHours.sort((a, b) => (a.order || 0) - (b.order || 0));

    let socialLinks = settings?.socialLinks?.filter(s => s.isActive !== false) || [];
    if (socialLinks.length === 0) socialLinks = FALLBACK_SOCIAL_LINKS;
    socialLinks.sort((a, b) => (a.order || 0) - (b.order || 0));

    let userData = null;
    if (req.user) {
      userData = {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.mobile || ''
      };
    }

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

        if (!name || !email || !subject || !message) {
            req.flash("warning", "Please fill in all required fields to send your message.");
            return res.redirect("/contact");
        }

        if (name.length < 2 || name.length > 100) {
            req.flash("warning", "Name must be between 2 and 100 characters.");
            return res.redirect("/contact");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash("warning", "Please enter a valid email address.");
            return res.redirect("/contact");
        }

        if (mobile && mobile.trim() !== "") {
            const phoneRegex = /^[0-9]{10}$/;
            const cleanMobile = mobile.replace(/[^0-9]/g, '');
            if (!phoneRegex.test(cleanMobile)) {
                req.flash("warning", "Please enter a valid 10-digit mobile number.");
                return res.redirect("/contact");
            }
        }

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

        if (message.length < 5) {
            req.flash("warning", "Message must be at least 5 characters.");
            return res.redirect("/contact");
        }
        if (message.length > 1000) {
            req.flash("warning", "Message cannot exceed 1000 characters.");
            return res.redirect("/contact");
        }

        if (containsSpam(message) || containsSpam(subject) || containsSpam(name)) {
            req.flash("error", "Your message contains inappropriate content. Please rephrase and try again.");
            return res.redirect("/contact");
        }

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
// SUBSCRIBE - Send OTP (API)
// ============================================================
module.exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = getClientIp(req);

    // ========== 1. VALIDATE EMAIL ==========
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required to subscribe."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ========== 2. CHECK RATE LIMIT (IP based) ==========
    const ipRateLimit = await Subscriber.countDocuments({
      ipAddress: clientIp,
      lastOtpSent: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 minutes
    });

    if (ipRateLimit >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts from this IP. Please try again after 15 minutes."
      });
    }

    // ========== 3. CHECK IF ALREADY VERIFIED ==========
    const existingVerified = await Subscriber.findOne({
      email: cleanEmail,
      isVerified: true
    });

    if (existingVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already subscribed and verified."
      });
    }

    // ========== 4. CHECK PENDING VERIFICATION ==========
    let subscriber = await Subscriber.findOne({ email: cleanEmail });

    if (subscriber && subscriber.isVerified === false) {
      // Check if OTP is still valid
      if (subscriber.otpExpires && subscriber.otpExpires > new Date()) {
        return res.status(400).json({
          success: false,
          message: "An OTP has already been sent to this email. Please check your inbox or request a new OTP.",
          hasPendingOtp: true,
          email: cleanEmail,
          canResend: subscriber.resendCount < MAX_RESEND_PER_EMAIL
        });
      }

      // OTP expired - allow resend
      if (subscriber.resendCount >= MAX_RESEND_PER_EMAIL) {
        return res.status(400).json({
          success: false,
          message: "Maximum resend attempts exceeded. Please try again after 24 hours.",
          isBlocked: true
        });
      }

      // Update existing subscriber
      const otp = generateOTP();
      const token = generateToken();
      
      subscriber.otp = otp;
      subscriber.otpToken = token;
      subscriber.otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
      subscriber.otpAttempts = 0;
      subscriber.resendCount = (subscriber.resendCount || 0) + 1;
      subscriber.lastOtpSent = new Date();
      subscriber.ipAddress = clientIp;
      subscriber.resendCooldownUntil = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);

      await subscriber.save();

      // Send OTP email
      await sendOTPEmail(cleanEmail, otp, subscriber);

      return res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email.",
        email: cleanEmail,
        hasPendingOtp: true,
        resendCount: subscriber.resendCount,
        maxResend: MAX_RESEND_PER_EMAIL,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS
      });
    }

    // ========== 5. CREATE NEW SUBSCRIBER ==========
    const otp = generateOTP();
    const token = generateToken();

    subscriber = new Subscriber({
      email: cleanEmail,
      otp: otp,
      otpToken: token,
      otpExpires: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      otpAttempts: 0,
      resendCount: 0,
      lastOtpSent: new Date(),
      ipAddress: clientIp,
      isVerified: false,
      isActive: false
    });

    await subscriber.save();

    // Send OTP email
    await sendOTPEmail(cleanEmail, otp, subscriber);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully! Please check your email.",
      email: cleanEmail,
      hasPendingOtp: true
    });

  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process your subscription. Please try again later."
    });
  }
};

// ============================================================
// VERIFY OTP (API)
// ============================================================
module.exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const clientIp = getClientIp(req);

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP."
      });
    }

    // Find subscriber
    const subscriber = await Subscriber.findOne({ email: cleanEmail });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this email."
      });
    }

    // Check if already verified
    if (subscriber.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified."
      });
    }

    // Check OTP expiry
    if (subscriber.otpExpires && subscriber.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
        expired: true
      });
    }

    // Check OTP attempts
    if (subscriber.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        message: `Too many failed attempts. Please request a new OTP.`,
        maxAttemptsReached: true
      });
    }

    // Verify OTP
    if (subscriber.otp !== otp) {
      subscriber.otpAttempts = (subscriber.otpAttempts || 0) + 1;
      await subscriber.save();

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - (subscriber.otpAttempts || 0)} attempts remaining.`,
        attemptsRemaining: MAX_OTP_ATTEMPTS - (subscriber.otpAttempts || 0)
      });
    }

    // ✅ SUCCESS - Verify subscriber
    subscriber.isVerified = true;
    subscriber.isActive = true;
    subscriber.verifiedAt = new Date();
    subscriber.otp = undefined;
    subscriber.otpToken = undefined;
    subscriber.otpExpires = undefined;
    subscriber.otpAttempts = 0;
    subscriber.resendCount = 0;
    subscriber.verificationIp = clientIp;

    await subscriber.save();

    // Send welcome email
    await sendWelcomeEmail(subscriber);

    return res.status(200).json({
      success: true,
      message: "🎉 Email verified successfully! You are now subscribed.",
      subscribed: true
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP. Please try again."
    });
  }
};

// ============================================================
// RESEND OTP (API)
// ============================================================
module.exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = getClientIp(req);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const subscriber = await Subscriber.findOne({ email: cleanEmail });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this email."
      });
    }

    if (subscriber.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified."
      });
    }

    // Check cooldown
    if (subscriber.resendCooldownUntil && subscriber.resendCooldownUntil > new Date()) {
      const remainingSeconds = Math.ceil((subscriber.resendCooldownUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        cooldownSeconds: remainingSeconds
      });
    }

    // Check max resend attempts
    if (subscriber.resendCount >= MAX_RESEND_PER_EMAIL) {
      return res.status(400).json({
        success: false,
        message: "Maximum resend attempts exceeded. Please try again after 24 hours.",
        isBlocked: true
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const token = generateToken();

    subscriber.otp = otp;
    subscriber.otpToken = token;
    subscriber.otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    subscriber.otpAttempts = 0;
    subscriber.resendCount = (subscriber.resendCount || 0) + 1;
    subscriber.lastOtpSent = new Date();
    subscriber.resendCooldownUntil = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    subscriber.ipAddress = clientIp;

    await subscriber.save();

    // Send OTP email
    await sendOTPEmail(cleanEmail, otp, subscriber);

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully!",
      resendCount: subscriber.resendCount,
      maxResend: MAX_RESEND_PER_EMAIL,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP. Please try again."
    });
  }
};

// ============================================================
// CHECK SUBSCRIPTION STATUS (API)
// ============================================================
module.exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const subscriber = await Subscriber.findOne({ email: cleanEmail });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "No subscription found.",
        exists: false
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      isVerified: subscriber.isVerified || false,
      isActive: subscriber.isActive || false,
      hasPendingOtp: !subscriber.isVerified && !!subscriber.otp,
      resendCount: subscriber.resendCount || 0,
      maxResend: MAX_RESEND_PER_EMAIL
    });

  } catch (error) {
    console.error("Check subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check subscription status."
    });
  }
};

// ============================================================
// EMAIL FUNCTIONS
// ============================================================
async function sendOTPEmail(email, otp, subscriber) {
  try {
    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    const domain = process.env.DOMAIN || 'http://localhost:8080';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Subscription | InstituteHub</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #F8FAFC;
          padding: 40px 0;
          color: #0F172A;
        }
        .email-container {
          max-width: 560px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          border: 1px solid #E2E8F0;
        }
        .email-header {
          background: linear-gradient(135deg, #0F172A 0%, #2563EB 100%);
          padding: 32px 40px 28px;
          text-align: center;
          border-bottom: 3px solid #C9A227;
        }
        .email-header .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #FFFFFF;
          text-decoration: none;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .email-header .logo-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #2563EB, #C9A227);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .email-header .logo span { color: #C9A227; }
        .email-header .subtitle {
          color: #93C5FD;
          font-size: 13px;
          margin-top: 6px;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        .email-body { padding: 40px 40px 32px; }
        .email-body .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 16px;
        }
        .email-body .greeting span { color: #2563EB; }
        .email-body .message {
          font-size: 15px;
          line-height: 1.7;
          color: #334155;
          margin-bottom: 24px;
        }
        .otp-box {
          background: #F8FAFC;
          border: 2px dashed #2563EB;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin: 20px 0;
        }
        .otp-box .label {
          font-size: 12px;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .otp-code {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #0F172A;
          font-family: 'Courier New', monospace;
          margin-top: 4px;
        }
        .otp-code span { color: #2563EB; }
        .security-box {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          padding: 14px 18px;
          margin: 20px 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .security-box .icon { color: #22C55E; font-size: 18px; flex-shrink: 0; }
        .security-box .text { font-size: 13px; color: #166534; line-height: 1.5; }
        .security-box .text strong { color: #0F172A; }
        .divider { border: none; border-top: 1px solid #E2E8F0; margin: 24px 0; }
        .email-footer {
          background: #F8FAFC;
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid #E2E8F0;
        }
        .email-footer .brand { font-size: 15px; font-weight: 700; color: #0F172A; }
        .email-footer .brand span { color: #C9A227; }
        .email-footer .tagline { font-size: 12px; color: #94A3B8; margin-top: 2px; }
        .email-footer .contact { margin-top: 8px; font-size: 12px; color: #94A3B8; }
        .email-footer .contact a { color: #2563EB; text-decoration: none; }
        .email-footer .copyright { font-size: 11px; color: #94A3B8; margin-top: 10px; }
        @media (max-width: 600px) {
          body { padding: 16px; }
          .email-header { padding: 24px 20px 20px; }
          .email-body { padding: 28px 20px 24px; }
          .email-footer { padding: 20px 20px; }
          .email-header .logo { font-size: 20px; }
          .otp-code { font-size: 32px; letter-spacing: 6px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <a href="${domain}" class="logo">
            Institute<span>Hub</span>
          </a>
          <div class="subtitle">🔐 Verify Your Subscription</div>
        </div>
        <div class="email-body">
          <div class="greeting">Hello <span>Subscriber</span>, 👋</div>
          <div class="message">
            Thank you for subscribing to <strong>InstituteHub</strong> newsletter! Please verify your email address to start receiving updates.
          </div>
          <div class="otp-box">
            <div class="label">🔑 Your Verification Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          <div class="security-box">
            <span class="icon">🛡️</span>
            <div class="text">
              <strong>Security notice:</strong> This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> and will expire at ${new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toLocaleTimeString()}.
            </div>
          </div>
          <hr class="divider">
          <div style="font-size:13px; color:#64748B; line-height:1.6;">
            <p style="margin:0;">
              Didn't request this? You can safely ignore this email.
              <br>
              Need help? Contact us at 
              <a href="mailto:student001599@gmail.com" style="color:#2563EB; text-decoration:none;">student001599@gmail.com</a>
            </p>
          </div>
        </div>
        <div class="email-footer">
          <div class="brand">Institute<span>Hub</span></div>
          <div class="tagline">Empowering the next generation of professionals</div>
          <div class="contact">📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a></div>
          <div class="copyright">&copy; ${new Date().getFullYear()} InstituteHub. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
    `;

    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: email }],
      subject: "🔐 Verify Your Subscription | InstituteHub",
      htmlContent: htmlContent,
    });

    console.log(`✅ Subscription OTP sent to: ${email}`);
  } catch (error) {
    console.error("❌ OTP email error:", error);
    throw new Error("Failed to send OTP email");
  }
}

async function sendWelcomeEmail(subscriber) {
  try {
    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    const domain = process.env.DOMAIN || 'http://localhost:8080';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to InstituteHub Newsletter</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #F8FAFC;
          padding: 40px 0;
          color: #0F172A;
        }
        .email-container {
          max-width: 560px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          border: 1px solid #E2E8F0;
        }
        .email-header {
          background: linear-gradient(135deg, #0F172A 0%, #2563EB 100%);
          padding: 32px 40px 28px;
          text-align: center;
          border-bottom: 3px solid #22C55E;
        }
        .email-header .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #FFFFFF;
          text-decoration: none;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .email-header .logo-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #2563EB, #C9A227);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .email-header .logo span { color: #C9A227; }
        .email-header .subtitle {
          color: #93C5FD;
          font-size: 13px;
          margin-top: 6px;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        .email-body { padding: 40px 40px 32px; }
        .email-body .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 16px;
        }
        .email-body .greeting span { color: #2563EB; }
        .email-body .message {
          font-size: 15px;
          line-height: 1.7;
          color: #334155;
          margin-bottom: 20px;
        }
        .success-icon { text-align: center; font-size: 56px; margin-bottom: 16px; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn-primary {
          display: inline-block;
          padding: 14px 44px;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #FFFFFF !important;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.30);
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.40);
          transform: translateY(-2px);
        }
        .divider { border: none; border-top: 1px solid #E2E8F0; margin: 24px 0; }
        .email-footer {
          background: #F8FAFC;
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid #E2E8F0;
        }
        .email-footer .brand { font-size: 15px; font-weight: 700; color: #0F172A; }
        .email-footer .brand span { color: #C9A227; }
        .email-footer .tagline { font-size: 12px; color: #94A3B8; margin-top: 2px; }
        .email-footer .contact { margin-top: 8px; font-size: 12px; color: #94A3B8; }
        .email-footer .contact a { color: #2563EB; text-decoration: none; }
        .email-footer .copyright { font-size: 11px; color: #94A3B8; margin-top: 10px; }
        @media (max-width: 600px) {
          body { padding: 16px; }
          .email-header { padding: 24px 20px 20px; }
          .email-body { padding: 28px 20px 24px; }
          .email-footer { padding: 20px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <a href="${domain}" class="logo">
            Institute<span>Hub</span>
          </a>
          <div class="subtitle">✅ Subscription Confirmed</div>
        </div>
        <div class="email-body">
          <div class="success-icon">✅</div>
          <div class="greeting">Hello <span>Subscriber</span>,</div>
          <div class="message">
            Your email has been successfully verified! You are now subscribed to the <strong>InstituteHub</strong> newsletter.
            <br><br>
            You'll receive the latest updates, course announcements, and exclusive offers directly in your inbox.
          </div>
          <div class="btn-wrapper">
            <a href="${domain}" class="btn-primary">🚀 Visit InstituteHub</a>
          </div>
          <hr class="divider">
          <div style="font-size:13px; color:#64748B; line-height:1.6;">
            <p style="margin:0;">
              Need help? Contact us at 
              <a href="mailto:student001599@gmail.com" style="color:#2563EB; text-decoration:none;">student001599@gmail.com</a>
            </p>
          </div>
        </div>
        <div class="email-footer">
          <div class="brand">Institute<span>Hub</span></div>
          <div class="tagline">Empowering the next generation of professionals</div>
          <div class="contact">📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a></div>
          <div class="copyright">&copy; ${new Date().getFullYear()} InstituteHub. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
    `;

    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: subscriber.email }],
      subject: "✅ Welcome to InstituteHub Newsletter!",
      htmlContent: htmlContent,
    });

    console.log(`✅ Welcome email sent to: ${subscriber.email}`);
  } catch (error) {
    console.error("❌ Welcome email error:", error);
  }
}

// ============================================================
// CAREERS PAGE
// ============================================================
module.exports.carriers = async (req, res) => {
  res.render("others/careers.ejs");
};