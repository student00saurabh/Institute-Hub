const { saveRedirectUrl } = require("../middleware.js");
const User = require("../models/user.js");
const Cources = require("../models/cources.js");
const Teacher = require("../models/teachers.js")
const Payment = require("../models/payment.js");
const Review = require("../models/review.js");
const Rating = require("../models/rating.js");
const LectureProgress = require("../models/lectureProgress.js");
const bcrypt = require("bcrypt");
const brevo = require("@getbrevo/brevo");
const Certificate = require("../models/certification.js");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const mongoose = require("mongoose");
const cloudinary = require("../Cloudconfig.js");

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

// ================================================================
// PROFESSIONAL EMAIL TEMPLATES — InstituteHub Theme
// ================================================================

// ===== OTP Verification Email =====
async function sendVerificationOTP(user) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpires = Date.now() + OTP_EXPIRY_MS;
  await user.save();

  const domain = process.env.DOMAIN || "https://institute-hub-7wsi.onrender.com";

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email | InstituteHub</title>
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
      .email-footer .contact a:hover { text-decoration: underline; }
      .email-footer .copyright { font-size: 11px; color: #94A3B8; margin-top: 10px; }
      @media (max-width: 600px) {
        body { padding: 16px; }
        .email-header { padding: 24px 20px 20px; }
        .email-body { padding: 28px 20px 24px; }
        .email-footer { padding: 20px 20px; }
        .email-header .logo { font-size: 20px; }
        .email-header .logo-icon { width: 36px; height: 36px; font-size: 16px; }
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
        <div class="subtitle">🔐 Email Verification</div>
      </div>
      <div class="email-body">
        <div class="greeting">Hello <span>${user.name || user.username || "User"}</span>, 👋</div>
        <div class="message">
          Welcome to <strong>InstituteHub</strong>! Please verify your email address to complete your registration and start your learning journey.
        </div>
        <div class="otp-box">
          <div class="label">🔑 Your Verification Code</div>
          <div class="otp-code">${otp}</div>
        </div>
        <div class="security-box">
          <span class="icon">🛡️</span>
          <div class="text">
            <strong>Security notice:</strong> This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> and will expire at ${new Date(Date.now() + OTP_EXPIRY_MS).toLocaleTimeString()}.
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

  const textContent = `
  ════════════════════════════════════════════════
    🔐 InstituteHub — Email Verification
  ════════════════════════════════════════════════

  Hello ${user.name || user.username || "User"},

  Welcome to InstituteHub! Please verify your email address to complete your registration.

  ────────────────────────────────────────────────
  🔑 Your Verification Code: ${otp}
  ────────────────────────────────────────────────

  ⏱️ Valid for ${OTP_EXPIRY_MINUTES} minutes
  ⏰ Expires: ${new Date(Date.now() + OTP_EXPIRY_MS).toLocaleString()}

  ────────────────────────────────────────────────
  Didn't request this? You can safely ignore this email.

  Need help? Contact us at:
  📧 student001599@gmail.com

  ────────────────────────────────────────────────
  InstituteHub
  Empowering the next generation of professionals
  © ${new Date().getFullYear()} InstituteHub. All rights reserved.
  `;

  try {
    await emailApi.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Verify Your Email | InstituteHub",
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

// ===== Welcome Email =====
async function sendWelcomeEmail(user) {
  const domain = process.env.DOMAIN || "https://institute-hub-7wsi.onrender.com";

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to InstituteHub</title>
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
      .email-body .message strong { color: #0F172A; }
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
      .features-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin: 20px 0;
      }
      .feature-item {
        background: #F8FAFC;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: #0F172A;
        border: 1px solid #E2E8F0;
      }
      .feature-item .icon { color: #2563EB; font-size: 16px; }
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
      .email-footer .contact a:hover { text-decoration: underline; }
      .email-footer .copyright { font-size: 11px; color: #94A3B8; margin-top: 10px; }
      @media (max-width: 600px) {
        body { padding: 16px; }
        .email-header { padding: 24px 20px 20px; }
        .email-body { padding: 28px 20px 24px; }
        .email-footer { padding: 20px 20px; }
        .email-header .logo { font-size: 20px; }
        .email-header .logo-icon { width: 36px; height: 36px; font-size: 16px; }
        .features-grid { grid-template-columns: 1fr; }
        .btn-primary { padding: 12px 32px; font-size: 15px; }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <a href="${domain}" class="logo">
          Institute<span>Hub</span>
        </a>
        <div class="subtitle">✅ Welcome Aboard!</div>
      </div>
      <div class="email-body">
        <div class="greeting">Welcome aboard, <span>${user.name || user.username || "User"}</span>! 🎉</div>
        <div class="message">
          Your email has been successfully verified. You're now part of the <strong>InstituteHub</strong> community — India's premier training platform for professionals.
        </div>
        <div class="features-grid">
          <div class="feature-item">
            <span class="icon">📚</span> 500+ Courses
          </div>
          <div class="feature-item">
            <span class="icon">🏅</span> Verified Certificates
          </div>
          <div class="feature-item">
            <span class="icon">👨‍🏫</span> 340+ Expert Mentors
          </div>
          <div class="feature-item">
            <span class="icon">💼</span> Career Support
          </div>
        </div>
        <div class="btn-wrapper">
          <a href="${domain}/" class="btn-primary">🚀 Start Learning Now</a>
        </div>
        <hr class="divider">
        <div style="font-size:13px; color:#64748B; line-height:1.6;">
          <p style="margin:0;">
            Need help? Contact our support team at 
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

  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🎉 Welcome to InstituteHub! Your Journey Begins",
      htmlContent: htmlContent,
    });

    console.log(`✅ Welcome email sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(`❌ Failed to send welcome email:`, emailErr);
  }
}

// ===== OTP Resend Confirmation Email =====
async function sendOtpResendConfirmation(user, otp) {
  const domain = process.env.DOMAIN || "https://institute-hub-7wsi.onrender.com";

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Verification Code | InstituteHub</title>
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
        margin-bottom: 20px;
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
        <div class="subtitle">🔄 New Verification Code</div>
      </div>
      <div class="email-body">
        <div class="greeting">Hello <span>${user.name || user.username || "User"}</span>,</div>
        <div class="message">
          You requested a new verification code for your <strong>InstituteHub</strong> account. Please use the code below to verify your email.
        </div>
        <div class="otp-box">
          <div class="label">🔑 Your New Verification Code</div>
          <div class="otp-code">${otp}</div>
        </div>
        <div class="security-box">
          <span class="icon">🛡️</span>
          <div class="text">
            <strong>Security notice:</strong> This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> and will expire at ${new Date(Date.now() + OTP_EXPIRY_MS).toLocaleTimeString()}.
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

  try {
    await emailApi.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔄 New Verification Code | InstituteHub",
      htmlContent: htmlContent,
    });
    console.log(`✅ OTP resend confirmation sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(`❌ Failed to send OTP resend confirmation:`, emailErr);
  }
}

// ===== Password Change Confirmation Email =====
async function sendPasswordChangeConfirmation(user) {
  const domain = process.env.DOMAIN || "https://institute-hub-7wsi.onrender.com";

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed | InstituteHub</title>
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
      .email-body .message strong { color: #0F172A; }
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
      .security-box {
        background: #EFF6FF;
        border: 1px solid #BFDBFE;
        border-radius: 10px;
        padding: 14px 18px;
        margin: 16px 0;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .security-box .icon { color: #2563EB; font-size: 18px; flex-shrink: 0; }
      .security-box .text { font-size: 13px; color: #1E40AF; line-height: 1.5; }
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
        .btn-primary { padding: 12px 32px; font-size: 15px; }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <a href="${domain}" class="logo">
          Institute<span>Hub</span>
        </a>
        <div class="subtitle">✅ Password Changed</div>
      </div>
      <div class="email-body">
        <div class="success-icon">✅</div>
        <div class="greeting">Hello <span>${user.name || user.username || "User"}</span>,</div>
        <div class="message">
          Your <strong>InstituteHub</strong> account password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.
        </div>
        <div class="security-box">
          <span class="icon">🛡️</span>
          <div class="text">
            <strong>Security reminder:</strong> If you didn't make this change, please 
            <a href="${domain}/contact" style="color:#2563EB; text-decoration:underline;">contact support immediately</a>.
          </div>
        </div>
        <div class="btn-wrapper">
          <a href="${domain}/login" class="btn-primary">🔑 Log in to Your Account</a>
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

  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "✅ Password Changed Successfully | InstituteHub",
      htmlContent: htmlContent,
    });
    console.log(`✅ Password change confirmation sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(`❌ Failed to send password change confirmation:`, emailErr);
  }
}

// ================================================================
// ROUTE HANDLERS
// ================================================================

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
  req.flash("success", "Welcome back to InstituteHub!");
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

// ================================================================
// OTP VERIFICATION
// ================================================================

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
      req.flash("success", "Email verified! Welcome to InstituteHub.");
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

    const otp = await sendVerificationOTP(user);
    await sendOtpResendConfirmation(user, otp);

    req.flash("success", "A new verification code has been sent to your email.");
    res.redirect(`/verify-email?email=${user.email}`);
  } catch (err) {
    console.error("❌ OTP resend error:", err);
    req.flash("error", "Unable to send verification code. Please try again.");
    res.redirect(`/verify-email?email=${req.query.email || ""}`);
  }
};

// ================================================================
// PROFILE & ACCOUNT MANAGEMENT
// ================================================================

module.exports.profile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with all details
    const user = await User.findById(userId);

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    // Get enrolled courses with progress
    const enrolledCourses = await Cources.find({
      "students.user": userId,
      isActive: true
    })
      .populate("teacher", "name email")
      .sort({ "students.enrolledAt": -1 })
      .lean();

    // Get teacher profile if user is a teacher
    let teacherProfile = null;
    if (user.role === "teacher" || user.role === "admin") {
      teacherProfile = await Teacher.findOne({ teacher: userId }).lean();
    }

    // Get certificates
    const certificates = await Certificate.find({
      student: userId,
      isActive: true
    })
      .populate("course", "title image")
      .populate("teacher", "name")
      .sort({ issueDate: -1 })
      .lean();

    // Get payments history
    const payments = await Payment.find({
      user: userId,
      status: "success"
    })
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get user's reviews
    const reviews = await Review.find({
      user: userId,
      isVerified: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Calculate stats
    const totalEnrolled = enrolledCourses.length;
    const totalPaid = enrolledCourses.reduce((sum, course) => {
      const studentInfo = course.students?.find(
        (s) => s.user?._id?.toString() === userId.toString() || 
               s.user?.toString() === userId.toString()
      );
      return sum + (studentInfo?.paidPrice || course.price || 0);
    }, 0);

    // Get total certificates count
    const totalCertificates = certificates.length;

    // Get lecture progress
    const progressDocs = await LectureProgress.find({
      user: userId
    }).lean();

    const totalLectures = progressDocs.length;
    const completedLectures = progressDocs.filter(p => p.isCompleted).length;

    // Calculate overall progress
    const overallProgress = totalLectures > 0 
      ? Math.round((completedLectures / totalLectures) * 100) 
      : 0;

    // Get recent activity (last 10)
    const recentActivity = [];

    // Enrollment activity
    enrolledCourses.slice(0, 5).forEach(course => {
      const studentInfo = course.students?.find(
        (s) => s.user?._id?.toString() === userId.toString() || 
               s.user?.toString() === userId.toString()
      );
      if (studentInfo?.enrolledAt) {
        recentActivity.push({
          type: "enrollment",
          title: "Course Enrolled",
          description: `Enrolled in "${course.title}"`,
          createdAt: studentInfo.enrolledAt,
          courseId: course._id,
          courseTitle: course.title,
          icon: "fa-graduation-cap",
          color: "blue"
        });
      }
    });

    // Payment activity
    payments.slice(0, 3).forEach(payment => {
      recentActivity.push({
        type: "payment",
        title: "Payment Made",
        description: `Paid ₹${payment.amount} for "${payment.course?.title || 'Course'}"`,
        createdAt: payment.createdAt,
        icon: "fa-credit-card",
        color: "green"
      });
    });

    // Certificate activity
    certificates.slice(0, 3).forEach(cert => {
      recentActivity.push({
        type: "certificate",
        title: "Certificate Earned",
        description: `Earned certificate for "${cert.course?.title || 'Course'}"`,
        createdAt: cert.issueDate,
        icon: "fa-certificate",
        color: "yellow"
      });
    });

    // Sort by date (newest first)
    recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedActivity = recentActivity.slice(0, 10);

    // Render profile
    res.render("users/profile.ejs", {
      user,
      enrolledCourses,
      teacherProfile,
      certificates,
      payments,
      reviews,
      totalEnrolled,
      totalPaid,
      totalCertificates,
      overallProgress,
      completedLectures,
      totalLectures,
      recentActivity: limitedActivity,
      moment: require("moment"),
      currUser: req.user
    });

  } catch (error) {
    console.error("Profile error:", error);
    req.flash("error", "Unable to load profile. Please try again.");
    res.redirect("/");
  }
};

// ================================================================
// UPDATE PROFILE (AJAX)
// ================================================================

module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, mobile, email } = req.body;

    // Validate
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long."
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address."
        });
      }

      // Check if email is taken
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "This email is already in use by another account."
        });
      }
    }

    if (mobile) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit mobile number."
        });
      }

      const existingUser = await User.findOne({
        mobile: mobile,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "This mobile number is already in use by another account."
        });
      }
    }

    // Update user
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    };

    if (email) updateData.email = email.toLowerCase();
    if (mobile) updateData.mobile = mobile;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('name email mobile role isVerified createdAt');

    return res.json({
      success: true,
      message: "Profile updated successfully!",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again."
    });
  }
};


module.exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash("error", "Please fill in all password fields.");
      return res.redirect("/profile");
    }

    if (newPassword !== confirmPassword) {
      req.flash("error", "New passwords do not match.");
      return res.redirect("/profile");
    }

    if (newPassword.length < 6) {
      req.flash("error", "Password must be at least 6 characters long.");
      return res.redirect("/profile");
    }

    const user = await User.findById(userId);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect("/profile");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send confirmation email
    await sendPasswordChangeConfirmation(user);

    req.flash("success", "Password changed successfully!");
    res.redirect("/profile");

  } catch (error) {
    console.error("Change password error:", error);
    req.flash("error", "Unable to change password. Please try again.");
    res.redirect("/profile");
  }
};

// ================================================================
// ENROLLMENT & COURSES
// ================================================================

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
      recommendedCourses,
      currUser: req.user,
      moment: require("moment")
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Unable to load your courses. Please try again.");
    res.redirect("/profile");
  }
};



// ================================================================
// GET USER STATS (AJAX)
// ================================================================

module.exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [enrolledCount, certificateCount, reviewCount, paymentCount] = await Promise.all([
      Cources.countDocuments({ "students.user": userId }),
      Certificate.countDocuments({ student: userId, isActive: true }),
      Review.countDocuments({ user: userId, isVerified: true }),
      Payment.countDocuments({ user: userId, status: "success" })
    ]);

    const totalSpent = await Payment.aggregate([
      { $match: { user: userId, status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      success: true,
      stats: {
        enrolledCourses: enrolledCount,
        certificates: certificateCount,
        reviews: reviewCount,
        payments: paymentCount,
        totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
      }
    });

  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch stats"
    });
  }
};

// ================================================================
// GET USER CERTIFICATES (AJAX)
// ================================================================

module.exports.getUserCertificates = async (req, res) => {
  try {
    const userId = req.user._id;

    const certificates = await Certificate.find({
      student: userId,
      isActive: true
    })
      .populate("course", "title image")
      .populate("teacher", "name")
      .sort({ issueDate: -1 })
      .lean();

    res.json({
      success: true,
      certificates
    });

  } catch (error) {
    console.error("Get user certificates error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch certificates"
    });
  }
};

// ================================================================
// UPLOAD AVATAR
// ================================================================

module.exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided."
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // ✅ Prevent Google users from changing avatar
    if (user.googleId) {
      return res.status(403).json({
        success: false,
        message: "Google users cannot change profile picture here. Please update from your Google account."
      });
    }

    // Delete old avatar if exists
    if (user.profileImage && user.profileImage.filename) {
      try {
        await cloudinary.uploader.destroy(user.profileImage.filename);
      } catch (err) {
        console.error("Error deleting old avatar:", err);
      }
    }

    // Save new avatar
    user.profileImage = {
      url: req.file.path,
      filename: req.file.filename
    };

    await user.save();

    res.json({
      success: true,
      message: "Profile picture updated!",
      imageUrl: user.profileImage.url
    });

  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to upload profile picture."
    });
  }
};

// ================================================================
// DELETE ACCOUNT
// ================================================================

module.exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { confirm } = req.body;

    if (confirm !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Please type DELETE to confirm account deletion."
      });
    }

    const user = await User.findById(userId);
    
    // Delete user's data
    await Promise.all([
      // Remove from all courses
      Cources.updateMany(
        { "students.user": userId },
        { $pull: { students: { user: userId } } }
      ),
      // Delete certificates
      Certificate.deleteMany({ student: userId }),
      // Delete reviews
      Review.deleteMany({ user: userId }),
      // Delete payments
      Payment.deleteMany({ user: userId }),
      // Delete lecture progress
      LectureProgress.deleteMany({ user: userId }),
      // Delete teacher profile if exists
      Teacher.deleteOne({ teacher: userId })
    ]);

    // Delete user
    await User.findByIdAndDelete(userId);

    req.logout((err) => {
      if (err) console.error("Logout error:", err);
      res.json({
        success: true,
        message: "Account deleted successfully."
      });
    });

  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to delete account. Please try again."
    });
  }
};

// ================================================================
// RESEND VERIFICATION EMAIL
// ================================================================

module.exports.resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified."
      });
    }

    await sendVerificationOTP(user);

    res.json({
      success: true,
      message: "Verification email sent successfully!"
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to send verification email."
    });
  }
};

// ================================================================
// GET COURSE PROGRESS (AJAX)
// ================================================================

module.exports.getCourseProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const progress = await LectureProgress.find({
      user: userId,
      course: courseId
    }).lean();

    const total = progress.length;
    const completed = progress.filter(p => p.isCompleted).length;

    res.json({
      success: true,
      progress: {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        lectures: progress
      }
    });

  } catch (error) {
    console.error("Get course progress error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch progress"
    });
  }
};

// ================================================================
// GET USER REVIEWS (AJAX)
// ================================================================

module.exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    const reviews = await Review.find({
      user: userId,
      isVerified: true
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch reviews"
    });
  }
};