const User = require('../../models/userSchema');
const Wallet = require('../../models/walletModel');

const walletController = {
    // Get wallet balance and transactions
    getWalletDetails: async (req, res) => {
        try {
            const userId = req.user._id;
            const wallet = await Wallet.getOrCreateWallet(userId);
            
            res.json({
                success: true,
                wallet: {
                    balance: wallet.balance,
                    transactions: wallet.transactions.sort((a, b) => b.date - a.date)
                }
            });
        } catch (error) {
            console.error('Error fetching wallet details:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // Add money to wallet
    addMoney: async (req, res) => {
        try {
            const { amount } = req.body;
            const userId = req.user._id;

            if (!amount || amount <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid amount' });
            }

            const wallet = await Wallet.getOrCreateWallet(userId);
            await wallet.addTransaction('CREDIT', amount, 'Added money to wallet');

            res.json({
                success: true,
                message: 'Money added successfully',
                newBalance: wallet.balance
            });
        } catch (error) {
            console.error('Error adding money to wallet:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    processWalletPayment: async (userId, amount, orderId) => {
        try {
            const wallet = await Wallet.getOrCreateWallet(userId);

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            await wallet.addTransaction('DEBIT', amount, 'Order payment', orderId);

            return {
                success: true,
                newBalance: wallet.balance
            };
        } catch (error) {
            console.error('Error processing wallet payment:', error);
            throw error;
        }
    },

    processRefund: async (userId, amount, orderId) => {
        try {
            const wallet = await Wallet.getOrCreateWallet(userId);
            await wallet.addTransaction('CREDIT', amount, 'Order refund', orderId);

            return {
                success: true,
                newBalance: wallet.balance
            };
        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }
};

module.exports = walletController;
