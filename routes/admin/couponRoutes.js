const express = require('express');
const router = express.Router();
const { isAdmin } = require('../../middleware/authMiddleware');
const {
    getAllCoupons,
    getAddCouponForm,
    addCoupon,
    getEditCouponForm,
    updateCoupon,
    deleteCoupon
} = require('../../controllers/admin/couponController');

// Apply admin middleware to all routes
router.use(isAdmin);

// Coupon routes
router.get('/', getAllCoupons);
router.get('/add', getAddCouponForm);
router.post('/add', addCoupon);
router.get('/edit/:id', getEditCouponForm);
router.post('/edit/:id', updateCoupon);
router.post('/delete/:id', deleteCoupon);

module.exports = router;
