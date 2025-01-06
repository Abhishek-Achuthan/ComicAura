const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    offer: {
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage'
        },
        discountValue: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        maxDiscountAmount: {
            type: Number,
            min: 0
        },
        isActive: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Generate slug from name before saving
categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    next();
});

// Virtual for checking if offer is currently valid
categorySchema.virtual('currentOffer').get(function() {
    if (!this.offer || !this.offer.isActive) return null;
    
    const now = new Date();
    const startDate = this.offer.startDate ? new Date(this.offer.startDate) : null;
    const endDate = this.offer.endDate ? new Date(this.offer.endDate) : null;
    
    if ((startDate && now < startDate) || (endDate && now > endDate)) {
        return null;
    }
    
    return {
        type: this.offer.discountType,
        value: this.offer.discountValue,
        maxAmount: this.offer.maxDiscountAmount,
        endDate: this.offer.endDate
    };
});

module.exports = mongoose.model('Category', categorySchema);
