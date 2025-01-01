const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Helper function to format date range
const getDateRange = (type, customStartDate, customEndDate) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (type) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(now.getDate() - now.getDay());
            end.setDate(start.getDate() + 6);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            return {
                start: new Date(customStartDate),
                end: new Date(customEndDate)
            };
    }

    return { start, end };
};

// Get sales report data
const getSalesReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const dateRange = getDateRange(type, startDate, endDate);

        const orders = await Order.find({
            orderDate: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('items.productId');

        // Calculate statistics
        let totalOrders = orders.length;
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount;
            if (order.discount) totalDiscount += order.discount;
            if (order.couponDiscount) totalCouponDiscount += order.couponDiscount;
        });

        const report = {
            dateRange: {
                start: dateRange.start,
                end: dateRange.end
            },
            totalOrders,
            totalAmount,
            totalDiscount,
            totalCouponDiscount,
            netAmount: totalAmount - totalDiscount - totalCouponDiscount,
            orders
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

// Generate PDF report
const generatePDFReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const dateRange = getDateRange(type, startDate, endDate);

        const orders = await Order.find({
            orderDate: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('items.productId');

        const doc = new PDFDocument();
        const filename = `sales-report-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../../public/reports', filename);

        // Pipe the PDF to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Add content to PDF
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`);
        doc.moveDown();

        // Add summary
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount;
            if (order.discount) totalDiscount += order.discount;
            if (order.couponDiscount) totalCouponDiscount += order.couponDiscount;
        });

        doc.text(`Total Orders: ${orders.length}`);
        doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`);
        doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`);
        doc.text(`Total Coupon Discount: ₹${totalCouponDiscount.toFixed(2)}`);
        doc.text(`Net Amount: ₹${(totalAmount - totalDiscount - totalCouponDiscount).toFixed(2)}`);
        doc.moveDown();

        // Add order details
        doc.fontSize(14).text('Order Details', { underline: true });
        doc.moveDown();

        orders.forEach(order => {
            doc.fontSize(12).text(`Order ID: #${order._id.toString().slice(-6)}`);
            doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`);
            doc.text(`Status: ${order.orderStatus}`);
            doc.text(`Amount: ₹${order.totalAmount.toFixed(2)}`);
            if (order.discount) doc.text(`Discount: ₹${order.discount.toFixed(2)}`);
            if (order.couponDiscount) doc.text(`Coupon Discount: ₹${order.couponDiscount.toFixed(2)}`);
            doc.moveDown();
        });

        // Finalize PDF
        doc.end();

        // Send download link
        res.json({
            success: true,
            downloadUrl: `/reports/${filename}`
        });
    } catch (error) {
        console.error('Generate PDF report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF report'
        });
    }
};

// Generate Excel report
const generateExcelReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const dateRange = getDateRange(type, startDate, endDate);

        const orders = await Order.find({
            orderDate: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('items.productId');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add headers
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Items', key: 'items', width: 30 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
            { header: 'Net Amount', key: 'netAmount', width: 15 }
        ];

        // Add data
        orders.forEach(order => {
            worksheet.addRow({
                orderId: `#${order._id.toString().slice(-6)}`,
                date: new Date(order.orderDate).toLocaleDateString(),
                status: order.orderStatus,
                items: order.items.map(item => `${item.productId.name} (${item.quantity})`).join(', '),
                amount: order.totalAmount,
                discount: order.discount || 0,
                couponDiscount: order.couponDiscount || 0,
                netAmount: order.totalAmount - (order.discount || 0) - (order.couponDiscount || 0)
            });
        });

        // Add summary
        worksheet.addRow({}); // Empty row
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount;
            if (order.discount) totalDiscount += order.discount;
            if (order.couponDiscount) totalCouponDiscount += order.couponDiscount;
        });

        worksheet.addRow({
            orderId: 'Total',
            amount: totalAmount,
            discount: totalDiscount,
            couponDiscount: totalCouponDiscount,
            netAmount: totalAmount - totalDiscount - totalCouponDiscount
        });

        // Save workbook
        const filename = `sales-report-${Date.now()}.xlsx`;
        const filePath = path.join(__dirname, '../../public/reports', filename);
        await workbook.xlsx.writeFile(filePath);

        res.json({
            success: true,
            downloadUrl: `/reports/${filename}`
        });
    } catch (error) {
        console.error('Generate Excel report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Excel report'
        });
    }
};

module.exports = {
    getSalesReport,
    generatePDFReport,
    generateExcelReport
};
