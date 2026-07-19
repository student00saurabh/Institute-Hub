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

  // CyberKavach Professional Welcome Email
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
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
        -webkit-font-smoothing: antialiased;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .header {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        padding: 40px 40px 32px;
        text-align: center;
        position: relative;
      }
      .header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
      }
      .header .logo {
        font-size: 32px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.5px;
        margin-bottom: 8px;
      }
      .header .logo span {
        color: #93c5fd;
      }
      .header .badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 16px;
        border-radius: 20px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
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
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .greeting span {
        color: #2563eb;
      }
      .message {
        font-size: 15px;
        line-height: 1.7;
        color: #475569;
        margin-bottom: 16px;
      }
      .message strong {
        color: #1e293b;
      }
      .highlight-box {
        background: linear-gradient(135deg, #f1f5f9, #eef2ff);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        border-left: 4px solid #2563eb;
      }
      .highlight-box .title {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .highlight-box ul {
        margin: 0;
        padding-left: 20px;
        color: #475569;
        font-size: 14px;
        line-height: 1.8;
      }
      .highlight-box ul li {
        margin-bottom: 4px;
      }
      .cta-container {
        text-align: center;
        margin: 32px 0;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        color: #ffffff !important;
        font-size: 16px;
        font-weight: 600;
        padding: 14px 48px;
        border-radius: 10px;
        text-decoration: none;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        transition: all 0.3s ease;
      }
      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
      }
      .security-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background-color: #f0fdf4;
        border-radius: 8px;
        padding: 12px 20px;
        margin: 24px 0;
        font-size: 13px;
        color: #065f46;
        border: 1px solid #bbf7d0;
      }
      .security-badge svg {
        flex-shrink: 0;
      }
      .divider {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 32px 0 24px;
      }
      .support-section {
        background-color: #f8fafc;
        border-radius: 12px;
        padding: 20px 24px;
        margin: 24px 0;
        text-align: center;
      }
      .support-section p {
        margin: 4px 0;
        font-size: 14px;
        color: #475569;
      }
      .support-section a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
      }
      .support-section a:hover {
        text-decoration: underline;
      }
      .footer {
        padding: 0 40px 32px;
        text-align: center;
        border-top: 1px solid #f1f5f9;
        padding-top: 24px;
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
        line-height: 1.6;
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
        line-height: 1.6;
      }
      .footer .copyright a {
        color: #94a3b8;
        text-decoration: underline;
      }
      @media only screen and (max-width: 600px) {
        .header {
          padding: 28px 20px 24px;
        }
        .header .logo {
          font-size: 26px;
        }
        .content {
          padding: 28px 20px 24px;
        }
        .greeting {
          font-size: 20px;
        }
        .cta-button {
          padding: 12px 32px;
          font-size: 15px;
          width: 100%;
          box-sizing: border-box;
        }
        .highlight-box {
          padding: 16px 20px;
        }
        .support-section {
          padding: 16px 20px;
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
          <div class="logo">Cyber<span>Kavach</span></div>
          <div class="badge">✅ Account Verified</div>
          <div class="subtitle">Cybersecurity Training &amp; Certification</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Welcome, <span>${name || "Security Professional"}</span>! 👋
          </div>
          
          <div class="message">
            Thank you for joining <strong>CyberKavach</strong> – India's premier cybersecurity training and certification platform. We're thrilled to have you as part of our community of security professionals and enthusiasts.
          </div>
          
          <div class="message">
            Your account has been successfully created and verified. You now have full access to our learning resources, courses, and community features.
          </div>
          
          <div class="highlight-box">
            <div class="title">🚀 What's Next?</div>
            <ul>
              <li><strong>Explore Courses:</strong> Browse our industry-leading cybersecurity programs</li>
              <li><strong>Connect with Mentors:</strong> Learn from certified security professionals</li>
              <li><strong>Earn Certifications:</strong> Get globally recognized credentials</li>
              <li><strong>Join Community:</strong> Network with like-minded security enthusiasts</li>
            </ul>
          </div>
          
          <div class="cta-container">
            <a href="${process.env.DOMAIN || "https://cyberkavach.org.in"}/" class="cta-button">
              Access Your Dashboard
            </a>
          </div>
          
          <div class="security-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <span>✓ Account secured via Google OAuth authentication</span>
          </div>
          
          <div class="support-section">
            <p style="font-weight:600;color:#1e293b;">📞 Need Assistance?</p>
            <p>
              Our support team is here to help you get started.
              <br>
              📧 <a href="mailto:info@cyberkavach.org.in">info@cyberkavach.org.in</a>
              &nbsp;|&nbsp; 🌐 <a href="${process.env.DOMAIN || "https://cyberkavach.org.in"}">cyberkavach.org.in</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="brand">Cyber <span>Kavach</span></div>
          <div class="tagline">Securing Digital Futures</div>
          <div class="contact">
             Delhi, India<br>
             <a href="mailto:info@cyberkavach.org.in">info@cyberkavach.org.in</a><br>
             <a href="${process.env.DOMAIN || "https://cyberkavach.org.in"}">www.cyberkavach.org.in</a>
          </div>
          <div class="copyright">
            This is an automated welcome email. Please do not reply directly.
            <br>
            Protecting your data is our priority. Read our 
            <a href="${process.env.DOMAIN || "https://cyberkavach.org.in"}/privacy">Privacy Policy</a>.
            <br><br>
            © ${new Date().getFullYear()} CyberKavach. All rights reserved.
            <br>
            MSME Registered • GST Compliant
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  // Professional Plain Text Version
  const textContent = `
  ========================================
  WELCOME TO CYBERKAVACH
  ========================================
  
  Hello ${name || "Security Professional"},
  
  Welcome to CyberKavach – India's premier cybersecurity training and certification platform!
  
  Your account has been successfully created and verified. You now have full access to our learning resources, courses, and community features.
  
  ─────────────────────────────────────
  🚀 WHAT'S NEXT?
  ─────────────────────────────────────
  
  • Explore Courses: Browse our industry-leading cybersecurity programs
  • Connect with Mentors: Learn from certified security professionals
  • Earn Certifications: Get globally recognized credentials
  • Join Community: Network with like-minded security enthusiasts
  
  ─────────────────────────────────────
  ACCESS YOUR DASHBOARD
  ─────────────────────────────────────
  
  ${process.env.DOMAIN || "https://cyberkavach.org.in"}/dashboard
  
  ─────────────────────────────────────
  NEED ASSISTANCE?
  ─────────────────────────────────────
  
  Our support team is here to help you get started.
  
  📧 Email: info@cyberkavach.org.in
  🌐 Website: ${process.env.DOMAIN || "https://cyberkavach.org.in"}
  
  ─────────────────────────────────────
  
  CyberKavach | Securing Digital Futures
  Delhi, India
  
  This is an automated welcome email. Please do not reply directly.
  Protecting your data is our priority. Read our Privacy Policy at:
  ${process.env.DOMAIN || "https://cyberkavach.org.in"}/privacy
  
  © ${new Date().getFullYear()} CyberKavach. All rights reserved.
  MSME Registered • GST Compliant
  `;

  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: "info@cyberkavach.org.in",
        name: "CyberKavach Welcome Team",
      },
      to: [{ email, name: name || "Security Professional" }],
      subject: "🎉 Welcome to CyberKavach! Your Cybersecurity Journey Begins",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log("Welcome email sent to:", email);
  } catch (emailErr) {
    console.error("Failed to send welcome email:", emailErr);
    // Don't fail user creation if email fails
  }
};