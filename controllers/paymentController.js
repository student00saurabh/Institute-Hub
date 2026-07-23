const Payment = require("../models/payment");
const User = require("../models/user");
const Course = require("../models/cources");

// ============================================================
// MANAGE PAYMENTS
// ============================================================
module.exports.managePayments = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};
        
        // Status filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // Search by user or course
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            }).select('_id');

            const userIds = users.map(u => u._id);
            
            const courses = await Course.find({
                title: { $regex: search, $options: "i" }
            }).select('_id');

            const courseIds = courses.map(c => c._id);

            query.$or = [
                { user: { $in: userIds } },
                { course: { $in: courseIds } },
                { userEmail: { $regex: search, $options: "i" } },
                { razorpayPaymentId: { $regex: search, $options: "i" } }
            ];
        }

        const totalPayments = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .populate('user', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get stats
        const stats = await Payment.getStats();
        const revenue = await Payment.getTotalRevenue();

        const totalPages = Math.ceil(totalPayments / parseInt(limit));

        res.render("admin/payments.ejs", {
            payments,
            totalPayments,
            currentPage: parseInt(page),
            totalPages,
            limit: parseInt(limit),
            status: status || 'all',
            search: search || '',
            stats,
            revenue,
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Manage payments error:", error);
        req.flash("error", "Failed to load payments");
        res.redirect("/admin/dashboard");
    }
};

// ============================================================
// PAYMENT DETAILS
// ============================================================
module.exports.paymentDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findById(id)
            .populate('user', 'name email mobile')
            .populate('course', 'title price image')
            .lean();

        if (!payment) {
            req.flash("error", "Payment not found");
            return res.redirect("/admin/payments");
        }

        res.render("admin/paymentDetails.ejs", {
            payment,
            moment: require("moment"),
            user: req.user
        });

    } catch (error) {
        console.error("Payment details error:", error);
        req.flash("error", "Failed to load payment details");
        res.redirect("/admin/payments");
    }
};

// ============================================================
// EXPORT PAYMENTS (CSV)
// ============================================================
module.exports.exportPayments = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        const payments = await Payment.find(query)
            .populate('user', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .lean();

        let csvContent = "Date,User,Email,Course,Amount,Status,Payment ID,Order ID\n";

        payments.forEach(p => {
            const date = new Date(p.createdAt).toLocaleDateString('en-IN');
            const user = p.user?.name || p.userName || 'N/A';
            const email = p.user?.email || p.userEmail || 'N/A';
            const course = p.course?.title || 'N/A';
            const amount = '₹' + (p.amount || 0).toLocaleString('en-IN');

            csvContent += `"${date}","${user}","${email}","${course}","${amount}","${p.status}","${p.razorpayPaymentId || 'N/A'}","${p.razorpayOrderId || 'N/A'}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payments-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error("Export payments error:", error);
        req.flash("error", "Failed to export payments");
        res.redirect("/admin/payments");
    }
};