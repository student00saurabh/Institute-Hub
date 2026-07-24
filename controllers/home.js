const User = require("../models/user");

const Course = require("../models/cources");
const Blog = require("../models/blog");
const Review = require("../models/review");
const lectureController = require("./lectureController");
const cloudinary = require("../Cloudconfig.js"); 
const CourseCategory = require("../models/courseCategory");
const { all } = require("axios");
const crypto = require('crypto');
const Razorpay = require("razorpay");
const Payment = require("../models/payment");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports.homePage = async (req, res, next) => {
    try {
        // ============================================================
        // 1. STATISTICS - Dynamic from Database
        // ============================================================
        const totalUsers = await User.countDocuments();
        const totalInstructors = await User.countDocuments({ 
            role: { $in: ["admin", "teacher"] } 
        });
        const totalCourses = await Course.countDocuments({ isActive: true });
        
        // Calculate satisfaction score from reviews
        const reviewStats = await Review.aggregate([
            { $match: { isApproved: true } },
            { $group: { 
                _id: null, 
                avgRating: { $avg: "$rating" },
                total: { $sum: 1 }
            }}
        ]);
        const satisfaction = reviewStats.length > 0 
            ? Math.round((reviewStats[0].avgRating / 5) * 100) 
            : 98;

        // ✅ STATS with fallback
        const stats = [
            { value: totalCourses || 120, suffix: "+", label: "Courses" },
            { value: totalUsers || 15000, suffix: "+", label: "Students" },
            { value: totalInstructors || 45, suffix: "+", label: "Mentors" },
            { value: satisfaction || 98, suffix: "%", label: "Satisfaction" },
        ];

        // ============================================================
        // 2. CATEGORIES - Dynamic with fallback
        // ============================================================
        let categories = await CourseCategory.find({ isActive: true })
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        // ✅ FALLBACK CATEGORIES - if DB empty
        const FALLBACK_CATEGORIES = [
            { name: "Web Development", icon: "fa-code", color: "blue" },
            { name: "Data Science", icon: "fa-chart-line", color: "purple" },
            { name: "UI / UX Design", icon: "fa-pen-ruler", color: "pink" },
            { name: "Cybersecurity", icon: "fa-shield-halved", color: "red" },
            { name: "Cloud & DevOps", icon: "fa-cloud", color: "cyan" },
            { name: "Mobile Apps", icon: "fa-mobile-screen", color: "green" },
            { name: "AI & ML", icon: "fa-brain", color: "indigo" },
            { name: "Marketing", icon: "fa-bullhorn", color: "orange" },
        ];

        let categoriesWithCount = [];
        if (categories && categories.length > 0) {
            // Use real categories
            categoriesWithCount = await Promise.all(
                categories.map(async (cat) => {
                    const count = await Course.countDocuments({
                        category: cat._id,
                        isActive: true
                    });
                    return {
                        _id: cat._id,
                        name: cat.name,
                        slug: cat.slug,
                        icon: cat.icon || "fa-shield-alt",
                        color: cat.color || "blue",
                        count: count || 0
                    };
                })
            );
        } else {
            // ✅ Use FALLBACK categories with random counts
            categoriesWithCount = FALLBACK_CATEGORIES.map((cat, index) => ({
                _id: `fallback-${index}`,
                name: cat.name,
                slug: cat.name.toLowerCase().replace(/ /g, '-'),
                icon: cat.icon,
                color: cat.color,
                count: Math.floor(Math.random() * 80) + 20 // Random count 20-100
            }));
        }

        // ============================================================
        // 3. OFFER SLIDER - Upcoming/Popular Courses
        // ============================================================
        let offerCourses = await Course.find({
            isActive: true,
            isPopular: true
        })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate("teacher", "name")
            .lean();

        // ✅ FALLBACK OFFERS - if DB empty
        const FALLBACK_OFFERS = [
            { title: "Complete Web Development Bootcamp", discount: "40% OFF", price: "₹2,499", original: "₹4,999", tag: "Best Seller", color: "from-[#2563EB] to-[#1D4ED8]", img: "https://picsum.photos/seed/offer1/800/500", enrolled: 2400 },
            { title: "Data Science & Machine Learning A-Z", discount: "35% OFF", price: "₹3,199", original: "₹4,999", tag: "Trending", color: "from-[#7C3AED] to-[#6D28D9]", img: "https://picsum.photos/seed/offer2/800/500", enrolled: 1800 },
            { title: "UI/UX Design Masterclass", discount: "45% OFF", price: "₹1,999", original: "₹3,499", tag: "Popular", color: "from-[#C9A227] to-[#B8901E]", img: "https://picsum.photos/seed/offer3/800/500", enrolled: 1200 },
            { title: "Cybersecurity Bundle", discount: "50% OFF", price: "₹2,799", original: "₹5,599", tag: "Limited", color: "from-[#EF4444] to-[#DC2626]", img: "https://picsum.photos/seed/offer4/800/500", enrolled: 900 },
            { title: "Cloud Architect Path", discount: "30% OFF", price: "₹2,999", original: "₹4,299", tag: "New", color: "from-[#06B6D4] to-[#0891B2]", img: "https://picsum.photos/seed/offer5/800/500", enrolled: 700 },
            { title: "Deep Learning with PyTorch", discount: "35% OFF", price: "₹3,499", original: "₹6,499", tag: "Featured", color: "from-[#22C55E] to-[#16A34A]", img: "https://picsum.photos/seed/offer6/800/500", enrolled: 500 },
        ];

        let offers = [];
        if (offerCourses && offerCourses.length > 0) {
            // Format real courses as offers
            offers = offerCourses.map((course, index) => {
                const discount = course.price > course.actualPrice
                    ? Math.round(((course.price - course.actualPrice) / course.price) * 100)
                    : 20 + (index * 5);
            
                const tags = ["Best Seller", "Trending", "Popular", "Limited", "New", "Featured"];
                const colors = [
                    "from-[#2563EB] to-[#1D4ED8]",
                    "from-[#7C3AED] to-[#6D28D9]",
                    "from-[#C9A227] to-[#B8901E]",
                    "from-[#EF4444] to-[#DC2626]",
                    "from-[#06B6D4] to-[#0891B2]",
                    "from-[#22C55E] to-[#16A34A]"
                ];
                
                return {
                    title: course.title || "Featured Course",
                    discount: `${discount}% OFF`,
                    price: `₹${(course.price || 0).toLocaleString()}`,
                    original: `₹${(course.actualPrice || 0).toLocaleString()}`,
                    tag: tags[index % tags.length],
                    color: colors[index % colors.length],
                    img: course.image?.url || FALLBACK_OFFERS[index % FALLBACK_OFFERS.length].img,
                    courseId: course._id,
                    enrolled: course.preStudents || Math.floor(Math.random() * 2000) + 500
                };
            });
        } else {
            // ✅ Use FALLBACK offers
            offers = FALLBACK_OFFERS;
        }

        // ============================================================
        // 4. POPULAR COURSES
        // ============================================================
        let popularCourses = await Course.find({
            isActive: true,
            isPopular: true
        })
            .sort({ rating: -1, createdAt: -1 })
            .limit(8)
            .populate("teacher", "name")
            .lean();

        // ✅ FALLBACK POPULAR COURSES
        const FALLBACK_POPULAR_COURSES = [
            { title: "Complete Web Development Bootcamp", instructor: "Aarav Mehta", category: "Web Development", price: 2499, oldPrice: 4999, rating: 4.8, reviews: 2140, students: 18500, lessons: 86, duration: "42h", level: "Beginner", img: "https://picsum.photos/seed/course1/640/420" },
            { title: "Data Science & Machine Learning A-Z", instructor: "Priya Nair", category: "Data Science", price: 3199, oldPrice: 5999, rating: 4.9, reviews: 1870, students: 15200, lessons: 104, duration: "58h", level: "Intermediate", img: "https://picsum.photos/seed/course2/640/420" },
            { title: "UI/UX Design Masterclass", instructor: "Kabir Sethi", category: "UI / UX Design", price: 1999, oldPrice: 3499, rating: 4.7, reviews: 980, students: 9800, lessons: 62, duration: "30h", level: "Beginner", img: "https://picsum.photos/seed/course3/640/420" },
            { title: "Ethical Hacking & Cybersecurity", instructor: "Rohan Kapoor", category: "Cybersecurity", price: 2799, oldPrice: 4499, rating: 4.8, reviews: 1420, students: 11200, lessons: 74, duration: "36h", level: "Advanced", img: "https://picsum.photos/seed/course4/640/420" },
            { title: "AWS Certified Solutions Architect", instructor: "Simran Kaur", category: "Cloud & DevOps", price: 2999, oldPrice: 5499, rating: 4.9, reviews: 1650, students: 13400, lessons: 91, duration: "48h", level: "Intermediate", img: "https://picsum.photos/seed/course5/640/420" },
            { title: "React Native: Build Mobile Apps", instructor: "Dev Malhotra", category: "Mobile Apps", price: 2299, oldPrice: 3999, rating: 4.6, reviews: 760, students: 7300, lessons: 58, duration: "27h", level: "Intermediate", img: "https://picsum.photos/seed/course6/640/420" },
            { title: "Deep Learning with PyTorch", instructor: "Ananya Rao", category: "AI & ML", price: 3499, oldPrice: 6499, rating: 4.9, reviews: 1120, students: 8900, lessons: 96, duration: "52h", level: "Advanced", img: "https://picsum.photos/seed/course7/640/420" },
            { title: "Digital Marketing Complete Guide", instructor: "Ishaan Verma", category: "Marketing", price: 1799, oldPrice: 2999, rating: 4.5, reviews: 640, students: 6100, lessons: 45, duration: "22h", level: "Beginner", img: "https://picsum.photos/seed/course8/640/420" },
        ];

        let formattedPopularCourses = [];
        if (popularCourses && popularCourses.length > 0) {
            formattedPopularCourses = popularCourses.map((course) => ({
                _id: course._id,
                title: course.title,
                instructor: course.teacher?.name || "Expert Instructor",
                category: course.courceType || "Course",
                price: course.price || 0,
                oldPrice: course.actualPrice || course.price || 0,
                rating: course.rating || 0,
                reviews: course.reviewCount || 0,
                students: course.preStudents || course.students?.length || 0,
                lessons: course.tableOfContent?.length || Math.floor(Math.random() * 50) + 20,
                duration: course.duration ? `${course.duration}h` : `${Math.floor(Math.random() * 30) + 15}h`,
                level: course.courseLevel || "Beginner",
                img: course.image?.url || `https://picsum.photos/seed/course${Math.floor(Math.random() * 100)}/640/420`,
                isPopular: true,
                categoryId: course.category
            }));
        } else {
            // ✅ Use FALLBACK popular courses
            formattedPopularCourses = FALLBACK_POPULAR_COURSES.map((course, index) => ({
                _id: `fallback-popular-${index}`,
                ...course,
                tags: index < 2 ? ["best-seller"] : index < 4 ? ["popular"] : []
            }));
        }

        // ============================================================
        // 5. NEWLY LAUNCHED COURSES
        // ============================================================
        let newCourses = await Course.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("teacher", "name")
            .lean();

        // ✅ FALLBACK NEW COURSES
        const FALLBACK_NEW_COURSES = [
            { title: "Next.js 15 Full Stack Development", instructor: "Aarav Mehta", price: 2699,  rating: 4.9, students: 420, duration: "34h", img: "https://picsum.photos/seed/new1/640/420", launched: "3 days ago", category: "Web Development" },
            { title: "Prompt Engineering for Developers", instructor: "Meera Iyer", price: 1499, rating: 4.8, students: 310, duration: "16h", img: "https://picsum.photos/seed/new2/640/420", launched: "5 days ago", category: "AI & ML" },
            { title: "Advanced Figma for Product Teams", instructor: "Kabir Sethi", price: 1899, rating: 4.7, students: 265, duration: "19h", img: "https://picsum.photos/seed/new3/640/420", launched: "1 week ago", category: "UI / UX Design" },
            { title: "Kubernetes for Production", instructor: "Simran Kaur", price: 2899, rating: 4.9, students: 198, duration: "29h", img: "https://picsum.photos/seed/new4/640/420", launched: "1 week ago", category: "Cloud & DevOps" },
            { title: "Generative AI with LangChain", instructor: "Ananya Rao", price: 3099, rating: 4.8, students: 372, duration: "31h", img: "https://picsum.photos/seed/new5/640/420", launched: "2 weeks ago", category: "AI & ML" },
            { title: "iOS 18 App Development with Swift", instructor: "Dev Malhotra", price: 2599, rating: 4.6, students: 154, duration: "26h", img: "https://picsum.photos/seed/new6/640/420", launched: "2 weeks ago", category: "Mobile Apps" },
        ];

        let formattedNewCourses = [];
        if (newCourses && newCourses.length > 0) {
            formattedNewCourses = newCourses.map((course) => ({
                _id: course._id,
                title: course.title,
                instructor: course.teacher?.name || "Expert Instructor",
                price: course.actualPrice || 0,
                rating: course.rating || 0,
                students: course.preStudents || course.students?.length || 0,
                duration: course.duration ? `${course.duration}h` : `${Math.floor(Math.random() * 30) + 15}h`,
                img: course.image?.url || `https://picsum.photos/seed/new${Math.floor(Math.random() * 100)}/640/420`,
                launched: course.createdAt ? getTimeAgo(course.createdAt) : "Recently",
                category: course.courceType || "Course"
            }));
        } else {
            // ✅ Use FALLBACK new courses
            formattedNewCourses = FALLBACK_NEW_COURSES.map((course, index) => ({
                _id: `fallback-new-${index}`,
                ...course
            }));
        }

        // ============================================================
        // 6. FEATURES (Static)
        // ============================================================
        const features = [
            { icon: "fa-video", title: "HD Video Lessons", desc: "Crisp, structured video lectures you can learn from at your own pace, anytime." },
            { icon: "fa-certificate", title: "Verified Certificates", desc: "Earn shareable certificates recognized by employers on completion." },
            { icon: "fa-infinity", title: "Lifetime Access", desc: "Pay once, learn forever — including all future course updates." },
            { icon: "fa-user-tie", title: "Industry Mentors", desc: "Learn directly from working professionals and subject-matter experts." },
            { icon: "fa-comments", title: "1:1 Doubt Support", desc: "Get your questions answered by mentors within 24 hours, guaranteed." },
            { icon: "fa-mobile-screen-button", title: "Learn On Any Device", desc: "Seamless experience across desktop, tablet and mobile — even offline." },
        ];

        // ============================================================
        // 7. BLOGS with Likes
        // ============================================================
        let blogs = await Blog.find({ isvalid: true, blocked: false })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate("author", "name")
            .lean();

        // ✅ FALLBACK BLOGS
        const FALLBACK_BLOGS = [
            { title: "10 Habits of Highly Effective Self-Taught Developers", category: "Career", author: "Aarav Mehta", authorInitial: "A", date: "Jul 12, 2026", readTime: "6 min read", img: "https://picsum.photos/seed/blog1/640/420", comments: 34, views: 2840, likes: 120 },
            { title: "How to Choose Your First Programming Language in 2026", category: "Web Development", author: "Priya Nair", authorInitial: "P", date: "Jul 8, 2026", readTime: "8 min read", img: "https://picsum.photos/seed/blog2/640/420", comments: 21, views: 1970, likes: 85 },
            { title: "Portfolio Projects That Actually Get You Hired", category: "Career", author: "Kabir Sethi", authorInitial: "K", date: "Jul 3, 2026", readTime: "5 min read", img: "https://picsum.photos/seed/blog3/640/420", comments: 47, views: 3620, likes: 210 },
            { title: "A Beginner's Guide to Cloud Certifications", category: "Cloud & DevOps", author: "Simran Kaur", authorInitial: "S", date: "Jun 27, 2026", readTime: "7 min read", img: "https://picsum.photos/seed/blog4/640/420", comments: 18, views: 1540, likes: 64 },
            { title: "Why Every Designer Should Learn Basic Front-End Code", category: "UI / UX Design", author: "Neha Joshi", authorInitial: "N", date: "Jun 20, 2026", readTime: "4 min read", img: "https://picsum.photos/seed/blog5/640/420", comments: 29, views: 2210, likes: 95 },
            { title: "Cybersecurity Basics Every Developer Should Know", category: "Cybersecurity", author: "Rohan Kapoor", authorInitial: "R", date: "Jun 14, 2026", readTime: "9 min read", img: "https://picsum.photos/seed/blog6/640/420", comments: 52, views: 4130, likes: 310 },
        ];

        let formattedBlogs = [];
        if (blogs && blogs.length > 0) {
            formattedBlogs = blogs.map((blog) => ({
                _id: blog._id,
                id: blog.id || blog._id,
                title: blog.title,
                category: blog.category || "General",
                author: blog.author?.name || "Anonymous",
                authorInitial: blog.author?.name?.charAt(0) || "A",
                date: blog.createdAt ? formatDate(blog.createdAt) : "Recent",
                readTime: `${Math.ceil((blog.content?.length || 1000) / 1000)} min read`,
                img: blog.image?.url || `https://picsum.photos/seed/blog${Math.floor(Math.random() * 100)}/640/420`,
                comments: blog.comments?.length || 0,
                views: blog.usersSeen?.length || Math.floor(Math.random() * 3000) + 500,
                likes: blog.likes?.length || 0,
                likedByUser: blog.likes?.some(id => id.toString() === req.user?._id?.toString()) || false,
                authorId: blog.author?._id
            }));
        } else {
            // ✅ Use FALLBACK blogs
            formattedBlogs = FALLBACK_BLOGS.map((blog, index) => ({
                _id: `fallback-blog-${index}`,
                ...blog,
                likedByUser: false
            }));
        }

        // ============================================================
        // 8. REVIEWS / TESTIMONIALS
        // ============================================================
        let approvedReviews = await Review.find({
            isApproved: true,
            isVerified: true
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // ✅ FALLBACK TESTIMONIALS
        const FALLBACK_TESTIMONIALS = [
            { name: 'Ananya Sharma', rating: 5, text: 'The courses are incredibly well-structured. The hands-on labs and expert guidance helped me build confidence and secure my first role.', role: 'Security Analyst', isVerified: true },
            { name: 'Rahul Verma', rating: 5, text: 'Outstanding platform! The learning environment closely mirrored real-world scenarios, making the experience both challenging and rewarding.', role: 'DevOps Engineer', isVerified: true },
            { name: 'Priya Mehta', rating: 5, text: 'As someone new to this field, I found the courses extremely well-structured. The instructors explained complex concepts in a simple manner.', role: 'Data Scientist', isVerified: true },
            { name: 'Arjun Singh', rating: 5, text: 'What impressed me most was the mentorship support. The instructors were always available to clarify doubts and guide us throughout.', role: 'Full Stack Developer', isVerified: true },
            { name: 'Sneha Patel', rating: 4, text: 'The platform offers great value for money. The practical exercises and real-world projects made learning engaging and effective.', role: 'Product Manager', isVerified: true },
            { name: 'Vikram Joshi', rating: 5, text: 'I transitioned from IT support to cybersecurity thanks to this platform. The career guidance and hands-on approach made all the difference.', role: 'Security Engineer', isVerified: true },
        ];

        let testimonials = [];
        if (approvedReviews && approvedReviews.length > 0) {
            testimonials = approvedReviews.map(review => ({
                name: review.name || 'Anonymous',
                rating: review.rating || 5,
                text: review.message || 'Great experience!',
                role: review.user?.role || 'Learner',
                date: review.createdAt,
                isVerified: true
            }));
        } else {
            // ✅ Use FALLBACK testimonials
            testimonials = FALLBACK_TESTIMONIALS;
        }

        // ============================================================
        // 9. RENDER with ALL DATA
        // ============================================================
        res.render("institutehub/home.ejs", {
            stats,
            categories: categoriesWithCount,
            offers,
            popularCourses: formattedPopularCourses,
            newCourses: formattedNewCourses,
            features,
            blogs: formattedBlogs,
            testimonials,
            totalCourses: await Course.countDocuments({ isActive: true }) || 120,
            totalBlogs: await Blog.countDocuments({ isvalid: true, blocked: false }) || 45,
            moment: require("moment"),
            currentUser: req.user || null,
            isFallback: {
                categories: categories.length === 0,
                offers: offerCourses.length === 0,
                popular: popularCourses.length === 0,
                new: newCourses.length === 0,
                blogs: blogs.length === 0,
                reviews: approvedReviews.length === 0
            }
        });

    } catch (error) {
        console.error("Homepage error:", error);
        req.flash("error", "Unable to load the homepage. Please refresh the page or try again later.");
        res.redirect("/login");
    }
};
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

function formatDate(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

module.exports.allCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        
        // Get filter parameters
        const search = req.query.search || "";
        const category = req.query.category || "";
        const level = req.query.level || "";
        const sortBy = req.query.sortBy || "popular";
        const filter = req.query.filter || "all";

        // ✅ FALLBACK COURSES DATA
        const FALLBACK_COURSES = [
            { id: 1, title: "Complete Web Development Bootcamp", instructor: "Aarav Mehta", category: "Web Development", price: 2499, oldPrice: 4999, rating: 4.8, reviews: 2140, students: 18500, lessons: 86, duration: "42h", level: "Beginner", img: "https://picsum.photos/seed/course1/640/420", tags: ["popular", "best-seller"] },
            { id: 2, title: "Data Science & Machine Learning A-Z", instructor: "Priya Nair", category: "Data Science", price: 3199, oldPrice: 5999, rating: 4.9, reviews: 1870, students: 15200, lessons: 104, duration: "58h", level: "Intermediate", img: "https://picsum.photos/seed/course2/640/420", tags: ["trending"] },
            { id: 3, title: "UI/UX Design Masterclass", instructor: "Kabir Sethi", category: "UI / UX Design", price: 1999, oldPrice: 3499, rating: 4.7, reviews: 980, students: 9800, lessons: 62, duration: "30h", level: "Beginner", img: "https://picsum.photos/seed/course3/640/420", tags: ["popular"] },
            { id: 4, title: "Ethical Hacking & Cybersecurity", instructor: "Rohan Kapoor", category: "Cybersecurity", price: 2799, oldPrice: 4499, rating: 4.8, reviews: 1420, students: 11200, lessons: 74, duration: "36h", level: "Advanced", img: "https://picsum.photos/seed/course4/640/420", tags: ["trending"] },
            { id: 5, title: "AWS Certified Solutions Architect", instructor: "Simran Kaur", category: "Cloud & DevOps", price: 2999, oldPrice: 5499, rating: 4.9, reviews: 1650, students: 13400, lessons: 91, duration: "48h", level: "Intermediate", img: "https://picsum.photos/seed/course5/640/420", tags: ["best-seller"] },
            { id: 6, title: "React Native: Build Mobile Apps", instructor: "Dev Malhotra", category: "Mobile Apps", price: 2299, oldPrice: 3999, rating: 4.6, reviews: 760, students: 7300, lessons: 58, duration: "27h", level: "Intermediate", img: "https://picsum.photos/seed/course6/640/420", tags: [] },
            { id: 7, title: "Deep Learning with PyTorch", instructor: "Ananya Rao", category: "AI & ML", price: 3499, oldPrice: 6499, rating: 4.9, reviews: 1120, students: 8900, lessons: 96, duration: "52h", level: "Advanced", img: "https://picsum.photos/seed/course7/640/420", tags: ["trending"] },
            { id: 8, title: "Digital Marketing Complete Guide", instructor: "Ishaan Verma", category: "Marketing", price: 1799, oldPrice: 2999, rating: 4.5, reviews: 640, students: 6100, lessons: 45, duration: "22h", level: "Beginner", img: "https://picsum.photos/seed/course8/640/420", tags: [] },
            { id: 9, title: "JavaScript: The Advanced Concepts", instructor: "Aarav Mehta", category: "Web Development", price: 1999, oldPrice: 3499, rating: 4.7, reviews: 890, students: 8200, lessons: 52, duration: "28h", level: "Intermediate", img: "https://picsum.photos/seed/course9/640/420", tags: ["popular"] },
            { id: 10, title: "Python for Data Science", instructor: "Priya Nair", category: "Data Science", price: 2199, oldPrice: 3999, rating: 4.8, reviews: 1340, students: 11200, lessons: 68, duration: "34h", level: "Beginner", img: "https://picsum.photos/seed/course10/640/420", tags: [] },
            { id: 11, title: "Figma Masterclass for UI/UX", instructor: "Kabir Sethi", category: "UI / UX Design", price: 1499, oldPrice: 2499, rating: 4.6, reviews: 720, students: 6800, lessons: 38, duration: "18h", level: "Beginner", img: "https://picsum.photos/seed/course11/640/420", tags: ["new"] },
            { id: 12, title: "Cloud Computing with AWS & Azure", instructor: "Simran Kaur", category: "Cloud & DevOps", price: 3299, oldPrice: 5999, rating: 4.8, reviews: 980, students: 8900, lessons: 82, duration: "44h", level: "Intermediate", img: "https://picsum.photos/seed/course12/640/420", tags: ["trending"] },
            { id: 13, title: "React JS: From Zero to Hero", instructor: "Aarav Mehta", category: "Web Development", price: 2299, oldPrice: 3999, rating: 4.7, reviews: 1560, students: 14200, lessons: 68, duration: "36h", level: "Beginner", img: "https://picsum.photos/seed/course13/640/420", tags: ["popular"] },
            { id: 14, title: "Machine Learning Engineering", instructor: "Ananya Rao", category: "AI & ML", price: 3799, oldPrice: 6999, rating: 4.8, reviews: 890, students: 6700, lessons: 78, duration: "42h", level: "Advanced", img: "https://picsum.photos/seed/course14/640/420", tags: ["trending"] },
            { id: 15, title: "DevOps with Docker & Kubernetes", instructor: "Simran Kaur", category: "Cloud & DevOps", price: 2799, oldPrice: 4999, rating: 4.7, reviews: 1120, students: 9800, lessons: 56, duration: "30h", level: "Intermediate", img: "https://picsum.photos/seed/course15/640/420", tags: ["best-seller"] },
            { id: 16, title: "Flutter Mobile App Development", instructor: "Dev Malhotra", category: "Mobile Apps", price: 1999, oldPrice: 3499, rating: 4.6, reviews: 580, students: 5200, lessons: 48, duration: "24h", level: "Beginner", img: "https://picsum.photos/seed/course16/640/420", tags: ["new"] },
        ];

        // Build query
        let query = { isActive: true };
        
        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
                { courceType: { $regex: search, $options: "i" } }
            ];
        }

        // Category filter
        if (category && category !== "All Categories") {
            if (category.match(/^[0-9a-fA-F]{24}$/)) {
                query.category = category;
            } else {
                query.courceType = { $regex: category, $options: "i" };
            }
        }

        // Level filter
        if (level && level !== "All Levels") {
            query.courseLevel = level.toLowerCase();
        }

        // Filter by status
        if (filter === "popular") query.isPopular = true;
        else if (filter === "free") query.price = 0;
        else if (filter === "paid") query.price = { $gt: 0 };

        // Build sort options
        let sortOptions = {};
        switch(sortBy) {
            case "popular":
                sortOptions = { rating: -1, reviewCount: -1 };
                break;
            case "newest":
                sortOptions = { createdAt: -1 };
                break;
            case "oldest":
                sortOptions = { createdAt: 1 };
                break;
            case "price-low":
                sortOptions = { price: 1 };
                break;
            case "price-high":
                sortOptions = { price: -1 };
                break;
            case "rating":
                sortOptions = { rating: -1 };
                break;
            case "students":
                sortOptions = { preStudents: -1 };
                break;
            default:
                sortOptions = { rating: -1, reviewCount: -1 };
        }

        // Get total count for pagination
        let totalCourses = await Course.countDocuments(query);
        
        // Fetch courses
        let courses = await Course.find(query)
            .populate("teacher", "name email")
            .populate("category", "name slug")
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        // ✅ IF NO COURSES IN DB, USE FALLBACK DATA
        let useFallback = false;
        let formattedCourses = [];
        let fallbackFiltered = [];

        if (courses && courses.length > 0) {
            // Use real courses
            formattedCourses = courses.map((course) => ({
                _id: course._id,
                title: course.title,
                instructor: course.teacher?.name || "Expert Instructor",
                category: course.courceType || course.category?.name || "Course",
                price: course.price || 0,
                oldPrice: course.actualPrice || course.price || 0,
                rating: course.rating || 0,
                reviews: course.reviewCount || 0,
                students: course.preStudents || course.students?.length || 0,
                lessons: course.tableOfContent?.length || Math.floor(Math.random() * 50) + 20,
                duration: course.duration ? `${course.duration}h` : `${Math.floor(Math.random() * 30) + 15}h`,
                level: course.courseLevel || "Beginner",
                img: course.image?.url || `https://picsum.photos/seed/course${Math.floor(Math.random() * 100)}/640/420`,
                tags: getCourseTags(course),
                categoryId: course.category?._id
            }));
            
            // Get total from DB
            totalCourses = await Course.countDocuments(query);
        } else {
            // ✅ USE FALLBACK DATA
            useFallback = true;
            
            // Filter fallback data
            fallbackFiltered = FALLBACK_COURSES.filter(c => {
                let show = true;
                
                if (search && !c.title.toLowerCase().includes(search.toLowerCase())) {
                    show = false;
                }
                if (category && category !== "All Categories" && c.category !== category) {
                    show = false;
                }
                if (level && level !== "All Levels" && c.level !== level) {
                    show = false;
                }
                if (filter === "popular" && !c.tags.includes("popular") && !c.tags.includes("best-seller")) {
                    show = false;
                }
                
                return show;
            });

            // Sort fallback data
            switch(sortBy) {
                case "popular":
                    fallbackFiltered.sort((a, b) => b.rating - a.rating);
                    break;
                case "price-low":
                    fallbackFiltered.sort((a, b) => a.price - b.price);
                    break;
                case "price-high":
                    fallbackFiltered.sort((a, b) => b.price - a.price);
                    break;
                case "rating":
                    fallbackFiltered.sort((a, b) => b.rating - a.rating);
                    break;
                default:
                    break;
            }

            totalCourses = fallbackFiltered.length;

            // Paginate fallback data
            const paginatedFallback = fallbackFiltered.slice(skip, skip + limit);
            
            formattedCourses = paginatedFallback.map(c => ({
                _id: `fallback-${c.id}`,
                title: c.title,
                instructor: c.instructor,
                category: c.category,
                price: c.price,
                oldPrice: c.oldPrice,
                rating: c.rating,
                reviews: c.reviews,
                students: c.students,
                lessons: c.lessons,
                duration: c.duration,
                level: c.level,
                img: c.img,
                tags: c.tags || []
            }));
        }

        // Calculate pagination
        const totalPages = Math.max(1, Math.ceil(totalCourses / limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Get all categories for filter dropdown
        let allCategories = await CourseCategory.find({ isActive: true })
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        // ✅ FALLBACK CATEGORIES for filter
        const FALLBACK_FILTER_CATEGORIES = [
            "Web Development", "Data Science", "UI / UX Design", 
            "Cybersecurity", "Cloud & DevOps", "Mobile Apps", 
            "AI & ML", "Marketing"
        ];

        let filterCategories = ["All Categories"];
        if (allCategories && allCategories.length > 0) {
            filterCategories = ["All Categories", ...allCategories.map(c => c.name)];
        } else {
            filterCategories = ["All Categories", ...FALLBACK_FILTER_CATEGORIES];
        }

        // Get upcoming courses for slider
        let upcomingCourses = await Course.find({
            isActive: true,
            isPopular: true,
            lounchedDate: { $gt: new Date() }
        })
            .sort({ lounchedDate: 1 })
            .limit(6)
            .populate("teacher", "name")
            .lean();

        // ✅ FALLBACK UPCOMING COURSES
        const FALLBACK_UPCOMING = [
            { title: "Full Stack AI Development", instructor: "Aarav Mehta", price: 3999, oldPrice: 6999, rating: 4.9, students: 540, duration: "56h", level: "Intermediate", img: "https://picsum.photos/seed/upcoming1/800/500", launchDate: "Coming Aug 2026", tag: "Highly Anticipated" },
            { title: "Blockchain & Web3 Fundamentals", instructor: "Priya Nair", price: 3499, oldPrice: 5999, rating: 4.8, students: 320, duration: "42h", level: "Intermediate", img: "https://picsum.photos/seed/upcoming2/800/500", launchDate: "Coming Sep 2026", tag: "New Topic" },
            { title: "DevOps Mastery with Kubernetes", instructor: "Simran Kaur", price: 3799, oldPrice: 6499, rating: 4.9, students: 280, duration: "48h", level: "Advanced", img: "https://picsum.photos/seed/upcoming3/800/500", launchDate: "Coming Oct 2026", tag: "Industry Focus" },
            { title: "Mobile App Development with Flutter", instructor: "Dev Malhotra", price: 2699, oldPrice: 4499, rating: 4.7, students: 410, duration: "32h", level: "Beginner", img: "https://picsum.photos/seed/upcoming4/800/500", launchDate: "Coming Nov 2026", tag: "Trending" },
            { title: "Advanced Cybersecurity & Ethical Hacking", instructor: "Rohan Kapoor", price: 4299, oldPrice: 7499, rating: 4.9, students: 190, duration: "64h", level: "Advanced", img: "https://picsum.photos/seed/upcoming5/800/500", launchDate: "Coming Dec 2026", tag: "Most Wanted" },
        ];

        let formattedUpcoming = [];
        if (upcomingCourses && upcomingCourses.length > 0) {
            formattedUpcoming = upcomingCourses.map((course, index) => {
                const tags = ["Highly Anticipated", "New Topic", "Industry Focus", "Trending", "Most Wanted", "Coming Soon"];
                const launchDate = course.lounchedDate 
                    ? `Coming ${formatMonthYear(course.lounchedDate)}`
                    : "Coming Soon";
                
                return {
                    _id: course._id,
                    title: course.title,
                    instructor: course.teacher?.name || "Expert Instructor",
                    price: course.price || 0,
                    oldPrice: course.actualPrice || course.price || 0,
                    rating: course.rating || 0,
                    students: course.preStudents || Math.floor(Math.random() * 500) + 100,
                    duration: course.duration ? `${course.duration}h` : `${Math.floor(Math.random() * 30) + 20}h`,
                    level: course.courseLevel || "Intermediate",
                    img: course.image?.url || `https://picsum.photos/seed/upcoming${index+1}/800/500`,
                    launchDate: launchDate,
                    tag: tags[index % tags.length]
                };
            });
        } else {
            formattedUpcoming = FALLBACK_UPCOMING;
        }

        // Get stats
        let stats = {
            total: totalCourses || FALLBACK_COURSES.length,
            popular: await Course.countDocuments({ isActive: true, isPopular: true }) || 8,
            free: await Course.countDocuments({ isActive: true, price: 0 }) || 2,
            paid: await Course.countDocuments({ isActive: true, price: { $gt: 0 } }) || 10
        };

        // If fallback, adjust stats
        if (useFallback) {
            stats = {
                total: FALLBACK_COURSES.length,
                popular: FALLBACK_COURSES.filter(c => c.tags.includes('popular') || c.tags.includes('best-seller')).length,
                free: FALLBACK_COURSES.filter(c => c.price === 0).length,
                paid: FALLBACK_COURSES.filter(c => c.price > 0).length
            };
        }

        // Levels for filter
        const filterLevels = ["All Levels", "Beginner", "Intermediate", "Advanced", "Expert"];

        // Render the page
        res.render("institutehub/courses.ejs", {
            courses: formattedCourses,
            totalCourses,
            currentPage: page,
            totalPages,
            limit,
            hasNextPage,
            hasPrevPage,
            search: search || "",
            category: category || "",
            level: level || "",
            sortBy: sortBy || "popular",
            filter: filter || "all",
            filterCategories,
            filterLevels,
            allCategories,
            upcomingCourses: formattedUpcoming,
            stats,
            moment: require("moment"),
            currentUser: req.user || null,
            isFallback: useFallback
        });

    } catch (error) {
        console.error("All courses error:", error);
        req.flash("error", "Unable to load courses. Please refresh the page.");
        res.redirect("/");
    }
};

function getCourseTags(course) {
    const tags = [];
    if (course.isPopular) tags.push("popular");
    if (course.rating >= 4.8) tags.push("best-seller");
    if (course.rating >= 4.5 && course.rating < 4.8) tags.push("trending");
    if (course.createdAt && (Date.now() - new Date(course.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000) {
        tags.push("new");
    }
    if (course.preStudents > 1000) tags.push("hot");
    return tags;
}

function formatMonthYear(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}



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


module.exports.renderNewCourseForm = async (req, res) => {
  try {
    const teachers = await User.find({ 
      role: { $in: ["admin", "teacher"] } 
    }).select("name email");

     const categories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    
    res.render("institutehub/newcourse.ejs", { 
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

    res.render("institutehub/editcourse.ejs", { 
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

// ============================================================
// ENROLLMENT PAGE CONTROLLER - WITH PAYMENT
// ============================================================
module.exports.enrollCourseForm = async (req, res) => {
    try {
        // Get courseId from params OR query
        const preselectedCourseId = req.params.courseId || req.query.courseId || null;
        const userId = req.user ? req.user._id : null;
        
        // Get all active courses
        let courses = await Course.find({ isActive: true })
            .select('title price actualPrice courceType category duration courseLevel image slug shortDescription')
            .populate('category', 'name slug')
            .populate('teacher', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // ============================================================
        // ✅ CHECK IF USER IS ALREADY ENROLLED IN THE COURSE
        // ============================================================
        let isAlreadyEnrolled = false;
        let enrolledCourse = null;

        if (userId && preselectedCourseId) {
            // Method 1: Check directly in Course model
            const courseWithStudent = await Course.findOne({
                _id: preselectedCourseId,
                'students.user': userId
            }).select('title _id');

            if (courseWithStudent) {
                isAlreadyEnrolled = true;
                enrolledCourse = courseWithStudent;
            }

            // Method 2: Also check in User's enrolledCourses array (if you maintain it)
            if (!isAlreadyEnrolled) {
                const user = await User.findById(userId)
                    .select('enrolledCourses')
                    .populate('enrolledCourses.course', 'title _id');
                
                if (user && user.enrolledCourses) {
                    const found = user.enrolledCourses.find(
                        e => e.course && e.course._id.toString() === preselectedCourseId
                    );
                    if (found) {
                        isAlreadyEnrolled = true;
                        enrolledCourse = found.course;
                    }
                }
            }

            // ✅ If already enrolled, redirect with flash message
            if (isAlreadyEnrolled) {
                req.flash("info", "✅ You are already enrolled in this course. Continue learning!");
                return res.redirect(`/courses/${preselectedCourseId}/access`);
            }
        }

        // ============================================================
        // FALLBACK COURSES - WITH ALL DATA
        // ============================================================
        const FALLBACK_COURSES = [
            {
                _id: 'fallback-1',
                title: 'Complete Cybersecurity Bootcamp 2026',
                price: 2999,
                actualPrice: 4999,
                courceType: 'Cybersecurity',
                category: { name: 'Cybersecurity' },
                duration: '42h',
                courseLevel: 'Beginner',
                shortDescription: 'Master cybersecurity from scratch with hands-on labs and real-world scenarios.',
                teacher: { name: 'Rohan Kapoor' },
                image: { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-2',
                title: 'Ethical Hacking & Penetration Testing',
                price: 2499,
                actualPrice: 4499,
                courceType: 'Cybersecurity',
                category: { name: 'Cybersecurity' },
                duration: '36h',
                courseLevel: 'Advanced',
                shortDescription: 'Learn ethical hacking techniques and become a certified penetration tester.',
                teacher: { name: 'Aarav Mehta' },
                image: { url: 'https://images.unsplash.com/photo-1584968352400-97fa07a88c7f?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-3',
                title: 'Web Development Masterclass 2026',
                price: 1999,
                actualPrice: 3999,
                courceType: 'Web Development',
                category: { name: 'Web Development' },
                duration: '48h',
                courseLevel: 'Beginner',
                shortDescription: 'Build modern websites with HTML, CSS, JavaScript, React, and Node.js.',
                teacher: { name: 'Priya Nair' },
                image: { url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-4',
                title: 'Data Science & Machine Learning A-Z',
                price: 3499,
                actualPrice: 6499,
                courceType: 'Data Science',
                category: { name: 'Data Science' },
                duration: '58h',
                courseLevel: 'Intermediate',
                shortDescription: 'Complete data science course covering Python, ML, Deep Learning, and AI.',
                teacher: { name: 'Ananya Rao' },
                image: { url: 'https://images.unsplash.com/photo-1518186285589-7f7765de9c6b?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-5',
                title: 'AWS Cloud Architecture Mastery',
                price: 2999,
                actualPrice: 5499,
                courceType: 'Cloud & DevOps',
                category: { name: 'Cloud & DevOps' },
                duration: '44h',
                courseLevel: 'Intermediate',
                shortDescription: 'Master AWS cloud architecture, services, and best practices for enterprise.',
                teacher: { name: 'Simran Kaur' },
                image: { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-6',
                title: 'UI/UX Design Pro - Complete Guide',
                price: 1499,
                actualPrice: 2999,
                courceType: 'UI/UX Design',
                category: { name: 'UI/UX Design' },
                duration: '30h',
                courseLevel: 'Beginner',
                shortDescription: 'Learn UI/UX design principles, Figma, and build a professional portfolio.',
                teacher: { name: 'Kabir Sethi' },
                image: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-7',
                title: 'React Native Mobile App Development',
                price: 2299,
                actualPrice: 3999,
                courceType: 'Mobile Apps',
                category: { name: 'Mobile Apps' },
                duration: '32h',
                courseLevel: 'Intermediate',
                shortDescription: 'Build cross-platform mobile apps with React Native and Expo.',
                teacher: { name: 'Dev Malhotra' },
                image: { url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&auto=format&fit=crop' }
            },
            {
                _id: 'fallback-8',
                title: 'Digital Marketing & SEO Mastery',
                price: 1799,
                actualPrice: 2999,
                courceType: 'Marketing',
                category: { name: 'Marketing' },
                duration: '24h',
                courseLevel: 'Beginner',
                shortDescription: 'Complete digital marketing course covering SEO, Social Media, and Analytics.',
                teacher: { name: 'Ishaan Verma' },
                image: { url: 'https://images.unsplash.com/photo-1432889821006-ca0f7af3f9fa?w=400&auto=format&fit=crop' }
            }
        ];

        // If no courses in DB, use fallback
        if (!courses || courses.length === 0) {
            courses = FALLBACK_COURSES;
        }

        // Get unique categories
        const categories = [...new Set(courses.map(c => c.courceType).filter(Boolean))];

        // Get selected course
        let selectedCourse = null;
        if (preselectedCourseId) {
            // Check in courses array
            selectedCourse = courses.find(c => c._id.toString() === preselectedCourseId);
            
            // If not found in courses (might be fallback), check fallback
            if (!selectedCourse) {
                selectedCourse = FALLBACK_COURSES.find(c => c._id === preselectedCourseId);
            }
        }

        // If no selected course, select first one
        if (!selectedCourse && courses.length > 0) {
            selectedCourse = courses[0];
        }

        // ✅ Pass enrollment status to view
        res.render("institutehub/enroll.ejs", {
            courses: courses,
            categories: categories,
            selectedCourse: selectedCourse,
            preselectedCourseId: preselectedCourseId,
            currentUser: req.user || null,
            moment: require('moment'),
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            // ✅ Pass enrollment status
            isAlreadyEnrolled: isAlreadyEnrolled,
            enrolledCourse: enrolledCourse
        });

    } catch (error) {
        console.error("Enrollment form error:", error);
        req.flash("error", "Unable to load enrollment page. Please try again.");
        res.redirect("/");
    }
};

// ============================================================
// CREATE RAZORPAY ORDER FOR ENROLLMENT
// ============================================================
module.exports.createEnrollmentOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        
        if (!courseId) {
            return res.status(400).json({ success: false, message: 'Course ID is required' });
        }

        // Find course
        let course = await Course.findById(courseId);
        
        // If not found in DB, check fallback
        if (!course) {
            const FALLBACK_COURSES = [
                { _id: 'fallback-1', actualPrice: 4999, price: 2999, title: 'Complete Cybersecurity Bootcamp 2026' },
                { _id: 'fallback-2', actualPrice: 4499, price: 2499, title: 'Ethical Hacking & Penetration Testing' },
                { _id: 'fallback-3', actualPrice: 3999, price: 1999, title: 'Web Development Masterclass 2026' },
                { _id: 'fallback-4', actualPrice: 6499, price: 3499, title: 'Data Science & Machine Learning A-Z' },
                { _id: 'fallback-5', actualPrice: 5499, price: 2999, title: 'AWS Cloud Architecture Mastery' },
                { _id: 'fallback-6', actualPrice: 2999, price: 1499, title: 'UI/UX Design Pro - Complete Guide' },
                { _id: 'fallback-7', actualPrice: 3999, price: 2299, title: 'React Native Mobile App Development' },
                { _id: 'fallback-8', actualPrice: 2999, price: 1799, title: 'Digital Marketing & SEO Mastery' }
            ];
            course = FALLBACK_COURSES.find(c => c._id === courseId);
            
            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }
        }

        // Get amount (actualPrice or price)
        const amount = course.actualPrice || course.price || 0;
        
        if (amount === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'This is a free course. Please enroll directly.',
                isFree: true
            });
        }

        // Check if user is already enrolled
        if (req.user) {
            const existingCourse = await Course.findById(courseId);
            if (existingCourse) {
                const alreadyEnrolled = existingCourse.students?.some(
                    s => s.user.toString() === req.user._id.toString()
                );
                if (alreadyEnrolled) {
                    return res.status(400).json({
                        success: false,
                        message: 'You are already enrolled in this course',
                        alreadyEnrolled: true
                    });
                }
            }
        }

        // Create Razorpay order
        const receipt = `ENR_${courseId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;
        
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: receipt,
            notes: {
                courseId: courseId.toString(),
                courseTitle: course.title?.substring(0, 30) || 'Course',
                type: 'enrollment'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            courseId: courseId,
            courseTitle: course.title
        });

    } catch (error) {
        console.error('Enrollment order creation error:', error);
        res.status(500).json({
            success: false,
            message: error.error?.description || 'Failed to create payment order'
        });
    }
};

// ============================================================
// VERIFY ENROLLMENT PAYMENT
// ============================================================
module.exports.verifyEnrollmentPayment = async (req, res) => {
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

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification details'
            });
        }

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

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login to complete enrollment'
            });
        }

        // Find course
        let course = await Course.findById(courseId);
        const isFallback = !course;
        
        if (!course) {
            // For fallback courses, create a virtual enrollment
            const FALLBACK_COURSES = [
                { _id: 'fallback-1', actualPrice: 4999, price: 2999, title: 'Complete Cybersecurity Bootcamp 2026' },
                { _id: 'fallback-2', actualPrice: 4499, price: 2499, title: 'Ethical Hacking & Penetration Testing' },
                { _id: 'fallback-3', actualPrice: 3999, price: 1999, title: 'Web Development Masterclass 2026' },
                { _id: 'fallback-4', actualPrice: 6499, price: 3499, title: 'Data Science & Machine Learning A-Z' },
                { _id: 'fallback-5', actualPrice: 5499, price: 2999, title: 'AWS Cloud Architecture Mastery' },
                { _id: 'fallback-6', actualPrice: 2999, price: 1499, title: 'UI/UX Design Pro - Complete Guide' },
                { _id: 'fallback-7', actualPrice: 3999, price: 2299, title: 'React Native Mobile App Development' },
                { _id: 'fallback-8', actualPrice: 2999, price: 1799, title: 'Digital Marketing & SEO Mastery' }
            ];
            course = FALLBACK_COURSES.find(c => c._id === courseId);
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
        }

        const paidPrice = course.actualPrice || course.price || 0;

        // Check if already enrolled
        if (!isFallback && course.students) {
            const alreadyEnrolled = course.students.some(
                s => s.user.toString() === req.user._id.toString()
            );
            if (alreadyEnrolled) {
                return res.json({
                    success: true,
                    message: 'You are already enrolled in this course',
                    alreadyEnrolled: true,
                    redirectUrl: `/courses/${courseId}/access`
                });
            }
        }

        // Save payment record
        const payment = new Payment({
            user: req.user._id,
            course: isFallback ? courseId : courseId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: paidPrice,
            status: 'success',
            userEmail: email || req.user.email,
            userName: name || req.user.name,
            description: description || '',
            receipt: `receipt_${Date.now()}`,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            isFallback: isFallback
        });
        await payment.save();

        // Enroll user in real course if exists
        if (!isFallback) {
            course.students.push({
                user: req.user._id,
                paidPrice: paidPrice,
                description: description || '',
                enrolledAt: new Date(),
                isSeen: false,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
            await course.save();
        }

        res.json({
            success: true,
            message: 'Payment verified and enrollment successful!',
            redirectUrl: isFallback ? `/courses` : `/courses/${courseId}/access`
        });

    } catch (error) {
        console.error('Enrollment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment. Please contact support.'
        });
    }
};

module.exports.enrollInNewCource = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { description } = req.body;
 
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
      req.flash("error", "Your account has been blocked. Please contact our support team for assistance.");
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
      (student) => student.user.toString() === user._id.toString()
    );
    if (alreadyEnrolled) {
      req.flash("info", "You are already enrolled in this course.");
      return res.redirect("/enroll");
    }
 
    // ✅ THE FIX — a priced course can NEVER be enrolled through this route.
    const coursePrice = course.actualPrice ?? course.price ?? 0;
    if (coursePrice > 0) {
      req.flash("warning", "This is a paid course. Please complete payment on the course page to enroll.");
      return res.redirect(`/courses/${courseId}`);
    }
 
    // Only reachable for genuinely free courses now.
    course.students.push({
      user: user._id,
      paidPrice: 0,
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
    const { courseId, name, email, mobile, description } = req.body;
 
    if (!courseId || !name || !email || !mobile) {
      req.flash("warning", "Please fill in all required fields to complete enrollment.");
      return res.redirect(redirectUrl);
    }
 
    const user = req.user;
    if (!user) {
      req.flash("warning", "Please log in to enroll.");
      return res.redirect("/login");
    }
 
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
      (s) => s.user.toString() === user._id.toString()
    );
    if (alreadyEnrolled) {
      req.flash("info", "You are already enrolled in this course.");
      return res.redirect(redirectUrl);
    }
 
    // ✅ THE FIX — reject direct enrollment for anything priced.
    // Paid courses must go through /create-order -> Razorpay -> /verify-payment,
    // which is the only path allowed to write a paid entry into course.students.
    const coursePrice = course.actualPrice ?? course.price ?? 0;
    if (coursePrice > 0) {
      req.flash("warning", "Please complete payment using the \"Enroll Now\" button to access this course.");
      return res.redirect(`/courses/${courseId}`);
    }
 
    course.students.push({
      user: user._id,
      paidPrice: 0,
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
      title: course.title + " | institutehub Courses",
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

    res.render("institutehub/viewCourse.ejs", {
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
    

    if (req.user) {
            const alreadyEnrolled = course.students.some(
                (s) => s.user.toString() === req.user._id.toString()
            );
            if (alreadyEnrolled) {
                return res.status(400).json({
                    success: false,
                    message: 'You are already enrolled in this course',
                    alreadyEnrolled: true
                });
            }
        }


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

module.exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            courseId,
            description
        } = req.body;

        // ✅ Import Payment model (if not already imported at top)
        const Payment = require("../models/payment");

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing payment verification details" 
            });
        }

        // ✅ Verify signature
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

        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login to enroll' 
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }

        const verifiedPaidPrice = course.actualPrice || course.price || 0;

        // ✅ CHECK IF PAYMENT ALREADY EXISTS
        let payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

        if (payment) {
            if (payment.status === 'success') {
                // Already successful - just check enrollment
                const alreadyEnrolled = course.students.some(
                    (s) => s.user.toString() === req.user._id.toString()
                );
                if (alreadyEnrolled) {
                    return res.json({
                        success: true,
                        message: 'Payment already verified and enrolled',
                        alreadyEnrolled: true,
                        redirectUrl: `/courses/${courseId}/access`
                    });
                }
                // Enroll if not already
                course.students.push({
                    user: req.user._id,
                    paidPrice: verifiedPaidPrice,
                    description: description || '',
                    enrolledAt: new Date(),
                    isSeen: false,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id
                });
                await course.save();
                return res.json({
                    success: true,
                    message: 'Enrollment completed!',
                    redirectUrl: `/courses/${courseId}/access`
                });
            }
        }

        // ✅ CHECK IF ALREADY ENROLLED
        const alreadyEnrolled = course.students.some(
            (s) => s.user.toString() === req.user._id.toString()
        );
        if (alreadyEnrolled) {
            return res.json({
                success: true,
                message: 'You are already enrolled in this course',
                alreadyEnrolled: true,
                redirectUrl: `/courses/${courseId}/access`
            });
        }

        // ✅ SAVE OR UPDATE PAYMENT RECORD
        if (!payment) {
            payment = new Payment({
                user: req.user._id,
                course: courseId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                amount: verifiedPaidPrice,
                status: 'success',
                userEmail: req.user.email,
                userName: req.user.name,
                description: description || '',
                receipt: `receipt_${Date.now()}`,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });
        } else {
            payment.status = 'success';
            payment.razorpayPaymentId = razorpay_payment_id;
            payment.razorpaySignature = razorpay_signature;
        }
        await payment.save();

        // ✅ ENROLL USER
        course.students.push({
            user: req.user._id,
            paidPrice: verifiedPaidPrice,
            description: description || '',
            enrolledAt: new Date(),
            isSeen: false,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        });
        await course.save();

        res.json({
            success: true,
            message: 'Payment verified and enrollment successful!',
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


// ============================================================
// 🎓 COURSE CONTENT - COMPLETE WITH ERROR HANDLING
// ============================================================
module.exports.getCourseContent = async (req, res) => {
    try {
        const { id: courseId } = req.params;

        // ✅ Check if user is logged in
        if (!req.user) {
            req.flash("warning", "Please login to access course content");
            return res.redirect(`/login?redirect=/courses/${courseId}/access`);
        }

        // ✅ Get course with teacher details
        const course = await Course.findById(courseId)
            .populate("teacher", "name email")
            .lean();

        if (!course) {
            req.flash("error", "Course not found");
            return res.redirect("/courses");
        }

        // ✅ Check enrollment
        const isEnrolled = (course.students || []).some(
            (s) => s.user.toString() === req.user._id.toString()
        );

        if (!isEnrolled) {
            req.flash("warning", "Please enroll in this course to access content");
            return res.redirect(`/courses/${courseId}`);
        }

        // ✅ Get lectures for this course with fallback
        let sections = {};
        let lectures = [];
        let totalLectures = 0;
        let completedLectures = 0;
        let progress = 0;

        try {
            // Get lectures grouped by section
            sections = await Lecture.getCourseLectures(courseId);
            
            // Flatten to get all lectures
            Object.values(sections).forEach(sectionLectures => {
                lectures = lectures.concat(sectionLectures);
            });

            totalLectures = lectures.length || 0;

            // Get progress for this user
            if (totalLectures > 0) {
                const lectureIds = lectures.map(l => l._id);
                const progressDocs = await LectureProgress.find({
                    user: req.user._id,
                    course: courseId,
                    lecture: { $in: lectureIds }
                }).lean();

                const progressMap = new Map();
                progressDocs.forEach(p => {
                    progressMap.set(p.lecture.toString(), p);
                });

                // Add progress info to lectures
                lectures = lectures.map((lecture) => {
                    const prog = progressMap.get(lecture._id.toString());
                    const isCompleted = prog?.isCompleted || false;
                    if (isCompleted) completedLectures++;
                    return {
                        ...lecture,
                        isCompleted: isCompleted,
                        watchPercentage: prog?.watchPercentage || 0,
                        lastPosition: prog?.lastPosition || 0,
                        // For video URL
                        videoUrl: lecture.video?.url || lecture.video?.embedId ? 
                            (lecture.video.provider === 'youtube' ? 
                                `https://www.youtube.com/embed/${lecture.video.embedId}` : 
                                lecture.video.url || '') : 
                            'https://www.youtube.com/embed/dQw4w9WgXcQ'
                    };
                });

                progress = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;
            }

        } catch (err) {
            console.error("Error fetching lectures:", err);
            // Continue with empty data
        }

        // ✅ If no lectures, create fallback dummy lectures
        if (lectures.length === 0) {
            lectures = [
                {
                    id: 'dummy-1',
                    title: 'Welcome to the Course',
                    duration: '5:00',
                    isCompleted: false,
                    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    _id: 'dummy-1'
                },
                {
                    id: 'dummy-2',
                    title: 'Getting Started',
                    duration: '10:00',
                    isCompleted: false,
                    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    _id: 'dummy-2'
                }
            ];
            totalLectures = lectures.length;
            progress = 0;
        }

        // ✅ Render with ALL required variables
        res.render("institutehub/course-content.ejs", {
            course,
            lectures: lectures || [],           // ✅ For backward compatibility
            sections: sections || {},            // For section-based display
            totalLectures: totalLectures || 0,
            completedLectures: completedLectures || 0,
            progress: progress || 0,
            // ✅ Safe access for all
            hasLectures: lectures.length > 0,
            // ✅ currentUser automatically available via app.js
        });

    } catch (error) {
        console.error("Course content error:", error);
        req.flash("error", "Unable to load course content. Please try again.");
        res.redirect("/courses");
    }
};

// Mark lecture as complete
module.exports.markLectureComplete = async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;
        const { currentTime, duration, ended } = req.body;

        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login to update progress" 
            });
        }

        // ✅ Verify lecture exists and is in course
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ 
                success: false, 
                message: "Lecture not found" 
            });
        }

        if (!lecture.isInCourse(courseId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Lecture does not belong to this course" 
            });
        }

        // ✅ Check access
        const hasAccess = await lecture.canAccess(req.user._id, courseId);
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "You don't have access to this lecture" 
            });
        }

        // ✅ Get or create progress
        let progress = await LectureProgress.findOne({
            user: req.user._id,
            course: courseId,
            lecture: lectureId
        });

        if (!progress) {
            progress = new LectureProgress({
                user: req.user._id,
                course: courseId,
                lecture: lectureId,
                lastAccessed: new Date()
            });
        }

        // ✅ Update progress
        const videoDuration = duration || lecture.video?.duration || 0;
        if (currentTime && videoDuration > 0) {
            progress.lastPosition = Math.max(progress.lastPosition || 0, currentTime);
            progress.watchTime = Math.max(progress.watchTime || 0, currentTime);
            progress.watchPercentage = Math.min(
                Math.round((currentTime / videoDuration) * 100), 
                100
            );
        }

        // ✅ Auto-complete when ended or reached threshold
        const minWatchPercentage = lecture.minWatchPercentage || 95;
        if (ended || progress.watchPercentage >= minWatchPercentage) {
            progress.isCompleted = true;
            progress.completedAt = new Date();
        }

        progress.lastAccessed = new Date();
        await progress.save();

        // ✅ Check if course is fully completed
        let allLectures = await Lecture.find({ 
            "courses.courseId": courseId 
        }).select('_id').lean();
        
        if (allLectures.length === 0) {
            allLectures = await Lecture.find({ course: courseId }).select('_id').lean();
        }

        const allLectureIds = allLectures.map(l => l._id);
        const completedCount = await LectureProgress.countDocuments({
            user: req.user._id,
            course: courseId,
            isCompleted: true,
            lecture: { $in: allLectureIds }
        });

        const isCourseCompleted = allLectureIds.length > 0 && 
            completedCount >= allLectureIds.length;

        res.json({
            success: true,
            isCompleted: progress.isCompleted,
            watchPercentage: progress.watchPercentage,
            lastPosition: progress.lastPosition,
            isCourseCompleted: isCourseCompleted,
            completedCount: completedCount,
            totalLectures: allLectureIds.length
        });

    } catch (error) {
        console.error("Mark lecture complete error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update progress. Please try again." 
        });
    }
};


module.exports.getSecureVideoUrl = async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;

        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login to watch this lecture" 
            });
        }

        // ✅ Verify lecture
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ 
                success: false, 
                message: "Lecture not found" 
            });
        }

        // ✅ Check if lecture is in course
        if (!lecture.isInCourse(courseId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Lecture does not belong to this course" 
            });
        }

        // ✅ Check access
        const hasAccess = await lecture.canAccess(req.user._id, courseId);
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "You don't have access to this lecture" 
            });
        }

        // ✅ Get secure URL
        const { provider, publicId, url, embedId } = lecture.video || {};
        let playbackUrl = null;
        let playerType = "direct";

        if (provider === "cloudinary" && publicId) {
            playbackUrl = cloudinary.url(publicId, {
                resource_type: "video",
                type: "authenticated",
                sign_url: true,
                secure: true
            });
        } else if (provider === "youtube" && embedId) {
            playbackUrl = `https://www.youtube.com/embed/${embedId}`;
            playerType = "embed-unprotected";
        } else if (provider === "vimeo" && embedId) {
            playbackUrl = `https://player.vimeo.com/video/${embedId}`;
            playerType = "embed-unprotected";
        } else if (url) {
            playbackUrl = url;
        }

        if (!playbackUrl) {
            return res.status(404).json({ 
                success: false, 
                message: "No video is attached to this lecture yet" 
            });
        }

        // ✅ Get progress
        let progress = await LectureProgress.findOne({
            user: req.user._id,
            course: courseId,
            lecture: lectureId
        });

        if (!progress) {
            progress = new LectureProgress({
                user: req.user._id,
                course: courseId,
                lecture: lectureId,
                lastAccessed: new Date()
            });
            await progress.save();
        }

        res.json({
            success: true,
            playbackUrl,
            playerType,
            duration: lecture.video?.duration || 0,
            resumeAt: progress.lastPosition || 0,
            isCompleted: progress.isCompleted || false,
            minWatchPercentage: lecture.minWatchPercentage || 95
        });

    } catch (error) {
        console.error("Get secure video URL error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to load video. Please try again." 
        });
    }
};

module.exports.getProgress = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login" 
            });
        }

        const progress = await LectureProgress.find({
            user: req.user._id,
            course: courseId
        }).lean();

        const total = progress.length;
        const completed = progress.filter(p => p.isCompleted).length;

        res.json({
            success: true,
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            progress
        });

    } catch (error) {
        console.error("Get progress error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get progress" 
        });
    }
};


module.exports.getCourseContent = lectureController.renderCourseContent;
module.exports.markLectureComplete = lectureController.updateProgress;
module.exports.getSecureVideoUrl = lectureController.getSecureVideoUrl;