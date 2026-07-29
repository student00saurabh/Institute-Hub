const User = require("../models/user.js");
const Blog = require("../models/blog.js");
const { required } = require("joi");
const { cloudinary } = require("../Cloudconfig");
const path = require("path");
const mongoose = require("mongoose");
const { validateComment } = require("../utils/commentFilter.cjs");

const fonts = {
  Jakarta: {
    normal: "fonts/PlusJakartaSans-Regular.ttf",
    bold: "fonts/PlusJakartaSans-Bold.ttf",
    italics: "fonts/PlusJakartaSans-Italic.ttf",
    bolditalics: "fonts/PlusJakartaSans-BoldItalic.ttf",
  },
};


module.exports.index = async (req, res) => {
    try {
        const cat = req.query.category || "";
        const search = req.query.q || "";
        const tag = req.query.tag || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        // Build query
        let query = { blocked: false };

        if (cat && cat !== "All Categories") {
            query.category = cat;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { shortdescription: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } },
                { Keywords: { $regex: search, $options: "i" } }
            ];
        }

        if (tag) {
            query.tags = { $in: [tag] };
        }

        // Get total count for pagination
        let totalBlogs = await Blog.countDocuments(query);

        // Fetch blogs with pagination
        let allBlogs = await Blog.find(query)
            .populate("author", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // ✅ FALLBACK BLOGS - if DB empty
        const FALLBACK_BLOGS = [
            {
                id: 1,
                title: "10 Habits of Highly Effective Self-Taught Developers",
                category: "Career",
                author: "Aarav Mehta",
                authorImg: "AM",
                date: "Jul 12, 2026",
                readTime: "6 min read",
                img: "https://picsum.photos/seed/blog1/800/500",
                comments: 34,
                views: 2840,
                excerpt: "Discover the daily habits that separate successful self-taught developers from those who struggle. Learn how to structure your learning, build projects, and stay motivated.",
                tags: ["career", "development", "productivity"],
                likes: 120
            },
            {
                id: 2,
                title: "How to Choose Your First Programming Language in 2026",
                category: "Web Development",
                author: "Priya Nair",
                authorImg: "PN",
                date: "Jul 8, 2026",
                readTime: "8 min read",
                img: "https://picsum.photos/seed/blog2/800/500",
                comments: 21,
                views: 1970,
                excerpt: "With so many programming languages available, choosing the right one can be overwhelming. This guide will help you make an informed decision based on your goals.",
                tags: ["programming", "beginners", "web-development"],
                likes: 85
            },
            {
                id: 3,
                title: "Portfolio Projects That Actually Get You Hired",
                category: "Career",
                author: "Kabir Sethi",
                authorImg: "KS",
                date: "Jul 3, 2026",
                readTime: "5 min read",
                img: "https://picsum.photos/seed/blog3/800/500",
                comments: 47,
                views: 3620,
                excerpt: "Not all portfolio projects are created equal. Learn which types of projects impress employers and how to showcase them effectively to land your dream job.",
                tags: ["career", "portfolio", "hiring"],
                likes: 210
            },
            {
                id: 4,
                title: "A Beginner's Guide to Cloud Certifications",
                category: "Cloud & DevOps",
                author: "Simran Kaur",
                authorImg: "SK",
                date: "Jun 27, 2026",
                readTime: "7 min read",
                img: "https://picsum.photos/seed/blog4/800/500",
                comments: 18,
                views: 1540,
                excerpt: "Cloud certifications can accelerate your career, but where do you start? This comprehensive guide covers AWS, Azure, and GCP certifications for beginners.",
                tags: ["cloud", "certifications", "devops"],
                likes: 64
            },
            {
                id: 5,
                title: "Why Every Designer Should Learn Basic Front-End Code",
                category: "UI / UX Design",
                author: "Neha Joshi",
                authorImg: "NJ",
                date: "Jun 20, 2026",
                readTime: "4 min read",
                img: "https://picsum.photos/seed/blog5/800/500",
                comments: 29,
                views: 2210,
                excerpt: "Understanding the basics of HTML, CSS, and JavaScript can make you a better designer. Learn why coding skills are valuable for UI/UX professionals.",
                tags: ["design", "frontend", "ui-ux"],
                likes: 95
            },
            {
                id: 6,
                title: "Cybersecurity Basics Every Developer Should Know",
                category: "Cybersecurity",
                author: "Rohan Kapoor",
                authorImg: "RK",
                date: "Jun 14, 2026",
                readTime: "9 min read",
                img: "https://picsum.photos/seed/blog6/800/500",
                comments: 52,
                views: 4130,
                excerpt: "Security is everyone's responsibility. Learn the essential security concepts every developer must understand to build secure applications and protect user data.",
                tags: ["security", "development", "best-practices"],
                likes: 310
            },
            {
                id: 7,
                title: "Mastering React Hooks: A Comprehensive Guide",
                category: "Web Development",
                author: "Aarav Mehta",
                authorImg: "AM",
                date: "Jun 8, 2026",
                readTime: "10 min read",
                img: "https://picsum.photos/seed/blog7/800/500",
                comments: 38,
                views: 2950,
                excerpt: "React Hooks have revolutionized how we write React components. This deep dive covers all the essential hooks, common patterns, and best practices.",
                tags: ["react", "frontend", "javascript"],
                likes: 156
            },
            {
                id: 8,
                title: "Data Science vs. AI: What's the Difference?",
                category: "Data Science",
                author: "Priya Nair",
                authorImg: "PN",
                date: "Jun 2, 2026",
                readTime: "6 min read",
                img: "https://picsum.photos/seed/blog8/800/500",
                comments: 15,
                views: 1830,
                excerpt: "Data Science and Artificial Intelligence are often used interchangeably, but they're not the same. Understand the key differences and how they complement each other.",
                tags: ["data-science", "ai", "machine-learning"],
                likes: 72
            },
            {
                id: 9,
                title: "Building Microservices with Spring Boot",
                category: "Web Development",
                author: "Dev Malhotra",
                authorImg: "DM",
                date: "May 25, 2026",
                readTime: "12 min read",
                img: "https://picsum.photos/seed/blog9/800/500",
                comments: 26,
                views: 1670,
                excerpt: "Microservices architecture is the modern way to build scalable applications. Learn how to build robust microservices using Spring Boot and Spring Cloud.",
                tags: ["java", "microservices", "spring-boot"],
                likes: 43
            },
            {
                id: 10,
                title: "The Future of Remote Work in Tech",
                category: "Career",
                author: "Ritika Sharma",
                authorImg: "RS",
                date: "May 18, 2026",
                readTime: "5 min read",
                img: "https://picsum.photos/seed/blog10/800/500",
                comments: 43,
                views: 3210,
                excerpt: "Remote work is here to stay. Explore the trends, tools, and strategies that will define the future of work in the technology industry.",
                tags: ["career", "remote-work", "future"],
                likes: 98
            },
            {
                id: 11,
                title: "Design Systems: Building for Scale",
                category: "UI / UX Design",
                author: "Kabir Sethi",
                authorImg: "KS",
                date: "May 12, 2026",
                readTime: "8 min read",
                img: "https://picsum.photos/seed/blog11/800/500",
                comments: 19,
                views: 1450,
                excerpt: "Design systems are essential for maintaining consistency at scale. Learn how to create and maintain a design system that works for your team.",
                tags: ["design", "design-systems", "ui-ux"],
                likes: 67
            },
            {
                id: 12,
                title: "Kubernetes for Beginners: A Practical Guide",
                category: "Cloud & DevOps",
                author: "Simran Kaur",
                authorImg: "SK",
                date: "May 5, 2026",
                readTime: "9 min read",
                img: "https://picsum.photos/seed/blog12/800/500",
                comments: 31,
                views: 2090,
                excerpt: "Kubernetes can seem intimidating, but it doesn't have to be. This practical guide walks you through the basics and helps you get started with container orchestration.",
                tags: ["kubernetes", "devops", "containers"],
                likes: 134
            }
        ];

        // ✅ FORMAT BLOGS FOR DISPLAY
        let formattedBlogs = [];
        let useFallback = false;

        if (allBlogs && allBlogs.length > 0) {
            // Use real blogs
            formattedBlogs = allBlogs.map((blog, index) => ({
                _id: blog._id,
                id: blog.id || blog._id,
                title: blog.title,
                category: blog.category || "General",
                author: blog.author?.name || "Anonymous",
                authorImg: blog.author?.name?.charAt(0) || "A",
                date: blog.createdAt ? formatDate(blog.createdAt) : "Recent",
                readTime: `${Math.ceil((blog.content?.length || 1000) / 1000)} min read`,
                img: blog.image?.url || `https://picsum.photos/seed/blog${index+1}/800/500`,
                comments: blog.comments?.length || 0,
                views: blog.usersSeen?.length || Math.floor(Math.random() * 3000) + 500,
                likes: blog.likes?.length || 0,
                excerpt: blog.shortdescription || blog.content?.substring(0, 150) || "Read more about this topic...",
                tags: blog.tags || ["general"],
                likedByUser: blog.likes?.some(id => id.toString() === req.user?._id?.toString()) || false,
                authorId: blog.author?._id
            }));
        } else {
            // ✅ USE FALLBACK DATA
            useFallback = true;
            
            // Filter fallback data
            let fallbackFiltered = FALLBACK_BLOGS;
            
            if (cat && cat !== "All Categories") {
                fallbackFiltered = fallbackFiltered.filter(b => b.category === cat);
            }
            if (search) {
                const searchLower = search.toLowerCase();
                fallbackFiltered = fallbackFiltered.filter(b => 
                    b.title.toLowerCase().includes(searchLower) ||
                    b.excerpt.toLowerCase().includes(searchLower) ||
                    b.tags.some(t => t.includes(searchLower))
                );
            }
            if (tag) {
                fallbackFiltered = fallbackFiltered.filter(b => b.tags.includes(tag));
            }

            // ✅ FIX: Update totalBlogs (use let, not const)
            totalBlogs = fallbackFiltered.length;

            // Paginate fallback data
            const paginatedFallback = fallbackFiltered.slice(skip, skip + limit);
            
            formattedBlogs = paginatedFallback.map(blog => ({
                _id: `fallback-${blog.id}`,
                id: blog.id,
                title: blog.title,
                category: blog.category,
                author: blog.author,
                authorImg: blog.authorImg,
                date: blog.date,
                readTime: blog.readTime,
                img: blog.img,
                comments: blog.comments,
                views: blog.views,
                likes: blog.likes || 0,
                excerpt: blog.excerpt,
                tags: blog.tags,
                likedByUser: false
            }));
        }

        // ✅ GET ALL UNIQUE CATEGORIES FROM BLOGS
        let blogCategories = ["All Categories"];
        let allCategoriesFromDB = await Blog.distinct("category", { blocked: false });
        let allCategoriesFromFallback = [...new Set(FALLBACK_BLOGS.map(b => b.category))];
        
        let allCategories = [...allCategoriesFromDB, ...allCategoriesFromFallback];
        allCategories = [...new Set(allCategories)].filter(Boolean);
        blogCategories = ["All Categories", ...allCategories.sort()];

        // ✅ GET ALL TAGS
        let allTags = [];
        
        // From DB
        const dbTags = await Blog.aggregate([
            { $match: { blocked: false } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        allTags.push(...dbTags.map(t => t._id));

        // From fallback
        const fallbackTags = [];
        FALLBACK_BLOGS.forEach(blog => {
            blog.tags.forEach(tag => {
                if (!fallbackTags.includes(tag)) fallbackTags.push(tag);
            });
        });
        allTags.push(...fallbackTags);
        allTags = [...new Set(allTags)].slice(0, 15);

        // Calculate pagination
        const totalPages = Math.max(1, Math.ceil(totalBlogs / limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // ✅ GET TRENDING BLOGS (for sidebar)
        let trendingBlogs = [...formattedBlogs];
        trendingBlogs.sort((a, b) => (b.views || 0) - (a.views || 0));
        trendingBlogs = trendingBlogs.slice(0, 4);

        // ✅ GET FEATURED BLOG (first blog with highest views)
        let featuredBlog = formattedBlogs.length > 0 ? formattedBlogs[0] : null;
        if (featuredBlog) {
            // Try to find a blog with high views for featured
            const sortedByViews = [...formattedBlogs].sort((a, b) => (b.views || 0) - (a.views || 0));
            featuredBlog = sortedByViews[0] || formattedBlogs[0];
        }

        // ✅ BUILD PAGINATION URL HELPER
        function buildPaginationUrl(pageNum, searchVal, categoryVal, tagVal) {
            const params = new URLSearchParams();
            if (pageNum && pageNum > 1) params.set('page', pageNum);
            if (searchVal) params.set('q', searchVal);
            if (categoryVal && categoryVal !== 'All Categories') params.set('category', categoryVal);
            if (tagVal) params.set('tag', tagVal);
            return params.toString();
        }

        // Render the page
        res.render("blogs/index.ejs", {
            allBlogs: formattedBlogs,
            featuredBlog: featuredBlog,
            trendingBlogs: trendingBlogs,
            blogCategories: blogCategories,
            popularTags: allTags,
            totalBlogs: totalBlogs,
            currentPage: page,
            totalPages: totalPages,
            limit: limit,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage,
            category: cat || "",
            search: search || "",
            tag: tag || "",
            moment: require("moment"),
            currentUser: req.user || null,
            isFallback: useFallback,
            buildPaginationUrl: buildPaginationUrl
        });

    } catch (error) {
        console.error("Blog index error:", error);
        req.flash("error", "Unable to load blog articles. Please refresh the page.");
        res.redirect("/");
    }
};

// ============================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================

function formatDate(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 7) return `${Math.floor(days / 7)} weeks ago`;
    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    if (minutes > 0) return `${minutes} minutes ago`;
    return 'Just now';
}


module.exports.renderNewForm = (req, res) => {
  const cat = undefined;
  res.render("blogs/new.ejs", { cat });
};

module.exports.showBlog = async (req, res) => {
  const { id } = req.params;

  let blog = await Blog.findOne({ id: id })
    .populate("author")
    .populate("usersSeen")
    .populate({
      path: "comments.user",
    });

  if (!blog && mongoose.Types.ObjectId.isValid(id)) {
    blog = await Blog.findById(id)
      .populate("author")
      .populate("usersSeen")
      .populate({
        path: "comments.user",
      });
  }

  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }

  // Track views
  if (req.user && !blog.usersSeen.some((u) => u._id.equals(req.user._id))) {
    blog.usersSeen.push(req.user._id);
    await blog.save();
  }

  // ✅ Show all comments (no pagination)
  const paginatedComments = blog.comments.sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const totalComments = blog.comments.length;

  // ✅ Fetch all related blogs (no pagination)
  const relatedBlogs = await Blog.find({
    category: blog.category,
    _id: { $ne: blog._id }, // exclude current blog
    blocked: false,
    // isvalid: true,
  })
    .populate("author")
    .limit(10);

  const dynamicMeta = { 
    title: blog.title + " | InstituteHub Blog",
    description: blog.shortdescription,
    keywords: blog.keywords,
    image: blog.image.url,
  };

  res.render("blogs/show.ejs", {
    meta: dynamicMeta,
    blog,
    comments: paginatedComments,
    currentPage: 1,
    totalPages: 1,
    relatedBlogs, // ✅ all related blogs directly
  });
};

module.exports.createBlog = async (req, res, next) => {
  try {
    const newblog = new Blog(req.body);

    function generateIdFromTitle(title) {
      if (!title || typeof title !== "string") return "";

      return title
        .toLowerCase() // convert to lowercase
        .trim() // remove leading/trailing spaces
        .replace(/&/g, "and") // replace & with 'and'
        .replace(/[\s]+/g, "-") // replace spaces (and multiple spaces) with -
        .replace(/[^\w\-]+/g, "") // remove all non-alphanumeric except -
        .replace(/\-+/g, "-") // replace multiple - with single -
        .replace(/^\-+|\-+$/g, ""); // remove leading/trailing -
    }

    newblog.id = generateIdFromTitle(req.body.title);

    // ✅ FIX: Convert externalLinks string to array
    if (req.body.externalLinks) {
      if (typeof req.body.externalLinks === 'string') {
        req.body.externalLinks = req.body.externalLinks
          .split('\n')
          .map(link => link.trim())
          .filter(link => link.length > 0);
      }
    } else {
      req.body.externalLinks = [];
    }

    // ✅ FIX: Convert tags string to array
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        req.body.tags = req.body.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
    } else {
      req.body.tags = [];
    }



    if (req.file) {
      const url = req.file.path;
      const filename = req.file.filename;
      newblog.image = { url, filename }; // ✅ only if image is uploaded
    }

    newblog.author = req.user._id;

    await newblog.save();

    req.flash(
      "success",
      "Your blog has been submitted successfully!",
    );

    res.redirect("/admin/blogs");
  } catch (err) {
    console.error("Blog creation error:", err);
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }
  const cat = undefined;
  let originalImageUrl = blog.image.url;
  if (blog.image && blog.image.url) {
    originalImageUrl = originalImageUrl.replace(
      "/upload",
      "/upload/w_1000,c_limit,f_auto,q_auto",
    );
  }

  res.render("blogs/edit.ejs", { blog, cat, originalImageUrl });
};

module.exports.renderViewrsPage = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // 10 viewers per page
  const skip = (page - 1) * limit;

  const blog = await Blog.findById(id).populate("usersSeen");

  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }

  const totalViewers = blog.usersSeen.length;
  const paginatedViewers = blog.usersSeen.slice(skip, skip + limit);
  const totalPages = Math.ceil(totalViewers / limit);

  const cat = undefined;
  res.render("blogs/seenusers.ejs", {
    blog,
    viewers: paginatedViewers,
    totalPages,
    currentPage: page,
    totalViewers,
    cat,
  });
};

module.exports.updateBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      req.flash("error", "Blog not found.");
      return res.redirect("/admin/blogs");
    }

    // ✅ FIX: Convert externalLinks string to array
    if (req.body.externalLinks) {
      if (typeof req.body.externalLinks === 'string') {
        // Split by newline and filter empty lines
        req.body.externalLinks = req.body.externalLinks
          .split('\n')
          .map(link => link.trim())
          .filter(link => link.length > 0);
      }
    } else {
      req.body.externalLinks = [];
    }

    // ✅ FIX: Convert tags string to array
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        req.body.tags = req.body.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
    } else {
      req.body.tags = [];
    }

    // Update blog fields
    Object.assign(blog, req.body);
    blog.updatedAt = Date.now();

    // If new image is uploaded
    if (req.file) {
      if (blog.image && blog.image.filename) {
        await cloudinary.uploader.destroy(blog.image.filename);
      }
      blog.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await blog.save();

    req.flash("success", "Your blog has been successfully updated.");
    res.redirect(`/blogs/${blog._id}`);
  } catch (err) {
    console.error("Error updating blog:", err);
    req.flash("error", "Something went wrong while updating the blog.");
    res.redirect("/blogs");
  }
};

module.exports.destroyBlog = async (req, res) => {
  let { id } = req.params;
  let deleteBlog = await Blog.findByIdAndDelete(id);
  req.flash("success", "Blog Deleted!");
  const url = new URL(req.get("Referrer"));
  redirectUrl = url.pathname === "/admin/blogs" ? url.pathname : "/admin/blogs";

  res.redirect(redirectUrl);
};

//comment post

module.exports.addComment = async (req, res) => {
  const { id } = req.params;

  if (!req.user) {
    req.flash("error", "You must be logged in to comment.");
    return res.redirect(`/blogs/${id}`);
  }

  const { text } = req.body;

  const commentErrorMessages = {
    abusive: "Please avoid using abusive or offensive language.",
    "adult-content": "Adult or explicit content is not allowed.",
    "adult-link": "18+ or unsafe links are not allowed.",
    "adult-emoji": "Inappropriate emojis are not allowed.",
    "too-short": "Comment is too short. Please write something meaningful.",
    "too-long": "Comment is too long.",
    "too-many-links": "Too many links in a comment.",
    "ip-link": "IP-based links are not allowed.",
    "adult-tld": "Adult domain extensions are not allowed.",
    "spam-pattern": "Spam-like text is not allowed.",
  };

  const result = validateComment(text);

  if (!result.valid) {
    const message =
      commentErrorMessages[result.reason] ||
      "Your comment violates our community guidelines.";

    req.flash("error", message);
    return res.redirect(`/blogs/${id}`);
  }

  const blog = await Blog.findById(id);

  blog.comments.push({
    text: result.text,
    user: req.user._id,
  });

  await blog.save();

  req.flash("success", "Comment added successfully!");
  res.redirect(`/blogs/${id}`);
};

// controllers/blogs.js
module.exports.deleteComment = async (req, res) => {
  const { id, comment } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    req.flash("error", "Blog not found");
    return res.redirect("/blogs");
  }

  // Optional: find the comment and check permission before deletion
  const targetComment = blog.comments.find((c) => c._id.equals(comment));
  if (!targetComment) {
    req.flash("error", "Comment not found");
    return res.redirect(`/blogs/${id}`);
  }

  // Optional: Only allow comment owner or admin
  if (!targetComment.user.equals(req.user._id)) {
    req.flash("error", "You are not allowed to delete this comment");
    return res.redirect(`/blogs/${id}`);
  }

  // Pull the comment
  await Blog.findByIdAndUpdate(id, {
    $pull: { comments: { _id: comment } },
  });

  req.flash("success", "Comment deleted!");
  res.redirect(`/blogs/${id}`);
};

module.exports.yourBlogs = async (req, res) => {
  try {
    const perPage = 20;
    const page = parseInt(req.query.page) || 1;

    const totalBlogs = await Blog.countDocuments({ author: req.user._id });

    const blogs = await Blog.find({ author: req.user._id })
      .populate("author")
      .populate("comments.user")
      .populate("usersSeen")
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * perPage)
      .limit(perPage);

    const cat = undefined;
    res.render("blogs/yourblogs.ejs", {
      allBlogs: blogs,
      currentPage: page,
      totalPages: Math.ceil(totalBlogs / perPage),
      totalBlogs,
      cat,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to fetch your blogs.");
    res.redirect("/blogs");
  }
};

module.exports.activateBlog = async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) {
    req.flash("error", "Blog not found.");
    return res.redirect("/blogs");
  }
  blog.isvalid = !blog.isvalid;
  await blog.save();
  req.flash(
    "success",
    `Blog has been ${blog.isvalid ? "activated" : "deactivated"}!`,
  );
  res.redirect("/admin/blogs");
};

// download blog controller

// Helper: image ko base64 me convert karo
async function getBase64Image(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return (
    "data:image/jpeg;base64," + Buffer.from(response.data).toString("base64")
  );
}


module.exports.toggleLike = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ error: "Blog not found" });

  const userId = req.user._id;
  const index = blog.likes.findIndex((id) => id.equals(userId));

  let liked;
  if (index === -1) {
    blog.likes.push(userId);
    liked = true;
  } else {
    blog.likes.splice(index, 1);
    liked = false;
  }

  await blog.save();
  res.json({ liked, likesCount: blog.likes.length });
};

// ============ SAVE/UNSAVE BLOG ============
module.exports.toggleSaveBlog = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user._id;

    // Find blog
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if blog is already saved
    const isSaved = user.savedBlogs.includes(blogId);

    if (isSaved) {
      // Remove from saved blogs
      user.savedBlogs = user.savedBlogs.filter(
        (id) => id.toString() !== blogId.toString()
      );
      await user.save();
      
      return res.json({
        success: true,
        saved: false,
        message: "Blog removed from saved",
        savedCount: user.savedBlogs.length,
      });
    } else {
      // Add to saved blogs
      user.savedBlogs.push(blogId);
      await user.save();
      
      return res.json({
        success: true,
        saved: true,
        message: "Blog saved successfully",
        savedCount: user.savedBlogs.length,
      });
    }
  } catch (error) {
    console.error("Toggle save blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save/unsave blog",
    });
  }
};

// ============ GET SAVED BLOGS ============
module.exports.getSavedBlogs = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).populate({
      path: "savedBlogs",
      populate: {
        path: "author",
        select: "name email",
      },
    });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/profile");
    }

    res.render("users/savedBlogs.ejs", {
      savedBlogs: user.savedBlogs || [],
      moment: require("moment"),
      currUser: req.user,
    });
  } catch (error) {
    console.error("Get saved blogs error:", error);
    req.flash("error", "Unable to load saved blogs");
    res.redirect("/profile");
  }
};

// ============ CHECK IF BLOG IS SAVED ============
module.exports.checkSavedStatus = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const isSaved = user.savedBlogs.includes(blogId);

    return res.json({
      success: true,
      saved: isSaved,
    });
  } catch (error) {
    console.error("Check saved status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check saved status",
    });
  }
};