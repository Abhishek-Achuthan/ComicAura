const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');
const cartController = require("../controllers/user/cartController");
const profileController = require("../controllers/user/profileController");
const shopController = require("../controllers/user/shopController");
const checkoutController = require('../controllers/user/checkoutController');
const userAuth = require('../middleware/userAuth');
const cartMiddleware = require('../middleware/cartMiddleware');

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

router.get("/profile", userAuth.isLoggedIn, profileController.loadProfile);
router.post("/addAddress", userAuth.isLoggedIn, profileController.addAddress);
router.patch("/profile/:addressId", userAuth.isLoggedIn, profileController.updateAddress);
router.delete("/address/:addressId", profileController.deleteAddress);

router.get("/shop",shopController.loadShop)
router.get("/shop/filter", shopController.filterProducts)

router.get("/cart",cartController.loadCart);
router.post("/addToCart",cartController.addToCart);
router.post("/updateCartQuantity",cartController.updateCartQuantity);
router.post("/removeFromCart",cartController.removeFromCart);

router.get('/checkout', userAuth.isLoggedIn, checkoutController.loadCheckout);
router.post('/place-order', userAuth.isLoggedIn, checkoutController.placeOrder);
router.get('/order/:orderId/success', userAuth.isLoggedIn, checkoutController.getOrderSuccess);
router.post('/cancel-order/:orderId', userAuth.isLoggedIn, checkoutController.cancelOrder);
router.get('/order-history', userAuth.isLoggedIn, checkoutController.getOrderHistory);

router.get("/logout", userAuth.isLoggedIn, userController.logout);

module.exports = router;