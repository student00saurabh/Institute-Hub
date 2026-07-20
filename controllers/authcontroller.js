const crypto = require("crypto");
const User = require("../models/user.js");

// Load .env in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports.restform = async (req, res) => {
  res.render("emailer/emailSent.ejs", {
    message: "Please enter your registered email address to reset your password.",
    alertmsg: false,
  });
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("emailer/emailSent.ejs", {
        message: "This email address is not registered with InstituteHub. Please verify your email and try again.",
        alertmsg: true,
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Auto-detect domain
    const domain =
      process.env.DOMAIN ||
      (process.env.NODE_ENV === "production"
        ? "https://institute-hub-7wsi.onrender.com"
        : "http://localhost:8080");
    const resetLink = `${domain}/reset-password/${token}`;

    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    // ================================================================
    // PASSWORD RESET EMAIL — Enhanced with InstituteHub Theme
    // ================================================================
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password | InstituteHub</title>
      <style>
        /* ===== EMAIL STYLES ===== */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
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
        
        /* Header */
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
        .email-header .logo span {
          color: #C9A227;
        }
        .email-header .subtitle {
          color: #93C5FD;
          font-size: 13px;
          margin-top: 6px;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        
        /* Content */
        .email-body {
          padding: 40px 40px 32px;
        }
        .email-body .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 16px;
        }
        .email-body .greeting span {
          color: #2563EB;
        }
        .email-body .message {
          font-size: 15px;
          line-height: 1.7;
          color: #334155;
          margin-bottom: 28px;
        }
        .email-body .message strong {
          color: #0F172A;
        }
        
        /* Button */
        .btn-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .btn-reset {
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
          letter-spacing: 0.3px;
        }
        .btn-reset:hover {
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.40);
          transform: translateY(-2px);
        }
        
        /* Alternative link */
        .link-alt {
          text-align: center;
          margin: 20px 0 28px;
          padding: 16px;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }
        .link-alt .label {
          font-size: 12px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .link-alt a {
          color: #2563EB;
          font-size: 13px;
          word-break: break-all;
          text-decoration: none;
        }
        .link-alt a:hover {
          text-decoration: underline;
        }
        
        /* Divider */
        .divider {
          border: none;
          border-top: 1px solid #E2E8F0;
          margin: 28px 0 24px;
        }
        
        /* Security notice */
        .security-notice {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          padding: 14px 18px;
          margin: 20px 0 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .security-notice .icon {
          color: #22C55E;
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .security-notice .text {
          font-size: 13px;
          color: #166534;
          line-height: 1.5;
        }
        .security-notice .text strong {
          color: #0F172A;
        }
        
        /* Footer */
        .email-footer {
          background: #F8FAFC;
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid #E2E8F0;
        }
        .email-footer .brand {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
        }
        .email-footer .brand span {
          color: #C9A227;
        }
        .email-footer .tagline {
          font-size: 12px;
          color: #94A3B8;
          margin-top: 2px;
        }
        .email-footer .contact {
          margin-top: 8px;
          font-size: 12px;
          color: #94A3B8;
        }
        .email-footer .contact a {
          color: #2563EB;
          text-decoration: none;
        }
        .email-footer .contact a:hover {
          text-decoration: underline;
        }
        .email-footer .copyright {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 10px;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          body { padding: 16px; }
          .email-header { padding: 24px 20px 20px; }
          .email-body { padding: 28px 20px 24px; }
          .email-footer { padding: 20px 20px; }
          .email-header .logo { font-size: 20px; }
          .email-header .logo-icon { width: 36px; height: 36px; font-size: 16px; }
          .btn-reset { padding: 12px 32px; font-size: 15px; }
          .link-alt a { font-size: 12px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        
        <!-- HEADER -->
        <div class="email-header">
          <a href="${domain}" class="logo">
            Institute<span>Hub</span>
          </a>
          <div class="subtitle">🔐 Secure Password Reset</div>
        </div>
        
        <!-- BODY -->
        <div class="email-body">
          <div class="greeting">Hello <span>${user.name || user.username || "User"}</span>, 👋</div>
          
          <div class="message">
            We received a request to reset the password for your <strong>InstituteHub</strong> account.
            If you initiated this request, please click the button below to securely reset your password.
          </div>
          
          <!-- Button -->
          <div class="btn-wrapper">
            <a href="${resetLink}" class="btn-reset">🔑 Reset Your Password</a>
          </div>
          
          <!-- Alternative Link -->
          <div class="link-alt">
            <div class="label">Or copy and paste this link into your browser</div>
            <a href="${resetLink}">${resetLink}</a>
          </div>
          
          <!-- Security Notice -->
          <div class="security-notice">
            <span class="icon">🛡️</span>
            <div class="text">
              <strong>Security tip:</strong> This link is valid for <strong>1 hour</strong> and will expire after that time.
              For your security, do not share this link with anyone.
            </div>
          </div>
          
          <hr class="divider">
          
          <div style="font-size:13px; color:#64748B; line-height:1.6;">
            <p style="margin-bottom:4px;">
              <strong>Didn't request this?</strong> You can safely ignore this email.
              No changes have been made to your account.
            </p>
            <p style="margin:0; font-size:12px; color:#94A3B8;">
              Need assistance? Contact us at 
              <a href="mailto:student001599@gmail.com" style="color:#2563EB; text-decoration:none;">student001599@gmail.com</a>
            </p>
          </div>
        </div>
        
        <!-- FOOTER -->
        <div class="email-footer">
          <div class="brand">Institute<span>Hub</span></div>
          <div class="tagline">Empowering the next generation of professionals</div>
          <div class="contact">
            📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a>
          </div>
          <div class="copyright">
            &copy; ${new Date().getFullYear()} InstituteHub. All rights reserved.
          </div>
        </div>
        
      </div>
    </body>
    </html>
    `;

    // Plain text version
    const textContent = `
    ════════════════════════════════════════════════
      🔐 InstituteHub — Password Reset Request
    ════════════════════════════════════════════════

    Hello ${user.name || user.username || "User"},

    We received a request to reset the password for your InstituteHub account.

    To reset your password, please visit the following link:
    ${resetLink}

    ────────────────────────────────────────────────
    ⚠️  Security Information
    ────────────────────────────────────────────────
    • This link is valid for 1 hour and will expire after that time.
    • Do not share this link with anyone.
    • If you didn't request this, please ignore this email.

    ────────────────────────────────────────────────
    Need help? Contact us at:
    📧 student001599@gmail.com

    ────────────────────────────────────────────────
    InstituteHub
    Empowering the next generation of professionals
    © ${new Date().getFullYear()} InstituteHub. All rights reserved.
    `;

    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Reset Your Password | InstituteHub",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    req.flash(
      "success",
      "Password reset instructions have been sent to your registered email address. Please check your inbox and spam folder."
    );
    return res.redirect("/login");
  } catch (err) {
    console.error("Password Reset Email Error:", err);
    req.flash(
      "error",
      "We encountered a technical issue while sending the reset email. Please try again in a few minutes."
    );
    return res.redirect("/login");
  }
};

// Show reset page
module.exports.getResetPassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "The password reset link you clicked has expired or is invalid. Please request a new password reset link."
    );
    return res.redirect("/login");
  }

  res.render("emailer/reset.ejs", {
    token: req.params.token,
    message: req.query.message || null,
    alertmsg: req.query.error || null,
  });
};

// Reset password submit
module.exports.postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "The password reset link has expired. Please request a new one from the login page."
    );
    return res.redirect("/login");
  }

  if (password.length < 6) {
    req.flash(
      "warning", 
      "For your account security, password must be at least 6 characters long. Please choose a stronger password."
    );
    return res.redirect(`/reset-password/${token}`);
  }

  user.setPassword(password, async (err, updatedUser) => {
    if (err) {
      req.flash(
        "error", 
        "Unable to update your password due to a technical issue. Please try again or contact support."
      );
      return res.redirect(`/reset-password/${token}`);
    }

    updatedUser.resetPasswordToken = undefined;
    updatedUser.resetPasswordExpires = undefined;
    await updatedUser.save();

    // ================================================================
    // PASSWORD CONFIRMATION EMAIL — Enhanced with InstituteHub Theme
    // ================================================================
    try {
      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        process.env.BREVO_API_KEY,
      );

      const confirmHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Updated | InstituteHub</title>
        <style>
          /* ===== EMAIL STYLES ===== */
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
          
          /* Header */
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
          
          /* Content */
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
          
          /* Success Icon */
          .success-icon {
            text-align: center;
            font-size: 56px;
            margin-bottom: 16px;
          }
          
          /* Divider */
          .divider {
            border: none;
            border-top: 1px solid #E2E8F0;
            margin: 24px 0;
          }
          
          /* Info Box */
          .info-box {
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            padding: 14px 18px;
            margin: 16px 0 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .info-box .icon {
            color: #2563EB;
            font-size: 18px;
            flex-shrink: 0;
            margin-top: 1px;
          }
          .info-box .text {
            font-size: 13px;
            color: #1E40AF;
            line-height: 1.5;
          }
          .info-box .text strong { color: #0F172A; }
          
          /* Footer */
          .email-footer {
            background: #F8FAFC;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #E2E8F0;
          }
          .email-footer .brand {
            font-size: 15px;
            font-weight: 700;
            color: #0F172A;
          }
          .email-footer .brand span { color: #C9A227; }
          .email-footer .tagline {
            font-size: 12px;
            color: #94A3B8;
            margin-top: 2px;
          }
          .email-footer .contact {
            margin-top: 8px;
            font-size: 12px;
            color: #94A3B8;
          }
          .email-footer .contact a {
            color: #2563EB;
            text-decoration: none;
          }
          .email-footer .contact a:hover { text-decoration: underline; }
          .email-footer .copyright {
            font-size: 11px;
            color: #94A3B8;
            margin-top: 10px;
          }
          
          @media (max-width: 600px) {
            body { padding: 16px; }
            .email-header { padding: 24px 20px 20px; }
            .email-body { padding: 28px 20px 24px; }
            .email-footer { padding: 20px 20px; }
            .email-header .logo { font-size: 20px; }
            .email-header .logo-icon { width: 36px; height: 36px; font-size: 16px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          
          <!-- HEADER -->
          <div class="email-header">
            <a href="${domain}" class="logo">
              Institute<span>Hub</span>
            </a>
            <div class="subtitle">✅ Password Updated Successfully</div>
          </div>
          
          <!-- BODY -->
          <div class="email-body">
            <div class="success-icon">✅</div>
            
            <div class="greeting">Hello <span>${user.name || user.username || "User"}</span>,</div>
            
            <div class="message">
              Your <strong>InstituteHub</strong> account password was successfully updated on <strong>${new Date().toLocaleString()}</strong>.
            </div>
            
            <div class="info-box">
              <span class="icon">🛡️</span>
              <div class="text">
                <strong>Security reminder:</strong> If you didn't make this change, please 
                <a href="${domain}/contact" style="color:#2563EB; text-decoration:underline;">contact support immediately</a>.
              </div>
            </div>
            
            <hr class="divider">
            
            <div style="font-size:13px; color:#64748B; line-height:1.6;">
              <p style="margin:0;">
                You can now log in to your account with your new password.
                <br>
                <a href="${domain}/login" style="color:#2563EB; text-decoration:none; font-weight:600;">🔑 Log in to InstituteHub</a>
              </p>
            </div>
          </div>
          
          <!-- FOOTER -->
          <div class="email-footer">
            <div class="brand">Institute<span>Hub</span></div>
            <div class="tagline">Empowering the next generation of professionals</div>
            <div class="contact">
              📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a>
            </div>
            <div class="copyright">
              &copy; ${new Date().getFullYear()} InstituteHub. All rights reserved.
            </div>
          </div>
          
        </div>
      </body>
      </html>
      `;

      const confirmText = `
      ════════════════════════════════════════════════
        ✅ InstituteHub — Password Updated Successfully
      ════════════════════════════════════════════════

      Hello ${user.name || user.username || "User"},

      Your InstituteHub account password was successfully updated on ${new Date().toLocaleString()}.

      ────────────────────────────────────────────────
      ⚠️  Security Reminder
      ────────────────────────────────────────────────
      If you didn't make this change, please contact support immediately:
      📧 student001599@gmail.com

      ────────────────────────────────────────────────
      You can now log in with your new password:
      🔑 ${domain}/login

      ────────────────────────────────────────────────
      InstituteHub
      Empowering the next generation of professionals
      © ${new Date().getFullYear()} InstituteHub. All rights reserved.
      `;

      await apiInstance.sendTransacEmail({
        sender: { email: "student001599@gmail.com", name: "InstituteHub" },
        to: [{ email: user.email, name: user.name || user.username }],
        subject: "✅ Password Updated Successfully | InstituteHub",
        htmlContent: confirmHtml,
        textContent: confirmText,
      });
    } catch (emailErr) {
      console.error("Confirmation email error:", emailErr);
      req.flash(
        "info", 
        "Your password was updated successfully, but we couldn't send a confirmation email. You can safely log in now."
      );
      return res.redirect("/login");
    }

    req.flash(
      "success",
      "Your password has been updated successfully! You can now log in with your new password."
    );
    res.redirect("/login");
  });
};