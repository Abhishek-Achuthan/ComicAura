const Order = require("../../models/orderSchema.js");
const Cart = require("../../models/cartSchema.js");
const Product = require("../../models/productSchema.js");
const Address = require("../../models/addressSchema.js");

const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const addresses = await Address.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            req.session.warning = "Your cart is empty";
            return res.redirect('/cart');
        }

        // Calculate cart totals
        let subtotal = 0;
        let itemCount = 0;

        cart.items.forEach(item => {
            const price = item.productId.salePrice || item.productId.regularPrice;
            subtotal += price * item.quantity;
            itemCount += item.quantity;
        });

        // Calculate tax and total
        const tax = subtotal * 0.05; // 5% tax
        const total = subtotal + tax;

        // Format cart data for the view
        const cartData = {
            items: cart.items.map(item => ({
                product: {
                    name: item.productId.name,
                    image: item.productId.images[0],
                    price: item.productId.salePrice || item.productId.regularPrice
                },
                quantity: item.quantity,
                total: (item.productId.salePrice || item.productId.regularPrice) * item.quantity
            })),
            subtotal,
            tax,
            total,
            itemCount
        };

        res.render('checkout', { 
            cart: cartData,
            addresses: addresses ? addresses.address : [],
            user: req.session.user,
            pageTitle: 'Checkout - Comic Aura',
            pageCss: 'checkout',
            pageJs: 'checkout'
        });
    } catch (error) {
        console.error('Error in loadCheckout:', error);
        req.session.error = "Failed to load checkout page";
        res.redirect('/cart');
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId } = req.body;
        
        // Validate address
        const address = await Address.findOne({ 
            userId, 
            'address._id': addressId 
        });
        
        if (!address) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid address selected" 
            });
        }

        // Get cart and validate products
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Cart is empty" 
            });
        }

        // Check stock and calculate total
        let totalAmount = 0;
        const stockUpdates = [];
        
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            
            if (!product) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Product not found: ${item.productId.name}` 
                });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
                });
            }
            
            const price = product.salePrice || product.regularPrice;
            totalAmount += item.quantity * price;
            
            // Add stock update operation
            stockUpdates.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: { $inc: { stock: -item.quantity } }
                }
            });
        }

        // Calculate tax and final amount
        const taxRate = 0.05;
        const taxAmount = totalAmount * taxRate;
        const finalAmount = totalAmount + taxAmount;

        // Create order
        const selectedAddress = address.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(400).json({ 
                success: false, 
                message: "Selected address not found" 
            });
        }

        const order = new Order({
            userId,
            products: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice || item.productId.regularPrice
            })),
            totalAmount: finalAmount,
            taxAmount,
            subTotal: totalAmount,
            shippingAddress: {
                name: selectedAddress.name,
                phoneNumber: selectedAddress.phoneNumber,
                country: selectedAddress.country,
                state: selectedAddress.state,
                city: selectedAddress.city,
                street: selectedAddress.street,
                pinCode: selectedAddress.pinCode,
                addressType: selectedAddress.addressType
            },
            paymentMethod: "COD",
            orderStatus: "Pending",
            orderDate: new Date()
        });

        // Save order first
        const savedOrder = await order.save();

        // Update stock in bulk
        if (stockUpdates.length > 0) {
            await Product.bulkWrite(stockUpdates);
        }

        // Clear cart
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        // Send response with order ID
        res.status(200).json({ 
            success: true, 
            message: "Order placed successfully",
            orderId: savedOrder._id
        });
    } catch (error) {
        console.error('Error in placeOrder:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to place order. Please try again." 
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.userId;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('products.productId');
            
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

        // Prepare stock restoration updates
        const stockUpdates = order.products.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { stock: item.quantity } }
            }
        }));

        // Update stock in bulk
        if (stockUpdates.length > 0) {
            await Product.bulkWrite(stockUpdates);
        }

        // Update order status
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

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('products.productId');

        if (!order) {
            req.session.error = "Order not found";
            return res.redirect('/orders');
        }

        res.render('orderSuccess', {
            order,
            pageTitle: 'Order Success - Comic Aura',
            user: req.session.user
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
        const limit = 10; // Orders per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        // Get orders for current page
        const orders = await Order.find({ userId })
            .populate('products.productId')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('orderHistory', {
            user: req.session.user,
            orders,
            error: null,
            currentPage: page,
            totalPages,
            pageTitle: 'Order History'
        });
    } catch (error) {
        console.error('Error in getOrderHistory:', error);
        res.render('orderHistory', {
            user: req.session.user,
            orders: [],
            error: 'Failed to load orders',
            currentPage: 1,
            totalPages: 1,
            pageTitle: 'Order History'
        });
    }
};

module.exports = {
    loadCheckout,
    placeOrder,
    cancelOrder,
    getOrderSuccess,
    getOrderHistory
};
