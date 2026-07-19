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
        message: "This email address is not registered with CyberKavach. Please verify your email and try again.",
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
        ? "https://cyberkavach.org.in"
        : "http://localhost:8080");
    const resetLink = `${domain}/reset-password/${token}`;

    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    // Professional Email HTML - Enhanced with CyberKavach branding
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password | CyberKavach</title>
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
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
            margin-bottom: 16px;
          }
          .message {
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 24px;
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            color: #ffffff !important;
            font-size: 16px;
            font-weight: 600;
            padding: 14px 40px;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
            transition: all 0.3s ease;
          }
          .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
          }
          .link-container {
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            word-break: break-all;
          }
          .link-container .label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .link-container a {
            color: #2563eb;
            font-size: 14px;
            text-decoration: none;
            word-break: break-all;
          }
          .link-container a:hover {
            text-decoration: underline;
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
          .footer .contact a:hover {
            text-decoration: underline;
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
            .header h1 {
              font-size: 22px;
            }
            .content {
              padding: 24px 20px;
            }
            .reset-button {
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
            <!-- Header -->
            <div class="header">
              <h1>CyberKavach</h1>
              <div class="subtitle">Cybersecurity Training &amp; Certification</div>
            </div>
            
            <!-- Content -->
            <div class="content">
              <div class="greeting">
                Hello ${user.name || user.username || "CyberKavach User"},
              </div>
              
              <div class="message">
                We received a request to reset the password for your CyberKavach account. 
                If you initiated this request, please click the button below to securely reset your password.
              </div>
              
              <div class="button-container">
                <a href="${resetLink}" class="reset-button">Reset Your Password</a>
              </div>
              
              <div class="link-container">
                <div class="label">Alternative Method</div>
                <a href="${resetLink}">${resetLink}</a>
              </div>
              
              <div class="warning-box">
                <div class="title">⏱️ Security Notice</div>
                <div class="text">
                  This password reset link is valid for <strong>1 hour</strong> from the time it was requested.
                  For your security, the link will expire after this time.
                </div>
              </div>
              
              <div class="message" style="font-size:14px;color:#94a3b8;margin-bottom:0;">
                If you did not request this password reset, please ignore this email. 
                No changes have been made to your account.
              </div>
            </div>
            
            <hr class="divider">
            
            <!-- Footer -->
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

    // Plain text version - Enhanced
    const textContent = `
      CyberKavach - Password Reset Request
      =====================================

      Hello ${user.name || user.username || "CyberKavach User"},

      We received a request to reset your password for your CyberKavach account.

      To reset your password, please visit the following link:
      ${resetLink}

      This link is valid for 1 hour and will expire after that time.

      If you did not request this password reset, please ignore this email.
      No changes have been made to your account.

      For security reasons, do not share this link with anyone.

      Need assistance? Contact us at:
      📧 info@cyberkavach.org.in

      ---
      CyberKavach
      Cybersecurity Training & Certification Platform
      ${new Date().getFullYear()} CyberKavach. All rights reserved.
    `;

    await apiInstance.sendTransacEmail({
      sender: { email: "info@cyberkavach.org.in", name: "CyberKavach" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Password Reset Request | CyberKavach",
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

    // Send confirmation email - Enhanced
    try {
      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        process.env.BREVO_API_KEY,
      );

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Updated | CyberKavach</title>
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
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
            .success-icon {
              text-align: center;
              font-size: 48px;
              margin-bottom: 16px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 16px;
            }
            .message {
              font-size: 15px;
              line-height: 1.6;
              color: #475569;
              margin-bottom: 16px;
            }
            .alert-box {
              background-color: #ecfdf5;
              border-left: 4px solid #10b981;
              padding: 16px 20px;
              border-radius: 4px;
              margin: 24px 0;
            }
            .alert-box .title {
              font-size: 13px;
              font-weight: 600;
              color: #065f46;
              margin-bottom: 4px;
            }
            .alert-box .text {
              font-size: 13px;
              color: #065f46;
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
              .header h1 {
                font-size: 22px;
              }
              .content {
                padding: 24px 20px;
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
                <div class="success-icon">✅</div>
                
                <div class="greeting">
                  Hello ${user.name || user.username || "CyberKavach User"},
                </div>
                
                <div class="message">
                  Your CyberKavach account password was successfully updated on <strong>${new Date().toLocaleString()}</strong>.
                </div>
                
                <div class="alert-box">
                  <div class="title">🔐 Security Confirmation</div>
                  <div class="text">
                    If you did not initiate this password change, please contact our support team immediately.
                  </div>
                </div>
                
                <div class="message" style="font-size:14px;color:#94a3b8;margin-bottom:0;">
                  You can now log in to your account using your new password.
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

      await apiInstance.sendTransacEmail({
        sender: { email: "info@cyberkavach.org.in", name: "CyberKavach" },
        to: [{ email: user.email, name: user.name || user.username }],
        subject: "✅ Password Updated Successfully | CyberKavach",
        htmlContent: htmlContent,
      });
    } catch (emailErr) {
      console.error("Confirmation email error:", emailErr);
      // Don't flash error here as password update was successful
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