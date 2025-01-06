const Order = require("../../models/orderSchema.js");
const Product = require("../../models/productSchema.js");
const ReturnRequest = require("../../models/returnRequestModel.js");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Helper function to format date range
const getDateRange = (type, customStartDate, customEndDate) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (type) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            end.setDate(start.getDate() + 6); // End of week (Saturday)
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1); // Start of month
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0); // End of month
            end.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            start.setMonth(0, 1); // Start of year
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31); // End of year
            end.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            if (!customStartDate || !customEndDate) {
                throw new Error('Start and end dates are required for custom range');
            }
            start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            throw new Error('Invalid date range type');
    }

    return { start, end };
};

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
            .populate('items.productId')
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

        // Fetch return requests
        const returnRequests = await ReturnRequest.find({ status: 'pending' })
            .populate('order', '_id')
            .populate('user', 'name')
            .lean();

        res.render('orders', { 
            orders,
            returnRequests,
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
        const { status, rejectionReason } = req.body;

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Return Rejected'];
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

        if ((order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') && status !== 'Returned' && status !== 'Return Rejected') {
            return res.status(400).json({
                success: false,
                message: `Cannot update status of ${order.orderStatus.toLowerCase()} orders`
            });
        }

        if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            const bulkOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            await Product.bulkWrite(bulkOps);
        }

        // Handle return rejection
        if (status === 'Return Rejected') {
            if (!rejectionReason) {
                return res.status(400).json({
                    success: false,
                    message: "Rejection reason is required"
                });
            }
            order.returnStatus = 'rejected';
            order.rejectionReason = rejectionReason;
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

        const bulkOps = order.items.map(item => ({
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

const getSalesReport = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;
        
        // Get date range using the helper function
        const dateRange = getDateRange(reportType || 'daily', startDate, endDate);

        // Find orders within the date range
        const orders = await Order.find({
            orderDate: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            orderStatus: { $nin: ['Cancelled'] }
        })
        .populate('userId', 'email')
        .populate('items.productId', 'name')
        .sort({ orderDate: -1 });

        // Calculate statistics
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount || 0;
            totalDiscount += order.discount || 0;
            totalCouponDiscount += order.couponDiscount || 0;
        });

        const report = {
            dateRange: {
                start: dateRange.start,
                end: dateRange.end
            },
            totalOrders: orders.length,
            totalAmount,
            totalDiscount,
            totalCouponDiscount,
            netAmount: totalAmount - totalDiscount - totalCouponDiscount,
            orders: orders.map(order => ({
                _id: order._id,
                userId: {
                    _id: order.userId._id,
                    email: order.userId.email
                },
                orderDate: order.orderDate,
                orderStatus: order.orderStatus,
                totalAmount: order.totalAmount,
                discount: order.discount || 0,
                couponDiscount: order.couponDiscount || 0,
                netAmount: order.totalAmount - (order.discount || 0) - (order.couponDiscount || 0)
            }))
        };

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate sales report'
        });
    }
};

const downloadSalesReport = async (req, res) => {
    try {
        const { type } = req.params;
        const { reportType, startDate, endDate } = req.query;
        
        // Get the sales data
        const dateRange = getDateRange(reportType || 'daily', startDate, endDate);
        const orders = await Order.find({
            orderDate: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('userId', 'email').populate('items.productId', 'name');

        // Calculate totals
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;
        orders.forEach(order => {
            totalAmount += order.totalAmount || 0;
            totalDiscount += order.discount || 0;
            totalCouponDiscount += order.couponDiscount || 0;
        });

        const filename = `sales-report-${Date.now()}`;

        if (type === 'pdf') {
            // Generate PDF
            const doc = new PDFDocument();
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);

            // Pipe the PDF directly to the response
            doc.pipe(res);

            // Add content to PDF
            doc.fontSize(20).text('ComicAura Sales Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date Range: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`);
            doc.moveDown();

            // Add summary
            doc.fontSize(14).text('Summary');
            doc.fontSize(12).text(`Total Orders: ${orders.length}`);
            doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`);
            doc.text(`Total Discount: ₹${(totalDiscount + totalCouponDiscount).toFixed(2)}`);
            doc.text(`Net Amount: ₹${(totalAmount - totalDiscount - totalCouponDiscount).toFixed(2)}`);
            doc.moveDown();

            // Add orders table
            doc.fontSize(14).text('Orders');
            doc.moveDown();
            
            orders.forEach((order, index) => {
                doc.fontSize(12).text(`${index + 1}. Order ID: ${order._id}`);
                doc.fontSize(10)
                    .text(`Customer: ${order.userId.email}`)
                    .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`)
                    .text(`Amount: ₹${order.totalAmount.toFixed(2)}`)
                    .text(`Status: ${order.orderStatus}`);
                doc.moveDown();
            });

            // End the document
            doc.end();

        } else if (type === 'excel') {
            // Generate Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add headers with styling
            worksheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 30 },
                { header: 'Customer', key: 'customer', width: 30 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Discount', key: 'discount', width: 15 },
                { header: 'Net Amount', key: 'netAmount', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];

            // Style the header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 12 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data
            orders.forEach(order => {
                worksheet.addRow({
                    orderId: order._id.toString(),
                    customer: order.userId.email,
                    date: new Date(order.orderDate).toLocaleDateString(),
                    amount: order.totalAmount,
                    discount: (order.discount || 0) + (order.couponDiscount || 0),
                    netAmount: order.totalAmount - (order.discount || 0) - (order.couponDiscount || 0),
                    status: order.orderStatus
                });
            });

            // Add summary at the bottom with styling
            worksheet.addRow([]);
            worksheet.addRow([]);
            
            const summaryTitleRow = worksheet.addRow(['Summary']);
            summaryTitleRow.font = { bold: true, size: 14 };
            
            const summaryRows = [
                ['Total Orders', orders.length],
                ['Total Amount', `₹${totalAmount.toFixed(2)}`],
                ['Total Discount', `₹${(totalDiscount + totalCouponDiscount).toFixed(2)}`],
                ['Net Amount', `₹${(totalAmount - totalDiscount - totalCouponDiscount).toFixed(2)}`]
            ];

            summaryRows.forEach(row => {
                const newRow = worksheet.addRow(row);
                newRow.font = { bold: true };
            });

            // Set content type and headers for excel file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

            // Write to response
            await workbook.xlsx.write(res);
            res.end();
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid download type'
            });
        }
    } catch (error) {
        console.error('Download sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download sales report'
        });
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
        const orderId = req.params.orderId;
        
        // Get order with populated fields
        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('items.productId', 'name price');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get return request if exists
        const returnRequest = await ReturnRequest.findOne({ order: orderId });
        
        // Add return request info to order object
        const orderData = order.toObject();
        if (returnRequest) {
            orderData.returnRequested = true;
            orderData.returnRequestDate = returnRequest.requestDate;
            orderData.returnReason = returnRequest.reason;
            orderData.returnStatus = returnRequest.status;
            orderData.returnRequestId = returnRequest._id;
            if (returnRequest.rejectionReason) {
                orderData.rejectionReason = returnRequest.rejectionReason;
            }
        }

        res.json({
            success: true,
            order: orderData
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
};

// Load the sales report page
const loadSalesReport = async (req, res) => {
    try {
        res.render('sales-report', {
            title: 'Sales Report',
            admin: req.session.admin,
            currentPage: 'sales'
        });
    } catch (error) {
        console.error('Error loading sales report page:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    listOrders,
    getOrderDetails,
    updateOrderStatus,
    cancelOrderAdmin,
    updateStock,
    getSalesReport,
    downloadSalesReport,
    getOrderStats,
    loadSalesReport
};
