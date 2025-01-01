const Wishlist = require('../../models/wishlistModel');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');

const wishlistController = {
    addToWishlist: async (req, res) => {
        try {
            const { productId } = req.body;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Please login to add to wishlist' });
            }

            let wishlist = await Wishlist.findOne({ user: userId });

            if (!wishlist) {
                wishlist = new Wishlist({
                    user: userId,
                    products: [productId]
                });
                await wishlist.save();
            } else if (!wishlist.products.includes(productId)) {
                wishlist.products.push(productId);
                await wishlist.save();
            }

            res.json({ success: true, message: 'Product added to wishlist' });
        } catch (error) {
            console.error('Add to wishlist error:', error);
            res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
        }
    },

    toggleWishlist: async (req, res) => {
        try {
            const productId = req.params.productId;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Please login to manage wishlist' });
            }

            let wishlist = await Wishlist.findOne({ user: userId });
            let added = false;

            if (!wishlist) {
                wishlist = new Wishlist({
                    user: userId,
                    products: [productId]
                });
                await wishlist.save();
                added = true;
            } else {
                const productIndex = wishlist.products.indexOf(productId);
                if (productIndex === -1) {
                    wishlist.products.push(productId);
                    added = true;
                } else {
                    wishlist.products.splice(productIndex, 1);
                }
                await wishlist.save();
            }

            res.json({ 
                success: true, 
                message: added ? 'Product added to wishlist' : 'Product removed from wishlist',
                added
            });
        } catch (error) {
            console.error('Toggle wishlist error:', error);
            res.status(500).json({ success: false, message: 'Failed to update wishlist' });
        }
    },

    removeFromWishlist: async (req, res) => {
        try {
            const { productId } = req.body;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Please login to manage wishlist' });
            }

            const wishlist = await Wishlist.findOne({ user: userId });

            if (wishlist) {
                wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
                await wishlist.save();
            }

            res.json({ success: true, message: 'Product removed from wishlist' });
        } catch (error) {
            console.error('Remove from wishlist error:', error);
            res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
        }
    },

    getWishlist: async (req, res) => {
        try {
            const userId = req.session.userId;
            
            if (!userId) {
                return res.redirect('/login');
            }

            const user = await User.findById(userId);

            const cart = await Cart.findOne({ userId });
            const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
            
            if (!wishlist) {
                return res.render('wishlist', {
                    wishlistItems: [],
                    user
                });
            }

            const wishlistItems = wishlist.products.map(product => {
                const productObj = product.toObject();
                if (cart) {
                    productObj.inCart = cart.items.some(item => 
                        item.productId.toString() === product._id.toString()
                    );
                }
                productObj.formattedRegularPrice = `₹${product.regularPrice.toLocaleString('en-IN')}`;
                if (product.salePrice) {
                    productObj.formattedSalePrice = `₹${product.salePrice.toLocaleString('en-IN')}`;
                    productObj.discount = Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100);
                }
                return productObj;
            });

            res.render('wishlist', {
                wishlistItems,
                user
            });
        } catch (error) {
            console.error('Get wishlist error:', error);
            res.status(500).render('wishlist', {
                error: 'Failed to load wishlist',
                user: req.user
            });
        }
    }
};

module.exports = wishlistController;
