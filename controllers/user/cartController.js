const User = require("../../models/userSchema.js");
const Product = require("../../models/productSchema.js");
const Cart = require("../../models/cartSchema.js");
const mongoose = require("../../config/database.js")

const loadCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).lean();
        
        if (!user) {
            return res.redirect('/login?error=Please login to view your cart');
        }

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name regularPrice salePrice images category',
                populate: {
                    path: 'category',
                    select: 'offer'
                }
            })
            .lean();

        let cartData = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            itemCount: 0
        };

        if (cart && cart.items) {
            cartData.items = cart.items.map((item) => {
                let effectivePrice = item.productId.salePrice < item.productId.regularPrice ? 
                    item.productId.salePrice : item.productId.regularPrice;
                
                // Apply category offer if available
                if (item.productId.category && item.productId.category.offer && item.productId.category.offer.isActive) {
                    const offer = item.productId.category.offer;
                    if (offer.discountType === 'percentage') {
                        const discountAmount = (effectivePrice * offer.discountValue) / 100;
                        effectivePrice = Math.max(effectivePrice - Math.min(discountAmount, offer.maxDiscountAmount || discountAmount), 0);
                    } else {
                        effectivePrice = Math.max(effectivePrice - offer.discountValue, 0);
                    }
                }
                
                return {
                    _id: item._id,
                    product: {
                        name: item.productId.name,
                        regularPrice: item.productId.regularPrice,
                        salePrice: item.productId.salePrice,
                        images: [item.productId.images[0]],
                        productId: item.productId._id,
                        category: item.productId.category
                    },
                    quantity: item.quantity,
                    totalRegularPrice: item.productId.regularPrice * item.quantity,
                    totalSalePrice: item.productId.salePrice * item.quantity,
                    totalPrice: effectivePrice * item.quantity
                };
            });

            cartData.items.forEach(item => {
                cartData.subtotal += item.totalPrice;
                cartData.itemCount += item.quantity;
            });

            cartData.tax = cartData.subtotal * 0.05;
            cartData.total = cartData.subtotal + cartData.tax;
        }

        res.render("cart", {
            user: user,
            cart: cartData,
            serverMessages: {
                success: req.query.success,
                error: req.query.error
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const addToCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first",
                toast: { type: 'warning', message: 'Please login to add items to cart' }
            });
        }

        const productId = req.body.productId;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                toast: { type: 'error', message: 'Product not found' }
            });
        }

        if (product.stock <= 0) {
            return res.status(400).json({
                success: false,
                message: "Product out of stock",
                toast: { type: 'warning', message: 'Sorry, this product is out of stock' }
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: 1,
                }]
            });
        } else {
            const existingItemIndex = cart.items.findIndex(item => 
                item.productId.toString() === productId.toString()
            );

            if (existingItemIndex !== -1) {
                if (cart.items[existingItemIndex].quantity >= 5) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity limit reached",
                        toast: { type: 'warning', message: 'Maximum 5 items allowed per product' }
                    });
                }
                cart.items[existingItemIndex].quantity += 1;
            } else {
                cart.items.push({
                    productId: productId,
                    quantity: 1
                });
            }
        }

        await cart.save();

        const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

        res.status(200).json({
            success: true,
            cartCount,
            message: "Item added to cart",
            toast: { type: 'success', message: 'Item added to cart successfully' }
        });
    } catch (error) {
        console.log("error during adding to the cart", error.message);
        res.status(500).json({
            success: false,
            message: "Server error",
            toast: { type: 'error', message: 'Failed to add item to cart' }
        });
    }
}

const addToCartWithQuantity = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first",
                toast: { type: 'warning', message: 'Please login to add items to cart' }
            });
        }

        const { productId, quantity } = req.body;
        const requestedQuantity = parseInt(quantity);

        // Basic validation
        if (!productId || isNaN(requestedQuantity) || requestedQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                toast: { type: 'error', message: 'Please provide valid product and quantity' }
            });
        }

        // Check product exists and has stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                toast: { type: 'error', message: 'Product not found' }
            });
        }

        // Check if product is in stock
        if (product.stock <= 0) {
            return res.status(400).json({
                success: false,
                message: "Product is out of stock",
                toast: { type: 'error', message: 'Sorry, this product is out of stock' }
            });
        }

        // Check if requested quantity exceeds stock
        if (requestedQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`,
                toast: { type: 'error', message: `Only ${product.stock} items available in stock` }
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check existing item in cart
        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId
        );

        if (existingItem) {
            // Calculate new total quantity
            const newTotalQuantity = existingItem.quantity + requestedQuantity;

            // Check if new total quantity exceeds stock
            if (newTotalQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add more items. Only ${product.stock - existingItem.quantity} more available`,
                    toast: { type: 'error', message: `Cannot add more items. Only ${product.stock - existingItem.quantity} more available` }
                });
            }

            // Check if new total quantity exceeds limit of 5
            if (newTotalQuantity > 5) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add ${requestedQuantity} more items. Maximum limit is 5 per product`,
                    toast: { type: 'warning', message: `Cannot add ${requestedQuantity} more items. Maximum limit is 5 per product` }
                });
            }

            existingItem.quantity = newTotalQuantity;
        } else {
            // Check if requested quantity exceeds limit of 5
            if (requestedQuantity > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 5 items allowed per product",
                    toast: { type: 'warning', message: 'Maximum 5 items allowed per product' }
                });
            }

            cart.items.push({
                productId,
                quantity: requestedQuantity
            });
        }

        await cart.save();

        // Calculate total items in cart
        const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

        return res.status(200).json({
            success: true,
            cartCount,
            message: "Items added to cart successfully",
            toast: { type: 'success', message: 'Items added to cart successfully' }
        });

    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({
            success: false,
            message: "Error adding items to cart",
            toast: { type: 'error', message: 'Error adding items to cart' }
        });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { prodId, action } = req.body;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
                toast: { type: 'error', message: 'Cart not found' }
            });
        }

        const itemIndex = cart.items.findIndex(item => item.productId._id.toString() === prodId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart",
                toast: { type: 'error', message: 'Product not found in cart' }
            });
        }

        let newQuantity = cart.items[itemIndex].quantity;

        if (action === 'increase') {
            if (newQuantity >= 5) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity limit exceeded",
                    toast: { type: 'warning', message: 'Maximum 5 items allowed per product' },
                    currentQuantity: newQuantity
                });
            }
            newQuantity += 1;
        } else if (action === 'decrease') {
            if (newQuantity <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity",
                    toast: { type: 'error', message: 'Quantity must be at least 1' },
                    currentQuantity: newQuantity
                });
            }
            newQuantity -= 1;
        }

        // Check stock availability
        const product = await Product.findById(cart.items[itemIndex].productId);
        if (!product || newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock",
                toast: { type: 'error', message: `Only ${product.stock} items available in stock` },
                currentQuantity: cart.items[itemIndex].quantity
            });
        }

        cart.items[itemIndex].quantity = newQuantity;
        await cart.save();

        await cart.populate({
            path: 'items.productId',
            populate: {
                path: 'category',
                select: 'offer'
            }
        });

        let subtotal = 0;
        let itemCount = 0;

        cart.items.forEach(item => {
            let effectivePrice = item.productId.salePrice < item.productId.regularPrice ? 
                item.productId.salePrice : item.productId.regularPrice;
            
            if (item.productId.category && item.productId.category.offer && item.productId.category.offer.isActive) {
                const offer = item.productId.category.offer;
                if (offer.discountType === 'percentage') {
                    const discountAmount = (effectivePrice * offer.discountValue) / 100;
                    effectivePrice = Math.max(effectivePrice - Math.min(discountAmount, offer.maxDiscountAmount || discountAmount), 0);
                } else {
                    effectivePrice = Math.max(effectivePrice - offer.discountValue, 0);
                }
            }
            
            subtotal += effectivePrice * item.quantity;
            itemCount += item.quantity;
        });

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        const updatedItem = cart.items[itemIndex];
        let itemPrice = updatedItem.productId.salePrice < updatedItem.productId.regularPrice ? 
            updatedItem.productId.salePrice : updatedItem.productId.regularPrice;
        
        if (updatedItem.productId.category && updatedItem.productId.category.offer && updatedItem.productId.category.offer.isActive) {
            const offer = updatedItem.productId.category.offer;
            if (offer.discountType === 'percentage') {
                const discountAmount = (itemPrice * offer.discountValue) / 100;
                itemPrice = Math.max(itemPrice - Math.min(discountAmount, offer.maxDiscountAmount || discountAmount), 0);
            } else {
                itemPrice = Math.max(itemPrice - offer.discountValue, 0);
            }
        }

        const itemTotal = itemPrice * newQuantity;

        res.json({
            success: true,
            cartCount: itemCount,
            itemSubtotal: subtotal,
            itemTotal: itemTotal,
            tax: tax,
            total: total,
            toast: {
                type: 'success',
                message: action === 'increase' ? 'Quantity increased successfully' : 'Quantity decreased successfully'
            }
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update cart",
            toast: { type: 'error', message: 'Failed to update cart' }
        });
    }
}

const removeFromCart = async(req,res) => {
    try {
        const {cartItemId} = req.body;
        const user = req.session.userId;

        await Cart.findOneAndUpdate(
            {userId : user},
            {$pull:{items:{productId:cartItemId}}},
            {new:true}
        );

        return res.status(200).json({
            success:true,
            message:"Item removed from the cart"
        });
    } catch (error) {
        console.log(error.message);

        return res.status(500).json({
            success:false,
            message:"internal error"
        });
    }
}

module.exports = {
    loadCart,
    addToCart,
    addToCartWithQuantity,
    updateCartQuantity,
    removeFromCart,
}