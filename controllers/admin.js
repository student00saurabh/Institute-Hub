const User = require("../models/user");
const crypto = require("crypto");
const Contact = require("../models/contact");
const Course = require("../models/cources");
const Subscriber = require("../models/subscriber");
const cources = require("../models/cources");
const Blog = require("../models/blog");
const Review = require("../models/review");
const Payment = require("../models/payment");
// const Diploma = require("../models/diploma");
const Certificate = require("../models/certification.js");

module.exports.adminDashboard = async (req, res) => {
  try {
    // Get stats
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalBlogs = await Blog.countDocuments();

    const totalPayments = await Payment.countDocuments({ status: "success" });
    const totalRevenue = await Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
    const pendingReviews = await Review.countDocuments({ isApproved: false, isVerified: true });
    const totalTeachers = await User.countDocuments({ role: { $in: ["teacher", "admin"] } });

    // Get recent 30 days data for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // User Growth
    const previousUsers = await User.countDocuments({
      createdAt: { $lt: thirtyDaysAgo },
    });
    const currentUsers = totalUsers - previousUsers;
    const userGrowth = previousUsers > 0
      ? Math.round(((currentUsers - previousUsers) / previousUsers) * 100)
      : 100;

    // Course Growth
    const previousCourses = await Course.countDocuments({
      createdAt: { $lt: thirtyDaysAgo },
    });
    const currentCourses = totalCourses - previousCourses;
    const courseGrowth = previousCourses > 0
      ? Math.round(((currentCourses - previousCourses) / previousCourses) * 100)
      : 100;

    // Blog Growth
    const previousBlogs = await Blog.countDocuments({
      createdAt: { $lt: thirtyDaysAgo },
    });
    const currentBlogs = totalBlogs - previousBlogs;
    const blogGrowth = previousBlogs > 0
      ? Math.round(((currentBlogs - previousBlogs) / previousBlogs) * 100)
      : 100;

    // Get pending actions (using correct field names)
    const pendingContacts = await Contact.countDocuments({ isSeen: false });
    const pendingSubscribers = await Subscriber.countDocuments({ isActive: false });
    const pendingActions = pendingContacts + pendingSubscribers;

    // Get pending contacts list (for quick view)
    const pendingContactsList = await Contact.find({ isSeen: false })
      .sort({ msgDate: -1 })
      .limit(5)
      .select("name email subject msgDate");

    // Get pending subscribers list (for quick view)
    const pendingSubscribersList = await Subscriber.find({ isActive: false })
      .sort({ subscribedAt: -1 })
      .limit(5)
      .select("email subscribedAt");

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email role isVerified isBlocked createdAt");

    // Get recent courses (last 5)
    const allCourses = await Course.find()
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent activities (combine from different collections)
    const recentActivities = [];

    // Add recent user registrations
    const recentUserRegistrations = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name email createdAt");
    
    recentUserRegistrations.forEach(user => {
      recentActivities.push({
        type: "user",
        title: "New User Registration",
        description: `${user.name || 'User'} registered as a student`,
        timestamp: user.createdAt,
        user: { name: user.name, email: user.email }
      });
    });

    // Add recent course creations
    const recentCourseCreations = await Course.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title createdAt teacher")
      .populate("teacher", "name");
    
    recentCourseCreations.forEach(course => {
      recentActivities.push({
        type: "course",
        title: "Course Created",
        description: `New course "${course.title}" published${course.teacher ? ` by ${course.teacher.name}` : ''}`,
        timestamp: course.createdAt,
        user: { name: course.teacher?.name || 'Admin' }
      });
    });

    // Add recent blog creations
    const recentBlogCreations = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title createdAt author")
      .populate("author", "name");
    
    recentBlogCreations.forEach(blog => {
      recentActivities.push({
        type: "blog",
        title: "New Blog Published",
        description: `Blog "${blog.title}" published${blog.author ? ` by ${blog.author.name}` : ''}`,
        timestamp: blog.createdAt,
        user: { name: blog.author?.name || 'Admin' }
      });
    });

    // Add recent contact submissions
    const recentContactSubmissions = await Contact.find()
      .sort({ msgDate: -1 })
      .limit(2)
      .select("name email subject msgDate");
    
    recentContactSubmissions.forEach(contact => {
      recentActivities.push({
        type: "contact",
        title: "New Contact Message",
        description: `Message from ${contact.name} regarding "${contact.subject}"`,
        timestamp: contact.msgDate,
        user: { name: contact.name, email: contact.email }
      });
    });

    // Sort activities by timestamp (newest first) and limit to 10
    recentActivities.sort((a, b) => b.timestamp - a.timestamp);
    const limitedActivities = recentActivities.slice(0, 10);

    res.render("admin/dashboard.ejs", {
      stats: {
        totalUsers,
        totalCourses,
        totalBlogs,
        totalRevenue: 0,
        pendingActions,
        userGrowth,
        courseGrowth,
        blogGrowth,
        revenueGrowth: 0,
        activeSessions: Math.floor(Math.random() * 100) + 50,
        uptime: "99.9%",
        totalPayments: totalPayments || 0,
        pendingReviews: pendingReviews || 0,
        totalTeachers: totalTeachers || 0,
      },
      recentUsers,
      recentActivities: limitedActivities,
      courses: allCourses,
      pendingContacts: pendingContactsList,
      pendingSubscribers: pendingSubscribersList,
      moment: require("moment"),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    req.flash("error", "Failed to load dashboard");
    res.status(500).render("error", {
      message: error.message,
      statusCode: 500,
    });
  }
};


// Update your controller
module.exports.contactSubmissions = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};

    // Apply filters
    if (filter === "unread") {
      query.isSeen = false;
    } else if (filter === "read") {
      query.isSeen = true;
    }

    const contacts = await Contact.find(query)
      .populate("user")
      .sort({ msgDate: -1 }); // Newest first

    res.render("admin/contact.ejs", {
      contacts,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load contact massages");
    res.redirect("/admin");
  }
};

// Add these new controller functions
module.exports.toggleSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      req.flash("error", "Contact not found");
      return res.redirect("/admin/contacts");
    }

    contact.isSeen = !contact.isSeen;
    await contact.save();

    req.flash("success", `Marked as ${contact.isSeen ? "read" : "unread"}`);
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update contact status");
    res.redirect("/admin/contacts");
  }
};

module.exports.getContactDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id).populate("user");

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch contact details" });
  }
};

module.exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);

    req.flash("success", "Contact message deleted successfully");
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete contact message");
    res.redirect("/admin/contacts");
  }
};

module.exports.subscribers = async (req, res) => {
  try {
    const { filter, search } = req.query;

    let query = {};

    // Apply status filter
    if (filter === "active") {
      query.isActive = true;
    } else if (filter === "inactive") {
      query.isActive = false;
    }

    // Apply search filter
    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const subscribers = await Subscriber.find(query).sort({ subscribedAt: -1 });

    res.render("admin/subscribers.ejs", {
      subscribers,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load subscribers");
    res.redirect("/admin");
  }
};

module.exports.createSubscriber = async (req, res) => {
  try {
    const { email, isActive = true } = req.body;

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({
      email: email.toLowerCase(),
    });
    if (existingSubscriber) {
      return res.status(400).json({
        message: "Email Already Registered",
      });
    }

    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      isActive,
      subscribedAt: new Date(),
    });

    await subscriber.save();

    res.status(201).json({
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Unable to subscribe. Please try again later.",
    });
  }
};

module.exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await Subscriber.findById(id);

    if (!subscriber) {
      req.flash("error", "Subscriber not found");
      return res.redirect("/admin/subscribers");
    }

    subscriber.isActive = !subscriber.isActive;
    await subscriber.save();

    req.flash(
      "success",
      `Subscriber ${subscriber.isActive ? "activated" : "deactivated"} successfully`,
    );
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update subscriber status");
    res.redirect("/admin/subscribers");
  }
};

module.exports.deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    await Subscriber.findByIdAndDelete(id);

    req.flash("success", "Subscriber deleted successfully");
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete subscriber");
    res.redirect("/admin/subscribers");
  }
};

module.exports.bulkAction = async (req, res) => {
  try {
    const { action, subscriberIds } = req.body;

    if (!action || !subscriberIds || subscriberIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    switch (action) {
      case "activate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds } },
          { $set: { isActive: true } },
        );
        break;

      case "deactivate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds } },
          { $set: { isActive: false } },
        );
        break;

      case "delete":
        await Subscriber.deleteMany({ _id: { $in: subscriberIds } });
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid action" });
    }

    res.json({ success: true, message: "Bulk action completed successfully" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to perform bulk action" });
  }
};

module.exports.exportSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });

    let csvContent = "Email,Status,Subscribed Date,Subscribed Time\n";

    subscribers.forEach((subscriber) => {
      const date = new Date(subscriber.subscribedAt);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      const status = subscriber.isActive ? "Active" : "Inactive";

      csvContent += `"${subscriber.email}","${status}","${formattedDate}","${formattedTime}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=subscribers-${new Date().toISOString().split("T")[0]}.csv`,
    );
    res.send(csvContent);
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to export subscribers");
    res.redirect("/admin/subscribers");
  }
};

// controllers/userController.js or wherever your controller is

module.exports.userDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user details
    const user = await User.findById(id).lean();

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/users");
    }

    // Get courses where user is a student (enrolled)
    const enrolledCourses = await Course.find({
      "students.user": id,
    })
      .populate("teacher", "name email")
      .lean();

    // Get certificates issued to this user
    const certificates = await Certificate.find({
      student: id,
    })
      .populate("course", "title")
      .populate("teacher", "name")
      .lean();

    // If user is a teacher, get their teacher profile and courses they teach
    let teacherProfile = null;
    let teachingCourses = [];

    if (user.role === "teacher") {
      teacherProfile = await Teacher.findOne({ teacher: id }).lean();
      teachingCourses = await Course.find({
        teacher: id,
      })
        .populate("students.user", "name email")
        .lean();
    }

    // Get contact messages from this user
    const contactMessages = await Contact.find({
      user: id,
    })
      .sort({ msgDate: -1 })
      .lean();

    res.render("admin/userDetails.ejs", {
      user,
      enrolledCourses,
      certificates,
      teacherProfile,
      teachingCourses,
      contactMessages,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load user details");
    res.redirect("/admin/users");
  }
};



// ============ 1. MANAGE COURSES ============
module.exports.manageCourses = async (req, res) => {
  try {
    // ✅ Role-based access control - Only admin and teacher can access
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
      req.flash('error', 'You do not have permission to access this page');
      return res.redirect('/');
    }

    // Get query parameters for filtering and pagination
    const { search, filter, page = 1 } = req.query;
    const limit = 20; // 20 courses per page
    const skip = (parseInt(page) - 1) * limit;

    // Build search query
    let query = {};
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { courceType: { $regex: search, $options: "i" } }
      ];
    }

    // Apply filters
    if (filter === 'active') {
      query.isActive = true;
    } else if (filter === 'inactive') {
      query.isActive = false;
    } else if (filter === 'popular') {
      query.isPopular = true;
    } else if (filter === 'navbar') {
      query.showInNavbar = true;
    } else if (filter === 'homepage') {
      query.addInHomePage = true;
    }

    // Get total count for pagination
    const totalCourses = await Course.countDocuments(query);

    // Fetch courses with pagination
    const courses = await Course.find(query)
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(totalCourses / limit);

    res.render('admin/courses.ejs', {
      courses,
      totalCourses,
      currentPage: parseInt(page),
      totalPages,
      search: search || '',
      filter: filter || 'all',
      moment: require('moment'),
      user: req.user // Pass user for role checking in view
    });
  } catch (error) {
    console.error('Manage courses error:', error);
    req.flash('error', 'Failed to load courses. Please try again.');
    res.redirect('/admin/dashboard');
  }
};

// ============ 2. MANAGE BLOGS ============
module.exports.manageBlogs = async (req, res) => {
  try {
    // ✅ Role-based access control - Only admin can access (teacher cannot manage blogs)
    if (!req.user || req.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to access this page');
      return res.redirect('/');
    }

    // Get query parameters for filtering and pagination
    const { search, filter, page = 1 } = req.query;
    const limit = 20; // 20 blogs per page
    const skip = (parseInt(page) - 1) * limit;

    // Build search query
    let query = {};

    // Search by title, description, or category
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortdescription: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    // Apply filters
    if (filter === 'valid') {
      query.isvalid = true;
    } else if (filter === 'invalid') {
      query.isvalid = false;
    } else if (filter === 'blocked') {
      query.blocked = true;
    } else if (filter === 'unblocked') {
      query.blocked = false;
    } else if (filter === 'verified') {
      query.adminVerified = true;
    } else if (filter === 'unverified') {
      query.adminVerified = false;
    }

    // Get total count for pagination
    const totalBlogs = await Blog.countDocuments(query);

    // Fetch blogs with pagination
    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(totalBlogs / limit);

    res.render('admin/blogs.ejs', {
      blogs,
      totalBlogs,
      currentPage: parseInt(page),
      totalPages,
      search: search || '',
      filter: filter || 'all',
      moment: require('moment'),
      user: req.user
    });
  } catch (error) {
    console.error('Manage blogs error:', error);
    req.flash('error', 'Failed to load blogs. Please try again.');
    res.redirect('/admin/dashboard');
  }
};

// ============ 3. MANAGE USERS ============
module.exports.manageUsers = async (req, res) => {
  try {
    // ✅ Role-based access control - Only admin can manage users
    if (!req.user || req.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to access this page');
      return res.redirect('/');
    }

    // Get query parameters for filtering and pagination
    const { search, role, page = 1 } = req.query;
    const limit = 20; // 20 users per page
    const skip = (parseInt(page) - 1) * limit;

    // Build search query
    let query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Apply role filter
    if (role && role !== 'all') {
      query.role = role;
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    // Fetch users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name email role isVerified isBlocked isActive createdAt googleId');

    // ============ FETCH USER REVIEWS ============
    // Get all approved reviews to check which users have reviewed
    const userReviews = await Review.find({ isApproved: true })
      .select('email rating isApproved')
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users.ejs', {
      users,
      totalUsers,
      currentPage: parseInt(page),
      totalPages,
      search: search || '',
      role: role || 'all',
      userReviews, // ✅ Pass userReviews to the view
      moment: require('moment'),
      user: req.user
    });
  } catch (error) {
    console.error('Manage users error:', error);
    req.flash('error', 'Failed to load users. Please try again.');
    res.redirect('/admin/dashboard');
  }
};

// ============ TOGGLE USER BLOCK ============
module.exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    req.flash('success', `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Toggle user block error:', error);
    req.flash('error', 'Failed to update user status');
    res.redirect('/admin/users');
  }
};

// ============ TOGGLE USER ROLE ============
module.exports.toggleUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    // Cycle through roles: user -> teacher -> admin -> user
    const roles = ['user', 'teacher', 'admin'];
    const currentIndex = roles.indexOf(user.role);
    user.role = roles[(currentIndex + 1) % roles.length];
    await user.save();

    req.flash('success', `User role changed to ${user.role}`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Toggle user role error:', error);
    req.flash('error', 'Failed to update user role');
    res.redirect('/admin/users');
  }
};

// ============ DELETE USER ============
module.exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    req.flash('success', `User "${user.name || 'User'}" deleted successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Delete user error:', error);
    req.flash('error', 'Failed to delete user');
    res.redirect('/admin/users');
  }
};

// ============ RESET USER REVIEW FLAG ============
module.exports.resetUserReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Reset the hasReviewed flag
    user.hasReviewed = false;
    await user.save();
    
    return res.json({
      success: true,
      message: "User review flag reset successfully"
    });
  } catch (error) {
    console.error("Reset user review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset user review flag"
    });
  }
};


// ============ COURSE RATINGS MANAGEMENT ============

// ===== 1. Manage All Course Ratings =====
module.exports.manageCourseRatings = async (req, res) => {
  try {
    const { courseId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {};
    if (courseId) {
      query._id = courseId;
    }

    // Get courses with ratings
    const courses = await Course.find(query)
      .select('title rating reviewCount totalRatings ratings teacher')
      .populate('teacher', 'name email')
      .sort({ rating: -1 });

    // Flatten ratings for display
    let allRatings = [];
    courses.forEach(course => {
      if (course.ratings && course.ratings.length > 0) {
        course.ratings.forEach(rating => {
          allRatings.push({
            _id: rating._id,
            courseId: course._id,
            courseTitle: course.title,
            teacher: course.teacher,
            userId: rating.user,
            rating: rating.rating,
            review: rating.review || '',
            createdAt: rating.createdAt,
            updatedAt: rating.updatedAt
          });
        });
      }
    });

    // Sort by newest first
    allRatings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const total = allRatings.length;
    const paginatedRatings = allRatings.slice(skip, skip + parseInt(limit));

    // Get user details for each rating
    const userIds = paginatedRatings.map(r => r.userId).filter(id => id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // Attach user details to ratings
    paginatedRatings.forEach(r => {
      r.user = r.userId ? userMap[r.userId.toString()] : null;
    });

    // Get stats
    const stats = {
      totalCourses: courses.length,
      totalRatings: total,
      averageRating: courses.length > 0 
        ? (courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length) 
        : 0,
      coursesWithRatings: courses.filter(c => c.ratings && c.ratings.length > 0).length
    };

    // Get all courses for dropdown filter
    const allCourses = await Course.find({ isActive: true })
      .select('title')
      .sort({ title: 1 });

    res.render('admin/courseRatings.ejs', {
      ratings: paginatedRatings,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats,
      courseId: courseId || '',
      allCourses,
      moment: require('moment'),
      user: req.user
    });
  } catch (error) {
    console.error('Manage course ratings error:', error);
    req.flash('error', 'Failed to load course ratings');
    res.redirect('/admin/dashboard');
  }
};

// ===== 2. Get Course Rating Details =====
module.exports.getCourseRatingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .select('title rating reviewCount totalRatings ratings teacher')
      .populate('teacher', 'name email');

    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/admin/course-ratings');
    }

    // Get user details for ratings
    const userIds = course.ratings.map(r => r.user).filter(id => id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // Attach user details to ratings
    const ratingsWithUsers = course.ratings.map(r => ({
      ...r.toObject ? r.toObject() : r,
      user: r.user ? userMap[r.user.toString()] : null
    }));

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    course.ratings.forEach(r => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    res.render('admin/courseRatingDetails.ejs', {
      course,
      distribution,
      ratings: ratingsWithUsers.sort((a, b) => b.createdAt - a.createdAt),
      moment: require('moment'),
      user: req.user
    });
  } catch (error) {
    console.error('Get course rating details error:', error);
    req.flash('error', 'Failed to load course rating details');
    res.redirect('/admin/course-ratings');
  }
};

// ===== 3. Delete Course Rating =====
module.exports.deleteCourseRating = async (req, res) => {
  try {
    const { id } = req.params;

    // Find course containing this rating
    const course = await Course.findOne({ 'ratings._id': id });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Remove the rating
    course.ratings = course.ratings.filter(r => r._id.toString() !== id);
    
    // Update course rating stats
    if (course.ratings.length > 0) {
      const total = course.ratings.reduce((sum, r) => sum + r.rating, 0);
      course.rating = Math.round((total / course.ratings.length) * 10) / 10;
      course.reviewCount = course.ratings.length;
      course.totalRatings = course.ratings.length;
    } else {
      course.rating = 0;
      course.reviewCount = 0;
      course.totalRatings = 0;
    }

    await course.save();

    return res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete course rating error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete rating'
    });
  }
};