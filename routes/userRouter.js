const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const userAuth = require('../middleware/userAuth');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController');
const orderController = require('../controllers/user/orderController');
const profileController = require('../controllers/user/profileController');
const walletController = require('../controllers/user/walletController');
const cartMiddleware = require('../middleware/cartMiddleware');
const wishlistController = require('../controllers/user/wishlistController');
const shopController = require("../controllers/user/shopController");
const couponController = require('../controllers/user/couponController');

router.use(cartMiddleware);

router.get("/", userController.loadHomepage);
router.get("/home", userController.loadHomepage);
router.get("/product/:id", userController.loadProductDetails);

router.get("/signup", userAuth.isLogin, userController.loadSignUp);
router.post("/signup", userAuth.isLogin, userController.signUp);
router.get("/login", userAuth.isLogin, userController.loadLogin);
router.post("/login", userAuth.isLogin, userController.login);
router.get("/verifyOtp", userAuth.isLogin, userController.loadOtp);
router.post("/verifyOtp", userAuth.isLogin, userController.verifyOtp);
router.post("/resendOtp", userAuth.isLogin, userController.resendOtp);

router.get("/forgot-password", userController.loadForgotPassword);
router.post("/forgot-password", userController.forgotPassword);
router.post("/verify-reset-otp", userController.verifyResetOTP);
router.post("/reset-password", userController.resetPassword);

router.get("/profile", userAuth.isLoggedIn, profileController.loadProfile);
router.get('/api/orders/:orderId', userAuth.isLoggedIn, profileController.getOrderDetails);
router.get('/profile/orders', userAuth.isLoggedIn, profileController.getOrders);
router.post("/profile/change-password", userAuth.isLoggedIn, profileController.changePassword);
router.post("/profile/send-email-otp", userAuth.isLoggedIn, profileController.sendEmailChangeOTP);
router.post("/profile/change-email", userAuth.isLoggedIn, profileController.changeEmail);
router.post("/addAddress", userAuth.isLoggedIn, profileController.addAddress);
router.patch("/profile/:addressId", userAuth.isLoggedIn, profileController.updateAddress);
router.delete("/address/:addressId", profileController.deleteAddress);

router.get("/shop",shopController.loadShop)
router.get("/shop/filter", shopController.filterProducts)

router.get("/cart", userAuth.isLoggedIn, cartController.loadCart);
router.post("/addToCart", userAuth.isLoggedIn, cartController.addToCart);
router.post("/updateCartQuantity", userAuth.isLoggedIn, cartController.updateCartQuantity);
router.post("/removeFromCart", userAuth.isLoggedIn, cartController.removeFromCart);

router.get('/checkout', userAuth.isLoggedIn, checkoutController.loadCheckout);
router.post('/place-order', userAuth.isLoggedIn, checkoutController.placeOrder);
router.post('/verify-razorpay-payment', userAuth.isLoggedIn, checkoutController.verifyRazorpayPayment);
router.get('/order/:orderId/success', userAuth.isLoggedIn, checkoutController.getOrderSuccess);
router.get('/order-success/:orderId',userAuth.isLoggedIn,checkoutController.getOrderSuccess)

router.post('/cancel-order/:orderId', userAuth.isLoggedIn, checkoutController.cancelOrder);
router.get('/order-history', userAuth.isLoggedIn, checkoutController.getOrderHistory);

// Order routes
router.post('/orders', userAuth.isLoggedIn, orderController.createOrder);
router.post('/orders/verify-payment', userAuth.isLoggedIn, orderController.verifyPayment);
router.post('/orders/:orderId/cancel', userAuth.isLoggedIn, orderController.cancelOrder);
router.post('/orders/:orderId/return', userAuth.isLoggedIn, orderController.returnOrder);

// Wishlist routes
router.get('/wishlist', userAuth.isLoggedIn, wishlistController.getWishlist);
router.post('/wishlist/add', userAuth.isLoggedIn, wishlistController.addToWishlist);
router.post('/wishlist/remove', userAuth.isLoggedIn, wishlistController.removeFromWishlist);
router.post('/wishlist/toggle/:productId', userAuth.isLoggedIn, wishlistController.toggleWishlist);

// Wallet routes
router.get('/wallet', userAuth.isLoggedIn, walletController.getWalletDetails);
router.post('/wallet/add', userAuth.isLoggedIn, walletController.addMoney);
router.post('/initiate-wallet-payment', userAuth.isLoggedIn, profileController.initiateWalletAddMoney);
router.post('/verify-wallet-payment', userAuth.isLoggedIn, profileController.verifyWalletPayment);

// Add this route for getting orders
router.get('/orders', userAuth.isLoggedIn, profileController.getOrders);

// Coupon Routes
router.post('/apply-coupon', userAuth.isLoggedIn, couponController.applyCoupon);
router.post('/remove-coupon', userAuth.isLoggedIn, couponController.removeCoupon);

router.get("/logout", userAuth.isLoggedIn, userController.logout);

module.exports = router;