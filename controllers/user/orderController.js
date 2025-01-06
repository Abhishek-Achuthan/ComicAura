const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const Wallet = require('../../models/walletModel');
const paymentService = require('../../services/paymentService');
const User = require('../../models/userSchema.js');
const ReturnRequest = require('../../models/returnRequestModel');
const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const { generateOrderId } = require('../../utils/orderUtils');

async function clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
        cart.items = [];
        cart.total = 0;
        cart.couponApplied = null;
        cart.couponDiscount = 0;
        await cart.save();
    }
}

async function processRefundToWallet(userId, amount, orderId, description) {
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
        const newWallet = new Wallet({
            user: userId,
            balance: amount,
            transactions: [{
                type: 'CREDIT',
                amount,
                description,
                orderId
            }]
        });
        await newWallet.save();
    } else {
        wallet.balance += amount;
        wallet.transactions.push({
            type: 'CREDIT',
            amount,
            description,
            orderId
        });
        await wallet.save();
    }
}

const orderController = {
    // Create new order
    createOrder: async (req, res) => {
        try {
            const { addressId, paymentMethod } = req.body;
            const cart = await Cart.findOne({ user: req.user._id })
                .populate('items.product');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cart is empty' 
                });
            }

            // Create order items from cart
            const orderItems = cart.items.map(item => ({
                productId: item.product._id,
                quantity: item.quantity,
                price: item.product.discountedPrice || item.product.price
            }));

            // Calculate totals
            const subTotal = cart.items.reduce((total, item) => {
                return total + (item.quantity * (item.product.discountedPrice || item.product.price));
            }, 0);
            const taxRate = 0.18; // 18% GST
            const taxAmount = subTotal * taxRate;
            const totalAmount = subTotal + taxAmount;

            // Get shipping address details
            const userId = await User.findById(req.session.userId);
            const user = await User.findById(userId);
            const shippingAddress = user.addresses.find(addr => addr._id.toString() === addressId);

            if (!shippingAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shipping address'
                });
            }

            const orderId = generateOrderId();

            const order = await Order.create({
                orderId,
              user,
                items: orderItems,
                shippingAddress: {
                    name: shippingAddress.name,
                    addressType: shippingAddress.addressType,
                    street: shippingAddress.street,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    country: shippingAddress.country,
                    pinCode: shippingAddress.pinCode,
                    phoneNumber: shippingAddress.phoneNumber
                },
                subTotal,
                taxAmount,
                totalAmount,
                paymentMethod,
                orderDate: new Date(),
                couponApplied: cart.couponApplied,
                couponDiscount: cart.couponDiscount
            });

            if (paymentMethod === 'razorpay') {
                const razorpayOrder = await paymentService.createRazorpayOrder(
                    totalAmount,
                    order.orderId.toString()
                );

                return res.json({
                    success: true,
                    orderId: order.orderId,
                    order: razorpayOrder
                });
            } else if (paymentMethod === 'wallet') {
                const wallet = await Wallet.findOne({ user: req.user._id });
                if (!wallet || wallet.balance < totalAmount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient wallet balance'
                    });
                }

                // Deduct from wallet
                wallet.balance -= totalAmount;
                wallet.transactions.push({
                    type: 'DEBIT',
                    amount: totalAmount,
                    description: `Payment for order #${order.orderId}`,
                    orderId: order.orderId
                });
                await wallet.save();

                order.paymentStatus = 'completed';
                await order.save();
            }

            // For COD or wallet payment
            await clearCart(req.user._id);
            
            res.json({ 
                success: true, 
                orderId: order.orderId,
                order: {
                    amount: totalAmount
                }
            });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to create order' 
            });
        }
    },

    // Verify payment
    verifyPayment: async (req, res) => {
        try {
            const { orderId, paymentId, signature } = req.body;

            const isValid = paymentService.verifyRazorpayPayment(
                paymentId,
                orderId,
                signature
            );

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment signature'
                });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            order.paymentStatus = 'completed';
            order.paymentDetails = {
                transactionId: orderId,
                paymentId,
                paymentSignature: signature
            };
            await order.save();

            await clearCart(req.user._id);

            res.json({
                success: true,
                message: 'Payment verified successfully',
                order
            });
        } catch (error) {
            console.error('Payment verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    },

    // Cancel order
    cancelOrder: async (req, res) => {
        try {
            const userId = req.session.userId;
            const { orderId } = req.params;
            const user = await User.findById(userId)
            
            const order = await Order.findOne({ 
                _id: orderId,
                user,
            }).populate('items.productId');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if order can be cancelled based on status
            if (!['Pending', 'Processing', 'Confirmed'].includes(order.orderStatus)) {
                return res.status(400).json({
                    success: false,
                    message: 'Order cannot be cancelled at this stage'
                });
            }

            order.orderStatus = 'Cancelled';

            // Process refund based on payment method and status
            if (['Completed', 'completed', 'Paid', 'paid'].includes(order.paymentStatus)) {
                const refundAmount = order.totalAmount;
                
                // Process refund for online payment, wallet payment, or COD after delivery
                if (order.paymentMethod === 'razorpay' || 
                    order.paymentMethod === 'wallet' || 
                    (order.paymentMethod === 'COD' && order.orderStatus === 'Delivered')) {
                    
                    // Get or create wallet
                    const wallet = await Wallet.findOne({ user: userId });
                    if (!wallet) {
                        const newWallet = new Wallet({
                            user: userId,
                            balance: refundAmount,
                            transactions: [{
                                type: 'CREDIT',
                                amount: refundAmount,
                                description: `Refund for cancelled order ${order.orderId}`,
                                orderId: order._id
                            }]
                        });
                        await newWallet.save();
                    } else {
                        wallet.balance += refundAmount;
                        wallet.transactions.push({
                            type: 'CREDIT',
                            amount: refundAmount,
                            description: `Refund for cancelled order ${order.orderId}`,
                            orderId: order._id
                        });
                        await wallet.save();
                    }
                    order.paymentStatus = 'Refunded';
                }

                // Update refund details in order
                order.refundDetails = {
                    amount: refundAmount,
                    status: 'completed',
                    processedAt: new Date(),
                    method: 'wallet'
                };

                // Return items to stock
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(
                        item.productId,
                        { $inc: { stock: item.quantity } }
                    );
                }
            }

            await order.save();

            // Send appropriate success message based on refund status
            const message = order.paymentStatus === 'Refunded' 
                ? `Order cancelled successfully. ₹${order.refundDetails.amount} has been refunded to your wallet`
                : 'Order cancelled successfully';

            res.json({ 
                success: true, 
                message,
                refunded: order.paymentStatus === 'Refunded',
                refundAmount: order.refundDetails?.amount || 0
            });
        } catch (error) {
            console.error('Cancel order error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to cancel order' 
            });
        }
    },

    returnOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { reason } = req.body;
            const userId = req.session.userId;

            // Validate reason
            if (!reason || reason.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Return reason is required'
                });
            }

            const order = await Order.findOne({ 
                _id: orderId,
                userId: userId
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found or does not belong to the current user'
                });
            }

            if (order.orderStatus !== 'Delivered') {
                return res.status(400).json({
                    success: false,
                    message: 'Only delivered orders can be returned'
                });
            }

            if (order.returnRequested || order.isReturned) {
                return res.status(400).json({
                    success: false,
                    message: 'Return request already exists for this order'
                });
            }

            const deliveryDate = new Date(order.deliveryDate || order.orderDate);
            const daysSinceDelivery = Math.floor((Date.now() - deliveryDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceDelivery > 7) {
                return res.status(400).json({
                    success: false,
                    message: 'Return window has expired (7 days)'
                });
            }

            // Create return request
            const returnRequest = new ReturnRequest({
                order: orderId,
                user: userId,
                reason: reason,
                status: 'pending',
                requestDate: new Date()
            });

            await returnRequest.save();

            // Update order status
            order.returnRequested = true;
            order.returnRequestDate = new Date();
            await order.save();

            // Send success response
            res.json({ 
                success: true, 
                message: 'Return request submitted successfully' 
            });
        } catch (error) {
            console.error('Return order error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to process return request' 
            });
        }
    }
};

module.exports = orderController;