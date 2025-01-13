const Coupon = require('../../models/couponModel');

const loadCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('coupons', {
            title: 'Coupon Management',
            currentPage: 'coupons',
            coupons
        });
    } catch (error) {
        console.error("Error loading the coupon page:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountAmount,
            minimumPurchase,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;

        const codeRegex = /^[A-Z0-9]{6,12}$/;
        if (!codeRegex.test(code)) {
            return res.status(400).json({
                success: false,
                message: "Coupon code must be 6-12 characters long and contain only uppercase letters and numbers"
            });
        }

        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date"
            });
        }

        if (discountType === 'percentage' && (discountAmount <= 0 || discountAmount > 100)) {
            return res.status(400).json({
                success: false,
                message: "Percentage discount must be between 0 and 100"
            });
        }

        if (maxDiscountAmount > minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: "Maximum discount amount cannot be greater than minimum purchase amount"
            });
        }

        const coupon = new Coupon({
            code,
            discountType,
            discountAmount,
            minimumPurchase,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description
        });

        await coupon.save();
        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            coupon
        });
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create coupon"
        });
    }
};

// Update existing coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            discountType,
            discountAmount,
            minimumPurchase,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date"
            });
        }

        // Validate amounts
        if (discountType === 'percentage' && (discountAmount < 0 || discountAmount > 100)) {
            return res.status(400).json({
                success: false,
                message: "Percentage discount must be between 0 and 100"
            });
        }

        if (maxDiscountAmount >= minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: "Maximum discount amount cannot be greater than or equal to minimum purchase amount"
            });
        }

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            {
                discountType,
                discountAmount,
                minimumPurchase,
                maxDiscountAmount,
                startDate,
                endDate,
                usageLimit,
                description
            },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.json({
            success: true,
            message: "Coupon updated successfully",
            coupon
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update coupon"
        });
    }
};

// Toggle coupon status
const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
            success: true,
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: coupon.isActive
        });
    } catch (error) {
        console.error("Error toggling coupon status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle coupon status"
        });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.json({
            success: true,
            message: "Coupon deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete coupon"
        });
    }
};

const generateCouponCode = async (req, res) => {
    try {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let isUnique = false;

        while (!isUnique) {
            code = '';
            for (let i = 0; i < 8; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            const existingCoupon = await Coupon.findOne({ code });
            if (!existingCoupon) {
                isUnique = true;
            }
        }

        res.json({
            success: true,
            code
        });
    } catch (error) {
        console.error("Error generating coupon code:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate coupon code"
        });
    }
};

module.exports = {
    loadCoupon,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon,
    generateCouponCode
};