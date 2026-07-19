const User = require("../models/user");

const Course = require("../models/cources");
const Blog = require("../models/blog");
const Review = require("../models/review");
const cloudinary = require("../Cloudconfig.js"); 
const CourseCategory = require("../models/courseCategory");
const { all } = require("axios");
const crypto = require('crypto');
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports.homePage = async (req, res, next) => {
  try {

    // Fetch approved reviews for testimonials
const approvedReviews = await Review.find({
  isApproved: true,
  isVerified: true
})
  .sort({ createdAt: -1 })
  .limit(10)
  .lean();

// If no approved reviews, use fallback data
let testimonials = [];
if (approvedReviews && approvedReviews.length > 2) {
  testimonials = approvedReviews.map(review => ({
    name: review.name || 'Anonymous',
    rating: review.rating || 5,
    message: review.message || '',
    date: review.createdAt,
    isVerified: true
  }));
} else {
  // Fallback testimonials (static data)
 testimonials = [
{
name: 'Ananya Sharma',
rating: 5,
message: 'CyberKavach provided me with practical, industry-focused training. The hands-on labs and expert guidance helped me build confidence and secure my first cybersecurity role.',
date: new Date(),
isVerified: true
},
{
name: 'Rahul Verma',
rating: 5,
message: 'The OSCP preparation program was outstanding. The lab environment closely mirrored real-world scenarios, making the learning experience both challenging and rewarding.',
date: new Date(),
isVerified: true
},
{
name: 'Priya Mehta',
rating: 5,
message: 'As someone new to cybersecurity, I found the CEH course extremely well-structured. The instructors explained complex concepts in a simple and engaging manner.',
date: new Date(),
isVerified: true
},
{
name: 'Arjun Singh',
rating: 5,
message: 'What impressed me most was the mentorship support. The instructors were always available to clarify doubts and guide us throughout the course journey.',
date: new Date(),
isVerified: true
},
{
name: 'Sneha Patel',
rating: 4,
message: 'CyberKavach offers high-quality content with excellent practical exercises. The curriculum is up-to-date and aligned with current industry standards.',
date: new Date(),
isVerified: true
},
{
name: 'Vikram Joshi',
rating: 5,
message: 'The platform helped me transition from IT support to cybersecurity. The hands-on approach and career guidance made a significant difference in my learning path.',
date: new Date(),
isVerified: true
}
];

}



    // ── STATS ──────────────────────────────────────────────────────────────
    const totalUsers = await User.countDocuments();
    const totalInstructors = await User.countDocuments({ role: { $in: ["admin", "teacher"] } });
    const totalCources = await Course.countDocuments({ isActive: true });

    // ── 1. HERO SLIDER COURSES ────────────────────────────────────────────
    const heroCourses = await Course.find({
      isPopular: true,
      isActive: true,
    })
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // ── 2. POPULAR COURSE ─────────────────────────────────────────────────
    const popularCourse = await Course.findOne({
      isPopular: true,
      isActive: true,
    })
      .populate("teacher", "name email")
      .lean();
    
    

    // ── 3. FEATURED COURSES (6 courses, 3 per row) ──────────────────────
    const featuredCourses = await Course.find({
      isActive: true,
      showInHomepage: true,
      homepageSection: { $ne: "hero" }, // Exclude hero courses
    })
      .sort({ isPopular: -1, createdAt: -1 })
      .limit(6)
      .populate("teacher", "name")
      .lean();

    // If not enough featured, get more active courses
    let allFeaturedCourses = [...featuredCourses];
    if (allFeaturedCourses.length < 6) {
      const additional = await Course.find({
        isActive: true,
        _id: { $nin: allFeaturedCourses.map(c => c._id) }
      })
        .sort({ createdAt: -1 })
        .limit(6 - allFeaturedCourses.length)
        .populate("teacher", "name")
        .lean();
      allFeaturedCourses = [...allFeaturedCourses, ...additional];
    }

    // ── 4. COURSES BY CATEGORY ────────────────────────────────────────────
    const activeCategories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const coursesByCategory = await Promise.all(
      activeCategories.map(async (cat) => {
        const courses = await Course.find({
          isActive: true,
          category: cat._id,
        })
          .sort({ isPopular: -1, createdAt: -1 })
          .limit(4)
          .select(
            "title shortDescription image price actualPrice duration courseLevel rating isPopular tableOfContent navbarButtonText navbarButtonLink navbarButtonIcon showInNavbar _id"
          )
          .lean();

        const courseCount = await Course.countDocuments({
          isActive: true,
          category: cat._id,
        });

        const navbarCourses = await Course.find({
          isActive: true,
          category: cat._id,
          showInNavbar: true,
        })
          .sort({ createdAt: -1 })
          .select("title navbarButtonText navbarButtonLink navbarButtonIcon _id")
          .lean();

        return {
          ...cat,
          courses,
          courseCount,
          navbarCourses,
        };
      })
    );

    // ── 5. "OTHERS" CATEGORY ──────────────────────────────────────────────
    const assignedCategoryIds = activeCategories.map((c) => c._id);

    const otherCourses = await Course.find({
      isActive: true,
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: { $nin: assignedCategoryIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select(
        "title shortDescription image price actualPrice duration courseLevel rating isPopular tableOfContent navbarButtonText navbarButtonLink navbarButtonIcon showInNavbar _id"
      )
      .lean();

    const otherCourseCount = await Course.countDocuments({
      isActive: true,
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: { $nin: assignedCategoryIds } },
      ],
    });

    const otherNavbarCourses = await Course.find({
      isActive: true,
      showInNavbar: true,
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: { $nin: assignedCategoryIds } },
      ],
    })
      .select("title navbarButtonText navbarButtonLink navbarButtonIcon _id")
      .lean();

    if (otherCourseCount > 0) {
      coursesByCategory.push({
        _id: "others",
        name: "Others",
        icon: "fa-folder-open",
        color: "gray",
        courseCount: otherCourseCount,
        courses: otherCourses,
        navbarCourses: otherNavbarCourses,
      });
    }

    // ── 6. LATEST BLOGS (max 8, 4 per row) ──────────────────────────────
    // ✅ FIXED: Using correct fields: isvalid=true, blocked=false
    const latestBlogs = await Blog.find({
      isvalid: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(8) // Max 8 blogs
      .populate("author", "name")
      .lean();

    // ── 7. TOTAL BLOG COUNT (for "View All" button) ──────────────────────
    const totalBlogs = await Blog.countDocuments({
      isvalid: true,
      blocked: false,
    });

    // ── 8. TOTAL COURSES COUNT (for "View All" button) ────────────────────
    const totalActiveCourses = await Course.countDocuments({ isActive: true });

    // ── RENDER ──────────────────────────────────────────────────────────────
    res.render("cyberkavach/home.ejs", {
      totalUsers,
      totalInstructors,
      totalCources,
      heroCourses,
      featuredCourses: allFeaturedCourses, // 6 courses for the grid
      coursesByCategory,
      popularCourse,
      latestBlogs, // Max 8 blogs
      totalBlogs, // For "View All" badge
      totalActiveCourses, // For "View All" badge
      moment: require("moment"),
      testimonials: testimonials,
    });

  } catch (error) {
    console.error("Homepage error:", error);
    req.flash("error", "Unable to load the homepage. Please refresh the page or try again later.");
    res.redirect("/login");
  }
};

module.exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const links = await Link.find({ user: req.user._id });

    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

    res.render("users/profile.ejs", {
      User: user,
      totalLinks,
      totalClicks,
      links,
    });
  } catch (err) {
    req.flash("error", "Unable to load your profile. Please try again.");
    res.redirect("/");
  }
};

module.exports.about = (req, res) => {
  res.render("others/about.ejs");
};

module.exports.privacy = (req, res) => {
  res.render("others/privacy.ejs");
};

module.exports.terms = (req, res) => {
  res.render("others/terms.ejs");
};

module.exports.contact = (req, res) => {
  res.render("others/contact.ejs");
};

// Courses
module.exports.allCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const level = req.query.level || "";
    const filter = req.query.filter || "all";
    const sortBy = req.query.sortBy || "latest";

    let query = {};
    
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (level && level !== "all") {
      query.courseLevel = level;
    }

    if (filter === "active") query.isActive = true;
    else if (filter === "inactive") query.isActive = false;
    else if (filter === "popular") query.isPopular = true;
    else if (filter === "navbar") query.showInNavbar = true;
    else if (filter === "homepage") query.showInHomepage = true;

    let sortOptions = {};
    
    switch(sortBy) {
      case "latest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "price_asc":
        sortOptions = { actualPrice: 1 };
        break;
      case "price_desc":
        sortOptions = { actualPrice: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const totalCourses = await Course.countDocuments(query);
    
    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    res.render("cyberkavach/courses.ejs", {
      cources: courses,
      currentPage: page,
      totalPages: Math.ceil(totalCourses / limit),
      totalCourses,
      search,
      level,
      filter,
      sortBy,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to load courses. Please refresh the page.");
    res.redirect("/login");
  }
};

module.exports.renderNewCourseForm = async (req, res) => {
  try {
    const teachers = await User.find({ 
      role: { $in: ["admin", "teacher"] } 
    }).select("name email");

     const categories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    
    res.render("cyberkavach/newcourse.ejs", { 
      course: {}, 
      teachers: teachers || [] ,
      categories: categories || []
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to load the course creation form. Please try again.");
    res.redirect("/courses");
  }
};

module.exports.createNewCourse = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      price,
      actualPrice,
      courceType,
      category,
      duration,
      lounchedDate,
      courseLevel,
      addInHomePage,
      isPopular,
      isActive,
      showInNavbar,
      navbarButtonText,
      navbarButtonColor,
      teacher,
      prerequisites,
      learningOutcomes,
      includes,
      preStudents
    } = req.body;
    

    if (!teacher) {
      req.flash("warning", "Please select a teacher for this course before proceeding.");
      return res.redirect("/courses/new");
    }

    const teacherExists = await User.findById(teacher);
    if (!teacherExists || (teacherExists.role !== "admin" && teacherExists.role !== "teacher")) {
      req.flash("error", "The selected teacher is not authorized to teach this course.");
      return res.redirect("/courses/new");
    }

    // Process comma-separated fields
    const processArray = (value) => {
      if (!value) return [];
      return value.split(',').map(item => item.trim()).filter(item => item);
    };

    let categoryName = "";
    if (category) {
      const categoryDoc = await CourseCategory.findById(category);
      if (categoryDoc) {
        categoryName = categoryDoc.name;
      }
    }

    const newCourse = new Course({
      teacher: teacher,
      title,
      shortDescription,
      discription: description,
      price: Number(price),
      actualPrice: Number(actualPrice),
      courceType,
      category: category || null,
      categoryName: categoryName,
      duration: duration ? Number(duration) : undefined,
      lounchedDate: lounchedDate ? new Date(lounchedDate) : undefined,
      courseLevel: courseLevel || "beginner",
      addInHomePage: addInHomePage === "on",
      isPopular: isPopular === "on",
      isActive: isActive === "on",
      showInNavbar: showInNavbar === "on",
      navbarButtonText: navbarButtonText || "",
      navbarButtonColor: navbarButtonColor || "blue",
      students: [],
      prerequisites: processArray(prerequisites),
      learningOutcomes: processArray(learningOutcomes),
      includes: processArray(includes),
      preStudents: Number(preStudents) || 0,
      pdfDetails: req.body.pdfDetails || ""
    });

    if (req.file) {
      newCourse.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await newCourse.save();

    req.flash("success", `"${title}" has been created successfully. You can now manage it from the course list.`);
    res.redirect("/admin/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to create the course. Please check all fields and try again.");
    res.redirect("/courses/new");
  }
};

module.exports.renderEditCourseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      req.flash("error", "The course you're trying to edit was not found.");
      return res.redirect("/courses");
    }
    
    const teachers = await User.find({ 
      role: { $in: ["admin", "teacher"] } 
    }).select("name email");
    
    const categories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.render("cyberkavach/editcourse.ejs", { 
      course,
      teachers: teachers || [],
      categories: categories || []
    });
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to load the edit form. Please try again.");
    res.redirect("/courses");
  }
};

module.exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseData = req.body;

    courseData.isActive = courseData.isActive === "on";
    courseData.isPopular = courseData.isPopular === "on";
    courseData.addInHomePage = courseData.addInHomePage === "on";
    courseData.showInNavbar = courseData.showInNavbar === "on";
    courseData.pdfDetails = req.body.pdfDetails || "";

    // Process arrays
    const processArray = (value) => {
      if (!value) return [];
      return value.split(',').map(item => item.trim()).filter(item => item);
    };

    courseData.prerequisites = processArray(courseData.prerequisites);
    courseData.learningOutcomes = processArray(courseData.learningOutcomes);
    courseData.includes = processArray(courseData.includes);
    courseData.preStudents = Number(courseData.preStudents) || 0;

    if (courseData.teacher) {
      const teacherExists = await User.findById(courseData.teacher);
      if (!teacherExists || (teacherExists.role !== "admin" && teacherExists.role !== "teacher")) {
        req.flash("error", "The selected teacher is not authorized to teach this course.");
        return res.redirect(`/courses/${id}/edit`);
      }
    }

    if (req.file) {
      const oldCourse = await Course.findById(id);
      if (oldCourse.image && oldCourse.image.filename) {
        // await cloudinary.uploader.destroy(oldCourse.image.filename);
      }
      courseData.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await Course.findByIdAndUpdate(id, courseData, { new: true });

    req.flash("success", "Course details have been updated successfully.");
    res.redirect("/admin/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to update the course. Please try again.");
    res.redirect("/courses");
  }
};

module.exports.togglePopular = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    course.isPopular = !course.isPopular;
    await course.save();

    res.json({
      success: true,
      isPopular: course.isPopular,
      message: `Course ${course.isPopular ? "marked as" : "removed from"} popular`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update popular status" });
  }
};

module.exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      req.flash("error", "The course you're trying to delete was not found.");
      return res.redirect("/courses");
    }

    req.flash("success", `"${course.title}" has been deleted successfully.`);
    res.redirect("/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to delete the course. Please try again.");
    res.redirect("/courses");
  }
};

module.exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.json({
      success: true,
      isActive: course.isActive,
      message: `Course ${course.isActive ? "activated" : "deactivated"}`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update active status" });
  }
};

module.exports.toggleNavbarVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    course.showInNavbar = !course.showInNavbar;
    await course.save();

    res.json({
      success: true,
      showInNavbar: course.showInNavbar,
      message: `Course ${course.showInNavbar ? "added to" : "removed from"} navbar`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update navbar visibility" });
  }
};

module.exports.toggleHomepageVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    course.showInHomepage = !course.showInHomepage;
    await course.save();

    res.json({
      success: true,
      showInHomepage: course.showInHomepage,
      message: `Course ${course.showInHomepage ? "added to" : "removed from"} homepage`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update homepage visibility",
    });
  }
};

module.exports.enrollCourseForm = async (req, res) => {
  try {
    const courses = await Course.find();
    res.render("cyberkavach/enroll.ejs", { courses });
  } catch (error) {
    console.log(error);
    req.flash("error", "Unable to load the enrollment form. Please try again.");
    res.redirect("/");
  }
};

module.exports.enrollInNewCource = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { description, paidPrice } = req.body;

    if (!req.user) {
      req.flash("warning", "Please log in to your account to enroll in a course.");
      return res.redirect("/login");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      req.flash("error", "Your account was not found. Please log in again.");
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      req.flash(
        "error",
        "Your account has been blocked. Please contact our support team for assistance.",
      );
      return res.redirect("/contact");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      req.flash("error", "The course you're trying to enroll in was not found.");
      return res.redirect("/enroll");
    }

    if (!course.isActive) {
      req.flash("info", "This course is currently unavailable and cannot be enrolled in.");
      return res.redirect("/enroll");
    }

    const alreadyEnrolled = course.students.some(
      (student) => student.user.toString() === user._id.toString(),
    );

    if (alreadyEnrolled) {
      req.flash("info", "You are already enrolled in this course.");
      return res.redirect("/enroll");
    }

    course.students.push({
      user: user._id,
      paidPrice: paidPrice ? Number(paidPrice) : 0,
      description: description || "",
      enrolledAt: new Date(),
      isSeen: false,
    });

    await course.save();

    req.flash("success", `You have successfully enrolled in "${course.title}". Welcome aboard!`);
    return res.redirect("/courses");
  } catch (error) {
    console.error("Enrollment error:", error);
    req.flash("error", "Enrollment failed. Please try again or contact support.");
    return res.redirect("/enroll");
  }
};

module.exports.enrollCourse = async (req, res) => {
  const redirectUrl = res.locals.redirectUrl || "/";
  try {
    const { courseId, paidPrice, name, email, mobile, description } = req.body;

    if (!courseId || !name || !email || !mobile) {
      req.flash("warning", "Please fill in all required fields to complete enrollment.");
      return res.redirect(redirectUrl);
    }

    const user = req.user;

    if (!user.mobile) {
      user.mobile = mobile;
      await user.save();
    }

    const course = await Course.findById(courseId);

    if (!course) {
      req.flash("error", "The course you're trying to enroll in was not found.");
      return res.redirect(redirectUrl);
    }

    const alreadyEnrolled = course.students.some(
      (s) => s.user.toString() === user._id.toString(),
    );

    if (alreadyEnrolled) {
      req.flash("info", "You are already enrolled in this course.");
      return res.redirect(redirectUrl);
    }

    course.students.push({
      user: user._id,
      paidPrice: Number(paidPrice),
      description: description || "",
      enrolledAt: new Date(),
      isSeen: false,
    });

    await course.save();

    req.flash("success", "Enrollment completed successfully! Your learning journey begins now. 🎉");
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    req.flash("error", "Enrollment failed. Please verify your details and try again.");
    return res.redirect(redirectUrl);
  }
};

module.exports.viewCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("teacher", "name email mobile profileImage")
      .populate("students.user", "name email")
      .lean();

    if (!course) {
      req.flash("error", "The course you're looking for was not found.");
      return res.redirect("/courses");
    }

    const newerCourses = await Course.find({
      courceType: course.courceType,
      _id: { $ne: course._id },
      isActive: true,
      lounchedDate: { $gt: course.lounchedDate }
    })
      .sort({ lounchedDate: 1 })
      .limit(4)
      .select("title image price shortDescription courceType")
      .populate("teacher", "name")
      .lean();

    let relatedCourses = [...newerCourses];

    if (relatedCourses.length < 4) {
      const remaining = 4 - relatedCourses.length;

      const olderCourses = await Course.find({
        courceType: course.courceType,
        _id: { $ne: course._id },
        isActive: true,
        lounchedDate: { $lt: course.lounchedDate }
      })
        .sort({ lounchedDate: -1 })
        .limit(remaining)
        .select("title image price shortDescription courceType")
        .populate("teacher", "name")
        .lean();

      relatedCourses = [...relatedCourses, ...olderCourses];
    }

    let isEnrolled = false;
    let userEnrollment = null;

    if (req.user) {
      const enrollment = course.students?.find(
        (student) => student.user?._id?.toString() === req.user._id.toString(),
      );
      if (enrollment) {
        isEnrolled = true;
        userEnrollment = enrollment;
      }
    }

    const totalStudents = course.students?.length || 0;
    const totalRevenue =
      course.students?.reduce(
        (sum, student) => sum + (student.paidPrice || 0),
        0,
      ) || 0;

    const dynamicMeta = {
      title: course.title + " | cyberkavach Courses",
      description: course.shortDescription,
      keywords:
        course.courceType +
        ", " +
        course.title +
        ", " +
        course.shortDescription +
        ", " +
        course.teacher.name +
        " best cybersecurity course, Best academy for cybersecurity, " +
        course.courceType +
        " course online",
      image: course.image.url,
    };

    res.render("cyberkavach/viewCourse.ejs", {
      meta: dynamicMeta,
      course,
      relatedCourses,
      isEnrolled,
      userEnrollment,
      totalStudents,
      totalRevenue,
      currentUser: req.user,
      pageTitle: course.title,
    });
  } catch (err) {
    console.error("Error viewing course:", err);
    req.flash("error", "Unable to load course details. Please try again.");
    res.redirect("/courses");
  }
};


module.exports.toggleNavbarOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    course.homepageOrder = order;
    await course.save();
    
    res.json({
      success: true,
      message: "Course order updated successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
};

// Add Razorpay order creation
// Add Razorpay order creation - FIXED VERSION
module.exports.createRazorpayOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    const amount = course.actualPrice || course.price || 0;
    
    // ✅ FIX: Create a short receipt (max 40 characters)
    // Using timestamp and first 4 chars of course ID
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const shortId = courseId.toString().slice(-6); // Last 6 chars of course ID
    const receipt = `CK_${shortId}_${timestamp}`; // Example: CK_123456_789012 (max 40 chars)
    
    // Create Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: receipt, // ✅ Now it's short (max 40 chars)
      notes: {
        courseId: courseId,
        courseTitle: course.title.substring(0, 30) // Limit title length
      }
    };
    
    console.log('Creating Razorpay order with receipt:', receipt); // Debug log
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.error?.description || 'Failed to create payment order' 
    });
  }
};

// Verify Razorpay payment
module.exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      name,
      email,
      mobile,
      description
    } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (!isAuthentic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed' 
      });
    }
    
    // Check if user is logged in
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to enroll' 
      });
    }
    
    // Enroll the user
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }
    
    // Check if already enrolled
    const alreadyEnrolled = course.students.some(
      s => s.user.toString() === req.user._id.toString()
    );
    
    if (alreadyEnrolled) {
      return res.json({ 
        success: true, 
        message: 'You are already enrolled in this course',
        alreadyEnrolled: true
      });
    }
    
    // Add student to course
    course.students.push({
      user: req.user._id,
      paidPrice: course.actualPrice || course.price || 0,
      description: description || '',
      enrolledAt: new Date(),
      isSeen: false,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    });
    
    await course.save();
    
    // Update user's enrolled courses if needed
    // You can add this to your User model
    
    res.json({
      success: true,
      message: 'Enrollment successful!',
      redirectUrl: `/courses/${courseId}/access`
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment. Please contact support.' 
    });
  }
};

// Get course content for enrolled users
module.exports.getCourseContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      req.flash('warning', 'Please login to access course content');
      return res.redirect('/login');
    }
    
    const course = await Course.findById(id)
      .populate('teacher', 'name email')
      .lean();
    
    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/courses');
    }
    
    // Check if user is enrolled
    const isEnrolled = course.students.some(
      student => student.user.toString() === req.user._id.toString()
    );
    
    if (!isEnrolled) {
      req.flash('warning', 'Please enroll in this course to access content');
      return res.redirect(`/courses/${id}`);
    }
    
    // Fetch user enrollment details
    const enrollment = course.students.find(
      student => student.user.toString() === req.user._id.toString()
    );
    
    // Dummy lectures data (you can replace with actual lectures from database)
    const lectures = [
      {
        id: 1,
        title: 'Introduction to Cybersecurity',
        duration: '10:25',
        isCompleted: false,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 2,
        title: 'Understanding Network Security',
        duration: '15:30',
        isCompleted: false,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 3,
        title: 'Threat Detection and Analysis',
        duration: '20:15',
        isCompleted: false,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 4,
        title: 'Security Protocols and Standards',
        duration: '18:45',
        isCompleted: false,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 5,
        title: 'Practical Lab: Security Implementation',
        duration: '25:00',
        isCompleted: false,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ];
    
    res.render('cyberkavach/course-content.ejs', {
      course,
      lectures,
      enrollment,
      progress: Math.floor((lectures.filter(l => l.isCompleted).length / lectures.length) * 100),
      currentUser: req.user
    });
    
  } catch (error) {
    console.error('Course content error:', error);
    req.flash('error', 'Unable to load course content');
    res.redirect('/courses');
  }
};

// Mark lecture as complete
module.exports.markLectureComplete = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const { completed } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Please login' });
    }
    
    // Update lecture completion in database
    // You would typically have a progress tracking model
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Progress updated successfully'
    });
    
  } catch (error) {
    console.error('Error marking lecture complete:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};