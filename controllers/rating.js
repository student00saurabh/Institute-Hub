const Course = require("../models/cources");
const User = require("../models/user");

// ========== USER FUNCTIONS ==========

// ===== 1. Get user's rating for a course =====
module.exports.getUserRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const userRating = course.getUserRating(userId);

    return res.json({
      success: true,
      rating: userRating ? userRating.rating : 0,
      review: userRating ? userRating.review : "",
      hasRated: !!userRating
    });
  } catch (error) {
    console.error("Get user rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get rating"
    });
  }
};

// ===== 2. Submit or Update Rating (FIXED) =====
module.exports.submitRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Validate user is logged in
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to rate this course"
      });
    }

    // Sanitize rating
    const ratingValue = parseInt(req.body.rating, 10);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rating (1-5)"
      });
    }

    // Sanitize review
    let reviewText = typeof req.body.review === "string" ? req.body.review.trim() : "";
    if (reviewText.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Review must be 500 characters or less"
      });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: "This course is not currently active"
      });
    }

    // Check if user is enrolled
    const isEnrolled = course.students.some(
      (s) => s.user && s.user.toString() === userId.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to rate it"
      });
    }

    const alreadyRated = !!course.getUserRating(userId);

    // Add or update rating
    course.addOrUpdateRating(userId, ratingValue, reviewText);
    await course.updateRating();

    // ✅ Always return 200 OK with success: true
    return res.status(200).json({
      success: true,
      message: alreadyRated ? "Your rating has been updated successfully!" : "Rating submitted successfully!",
      rating: ratingValue,
      review: reviewText,
      averageRating: course.rating,
      totalRatings: course.totalRatings,
      reviewCount: course.reviewCount,
      hasRated: true
    });

  } catch (error) {
    console.error("Submit rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating. Please try again."
    });
  }
};

// ===== 3. Delete User's Rating (FIXED) =====
module.exports.deleteUserRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const userRating = course.getUserRating(userId);
    if (!userRating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    course.removeUserRating(userId);
    await course.updateRating();

    // ✅ Always return 200 OK with success: true
    return res.status(200).json({
      success: true,
      message: "Rating deleted successfully!",
      averageRating: course.rating,
      totalRatings: course.totalRatings,
      reviewCount: course.reviewCount,
      hasRated: false
    });

  } catch (error) {
    console.error("Delete rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete rating"
    });
  }
};

// ========== PUBLIC FUNCTIONS ==========

// ===== Public: Get all reviews for a course =====
module.exports.getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const course = await Course.findById(courseId)
      .select("title rating reviewCount totalRatings ratings")
      .populate("ratings.user", "name")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const allRatings = (course.ratings || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = allRatings.length;
    const paginated = allRatings.slice(skip, skip + limit).map((r) => ({
      _id: r._id,
      userName: r.user?.name || "Anonymous",
      rating: r.rating,
      review: r.review || "",
      createdAt: r.createdAt
    }));

    return res.json({
      success: true,
      reviews: paginated,
      averageRating: course.rating || 0,
      totalRatings: course.totalRatings || 0,
      reviewCount: course.reviewCount || 0,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + paginated.length < total
    });
  } catch (error) {
    console.error("Get course reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load reviews"
    });
  }
};

// ========== ADMIN FUNCTIONS ==========

// ===== 4. Admin: Get All Course Ratings =====
module.exports.adminGetRatings = async (req, res) => {
  try {
    const { courseId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (courseId) {
      query._id = courseId;
    }

    const courses = await Course.find(query)
      .select("title rating reviewCount totalRatings ratings")
      .populate("ratings.user", "name email")
      .sort({ rating: -1 });

    let allRatings = [];
    courses.forEach(course => {
      course.ratings.forEach(rating => {
        allRatings.push({
          _id: rating._id,
          courseId: course._id,
          courseTitle: course.title,
          user: rating.user,
          rating: rating.rating,
          review: rating.review,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt
        });
      });
    });

    allRatings.sort((a, b) => b.createdAt - a.createdAt);

    const total = allRatings.length;
    const paginated = allRatings.slice(skip, skip + parseInt(limit));

    const stats = {
      total: total,
      averageRating: courses.length > 0 ? 
        (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length) : 0,
      totalCourses: courses.length
    };

    res.render("admin/ratings.ejs", {
      ratings: paginated,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats,
      courseId: courseId || "",
      moment: require("moment")
    });
  } catch (error) {
    console.error("Admin get ratings error:", error);
    req.flash("error", "Failed to load ratings");
    res.redirect("/admin/dashboard");
  }
};

// ===== 5. Admin: Delete Rating =====
module.exports.adminDeleteRating = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({ "ratings._id": id });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    const targetRating = course.ratings.find((r) => r._id.toString() === id);
    if (!targetRating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    course.removeUserRating(targetRating.user);
    await course.updateRating();

    return res.json({
      success: true,
      message: "Rating deleted successfully"
    });
  } catch (error) {
    console.error("Admin delete rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete rating"
    });
  }
};

// ===== 6. Admin: Get Course Ratings =====
module.exports.adminGetCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("ratings.user", "name email");

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/admin/ratings");
    }

    res.render("admin/courseRatings.ejs", {
      course,
      ratings: course.ratings,
      moment: require("moment")
    });
  } catch (error) {
    console.error("Admin get course ratings error:", error);
    req.flash("error", "Failed to load course ratings");
    res.redirect("/admin/ratings");
  }
};