const express = require("express");
const router = express.Router();
const Course = require("../models/cources");
const Blog = require("../models/blog");

// ==================== SECURITY CONFIGURATION ====================

// Blocked search terms - sensitive keywords
const BLOCKED_TERMS = [
  "admin", "administrator", "root", "password", "passwd", 
  "secret", "credential", "login", "auth", "authentication",
  "database", "config", "configuration", "backup", "dump"
];

// Dangerous patterns - HTML/JS injection attempts
const DANGEROUS_PATTERNS = [
  // HTML Tags
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object[^>]*>[\s\S]*?<\/object>/gi,
  /<embed[^>]*>[\s\S]*?<\/embed>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<style[^>]*>[\s\S]*?<\/style>/gi,
  /<[^>]*on\w+\s*=[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  
  // JS Code patterns
  /eval\s*\(/gi,
  /document\.(write|cookie|location)/gi,
  /window\.(location|alert|eval)/gi,
  /\.innerHTML\s*=/gi,
  /\.outerHTML\s*=/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,
  /new\s+Function/gi,
  
  // SQL Injection patterns
  /(\bSELECT\b.*\bFROM\b)/gi,
  /(\bINSERT\b.*\bINTO\b)/gi,
  /(\bUPDATE\b.*\bSET\b)/gi,
  /(\bDELETE\b.*\bFROM\b)/gi,
  /(\bDROP\b.*\bTABLE\b)/gi,
  /(\bUNION\b.*\bSELECT\b)/gi,
  /(\bOR\b.*=.*=)/gi,
  /(\bAND\b.*=.*=)/gi,
  /(--|\#|\/\*)/gi,
  /(\bEXEC\b.*\bXP_)/gi,
  
  // NoSQL Injection patterns
  /\$gt|\$lt|\$eq|\$ne|\$in|\$nin|\$or|\$and|\$not|\$where|\$regex/gi,
  /\$\$?[a-zA-Z]+/gi,
  
  // Path Traversal
  /\.\.\/|\.\.\\/gi,
  /\/etc\/passwd|\\windows\\win\.ini/gi,
  
  // Command Injection
  /[;&|`$]|\b(exec|system|popen|shell_exec|eval|assert)\s*\(/gi,
  
  // Encoded attacks
  /\%3C|\%3E|\%22|\%27|\%3B|\%26|\%7C|\%60|\%24/gi,
  /\\x[0-9a-f]{2}/gi,
  /\\u[0-9a-f]{4}/gi
];

// Maximum query length to prevent buffer overflow
const MAX_QUERY_LENGTH = 100;

// Allowed characters pattern (alphanumeric, spaces, basic punctuation)
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-_.,?!@#$%^&*()+=:;'"\[\]{}|\\/]+$/;

// ==================== SECURITY FUNCTIONS ====================

function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsBlockedTerm(query) {
  const lowerQuery = query.toLowerCase();
  return BLOCKED_TERMS.some(term => {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    return wordBoundaryRegex.test(lowerQuery);
  });
}

function containsDangerousPattern(query) {
  try {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(query)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Pattern matching error:", error);
    return true;
  }
}

function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  let sanitized = query.trim();
  
  if (sanitized.length > MAX_QUERY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
  }
  
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

function isSafeQuery(query) {
  if (!query || query.length < 2) {
    return false;
  }
  
  if (!ALLOWED_CHARS.test(query)) {
    return false;
  }
  
  return true;
}

function escapeHtml(text) {
  if (!text) return text;
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return text.replace(/[&<>"'\/`=]/g, (char) => htmlEscapes[char]);
}

function logSecurityEvent(eventType, query, ip, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    query,
    ip,
    ...details
  };
  console.warn("Security Alert:", JSON.stringify(logEntry));
}

// ===================== MAIN SEARCH API =====================

router.get("/api/search", async (req, res) => {
  let query = req.query.q;
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  try {
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Search query is required",
        results: [] 
      });
    }
    
    let sanitizedQuery = sanitizeQuery(query);
    
    if (sanitizedQuery.length < 2) {
      return res.json({ results: [], message: "Query too short" });
    }
    
    if (containsDangerousPattern(sanitizedQuery)) {
      logSecurityEvent('DANGEROUS_PATTERN', sanitizedQuery, clientIp, {
        reason: 'HTML/JS/SQL injection attempt detected'
      });
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Search contains potentially dangerous content",
        results: [] 
      });
    }
    
    if (containsBlockedTerm(sanitizedQuery)) {
      logSecurityEvent('BLOCKED_TERM', sanitizedQuery, clientIp);
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "This search term is not allowed",
        results: [] 
      });
    }
    
    if (!isSafeQuery(sanitizedQuery)) {
      logSecurityEvent('INVALID_CHARS', sanitizedQuery, clientIp);
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Search contains invalid characters",
        results: [] 
      });
    }
    
    const escapedQuery = escapeRegex(sanitizedQuery);
    const searchRegex = new RegExp(escapedQuery, "i");
    
    const courses = await Course.find({
      $or: [
        { title: searchRegex },
        { shortDescription: searchRegex },
        { courceType: searchRegex },
        { "teacher.name": searchRegex }
      ],
      isActive: true
    })
    .populate("teacher", "name")
    .limit(4)
    .lean()
    .catch(err => {
      console.error("Course search error:", err);
      return [];
    });
    
    const blogs = await Blog.find({
      $or: [
        { title: searchRegex },
        { shortdescription: searchRegex },
        { category: searchRegex },
        { Keywords: searchRegex }
      ],
      blocked: false,
      isvalid: true
    })
    .populate("author", "name")
    .limit(3)
    .lean()
    .catch(err => {
      console.error("Blog search error:", err);
      return [];
    });
    
    const pages = [
      { title: "About Us", url: "/about", description: "Learn about CyberKavach - Cybersecurity training platform", icon: "fas fa-info-circle", color: "green" },
      { title: "Contact Us", url: "/contact", description: "Get in touch with our support team", icon: "fas fa-envelope", color: "blue" },
      { title: "Careers", url: "/careers", description: "Join our team of cybersecurity experts", icon: "fas fa-briefcase", color: "purple" },
      { title: "Privacy Policy", url: "/privacy", description: "Read our privacy and data protection policy", icon: "fas fa-shield-alt", color: "indigo" },
      { title: "Terms & Conditions", url: "/terms", description: "Terms of service and usage guidelines", icon: "fas fa-file-contract", color: "gray" }
    ];
    
    const matchedPages = pages.filter(page => 
      page.title.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(sanitizedQuery.toLowerCase())
    );
    
    const formattedCourses = courses.map(course => ({
      type: "course",
      title: escapeHtml(course.title),
      url: `/courses/${course._id}`,
      description: escapeHtml(course.shortDescription?.substring(0, 120)),
      image: course.image?.url || null,
      icon: "fas fa-graduation-cap",
      color: "blue",
      badge: escapeHtml(course.courceType || "Course"),
      price: course.price
    }));
    
    const formattedBlogs = blogs.map(blog => ({
      type: "blog",
      title: escapeHtml(blog.title),
      url: `/blogs/${blog.id || blog._id}`,
      description: escapeHtml(blog.shortdescription?.substring(0, 120)),
      image: blog.image?.url || null,
      icon: "fas fa-blog",
      color: "purple",
      badge: escapeHtml(blog.category || "Blog"),
      author: escapeHtml(blog.author?.name)
    }));
    
    const formattedPages = matchedPages.map(page => ({
      type: "page",
      title: escapeHtml(page.title),
      url: page.url,
      description: escapeHtml(page.description),
      image: null,
      icon: page.icon,
      color: page.color,
      badge: "Page"
    }));
    
    // ✅ FIXED: Only use defined variables
    let results = [...formattedCourses, ...formattedBlogs, ...formattedPages];
    results = results.slice(0, 12);
    
    res.json({ 
      results,
      total: results.length,
      query: sanitizedQuery
    });
    
  } catch (error) {
    console.error("Search error:", error);
    logSecurityEvent('SEARCH_ERROR', query, clientIp, { error: error.message });
    res.status(500).json({ 
      results: [], 
      error: "Search failed",
      message: "An internal error occurred"
    });
  }
});

// Rate limiting
const rateLimit = require('express-rate-limit');
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { 
    error: "Too Many Requests", 
    message: "Please try again later",
    results: [] 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
router.get("/api/search", searchLimiter);

router.get("/search", (req, res) => {
  // Block direct browser access - redirect to homepage
  req.flash("info", "Please use the search bar on our website to find courses and blogs.");
  res.redirect("/");
});

module.exports = router;