const Coupon = require('../../models/couponModel');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const CategoryOffer = require('../../models/categoryOfferModel');

// Calculate the best discount between category offer and coupon
const calculateBestDiscount = async (cart, coupon) => {
    try {
        let categoryDiscounts = new Map(); // To store category-wise discounts
        let totalCategoryDiscount = 0;
        let subtotalBeforeDiscount = 0;

        // Calculate subtotal and category discounts
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id).populate('category');
            if (!product || !product.category) continue;

            const price = Number(product.salePrice) || Number(product.regularPrice) || 0;
            const itemSubtotal = price * Number(item.quantity);
            subtotalBeforeDiscount += itemSubtotal;

            // Check for category offer
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

        // Calculate coupon discount
        let couponDiscount = 0;
        if (coupon) {
            if (coupon.discountType === 'percentage') {
                couponDiscount = (subtotalBeforeDiscount * Number(coupon.discountAmount)) / 100;
            } else {
                couponDiscount = Number(coupon.discountAmount);
            }

            // Apply maximum discount cap
            if (coupon.maxDiscountAmount) {
                couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscountAmount));
            }
        }

        // Compare and return the better discount
        const discounts = {
            categoryDiscount: {
                amount: totalCategoryDiscount,
                type: 'category',
                breakdown: Object.fromEntries(categoryDiscounts)
            },
            couponDiscount: {
                amount: couponDiscount,
                type: 'coupon',
                code: coupon ? coupon.code : null
            },
            subtotalBeforeDiscount
        };

        // Determine which discount is better
        if (totalCategoryDiscount >= couponDiscount) {
            discounts.bestDiscount = {
                type: 'category',
                amount: totalCategoryDiscount
            };
        } else {
            discounts.bestDiscount = {
                type: 'coupon',
                amount: couponDiscount
            };
        }

        return discounts;
    } catch (error) {
        console.error('Error calculating best discount:', error);
        throw error;
    }
};

// Apply coupon to cart
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

        // Find the coupon
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

        // Check usage limit
        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Coupon usage limit exceeded'
            });
        }

        // Get cart and calculate discounts
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Calculate all possible discounts
        const discounts = await calculateBestDiscount(cart, coupon);

        // Check minimum purchase requirement
        if (discounts.subtotalBeforeDiscount < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
            });
        }

        // Check if user has already used this coupon
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

        // Apply the best discount
        const bestDiscount = discounts.bestDiscount;
        const taxRate = 0.05;

        if (bestDiscount.type === 'coupon') {
            // Store coupon in cart if it gives better discount
            cart.coupon = {
                code: coupon.code,
                discountAmount: Number(bestDiscount.amount.toFixed(2)),
                discountType: coupon.discountType
            };
            await cart.save();

            const subtotalAfterDiscount = discounts.subtotalBeforeDiscount - bestDiscount.amount;
            const tax = Number((subtotalAfterDiscount * taxRate).toFixed(2));
            const total = Number((subtotalAfterDiscount + tax).toFixed(2));

            res.json({
                success: true,
                message: 'Coupon applied successfully',
                data: {
                    subtotal: Number(discounts.subtotalBeforeDiscount.toFixed(2)),
                    discountAmount: Number(bestDiscount.amount.toFixed(2)),
                    tax,
                    total,
                    coupon: {
                        code: coupon.code,
                        discountType: coupon.discountType,
                        discountAmount: Number(bestDiscount.amount.toFixed(2))
                    }
                }
            });
        } else {
            // If category discount is better, inform the user
            return res.status(400).json({
                success: false,
                message: 'Category discount offers better savings (₹' + bestDiscount.amount.toFixed(2) + '). Coupon not applied.'
            });
        }

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};

// Remove coupon from cart
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

        // Calculate category discounts after removing coupon
        const discounts = await calculateBestDiscount(cart, null);
        const bestDiscount = discounts.bestDiscount;
        const taxRate = 0.05;

        // Remove coupon from cart
        cart.coupon = undefined;
        await cart.save();

        // Calculate new totals with category discounts
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
