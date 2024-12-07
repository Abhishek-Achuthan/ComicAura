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
    },isBlocked:{
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
});

userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('User', userSchema);
