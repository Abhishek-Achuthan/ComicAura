const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

categoryOfferSchema.index({ category: 1, isActive: 1 });
categoryOfferSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('CategoryOffer', categoryOfferSchema);
