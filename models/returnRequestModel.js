const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestDate: {
        type: Date,
        required: true
    },
    processedDate: {
        type: Date
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
