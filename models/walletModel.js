const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['CREDIT', 'DEBIT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const walletModel = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [walletTransactionSchema]
});

walletModel.statics.getOrCreateWallet = async function(userId) {
    let wallet = await this.findOne({ user: userId });
    if (!wallet) {
        wallet = await this.create({
            user: userId,
            balance: 0,
            transactions: []
        });
    }
    return wallet;
};

walletModel.methods.addTransaction = async function(type, amount, description, orderId = null) {
    if(!this.transactions){
        this.transactions = []
    }
    this.transactions.push({
        type,
        amount,
        description,
        orderId
    });

    if (type === 'CREDIT') {
        this.balance += amount;
    } else if (type === 'DEBIT') {
        if (this.balance < amount) {
            throw new Error('Insufficient balance');
        }
        this.balance -= amount;
    }

    return this.save();
};

module.exports = mongoose.model('Wallet', walletModel);
