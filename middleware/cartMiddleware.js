const Cart = require('../models/cartSchema.js');

const getCartCount = async (req, res, next) => {
    try {
        if (req.session.userId) {
            const cart = await Cart.findOne({ userId: req.session.userId });
            if (cart && cart.items) {
               const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);
                res.locals.cartCount = cartCount;
            } else {
                res.locals.cartCount = 0;
            }
        } else {
            res.locals.cartCount = 0;
        }
        next();
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.locals.cartCount = 0;
        next();
    }
};

module.exports = getCartCount;
