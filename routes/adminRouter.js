const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require("../controllers/admin/adminController");
const adminAuth = require("../middleware/adminAuth");
const orderController = require('../controllers/admin/orderController');
const returnRequestController = require('../controllers/admin/returnRequestController');
const couponController = require('../controllers/admin/couponController');
const offerController = require('../controllers/admin/offerController');
const salesReportController = require('../controllers/admin/salesReportController');

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

router.get("/", adminAuth.isadminLogin, adminController.loadLogin);
router.post("/login", adminController.login);

router.get("/dashboard", adminAuth.isAdmin, adminController.loadDashboard);

router.get("/user", adminAuth.isAdmin, adminController.loadUser);
router.post("/user/:userId", adminAuth.isAdmin, adminController.toggleBlockUser);

router.get("/category", adminAuth.isAdmin, adminController.loadCategory);
router.post("/addCategory", adminAuth.isAdmin, adminController.addCategory);
router.post("/category/:id", adminAuth.isAdmin, adminController.toggleCategory);
router.delete("/category/:id", adminAuth.isAdmin, adminController.deleteCategory);
router.get("/editCategory/:id", adminAuth.isAdmin, adminController.loadEditCategory);
router.put("/category/:id", adminAuth.isAdmin, adminController.updateCategory);

router.get("/product", adminAuth.isAdmin, adminController.loadProduct);
router.get("/addProduct", adminAuth.isAdmin, adminController.loadAddProduct);
router.post("/addProduct", adminAuth.isAdmin, upload.array('images', 10), adminController.addProduct);
router.post("/product/:id", adminAuth.isAdmin, adminController.toggleBlockProduct);
router.get("/editProduct/:id", adminAuth.isAdmin, adminController.loadEditProduct);
router.post("/editProduct/:id", adminAuth.isAdmin, upload.array('images', 10), adminController.updateProduct);
router.post("/product/:productId/deleteImage", adminAuth.isAdmin, adminController.deleteProductImage);
router.put('/product/:id/delete', adminAuth.isAdmin, adminController.deleteProduct);

router.get('/orders', adminAuth.isAdmin, orderController.listOrders);
router.get('/orders/stats', adminAuth.isAdmin, orderController.getOrderStats);
router.get('/orders/report', adminAuth.isAdmin, orderController.getSalesReport);
router.get('/orders/:orderId', adminAuth.isAdmin, orderController.getOrderDetails);
router.post('/orders/:orderId/status', adminAuth.isAdmin, orderController.updateOrderStatus);
router.post('/orders/:orderId/cancel', adminAuth.isAdmin, orderController.cancelOrderAdmin);
router.put('/product/:productId/stock', adminAuth.isAdmin, orderController.updateStock);

// Return request routes
router.get('/returns', adminAuth.isAdmin, returnRequestController.getAllReturnRequests);
router.post('/returns/:returnRequestId/approve', adminAuth.isAdmin, returnRequestController.approveReturn);
router.post('/returns/:returnRequestId/reject', adminAuth.isAdmin, returnRequestController.rejectReturn);

// Coupon Routes
router.get("/coupons", adminAuth.isAdmin, couponController.loadCoupon);
router.post("/coupons", adminAuth.isAdmin, couponController.createCoupon);
router.put("/coupons/:id", adminAuth.isAdmin, couponController.updateCoupon);
router.delete("/coupons/:id", adminAuth.isAdmin, couponController.deleteCoupon);
router.post("/coupons/:id/toggle", adminAuth.isAdmin, couponController.toggleCouponStatus);
router.get("/coupons/generate-code", adminAuth.isAdmin, couponController.generateCouponCode);

// Product Offer Routes
router.post('/offers/product', adminAuth.isAdmin, offerController.createProductOffer);
router.get('/offers/product', adminAuth.isAdmin, offerController.getProductOffers);
router.put('/offers/product/:offerId', adminAuth.isAdmin, offerController.updateProductOffer);
router.delete('/offers/product/:offerId', adminAuth.isAdmin, offerController.deleteProductOffer);

// Category Offer Routes
router.post('/offers/category', adminAuth.isAdmin, offerController.createCategoryOffer);
router.get('/offers/category', adminAuth.isAdmin, offerController.getCategoryOffers);
router.put('/offers/category/:offerId', adminAuth.isAdmin, offerController.updateCategoryOffer);
router.delete('/offers/category/:offerId', adminAuth.isAdmin, offerController.deleteCategoryOffer);

// Sales Report Routes
router.get('/sales', adminAuth.isAdmin, orderController.loadSalesReport);
router.get('/sales-report', adminAuth.isAdmin, orderController.getSalesReport);
router.get('/sales-report/:type(pdf|excel)', adminAuth.isAdmin, orderController.downloadSalesReport);

router.get("/logout", adminAuth.isAdmin, adminController.logout);

module.exports = router;
