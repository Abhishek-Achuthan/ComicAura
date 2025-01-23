const Coupon = require('../../models/couponModel');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const CategoryOffer = require('../../models/categoryOfferModel')

const calculateBestDiscount = async (cart, coupon) => {
    try {
        let categoryDiscounts = new Map(); 
        let totalCategoryDiscount = 0;
        let subtotalBeforeDiscount = 0;

        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id).populate('category');
            if (!product || !product.category) continue;

            const price = Number(product.salePrice) || Number(product.regularPrice) || 0;
            const itemSubtotal = price * Number(item.quantity);
            subtotalBeforeDiscount += itemSubtotal;

            const categoryOffer = await CategoryOffer.findOne({
                category: product.category._id,
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (categoryOffer) {
                const categoryId = product.category._id.toString();
                const discountPercentage = categoryOffer.discountPercentage;
                
                let categoryDiscount = (itemSubtotal * discountPercentage) / 100;
                const existingDiscount = categoryDiscounts.get(categoryId) || 0;
                categoryDiscounts.set(categoryId, existingDiscount + categoryDiscount);
                totalCategoryDiscount += categoryDiscount;
            }
        }

        let couponDiscount = 0;
        if (coupon) {
            if (coupon.discountType === 'percentage') {
                couponDiscount = (subtotalBeforeDiscount * Number(coupon.discountAmount)) / 100;
                if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
                    couponDiscount = Number(coupon.maxDiscountAmount);
                }
            } else {
                couponDiscount = Math.min(Number(coupon.discountAmount), subtotalBeforeDiscount);
            }
        }

        let bestDiscount = {
            type: totalCategoryDiscount > couponDiscount ? 'category' : 'coupon',
            amount: Math.max(totalCategoryDiscount, couponDiscount)
        };

        bestDiscount.amount = Math.min(bestDiscount.amount, subtotalBeforeDiscount);

        return {
            subtotalBeforeDiscount,
            bestDiscount,
            categoryDiscounts: Array.from(categoryDiscounts.entries())
        };
    } catch (error) {
        console.error('Error calculating best discount:', error);
        throw error;
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.session.userId;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a coupon code'
            });
        }

        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
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

        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Coupon usage limit exceeded'
            });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        const discounts = await calculateBestDiscount(cart, coupon);

        if (discounts.subtotalBeforeDiscount < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
            });
        }

        const hasUsedCoupon = await Order.findOne({
            userId,
            'coupon.code': code.toUpperCase()
        });

        if (hasUsedCoupon) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon'
            });
        }

        const bestDiscount = discounts.bestDiscount;
        const taxRate = 0.05;
        const subtotalAfterDiscount = discounts.subtotalBeforeDiscount - bestDiscount.amount;
        const tax = Number((subtotalAfterDiscount * taxRate).toFixed(2));
        const total = Number((subtotalAfterDiscount + tax).toFixed(2));

        if (bestDiscount.type === 'coupon') {
            cart.coupon = {
                code: coupon.code,
                discountAmount: Number(bestDiscount.amount.toFixed(2)),
                discountType: coupon.discountType
            };
            await cart.save();
        }

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                subtotal: Number(discounts.subtotalBeforeDiscount.toFixed(2)),
                discountAmount: Number(bestDiscount.amount.toFixed(2)),
                tax,
                total,
                coupon: bestDiscount.type === 'coupon' ? {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountAmount: Number(bestDiscount.amount.toFixed(2))
                } : null
            }
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon. Please try again.'
        });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const discounts = await calculateBestDiscount(cart, null);
        const bestDiscount = discounts.bestDiscount;
        const taxRate = 0.05;

        cart.coupon = undefined;
        await cart.save();

        const subtotalAfterDiscount = discounts.subtotalBeforeDiscount - bestDiscount.amount;
        const tax = Number((subtotalAfterDiscount * taxRate).toFixed(2));
        const total = Number((subtotalAfterDiscount + tax).toFixed(2));

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            data: {
                subtotal: Number(discounts.subtotalBeforeDiscount.toFixed(2)),
                discountAmount: Number(bestDiscount.amount.toFixed(2)),
                tax,
                total,
                categoryDiscount: bestDiscount.type === 'category' ? bestDiscount.amount : 0
            }
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon'
        });
    }
};

module.exports = {
    applyCoupon,
    removeCoupon
};
