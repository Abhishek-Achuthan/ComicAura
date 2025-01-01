const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: function () {
            return !this.socialLogin.isUsed; 
        },
        trim: true,
    },
    lastName: {
        type: String,
        required: function () {
            return !this.socialLogin.isUsed; 
        },
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phoneNumber: {
        type: String,
        required: function () {
            return !this.socialLogin.isUsed;
        },
    },
    password: {
        type: String,
        required: function () {
            return !this.socialLogin.isUsed; 
        },
    },
    isBlocked:{
        type: Boolean,
        default:false,
    },
    socialLogin: {
        isUsed: {
            type: Boolean,
            default: false,
        },
        provider: {
            type: String,
            enum: ['GOOGLE', 'FACEBOOK', 'NONE'],
            default: 'NONE',
        },
        socialId: {
            type: String, 
        },
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet'
    }
});

userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });

// Method to get user's wallet
userSchema.methods.getWallet = async function() {
    // Require the wallet model here to avoid circular dependency
    const Wallet = require('./walletModel');
    return await Wallet.getOrCreateWallet(this._id);
};

module.exports = mongoose.model('User', userSchema);
