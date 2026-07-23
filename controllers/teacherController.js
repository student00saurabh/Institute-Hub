const User = require("../models/user");
const Course = require("../models/cources");
const Teacher = require("../models/teachers");

// ============================================================
// MANAGE TEACHERS
// ============================================================
module.exports.manageTeachers = async (req, res) => {
    try {
        const { search, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        let query = { role: { $in: ["teacher", "admin"] } };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const totalTeachers = await User.countDocuments(query);
        const teachers = await User.find(query)
            .select('name email mobile role isActive isBlocked createdAt profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get course count for each teacher
        const teachersWithCount = await Promise.all(
            teachers.map(async (teacher) => {
                const courseCount = await Course.countDocuments({ 
                    teacher: teacher._id 
                });
                return { ...teacher, courseCount };
            })
        );

        const totalPages = Math.ceil(totalTeachers / limit);

        res.render("admin/teachers.ejs", {
            teachers: teachersWithCount,
            totalTeachers,
            currentPage: parseInt(page),
            totalPages,
            search: search || '',
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Manage teachers error:", error);
        req.flash("error", "Failed to load teachers");
        res.redirect("/admin/dashboard");
    }
};

// ============================================================
// MAKE TEACHER
// ============================================================
module.exports.makeTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/admin/teachers");
        }

        // Toggle teacher role
        if (user.role === "teacher" || user.role === "admin") {
            user.role = "user";
            req.flash("success", `Teacher role removed from ${user.name}`);
        } else {
            user.role = "teacher";
            req.flash("success", `${user.name} is now a teacher`);
        }

        await user.save();
        res.redirect("/admin/teachers");

    } catch (error) {
        console.error("Make teacher error:", error);
        req.flash("error", "Failed to update teacher role");
        res.redirect("/admin/teachers");
    }
};

// ============================================================
// TEACHER DETAILS
// ============================================================
module.exports.teacherDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const teacher = await User.findById(id)
            .select('name email mobile role isActive isBlocked createdAt profileImage')
            .lean();

        if (!teacher || (teacher.role !== "teacher" && teacher.role !== "admin")) {
            req.flash("error", "Teacher not found");
            return res.redirect("/admin/teachers");
        }

        // Get courses taught by this teacher
        const courses = await Course.find({ teacher: id })
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Get students enrolled in teacher's courses
        const allStudents = [];
        courses.forEach(course => {
            if (course.students) {
                course.students.forEach(student => {
                    allStudents.push({
                        ...student,
                        courseTitle: course.title,
                        courseId: course._id
                    });
                });
            }
        });

        const totalStudents = allStudents.length;
        const totalRevenue = allStudents.reduce((sum, s) => sum + (s.paidPrice || 0), 0);

        res.render("admin/teacherDetails.ejs", {
            teacher,
            courses,
            totalStudents,
            totalRevenue,
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Teacher details error:", error);
        req.flash("error", "Failed to load teacher details");
        res.redirect("/admin/teachers");
    }
};