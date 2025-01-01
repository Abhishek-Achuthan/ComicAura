const ReturnRequest = require("../../models/returnRequestModel.js");
const Order = require("../../models/orderSchema.js");

const getAllReturnRequests = async (req, res) => {
    try {
        const returnRequests = await ReturnRequest.find()
            .populate('order')
            .populate('user', 'name email')
            .sort({ requestDate: -1 });

        res.json({
            success: true,
            returnRequests
        });
    } catch (error) {
        console.error('Get return requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch return requests'
        });
    }
};

const approveReturn = async (req, res) => {
    try {
        const returnRequest = await ReturnRequest.findById(req.params.returnRequestId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return request not found'
            });
        }

        if (returnRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Return request has already been processed'
            });
        }

        returnRequest.status = 'approved';
        returnRequest.processedDate = new Date();
        await returnRequest.save();

        const order = await Order.findById(returnRequest.order);
        if (order) {
            order.orderStatus = 'Returned';  
            order.returnStatus = 'approved';
            await order.save();
        }

        res.json({
            success: true,
            message: 'Return request approved successfully'
        });
    } catch (error) {
        console.error('Approve return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve return request'
        });
    }
};

const rejectReturn = async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const returnRequest = await ReturnRequest.findById(req.params.returnRequestId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return request not found'
            });
        }

        if (returnRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Return request has already been processed'
            });
        }

        returnRequest.status = 'rejected';
        returnRequest.rejectionReason = reason;
        returnRequest.processedDate = new Date();
        await returnRequest.save();

        const order = await Order.findById(returnRequest.order);
        if (order) {
            order.returnStatus = 'rejected';
            await order.save();
        }

        res.json({
            success: true,
            message: 'Return request rejected successfully'
        });
    } catch (error) {
        console.error('Reject return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject return request'
        });
    }
};

module.exports = {
    getAllReturnRequests,
    approveReturn,
    rejectReturn
};
