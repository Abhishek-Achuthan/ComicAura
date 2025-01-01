const express = require('express');
const router = express.Router();
const { isAuth } = require('../../middleware/authMiddleware');
const wishlistController = require('../../controllers/user/wishlistController');
const walletController = require('../../controllers/user/walletController');
const orderController = require('../../controllers/user/orderController');

// Wishlist routes
router.get('/wishlist', isAuth, wishlistController.getWishlist);
router.post('/wishlist/add', isAuth, wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', isAuth, wishlistController.removeFromWishlist);

// Wallet routes
router.get('/wallet', isAuth, walletController.getWallet);
router.post('/wallet/add', isAuth, walletController.addToWallet);
router.post('/wallet/use', isAuth, walletController.useWalletBalance);

// Order routes
router.post('/order/create', isAuth, orderController.createOrder);
router.post('/order/verify-payment', isAuth, orderController.verifyPayment);
router.post('/order/:orderId/cancel', isAuth, orderController.cancelOrder);
router.post('/order/:orderId/return', isAuth, orderController.returnOrder);

module.exports = router;
