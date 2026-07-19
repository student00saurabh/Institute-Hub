const { saveRedirectUrl } = require("../middleware.js");
const User = require("../models/user.js");
const Cources = require("../models/cources.js");
const bcrypt = require("bcrypt");
const brevo = require("@getbrevo/brevo");
const Certificate = require("../models/certification.js");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const mongoose = require("mongoose");

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Configure Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const emailApi = new brevo.TransactionalEmailsApi();
emailApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

// Constants
const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// ==================== PROFESSIONAL EMAIL TEMPLATES ====================

// Professional OTP Email Template
async function sendVerificationOTP(user) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpires = Date.now() + OTP_EXPIRY_MS;
  await user.save();

  const domain = process.env.DOMAIN || "https://cyberkavach.org.in";

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification | CyberKavach</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        padding: 32px 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .header .subtitle {
        color: #93c5fd;
        font-size: 14px;
        margin-top: 8px;
        font-weight: 400;
      }
      .content {
        padding: 40px 40px 32px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .message {
        font-size: 15px;
        line-height: 1.6;
        color: #475569;
        margin-bottom: 24px;
      }
      .otp-box {
        background-color: #f1f5f9;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        margin: 24px 0;
        border: 2px dashed #2563eb;
      }
      .otp-code {
        font-size: 42px;
        font-weight: 700;
        color: #1e3a8a;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
      }
      .warning-box {
        background-color: #fefce8;
        border-left: 4px solid #eab308;
        padding: 16px 20px;
        border-radius: 4px;
        margin: 24px 0;
      }
      .warning-box .title {
        font-size: 13px;
        font-weight: 600;
        color: #854d0e;
        margin-bottom: 4px;
      }
      .warning-box .text {
        font-size: 13px;
        color: #854d0e;
        line-height: 1.5;
      }
      .divider {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 32px 0 24px;
      }
      .footer {
        padding: 0 40px 32px;
        text-align: center;
      }
      .footer .brand {
        font-weight: 700;
        color: #1e293b;
        font-size: 16px;
      }
      .footer .brand span {
        color: #2563eb;
      }
      .footer .tagline {
        color: #94a3b8;
        font-size: 13px;
        margin-top: 4px;
      }
      .footer .contact {
        color: #64748b;
        font-size: 13px;
        margin-top: 8px;
      }
      .footer .contact a {
        color: #2563eb;
        text-decoration: none;
      }
      .footer .copyright {
        color: #94a3b8;
        font-size: 12px;
        margin-top: 16px;
      }
      @media only screen and (max-width: 600px) {
        .header {
          padding: 24px 20px;
        }
        .content {
          padding: 24px 20px;
        }
        .otp-code {
          font-size: 32px;
          letter-spacing: 4px;
        }
        .footer {
          padding: 0 20px 24px;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:20px;background-color:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;">
      <div class="container">
        <div class="header">
          <h1>CyberKavach</h1>
          <div class="subtitle">Cybersecurity Training &amp; Certification</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hello ${user.name || user.username || "Security Professional"},</div>
          
          <div class="message">
            Welcome to CyberKavach! Please use the One-Time Password (OTP) below to verify your email address and complete your registration.
          </div>
          
          <div class="otp-box">
            <div style="font-size:13px;color:#64748b;margin-bottom:8px;font-weight:600;">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <div class="warning-box">
            <div class="title">⏱️ Security Notice</div>
            <div class="text">
              This OTP is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> and will expire at ${new Date(Date.now() + OTP_EXPIRY_MS).toLocaleTimeString()}.
            </div>
          </div>
          
          <div class="message" style="font-size:14px;color:#94a3b8;margin-bottom:0;">
            <strong>⚠️ Important:</strong> Never share this OTP with anyone. CyberKavach staff will never ask for your password or OTP.
          </div>
        </div>
        
        <hr class="divider">
        
        <div class="footer">
          <div class="brand">Cyber <span>Kavach</span></div>
          <div class="tagline">Securing Digital Futures</div>
          <div class="contact">
            📧 <a href="mailto:info@cyberkavach.org.in">info@cyberkavach.org.in</a>
          </div>
          <div class="copyright">
            &copy; ${new Date().getFullYear()} CyberKavach. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const textContent = `
  CyberKavach - Email Verification
  ================================

  Hello ${user.name || user.username || "Security Professional"},

  Welcome to CyberKavach! Please use the OTP below to verify your email:

  Your Verification Code: ${otp}

  ⏱️ Valid for ${OTP_EXPIRY_MINUTES} minutes
  Expires: ${new Date(Date.now() + OTP_EXPIRY_MS).toLocaleString()}

  ⚠️ Security Tips:
  • Never share this OTP with anyone
  • CyberKavach staff will never ask for your password
  • If you didn't request this, please ignore this email

  Need assistance? Contact us at info@cyberkavach.org.in

  ---
  CyberKavach
  Cybersecurity Training & Certification Platform
  ${new Date().getFullYear()} CyberKavach. All rights reserved.
  `;

  try {
    await emailApi.sendTransacEmail({
      sender: { email: "info@cyberkavach.org.in", name: "CyberKavach" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Email Verification | CyberKavach",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log(`✅ Verification OTP sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(`❌ Failed to send verification email:`, emailErr);
    throw new Error("Unable to send verification email. Please try again.");
  }

  return otp;
}

// Professional Welcome Email Template
async function sendWelcomeEmail(user) {
  const domain = process.env.DOMAIN || "https://cyberkavach.org.in";

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CyberKavach</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        padding: 32px 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .header .subtitle {
        color: #93c5fd;
        font-size: 14px;
        margin-top: 8px;
        font-weight: 400;
      }
      .content {
        padding: 40px 40px 32px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .message {
        font-size: 15px;
        line-height: 1.6;
        color: #475569;
        margin-bottom: 16px;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        color: #ffffff !important;
        font-size: 16px;
        font-weight: 600;
        padding: 14px 40px;
        border-radius: 8px;
        text-decoration: none;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        margin: 16px 0;
      }
      .features {
        background-color: #f1f5f9;
        border-radius: 8px;
        padding: 20px;
        margin: 24px 0;
      }
      .features ul {
        margin: 0;
        padding-left: 20px;
        color: #475569;
        font-size: 14px;
        line-height: 1.8;
      }
      .divider {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 32px 0 24px;
      }
      .footer {
        padding: 0 40px 32px;
        text-align: center;
      }
      .footer .brand {
        font-weight: 700;
        color: #1e293b;
        font-size: 16px;
      }
      .footer .brand span {
        color: #2563eb;
      }
      .footer .tagline {
        color: #94a3b8;
        font-size: 13px;
        margin-top: 4px;
      }
      .footer .contact {
        color: #64748b;
        font-size: 13px;
        margin-top: 8px;
      }
      .footer .contact a {
        color: #2563eb;
        text-decoration: none;
      }
      .footer .copyright {
        color: #94a3b8;
        font-size: 12px;
        margin-top: 16px;
      }
      @media only screen and (max-width: 600px) {
        .header {
          padding: 24px 20px;
        }
        .content {
          padding: 24px 20px;
        }
        .cta-button {
          padding: 12px 32px;
          font-size: 15px;
        }
        .footer {
          padding: 0 20px 24px;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:20px;background-color:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;">
      <div class="container">
        <div class="header">
          <h1>CyberKavach</h1>
          <div class="subtitle">Cybersecurity Training &amp; Certification</div>
        </div>
        
        <div class="content">
          <div class="greeting">Welcome aboard, ${user.name || user.username || "Security Professional"}! ✅</div>
          
          <div class="message">
            Your email has been successfully verified. You're now part of the CyberKavach community — India's premier cybersecurity training platform.
          </div>
          
          <div style="text-align:center;">
            <a href="${domain}/dashboard" class="cta-button">Access Your Dashboard</a>
          </div>
          
          <div class="features">
            <strong style="color:#1e293b;">🎯 What's Next?</strong>
            <ul>
              <li>Explore our industry-leading cybersecurity courses</li>
              <li>Connect with expert mentors and peers</li>
              <li>Start your journey towards becoming a certified security professional</li>
            </ul>
          </div>
          
          <div class="message" style="font-size:14px;color:#94a3b8;">
            Need help? Contact our support team at <a href="mailto:info@cyberkavach.org.in" style="color:#2563eb;text-decoration:none;">info@cyberkavach.org.in</a>
          </div>
        </div>
        
        <hr class="divider">
        
        <div class="footer">
          <div class="brand">Cyber <span>Kavach</span></div>
          <div class="tagline">Securing Digital Futures</div>
          <div class="contact">
            📧 <a href="mailto:info@cyberkavach.org.in">info@cyberkavach.org.in</a>
          </div>
          <div class="copyright">
            &copy; ${new Date().getFullYear()} CyberKavach. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "info@cyberkavach.org.in", name: "CyberKavach" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🎉 Welcome to CyberKavach! Your Journey Begins",
      htmlContent: htmlContent,
    });

    console.log(`✅ Welcome email sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(`❌ Failed to send welcome email:`, emailErr);
  }
}

// ==================== ROUTE HANDLERS ====================

module.exports.renderSignupForm = async (req, res) => {
  try {
    res.render("users/signup.ejs");
  } catch (err) {
    console.error("❌ Error loading signup form:", err);
    req.flash("error", "Unable to load registration page. Please try again.");
    res.redirect("/");
  }
};

module.exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const username = email.split("@")[0];

    const newUser = new User({ name, email, username });
    const registeredUser = await User.register(newUser, password);

    req.flash("success", "Verification code sent to your email. Please verify your account.");
    res.redirect(`/verify-email?email=${email}`);
  } catch (err) {
    console.error("Signup error:", err.message);
    req.flash("error", err.message || "Registration failed. Please try again.");
    res.redirect("/signup");
  }
};

module.exports.renderLoginForm = (req, res) => {
  try {
    if (res.locals.currUser) {
      req.flash("info", "You are already logged in.");
      return res.redirect("/");
    }
    res.render("users/login.ejs");
  } catch (err) {
    console.error("❌ Error loading login form:", err);
    req.flash("error", "Unable to load login page. Please try again.");
    res.redirect("/");
  }
};

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to CyberKavach!");
  const redirectUrl = res.locals.redirectUrl || "/";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been successfully logged out.");
    res.redirect("/");
  });
};

// ==================== OTP VERIFICATION ====================

module.exports.renderVerifyEmailForm = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    req.flash("warning", "Email address is required for verification.");
    return res.redirect("/login");
  }
  
  const user = await User.findOne({ email: email });
  if (!user) {
    req.flash("error", "Account not found. Please sign up first.");
    return res.redirect("/signup");
  }
  
  await sendVerificationOTP(user);
  res.render("emailer/otp.ejs", { user });
};

module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const { id } = req.params;

    if (!otp || otp.length !== 6) {
      req.flash("warning", "Please enter a valid 6-digit verification code.");
      return res.redirect(`/verify-email?email=${req.body.email || ""}`);
    }

    const user = await User.findById(id);

    if (!user) {
      req.flash("error", "Invalid verification request. Please sign up again.");
      return res.redirect("/signup");
    }

    if (user.isVerified) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    if (!user.otp || !user.otpExpires) {
      req.flash("warning", "No active verification code found. Please request a new one.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otp !== otp) {
      req.flash("warning", "Invalid verification code. Please check and try again.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otpExpires < Date.now()) {
      req.flash("warning", "Verification code has expired. Please request a new one.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    await sendWelcomeEmail(user);

    req.login(user, (err) => {
      if (err) {
        console.error("❌ Auto-login error:", err);
        req.flash("success", "Email verified successfully! Please log in to continue.");
        return res.redirect("/login");
      }
      req.flash("success", "Email verified! Welcome to CyberKavach.");
      res.redirect("/");
    });
  } catch (err) {
    console.error("❌ Email verification error:", err);
    req.flash("error", "Unable to verify your email. Please try again.");
    res.redirect(`/verify-email?email=${req.body.email || ""}`);
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      req.flash("error", "Account not found.");
      return res.redirect("/signup");
    }

    if (user.isVerified) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    if (user.otpExpires && user.otpExpires > Date.now() - 60000) {
      req.flash("primary", "Please wait 1 minute before requesting a new verification code.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    await sendVerificationOTP(user);

    req.flash("success", "A new verification code has been sent to your email.");
    res.redirect(`/verify-email?email=${user.email}`);
  } catch (err) {
    console.error("❌ OTP resend error:", err);
    req.flash("error", "Unable to send verification code. Please try again.");
    res.redirect(`/verify-email?email=${req.query.email || ""}`);
  }
};

// ==================== PROFILE & ACCOUNT MANAGEMENT ====================

module.exports.profile = async (req, res) => {
  try {
    const id = req.user._id;
    const user = await User.findById(id);
    
    const enrolledCourses = await Cources.find({
      "students.user": id,
    })
      .populate("teacher", "name email")
      .sort({ "students.enrolledAt": -1 })
      .limit(6);

    let displayCourses = enrolledCourses;
    const taughtCourses = [];
    const recentActivity = [];
    const certificates = [];

    const totalEnrolled = displayCourses.length;
    const totalPaid = displayCourses.reduce((sum, course) => {
      const studentInfo = course.students?.find(
        (s) => s.user?._id?.toString() === id.toString() || s.user?.toString() === id.toString(),
      );
      return sum + (studentInfo?.paidPrice || course.price || 0);
    }, 0);

    res.render("users/profile.ejs", {
      user,
      enrolledCourses: displayCourses,
      taughtCourses,
      totalEnrolled,
      totalPaid,
      recentActivity,
      certificates,
      moment: require("moment"),
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Unable to load profile. Please try again.");
    res.redirect("/");
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, mobile, email } = req.body || {};

    if (!name && !mobile && !email) {
      return res.status(400).json({
        success: false,
        message: "No update data provided.",
      });
    }

    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "This email is already in use.",
        });
      }
    }

    if (mobile) {
      const existingUser = await User.findOne({
        mobile,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "This mobile number is already in use.",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        mobile,
        email: email?.toLowerCase(),
        updatedAt: new Date(),
      },
      { new: true },
    );

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again.",
    });
  }
};

module.exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      req.flash("warning", "New passwords do not match.");
      return res.redirect("/profile#security");
    }

    if (newPassword.length < 6) {
      req.flash("warning", "Password must be at least 6 characters long.");
      return res.redirect("/profile#security");
    }

    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect("/profile#security");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    req.flash("success", "Password changed successfully.");
    res.redirect("/profile#security");
  } catch (err) {
    console.log(err);
    req.flash("error", "Unable to change password. Please try again.");
    res.redirect("/profile#security");
  }
};

// ==================== ENROLLMENT & COURSES ====================

module.exports.enrollmentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Cources.aggregate([
      { $match: { "students.user": new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$students" },
      { $match: { "students.user": new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "teacher",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: "$teacher" },
      {
        $project: {
          courseId: "$_id",
          courseTitle: "$title",
          courseImage: "$image.url",
          courseType: "$courceType",
          teacherName: "$teacher.name",
          enrolledAt: "$students.enrolledAt",
          paidPrice: "$students.paidPrice",
          description: "$students.description",
          completionPercentage: 0,
          lastAccessed: new Date(),
        },
      },
      { $sort: { enrolledAt: -1 } },
    ]);

    res.json({ success: true, enrollments });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Unable to load enrollment history." });
  }
};

module.exports.myCourses = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Fetch enrolled courses
    const enrolledCourses = await Cources.find({
      "students.user": userId,
    }).populate("teacher", "name email");
    
    // Get IDs of enrolled courses to exclude them from recommendations
    const enrolledIds = enrolledCourses.map(c => c._id.toString());
    
    // Fetch recommended courses (max 4)
    // Logic: First get popular courses, then fallback to other active courses
    let recommendedCourses = [];
    
    // Try to get popular courses first (excluding enrolled)
    let popularCourses = await Cources.find({
      isActive: true,
      isPopular: true,
      _id: { $nin: enrolledIds }
    })
    .populate("teacher", "name")
    .sort({ createdAt: -1 })
    .limit(4);
    
    // If we have popular courses, use them
    if (popularCourses && popularCourses.length > 0) {
      recommendedCourses = popularCourses;
    } else {
      // Fallback: Get any active courses (excluding enrolled)
      recommendedCourses = await Cources.find({
        isActive: true,
        _id: { $nin: enrolledIds }
      })
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .limit(4);
    }
    
    // If still no courses, get any courses (including enrolled ones if needed)
    if (!recommendedCourses || recommendedCourses.length === 0) {
      recommendedCourses = await Cources.find({
        isActive: true,
      })
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .limit(4);
    }
    
    res.render("users/myCources.ejs", { 
      enrolledCourses,
      recommendedCourses, // Pass recommended courses (max 4)
      currUser: req.user,
      moment: require("moment")
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Unable to load your courses. Please try again.");
    res.redirect("/profile");
  }
};


