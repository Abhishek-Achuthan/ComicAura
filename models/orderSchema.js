const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    subTotal: {
        type: Number,
        required: true
    },
    taxAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        name: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: Number,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        pinCode: {
            type: Number,
            required: true
        },
        addressType: {
            type: String,
            enum: ['home', 'work', 'other'],
            required: true
        }
    },
    paymentMethod: {
        type: String,
        enum: ["COD"],
        required: true
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Pending"
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Order", orderSchema);
