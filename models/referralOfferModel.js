const mongoose = require('mongoose');

const referralOfferSchema = new mongoose.Schema({
    referrerBonus: {
        type: Number,
        required: true,
        min: 0
    },
    refereeBonus: {
        type: Number,
        required: true,
        min: 0
    },
    minimumPurchaseAmount: {
        type: Number,
        required: true,
        min: 0
    },
    maxReferrals: {
        type: Number,
        required: true,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ReferralOffer', referralOfferSchema);
