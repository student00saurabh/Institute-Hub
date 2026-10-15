const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    // User who made the payment
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // Course purchased
    course: {
        type: Schema.Types.ObjectId,
        ref: "Cources",
        required: true
    },
    
    // Razorpay details
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayPaymentId: {
        type: String,
        required: true,
        unique: true
    },
    razorpaySignature: {
        type: String,
        required: true
    },
    
    // Payment details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: "INR"
    },
    
    // Payment status
    status: {
        type: String,
        enum: ["pending", "success", "failed", "refunded", "partially_refunded"],
        default: "pending"
    },
    
    // Refund details
    refundId: {
        type: String,
        default: null
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundReason: {
        type: String,
        trim: true
    },
    refundedAt: {
        type: Date
    },
    
    // Metadata
    description: {
        type: String,
        trim: true
    },
    userEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    userName: {
        type: String,
        trim: true
    },
    
    // Payment method
    paymentMethod: {
        type: String,
        enum: ["card", "upi", "netbanking", "wallet", "emi"],
        default: "card"
    },
    
    // For receipts
    receipt: {
        type: String,
        trim: true
    },
    
    // IP and device info
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },

    // Admin notes
    adminNotes: {
        type: String,
        trim: true
    }

}, {
    timestamps: true
});

// ========== INDEXES ==========
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ course: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// ========== VIRTUAL FIELDS ==========
paymentSchema.virtual('amountFormatted').get(function() {
    return '₹' + this.amount.toLocaleString('en-IN');
});

paymentSchema.virtual('statusLabel').get(function() {
    const labels = {
        pending: 'Pending',
        success: 'Success',
        failed: 'Failed',
        refunded: 'Refunded',
        partially_refunded: 'Partially Refunded'
    };
    return labels[this.status] || this.status;
});

paymentSchema.virtual('statusColor').get(function() {
    const colors = {
        pending: 'yellow',
        success: 'green',
        failed: 'red',
        refunded: 'gray',
        partially_refunded: 'orange'
    };
    return colors[this.status] || 'gray';
});

// ========== STATIC METHODS ==========
paymentSchema.statics.getStats = async function() {
    return await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
};

paymentSchema.statics.getTotalRevenue = async function() {
    const result = await this.aggregate([
        { $match: { status: 'success' } },
        { $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
        }}
    ]);
    return result.length > 0 ? result[0] : { total: 0, count: 0 };
};

paymentSchema.statics.getMonthlyRevenue = async function(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    
    return await this.aggregate([
        {
            $match: {
                status: 'success',
                createdAt: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: { $dayOfMonth: '$createdAt' },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = mongoose.model("Payment", paymentSchema);