const Order = require("../../models/orderSchema.js");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletModel");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../../models/userSchema.js');
const Coupon = require("../../models/couponModel");
const { generateOrderId } = require('../../utils/orderUtils');
const generateInvoice = require('../../utils/invoiceGenerator');

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

        const currentDate = new Date();
        const availableCoupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).select('code discountType discountAmount minimumPurchase maxDiscountAmount description');

        if (!cart || cart.items.length === 0) {
            req.session.warning = "Your cart is empty";
            return res.redirect('/cart');
        }

        if (cart.coupon) {
            cart.coupon = undefined;
            await cart.save();
        }

        let subtotal = 0;
        let itemCount = 0;

        cart.items.forEach(item => {
            if (item.productId) {  
                const price = Number(item.productId.salePrice) || Number(item.productId.regularPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                subtotal += price * quantity;
                itemCount += quantity;
            }
        });

        subtotal = Number(subtotal.toFixed(2));

        const taxRate = 0.05;
        const tax = Number((subtotal * taxRate).toFixed(2));
        const total = Number((subtotal + tax).toFixed(2));

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
            subtotal: subtotal,
            tax: tax,
            total: total,
            itemCount: Number(itemCount)
        };

        res.render('checkout', { 
            cart: cartData,
            addresses: addresses ? addresses.address : [],
            wallet: wallet ? { balance: Number(wallet.balance) || 0 } : { balance: 0 },
            availableCoupons,
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

        let discountAmount = 0;
        if (cart.coupon && cart.coupon.discountAmount) {
            discountAmount = Number(cart.coupon.discountAmount);
            if (discountAmount > subTotal) {
                discountAmount = subTotal;
            }
        }

        const subtotalAfterDiscount = subTotal - discountAmount;
        const taxRate = 0.05;
        const taxAmount = Number((subtotalAfterDiscount * taxRate).toFixed(2));
        const total = Number((subtotalAfterDiscount + taxAmount).toFixed(2));

        if (paymentMethod === 'COD' && total > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Cash on Delivery is not available for orders above ₹1,000. Please choose a different payment method.'
            });
        }

        const orderId = generateOrderId();

        const order = new Order({
            orderId,
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
            discountAmount: Number(discountAmount.toFixed(2)),
            taxAmount: Number(taxAmount.toFixed(2)),
            totalAmount: Number(total.toFixed(2)),
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Processing'
        });

        if (cart.coupon) {
            order.coupon = {
                code: cart.coupon.code,
                discountAmount: discountAmount,
                discountType: cart.coupon.discountType
            };
        }

        if (paymentMethod === 'razorpay') {
            try {
                const amountInPaise = Math.round(total * 100);

                const razorpayOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `order_${Date.now()}`
                });

                order.razorpayOrderId = razorpayOrder.id;
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

                await wallet.addTransaction('DEBIT', total, `Payment for order ${order._id}`, order._id);
                wallet.balance -= total;
                await wallet.save();

                order.paymentStatus = 'Paid';
                order.status = 'Processing';
                await order.save();
                
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
            razorpay_signature,
            orderId 
        } = req.body;

        let order;
        if (orderId) {
            order = await Order.findOne({ 
                _id: orderId,
                razorpayOrderId: razorpay_order_id,
                paymentStatus: { $ne: 'Paid' }
            });
        } else {
            order = await Order.findOne({ 
                razorpayOrderId: razorpay_order_id,
                paymentStatus: { $ne: 'Paid' }
            });
        }

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

        if ((order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet') && order.paymentStatus === 'Paid') {
            try {
                const wallet = await Wallet.findOne({ user: order.userId });
                if (!wallet) {
                    const newWallet = new Wallet({
                        user: order.userId,
                        balance: order.totalAmount,
                        transactions: [{
                            type: 'CREDIT',
                            amount: order.totalAmount,
                            description: `Refund for cancelled order ${order.orderId}`,
                            orderId: order._id
                        }]
                    });
                    await newWallet.save();
                    console.log(`Created new wallet and refunded ₹${order.totalAmount} for order ${order.orderId}`);
                } else {
                    wallet.balance += order.totalAmount;
                    wallet.transactions.push({
                        type: 'CREDIT',
                        amount: order.totalAmount,
                        description: `Refund for cancelled order ${order.orderId}`,
                        orderId: order._id
                    });
                    await wallet.save();
                    console.log(`Refunded ₹${order.totalAmount} to existing wallet for order ${order.orderId}`);
                }
                order.paymentStatus = 'Refunded';
                await order.save();
            } catch (error) {
                console.error('Error processing refund:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to process refund'
                });
            }
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

        console.log('Order found:', order);

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
            .select('orderId items orderDate orderStatus returnStatus returnReason rejectionReason isReturned returnRequested deliveryDate paymentMethod totalAmount subTotal taxAmount shippingAddress paymentStatus')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);

        
        if (orders.length > 0) {
            console.log('First Order Shipping Address:', orders[0].shippingAddress);
            console.log('First Order Payment Details:', {
                method: orders[0].paymentMethod,
                status: orders[0].paymentStatus
            });
        }

        res.render('orderHistory', {
            user,
            orders,
            currentPage: page,
            totalPages,
            error: req.session.error
        });

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

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.userId;

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a coupon code'
            });
        }

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(400).json({
                success: false,
                message: 'Cart not found'
            });
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += (item.productId.salePrice || item.productId.price) * item.quantity;
        });

        if (subtotal < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPurchase} required for this coupon`
            });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountAmount) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountAmount;
        }

        const taxRate = 0.05;
        const taxAmount = (subtotal - discount) * taxRate;
        const total = subtotal - discount + taxAmount;

        req.session.appliedCoupon = {
            code: coupon.code,
            discount: discount
        };

        res.json({
            success: true,
            subtotal: subtotal,
            discount: discount,
            tax: taxAmount,
            total: total,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};

const paymentFailed = async (req, res) => {

    try {
        console.log('Order found:', req.params.orderId);

        const orderId = req.params.orderId;
        const userId = req.session.userId;

        if (!userId) {
            return res.redirect('/login');
        }
        const order = await Order.findOne({ _id: orderId, userId: userId })
        const user = await User.findOne({userId});
   

        order.paymentStatus = 'Failed';
        console.log(order)

        await order.save();
        if (!order) {
            
            return res.render('payment-failed', {
                orderId: orderId,
                error: 'Order not found or unauthorized access',
                user,
            });
        }

        res.render('payment-failed', {
            orderId: orderId,
            user
        });
    } catch (error) {
        console.error('Error in payment failed page:', error);
        // Render the payment-failed page with a generic error message
        res.render('payment-failed', {
            orderId: req.params.orderId,
            error: 'An error occurred while processing your request',
            user:req.session.user,
        });
    }
};

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.userId;

        // Find the order
        const order = await Order.findOne({ _id: orderId, userId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.paymentStatus === 'Paid') {
            return res.status(400).json({
                success: false,
                message: 'Order is already paid'
            });
        }

        // Create new Razorpay order with same orderId
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalAmount * 100),
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        // Update order with new Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            order: razorpayOrder
        });
    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry payment'
        });
    }
};

const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, error } = req.body;
        const userId = req.session.userId;

        const order = await Order.findOne({ orderId, userId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update payment status
        order.paymentStatus = status.toUpperCase();
        
        // If there's an error, store it for reference
        if (error) {
            order.paymentError = {
                code: error.code,
                description: error.description,
                source: error.source,
                step: error.step,
                reason: error.reason
            };
        }
        
        await order.save();

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;

        const order = await Order.findById(orderId).populate('items.productId');
        const user = await User.findById(userId);

        if (!order || order.userId.toString() !== userId) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const pdfBuffer = await generateInvoice(order, user);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: 'Failed to generate invoice' });
    }
};

module.exports = {
    loadCheckout,
    placeOrder,
    verifyRazorpayPayment,
    cancelOrder,
    getOrderSuccess,
    getOrderHistory,
    applyCoupon,
    paymentFailed,
    retryPayment,
    updatePaymentStatus,
    downloadInvoice
};
