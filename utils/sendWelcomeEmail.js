if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
const brevo = require("@getbrevo/brevo");

module.exports.welComeEmail = async ({ name, email }) => {
  // Initialize Brevo API instance
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );

  const domain = process.env.DOMAIN || "https://institute-hub-7wsi.onrender.com";

  // InstituteHub Professional Welcome Email for Google Login
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to InstituteHub</title>
    <style>
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
        margin-bottom: 16px;
      }
      .email-body .message strong {
        color: #0F172A;
      }
      
      /* Welcome Icon */
      .welcome-icon {
        text-align: center;
        font-size: 56px;
        margin-bottom: 16px;
      }
      
      /* Features Grid */
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
      .feature-item .icon {
        color: #2563EB;
        font-size: 16px;
      }
      
      /* Button */
      .btn-wrapper {
        text-align: center;
        margin: 28px 0;
      }
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
      
      /* Divider */
      .divider {
        border: none;
        border-top: 1px solid #E2E8F0;
        margin: 24px 0;
      }
      
      /* Support Section */
      .support-section {
        background: #F8FAFC;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 16px 0 0;
        border: 1px solid #E2E8F0;
      }
      .support-section p {
        font-size: 13px;
        color: #64748B;
        line-height: 1.6;
        margin: 4px 0;
      }
      .support-section a {
        color: #2563EB;
        text-decoration: none;
      }
      .support-section a:hover {
        text-decoration: underline;
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
      .email-footer .copyright a {
        color: #2563EB;
        text-decoration: none;
      }
      .email-footer .copyright a:hover {
        text-decoration: underline;
      }
      
      /* Responsive */
      @media (max-width: 600px) {
        body {
          padding: 16px;
        }
        .email-header {
          padding: 24px 20px 20px;
        }
        .email-body {
          padding: 28px 20px 24px;
        }
        .email-footer {
          padding: 20px 20px;
        }
        .email-header .logo {
          font-size: 20px;
        }
        .email-header .logo-icon {
          width: 36px;
          height: 36px;
          font-size: 16px;
        }
        .features-grid {
          grid-template-columns: 1fr;
        }
        .btn-primary {
          padding: 12px 32px;
          font-size: 15px;
        }
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
        <div class="subtitle">✅ Welcome Aboard!</div>
      </div>
      
      <!-- BODY -->
      <div class="email-body">
        <div class="welcome-icon">👋</div>
        
        <div class="greeting">
          Welcome, <span>${name || "User"}</span>!
        </div>
        
        <div class="message">
          Thank you for joining <strong>InstituteHub</strong> – India's premier training and certification platform. We're thrilled to have you as part of our community of professionals and enthusiasts.
        </div>
        
        <div class="message">
          Your account has been successfully created and verified. You now have full access to our learning resources, courses, and community features.
        </div>
        
        <!-- Features -->
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
        
        <!-- CTA Button -->
        <div class="btn-wrapper">
          <a href="${domain}/" class="btn-primary">
            🚀 Access Your Dashboard
          </a>
        </div>
        
        <hr class="divider">
        
        <!-- Support Section -->
        <div class="support-section">
          <p style="font-weight:600; color:#0F172A; margin-bottom:6px;">
            📞 Need Assistance?
          </p>
          <p>
            Our support team is here to help you get started.
            <br>
            📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a>
            &nbsp;|&nbsp; 🌐 <a href="${domain}">InstituteHub.org.in</a>
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
          This is an automated welcome email. Please do not reply directly.
          <br>
          Protecting your data is our priority. Read our 
          <a href="${domain}/privacy">Privacy Policy</a>.
          <br><br>
          © ${new Date().getFullYear()} InstituteHub. All rights reserved.
        </div>
      </div>
      
    </div>
  </body>
  </html>
  `;

  // Professional Plain Text Version
  const textContent = `
  ════════════════════════════════════════════════
    🎉 WELCOME TO INSTITUTEHUB
  ════════════════════════════════════════════════

  Hello ${name || "User"},

  Welcome to InstituteHub – India's premier training and certification platform!

  Your account has been successfully created and verified. You now have full access to our learning resources, courses, and community features.

  ────────────────────────────────────────────────
  🚀 ACCESS YOUR DASHBOARD
  ────────────────────────────────────────────────

  ${domain}/

  ────────────────────────────────────────────────
  📚 WHAT YOU GET
  ────────────────────────────────────────────────

  • 500+ Courses across 10+ categories
  • Verified Certificates recognized by employers
  • 340+ Expert Mentors and instructors
  • Career Support and guidance

  ────────────────────────────────────────────────
  📞 NEED ASSISTANCE?
  ────────────────────────────────────────────────

  Our support team is here to help you get started.

  📧 Email: student001599@gmail.com
  🌐 Website: ${domain}

  ────────────────────────────────────────────────

  InstituteHub | Empowering the next generation of professionals
  Delhi, India

  This is an automated welcome email. Please do not reply directly.
  Protecting your data is our priority. Read our Privacy Policy at:
  ${domain}/privacy

  © ${new Date().getFullYear()} InstituteHub. All rights reserved.
  `;

  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: "student001599@gmail.com",
        name: "InstituteHub Welcome Team",
      },
      to: [{ email, name: name || "Professional" }],
      subject: "🎉 Welcome to InstituteHub! Your Journey Begins",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log("✅ Welcome email sent to:", email);
  } catch (emailErr) {
    console.error("❌ Failed to send welcome email:", emailErr);
    // Don't fail user creation if email fails
  }
};