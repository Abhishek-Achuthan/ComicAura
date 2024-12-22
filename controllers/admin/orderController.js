const Order = require("../../models/orderSchema.js");
const Product = require("../../models/productSchema.js");

const listOrders = async (req, res) => {
    try {
        const { 
            status, 
            sort = 'latest',
            search,
            startDate,
            endDate,
            limit = 10
        } = req.query;
        
        let query = {};

        if (status && status !== 'all') {
            query.orderStatus = status;
        }

        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) query.orderDate.$gte = new Date(startDate);
            if (endDate) query.orderDate.$lte = new Date(endDate);
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { 'userId.name': searchRegex },
                { 'userId.email': searchRegex },
                { orderNumber: searchRegex }
            ];
        }

        let sortOptions = {};
        switch (sort) {
            case 'oldest':
                sortOptions.orderDate = 1;
                break;
            case 'amount-high':
                sortOptions.totalAmount = -1;
                break;
            case 'amount-low':
                sortOptions.totalAmount = 1;
                break;
            default: 
                sortOptions.orderDate = -1;
        }

        const page = req.query.page || 1;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .populate('products.productId')
            .populate('shippingAddress')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        res.render('orders', { 
            orders,
            currentPage: 'orders',
            currentStatus: status || 'all',
            currentSort: sort,
            totalPages,
            totalOrders,
            stats,
            search,
            startDate,
            endDate
        });
    } catch (error) {
        console.error('Error in listOrders:', error);
        res.status(500).render('error', { 
            message: 'Failed to load orders' 
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: "Invalid status" 
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: `Cannot update status of ${order.orderStatus.toLowerCase()} orders`
            });
        }

        if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            const bulkOps = order.products.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            await Product.bulkWrite(bulkOps);
        }

        order.orderStatus = status;
        await order.save();

        res.status(200).json({ 
            success: true, 
            message: "Order status updated successfully" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const cancelOrderAdmin = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel ${order.orderStatus.toLowerCase()} orders`
            });
        }

        const bulkOps = order.products.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { stock: item.quantity } }
            }
        }));
        await Product.bulkWrite(bulkOps);

        order.orderStatus = 'Cancelled';
        order.cancellationReason = reason;
        await order.save();

        res.status(200).json({ 
            success: true, 
            message: "Order cancelled successfully" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const updateStock = async (req, res) => {
    try {
        const { productId } = req.params;
        const { stock } = req.body;

        if (typeof stock !== 'number' || stock < 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid stock value" 
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: "Product not found" 
            });
        }

        product.stock = stock;
        await product.save();

        res.status(200).json({ 
            success: true, 
            message: "Stock updated successfully" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getOrderStats = async (req, res) => {
    try {
        const [totalStats, statusStats, recentOrders] = await Promise.all([
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                        avgOrderValue: { $avg: '$totalAmount' }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $group: {
                        _id: '$orderStatus',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Order.find()
                .populate('userId', 'name email')
                .sort({ orderDate: -1 })
                .limit(5)
                .lean()
        ]);

        const last7Days = await Order.aggregate([
            {
                $match: {
                    orderDate: {
                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$orderDate" }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const stats = {
            total: totalStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
            byStatus: statusStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
            recentOrders,
            dailyStats: last7Days
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting order stats:', error);
        res.status(500).json({ error: 'Failed to get order statistics' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('products.productId', 'name')
            .populate('shippingAddress')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

module.exports = {
    listOrders,
    updateOrderStatus,
    cancelOrderAdmin,
    updateStock,
    getOrderStats,
    getOrderDetails
};
