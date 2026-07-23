const User = require("../models/user");
const Review = require("../models/review");
const crypto = require("crypto");
const brevo = require("@getbrevo/brevo");

// ========== CONFIGURATION ==========
const TOKEN_EXPIRY_HOURS = 168; // 7 days

// ========== HELPER FUNCTIONS ==========

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendReviewEmail(user, reviewLink) {
  try {
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
        <title>Share Your Experience | InstituteHub</title>
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 40px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
          .header .subtitle { color: #93c5fd; font-size: 14px; margin-top: 8px; font-weight: 400; }
          .content { padding: 40px 40px 32px; }
          .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
          .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
          .button-container { text-align: center; margin: 32px 0; }
          .review-button { display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff !important; font-size: 16px; font-weight: 600; padding: 14px 48px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
          .review-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45); }
          .info-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
          .info-box .text { font-size: 13px; color: #475569; line-height: 1.5; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 24px; }
          .footer { padding: 0 40px 32px; text-align: center; }
          .footer .brand { font-weight: 700; color: #1e293b; font-size: 16px; }
          .footer .brand span { color: #2563eb; }
          .footer .tagline { color: #94a3b8; font-size: 13px; margin-top: 4px; }
          .footer .contact { color: #64748b; font-size: 13px; margin-top: 8px; }
          .footer .contact a { color: #2563eb; text-decoration: none; }
          .footer .copyright { color: #94a3b8; font-size: 12px; margin-top: 16px; }
          @media only screen and (max-width: 600px) {
            .header { padding: 24px 20px; }
            .content { padding: 24px 20px; }
            .review-button { padding: 12px 32px; font-size: 15px; }
            .footer { padding: 0 20px 24px; }
          }
        </style>
      </head>
      <body style="margin:0;padding:20px;background-color:#f8fafc;">
        <div style="max-width:600px;margin:0 auto;">
          <div class="container">
            <div class="header">
              <h1>InstituteHub</h1>
              <div class="subtitle">We Value Your Feedback!</div>
            </div>
            <div class="content">
              <div class="greeting">Hello ${user.name || 'there'},</div>
              <div class="message">
                Thank you for being a part of the InstituteHub community! We'd love to hear about your experience with our platform.
                <br><br>
                Your feedback helps us improve and helps others make informed decisions.
              </div>
              <div class="button-container">
                <a href="${reviewLink}" class="review-button">Share Your Review</a>
              </div>
              <div class="info-box">
                <div class="text">
                  <strong>⏱️ This link will expire in 7 days</strong><br>
                  Your review will be shared on our platform to help other cybersecurity enthusiasts.
                </div>
              </div>
              <div class="message" style="font-size:14px;color:#94a3b8;margin-bottom:0;">
                If you have any questions, feel free to contact us at student001599@gmail.com
              </div>
            </div>
            <hr class="divider">
            <div class="footer">
              <div class="brand">Institute <span>Hub</span></div>
              <div class="tagline">Securing Digital Futures</div>
              <div class="contact">📧 <a href="mailto:student001599@gmail.com">student001599@gmail.com</a></div>
              <div class="copyright">&copy; ${new Date().getFullYear()} InstituteHub. All rights reserved.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail({
      sender: { email: "student001599@gmail.com", name: "InstituteHub" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "⭐ Share Your Experience | InstituteHub Review",
      htmlContent: htmlContent,
    });

    console.log(`✅ Review email sent to: ${user.email}`);
  } catch (error) {
    console.error("❌ Review email error:", error);
    throw new Error("Failed to send review email");
  }
}

// ===== 1. Send Review Invitation (Admin) =====
module.exports.sendReviewInvitation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      req.flash("error", "User ID is required");
      return res.redirect("/admin/users");
    }

    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/users");
    }

    // ✅ Check if user already has ANY review (pending, verified, or approved)
    const existingReview = await Review.findOne({
      email: user.email
    });

    if (existingReview) {
      if (existingReview.isApproved) {
        req.flash("warning", `${user.name} has already submitted an approved review`);
      } else if (existingReview.isVerified) {
        req.flash("warning", `${user.name} has already submitted a review (pending approval)`);
      } else {
        req.flash("info", `A review invitation already exists for ${user.name}`);
      }
      return res.redirect("/admin/users");
    }

    // Generate token
    const token = generateToken();
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + TOKEN_EXPIRY_HOURS);

    // Create review with default values
    const review = new Review({
      user: user._id,
      name: user.name || user.username || 'User',
      email: user.email,
      token: token,
      tokenExpires: tokenExpires,
      reviewSource: 'email_invite',
      rating: 5,
      title: 'Pending Review',
      message: 'User has not submitted review yet',
      isVerified: false,
      isApproved: false
    });

    await review.save();

    // Send email
    const domain = process.env.DOMAIN || 'http://localhost:8080';
    const reviewLink = `${domain}/review/${token}`;

    await sendReviewEmail(user, reviewLink);

    req.flash("success", `Review invitation sent to ${user.name}`);
    res.redirect("/admin/users");

  } catch (error) {
    console.error("Send review invitation error:", error);
    req.flash("error", "Failed to send review invitation");
    res.redirect("/admin/users");
  }
};



function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.socket?.remoteAddress || 
         req.ip || 
         'unknown';
}

// ===== Render Review Form =====
module.exports.renderReviewForm = async (req, res) => {
  try {
    const { token } = req.params;

    const review = await Review.findOne({
      token: token,
      tokenExpires: { $gt: new Date() }
    }).populate('user');

    if (!review) {
      req.flash("error", "This review link has expired or is invalid");
      return res.redirect("/");
    }

    if (review.isVerified) {
      req.flash("info", "You have already submitted this review");
      return res.redirect("/");
    }

    // ✅ Pass token to the view
    res.render("reviews/submit.ejs", {
      review: review,
      token: token,  // ← This is the key!
      title: "Submit Your Review"
    });

  } catch (error) {
    console.error("Render review form error:", error);
    req.flash("error", "Unable to load review form");
    res.redirect("/");
  }
};

// ===== 3. Submit Review =====
module.exports.submitReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { rating, message } = req.body;

    const review = await Review.findOne({
      token: token,
      tokenExpires: { $gt: new Date() }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review link has expired or is invalid"
      });
    }

    // Check if already submitted
    if (review.isVerified) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this review"
      });
    }

    // Validate
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rating (1-5)"
      });
    }

    if (!message || message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed review (min 10 characters)"
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Review cannot exceed 1000 characters"
      });
    }

    // ✅ Check if email already has a review
    const existingReview = await Review.findOne({
      email: review.email,
      isVerified: true
    });

    if (existingReview && existingReview._id.toString() !== review._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this email"
      });
    }

    // Update review
    review.rating = parseInt(rating);
    review.message = message.trim();
    review.isVerified = true;
    review.title = 'Review'; // ✅ Keep a default title for admin view

    await review.save();

    // Update user's hasReviewed flag
    if (review.user) {
      await User.findByIdAndUpdate(review.user, {
        $set: { hasReviewed: true }
      });
    }

    return res.json({
      success: true,
      message: "Thank you for your review! It will be reviewed by our team shortly."
    });

  } catch (error) {
    console.error("Submit review error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit your review. Please try again."
    });
  }
};

// ===== 4. Admin - Manage Reviews =====
module.exports.manageReviews = async (req, res) => {
  try {
    const { filter, status, page = 1 } = req.query;
    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    let query = {};

    // Filters
    if (filter === 'pending') {
      query.isApproved = false;
      query.isVerified = true;
    } else if (filter === 'approved') {
      query.isApproved = true;
    } else if (filter === 'featured') {
      query.isFeatured = true;
    } else if (filter === 'homepage') {
      query.showOnHomepage = true;
    }

    if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'unverified') {
      query.isVerified = false;
    }

    const totalReviews = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get stats
    const stats = {
      total: await Review.countDocuments(),
      pending: await Review.countDocuments({ isApproved: false, isVerified: true }),
      approved: await Review.countDocuments({ isApproved: true }),
      featured: await Review.countDocuments({ isFeatured: true }),
      homepage: await Review.countDocuments({ showOnHomepage: true }),
      verified: await Review.countDocuments({ isVerified: true }),
      unverified: await Review.countDocuments({ isVerified: false })
    };

    res.render("admin/reviews.ejs", {
      reviews,
      totalReviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReviews / limit),
      filter: filter || 'all',
      status: status || 'all',
      stats,
      moment: require("moment")
    });

  } catch (error) {
    console.error("Manage reviews error:", error);
    req.flash("error", "Failed to load reviews");
    res.redirect("/admin/dashboard");
  }
};

// ===== 5. Admin - Toggle Review Status =====
module.exports.toggleReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    switch(action) {
      case 'approve':
        review.isApproved = true;
        review.approvedBy = req.user._id;
        review.approvedAt = new Date();
        break;
      case 'unapprove':
        review.isApproved = false;
        review.approvedBy = null;
        review.approvedAt = null;
        break;
      case 'feature':
        review.isFeatured = !review.isFeatured;
        break;
      case 'homepage':
        review.showOnHomepage = !review.showOnHomepage;
        break;
      case 'delete':
        const reviewToDelete = await Review.findById(id);
        if (reviewToDelete && reviewToDelete.user) {
          // Reset the user's hasReviewed flag
            await User.findByIdAndUpdate(reviewToDelete.user, {
            $set: { hasReviewed: false }
          });
        }
        await Review.findByIdAndDelete(id);
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

    await review.save();

    return res.json({
      success: true,
      message: "Review updated successfully",
      review
    });

  } catch (error) {
    console.error("Toggle review status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review"
    });
  }
};

// ===== 6. Admin - Add Admin Response =====
module.exports.addAdminResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || response.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Response must be at least 3 characters"
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    review.adminResponse = response.trim();
    review.adminResponseAt = new Date();
    await review.save();

    return res.json({
      success: true,
      message: "Admin response added successfully"
    });

  } catch (error) {
    console.error("Add admin response error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add admin response"
    });
  }
};

// ===== 7. Get Featured Reviews for Homepage =====
module.exports.getFeaturedReviews = async () => {
  try {
    const reviews = await Review.find({
      isApproved: true,
      isFeatured: true,
      showOnHomepage: true
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    return reviews;
  } catch (error) {
    console.error("Get featured reviews error:", error);
    return [];
  }
};

// ===== 8. Public Reviews Page =====
module.exports.publicReviews = async (req, res) => {
  try {
    const { page = 1, sort = 'latest' } = req.query;
    const limit = 12;
    const skip = (parseInt(page) - 1) * limit;

    let query = { isApproved: true, isVerified: true };
    let sortOptions = {};

    switch(sort) {
      case 'latest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'highest':
        sortOptions = { rating: -1 };
        break;
      case 'lowest':
        sortOptions = { rating: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const totalReviews = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Get stats
    const stats = {
      total: await Review.countDocuments({ isApproved: true }),
      average: await Review.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: null, avg: { $avg: "$rating" } } }
      ]),
      distribution: await Review.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    };

    res.render("reviews/public.ejs", {
      reviews,
      totalReviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReviews / limit),
      sort,
      stats,
      moment: require("moment")
    });

  } catch (error) {
    console.error("Public reviews error:", error);
    req.flash("error", "Unable to load reviews");
    res.redirect("/");
  }
};
