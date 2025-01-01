const express = require('express');
const router = express.Router();
const wishlistController = require('../../controllers/user/wishlistController');
const { isLoggedIn } = require('../../middleware/auth');

// Get wishlist page
router.get('/', isLoggedIn, wishlistController.getWishlist);

// Toggle product in wishlist
router.post('/toggle/:productId', isLoggedIn, wishlistController.toggleWishlist);

module.exports = router;
