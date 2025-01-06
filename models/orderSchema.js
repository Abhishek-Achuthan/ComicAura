const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    shippingAddress: {
        name: {
            type: String,
            required: true
        },
        addressType: {
            type: String,
            required: true,
            enum: ['home', 'work', 'other']
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true,
            default: 'India'
        },
        pinCode: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        }
    },
    subTotal: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    coupon: {
        code: {
            type: String
        },
        discountAmount: {
            type: Number
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        }
    },
    taxAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'razorpay', 'wallet']
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Return Rejected'],
        default: 'Pending'
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    isReturned: {
        type: Boolean,
        default: false
    },
    returnReason: {
        type: String
    },
    returnDate: {
        type: Date
    },
    deliveryDate: {
        type: Date
    },
    // New fields for return rejection
    returnStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    }
});

orderSchema.methods.updateStatus = async function(status, comment) {
    this.orderStatus = status;
    this.statusHistory.push({ status, comment });
    if (status === 'Return Rejected') {
        this.returnStatus = 'rejected';
        this.rejectionReason = comment;
    }
    return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
