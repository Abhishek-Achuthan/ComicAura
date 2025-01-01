const Order = require("../../models/orderSchema.js");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletModel");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../../models/userSchema.js')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const wallet = await Wallet.getOrCreateWallet(userId);
        const addresses = await Address.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            req.session.warning = "Your cart is empty";
            return res.redirect('/cart');
        }

        // Initialize totals with default values
        let subtotal = 0;
        let itemCount = 0;
        let discountAmount = 0;

        // Calculate subtotal and item count
        cart.items.forEach(item => {
            if (item.productId) {  // Check if product exists
                const price = Number(item.productId.salePrice) || Number(item.productId.regularPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                subtotal += price * quantity;
                itemCount += quantity;
            }
        });

        // Ensure subtotal is a valid number
        subtotal = Number(subtotal.toFixed(2));

        // Calculate tax (5%)
        const taxRate = 0.05;
        let tax = Number((subtotal * taxRate).toFixed(2));

        // Handle coupon discount if present
        let finalSubtotal = subtotal;
        let finalTax = tax;
        let finalTotal = subtotal + tax;
        let appliedCoupon = null;

        if (cart.coupon && cart.coupon.discountAmount) {
            discountAmount = Number(cart.coupon.discountAmount);
            
            // Ensure discount doesn't exceed subtotal
            if (discountAmount > subtotal) {
                discountAmount = subtotal;
            }

            finalSubtotal = subtotal - discountAmount;
            finalTax = Number((finalSubtotal * taxRate).toFixed(2));
            finalTotal = Number((finalSubtotal + finalTax).toFixed(2));
            appliedCoupon = {
                ...cart.coupon,
                discountAmount: discountAmount
            };
        }

        // Ensure all values are valid numbers
        const cartData = {
            items: cart.items.map(item => ({
                product: {
                    name: item.productId.name,
                    image: item.productId.images[0],
                    price: Number(item.productId.salePrice) || Number(item.productId.regularPrice) || 0
                },
                quantity: Number(item.quantity),
                total: Number(((item.productId.salePrice || item.productId.regularPrice) * item.quantity).toFixed(2))
            })),
            subtotal: Number(finalSubtotal.toFixed(2)),
            tax: Number(finalTax.toFixed(2)),
            total: Number(finalTotal.toFixed(2)),
            itemCount: Number(itemCount),
            coupon: appliedCoupon
        };

        // Log values for debugging
        console.log('Cart Data:', {
            subtotal: cartData.subtotal,
            tax: cartData.tax,
            total: cartData.total,
            discountAmount: discountAmount
        });

        res.render('checkout', { 
            cart: cartData,
            addresses: addresses ? addresses.address : [],
            wallet: wallet ? { balance: Number(wallet.balance) || 0 } : { balance: 0 },
            pageTitle: 'Checkout - Comic Aura',
            pageCss: 'checkout',
            pageJs: 'checkout',
            user,
        });
    } catch (error) {
        console.error('Error in loadCheckout:', error);
        req.session.error = "Failed to load checkout page";
        res.redirect('/cart');
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.userId;
        console.log("paymentmethod:", paymentMethod);
        console.log("addressId:", addressId);

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // Check stock availability for all items
        for (const item of cart.items) {
            if (!item.productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Some products in your cart are no longer available'
                });
            }

            const product = await Product.findById(item.productId._id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.productId.name} is no longer available`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${product.stock} units available for ${product.name}`
                });
            }
        }

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(400).json({ success: false, message: 'No addresses found for user' });
        }

        const address = userAddress.address.id(addressId);
        console.log("Found address:", address);
        
        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid address' });
        }

        const subTotal = cart.items.reduce((total, item) => {
            const price = Number(item.productId.salePrice) || Number(item.productId.regularPrice) || 0;
            return total + (price * Number(item.quantity));
        }, 0);

        const taxRate = 0.05; // 5% tax
        const taxAmount = Number((subTotal * taxRate).toFixed(2));
        const total = Number((subTotal + taxAmount).toFixed(2));

        const order = new Order({
            userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: Number(item.quantity),
                price: Number(item.productId.salePrice) || Number(item.productId.regularPrice) || 0
            })),
            shippingAddress: {
                name: address.name,
                addressType: address.addressType,
                street: address.street,
                city: address.city,
                state: address.state,
                country: address.country || 'India',
                pinCode: address.pinCode,
                phoneNumber: address.phoneNumber.toString()
            },
            subTotal: Number(subTotal.toFixed(2)),
            taxAmount: Number(taxAmount.toFixed(2)),
            totalAmount: Number(total.toFixed(2)),
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Processing'
        });

        if (paymentMethod === 'razorpay') {
            try {
                const amountInPaise = Math.round(total * 100);
                console.log('Amount in paise:', amountInPaise);

                const razorpayOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `order_${Date.now()}`
                });

                order.razorpayOrderId = razorpayOrder.id;
                // Save order but don't clear cart yet
                await order.save();

                return res.json({
                    success: true,
                    orderId: order._id,
                    razorpayOrder: {
                        id: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                        key: process.env.RAZORPAY_KEY_ID
                    }
                });
            } catch (error) {
                console.error('Razorpay order creation error:', error);
                if (error.error) {
                    console.error('Razorpay error details:', error.error);
                }
                return res.status(400).json({
                    success: false,
                    message: 'Failed to create Razorpay order: ' + (error.error?.description || error.message)
                });
            }
        } else if (paymentMethod === 'wallet') {
            try {
                const wallet = await Wallet.getOrCreateWallet(userId);
                if (!wallet || wallet.balance < total) {
                    return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
                }

                // Deduct from wallet
                await wallet.addTransaction('DEBIT', total, `Payment for order ${order._id}`, order._id);
                wallet.balance -= total;
                await wallet.save();

                order.paymentStatus = 'Paid';
                order.status = 'Processing';
                await order.save();
                
                // Clear cart after successful payment
                cart.items = [];
                await cart.save();

                return res.json({
                    success: true,
                    orderId: order._id
                });
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message || 'Wallet payment failed'
                });
            }
        } else if (paymentMethod === 'COD') {
            await order.save();
            
            // Clear cart after successful order creation
            cart.items = [];
            await cart.save();

            return res.json({
                success: true,
                orderId: order._id
            });
        }
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to place order',
            error: error.message 
        });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature 
        } = req.body;

        // Find the order and make sure it hasn't been paid yet
        const order = await Order.findOne({ 
            razorpayOrderId: razorpay_order_id,
            paymentStatus: { $ne: 'Paid' } // Only process if not already paid
        });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found or already processed' 
            });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            order.paymentStatus = 'Paid';
            order.razorpayPaymentId = razorpay_payment_id;
            await order.save();

            // Only clear cart after successful payment verification
            const cart = await Cart.findOne({ userId: order.userId });
            if (cart) {
                cart.items = [];
                await cart.save();
            }

            return res.json({
                success: true,
                message: 'Payment verified successfully'
            });
        } else {
            // If verification fails, mark order as failed
            order.paymentStatus = 'Failed';
            await order.save();
            
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Razorpay verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.userId;


        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId');
            
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }
    
        if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled") {
            return res.status(400).json({ 
                success: false, 
                message: "Cannot cancel this order" 
            });
        }

        const stockUpdates = order.items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { stock: item.quantity } }
            }
        }));

        if (stockUpdates.length > 0) {
            await Product.bulkWrite(stockUpdates);
        }

        order.orderStatus = "Cancelled";
        await order.save();

        res.status(200).json({ 
            success: true, 
            message: "Order cancelled successfully" 
        });
    } catch (error) {
        console.error('Error in cancelOrder:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to cancel order" 
        });
    }
};

const getOrderSuccess = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;

        const user = await User.findById(userId);

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId');

        if (!order) {
            req.session.error = "Order not found";
            return res.redirect('/orders');
        }

        console.log('Order found:', order); // Debug log

        res.render('orderSuccess', {
            order,
            pageTitle: 'Order Success - Comic Aura',
            user
        });
    } catch (error) {
        console.error('Error in getOrderSuccess:', error);
        req.session.error = "Failed to load order details";
        res.redirect('/orders');
    }
};

const getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);

        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

       
        const orders = await Order.find({ userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price salePrice'
            })
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);

        
        // Debug log for first order's items
        if (orders.length > 0) {
            console.log('First Order Items:', orders[0].items);
        }

        res.render('orderHistory', {
            user,
            orders,
            currentPage: page,
            totalPages,
            error: req.session.error
        });

        // Clear any session error after displaying
        delete req.session.error;
    } catch (error) {
        console.error('Error in getOrderHistory:', error);
        res.render('orderHistory', {
            user: req.session.user,
            orders: [],
            currentPage: 1,
            totalPages: 1,
            error: 'Failed to load order history'
        });
    }
};

module.exports = {
    loadCheckout,
    placeOrder,
    verifyRazorpayPayment,
    cancelOrder,
    getOrderSuccess,
    getOrderHistory
};
