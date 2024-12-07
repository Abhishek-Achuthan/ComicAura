const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');
const userAuth = require('../middleware/userAuth');

router.get("/", userController.loadHomepage);
router.get("/home", userController.loadHomepage);
router.get("/product/:id", userController.loadProuductDetails);

router.get("/signup", userAuth.isLogin, userController.loadSignUp);
router.post("/signup", userAuth.isLogin, userController.signUp);
router.get("/login", userAuth.isLogin, userController.loadLogin);
router.post("/login", userAuth.isLogin, userController.login);
router.get("/verifyOtp", userAuth.isLogin, userController.loadOtp);
router.post("/verifyOtp", userAuth.isLogin, userController.verifyOtp);
router.post("/resendOtp", userAuth.isLogin, userController.resendOtp);

router.get("/logout", userAuth.isLoggedIn, userController.logout);

module.exports = router;