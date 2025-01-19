const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
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
        }
    }],
    coupon: {
        code: {
            type: String,
            uppercase: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        },
        discountAmount: {
            type: Number,
            min: 0
        }
    }
}, {
    timestamps: true
});

cartSchema.virtual('total').get(function() {
    return this.items.reduce((total, item) => {
        const price = item.productId.salePrice || item.productId.regularPrice;
        return total + (price * item.quantity);
    }, 0);
});

cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);