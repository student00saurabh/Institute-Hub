const User = require("../models/user");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");

// ========== SECURITY CONFIGURATION ==========

// Blocked words for content filtering
const BLOCKED_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
  'nigger', 'faggot', 'retard', 'whore', 'slut', 'bastard',
  'motherfucker', 'bullshit', 'dumbass', 'prick', 'chutiya', 'madarchod',
  'bhenchod', 'lund', 'gandu', 'harami'
];

// Spam patterns
const SPAM_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /document\./i,
  /window\./i,
  /alert\s*\(/i,
  /confirm\s*\(/i,
  /prompt\s*\(/i,
  /<[^>]*>/i,
  /%3C/i, /%3E/i, /%22/i, /%27/i,
  /\\x[0-9a-f]{2}/i,
  /\\u[0-9a-f]{4}/i,
  /(--|\#|\/\*)/,
  /(\bSELECT\b.*\bFROM\b)/i,
  /(\bINSERT\b.*\bINTO\b)/i,
  /(\bUPDATE\b.*\bSET\b)/i,
  /(\bDROP\b.*\bTABLE\b)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bOR\b.*=.*=)/i,
  /\$gt|\$lt|\$eq|\$ne|\$in|\$nin|\$or|\$and|\$not|\$where|\$regex/i,
];

// Rate limiting config
const RATE_LIMIT = {
  MAX_REQUESTS: 5,        // Max 5 requests
  TIME_WINDOW: 15 * 60,   // In 15 minutes (900 seconds)
};

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

// ========== CONTACT API (JSON Response) ==========

module.exports.contactAPI = async (req, res) => {
  try {
    const { name, email, mobile, subject, message, userId, type } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ========== VALIDATION ==========
    if (!name || !email || !mobile || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobile.replace(/[^0-9]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number."
      });
    }

    if (message.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 5 characters."
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 1000 characters."
      });
    }

    // ========== SPAM CHECKS ==========
    if (containsSpam(message) || containsSpam(subject) || containsSpam(name)) {
      console.warn(`⚠️ Security: Spam blocked from ${clientIp}`, { email });
      return res.status(403).json({
        success: false,
        message: "Your message contains inappropriate content. Please rephrase and try again."
      });
    }

    // ========== RATE LIMITING ==========
    const now = new Date();
    const timeWindow = new Date(now.getTime() - RATE_LIMIT.TIME_WINDOW * 1000);
    
    const recentSubmissions = await Contact.countDocuments({
      $or: [
        { email: email.toLowerCase() },
        { ipAddress: clientIp }
      ],
      createdAt: { $gte: timeWindow }
    });
    
    if (recentSubmissions >= RATE_LIMIT.MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again after some time."
      });
    }

    // ========== SANITIZE ==========
    const sanitizedName = sanitizeInput(name);
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedMobile = mobile.replace(/[^0-9]/g, '');

    // ========== CHECK USER ==========
    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user) {
      user = await User.findOne({ email: sanitizedEmail });
    }

    // ========== SAVE ==========
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
    return res.status(500).json({
      success: false,
      message: "Unable to send your message. Please try again later."
    });
  }
};

// ========== CONTACT (Web - redirect) ==========

module.exports.contact = async (req, res) => {
  try {
    const { name, email, mobile, subject, message } = req.body;

    if (!name || !email || !mobile || !subject || !message) {
      req.flash("warning", "Please fill in all required fields to send your message.");
      return res.redirect("/contact");
    }

    await Contact.create({
      user: req.user?._id,
      name,
      email,
      mobile,
      subject,
      message,
    });

    req.flash("success", "Your message has been sent successfully. Our team will get back to you within 24 hours.");
    res.redirect("/contact");
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to send your message. Please try again or contact us directly at info@cyberkavach.org.in");
    res.redirect("/contact");
  }
};

// ========== SUBSCRIBE ==========

module.exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required to subscribe to our newsletter.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const existingUser = await Subscriber.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed to our newsletter.",
      });
    }

    await Subscriber.create({ 
      email: email.toLowerCase(),
      subscribedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to CyberKavach newsletter! Stay tuned for updates and exclusive offers.",
    });
  } catch (error) {
    console.error("Newsletter Error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to process your subscription. Please try again later.",
    });
  }
};

module.exports.carriers = async (req, res) => {
  res.render("others/careers.ejs");
};