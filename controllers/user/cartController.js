const User = require("../../models/userSchema.js");
const Product = require("../../models/productSchema.js");
const Cart = require("../../models/cartSchema.js");
const mongoose = require("../../config/database.js")



const loadCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await Cart.findOne({ userId }).populate('items.productId', 'name regularPrice salePrice images _id').lean();
 
 
        let cartData = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            itemCount: 0
        };

        if (cart && cart.items) {
            cartData.items = cart.items.map((item) => ({
                _id: item._id,
                product: {
                    name: item.productId.name,
                    regularPrice: item.productId.regularPrice,
                    salePrice: item.productId.salePrice,
                    images: [item.productId.images[0]],
                    productId: item.productId._id
                },
                quantity: item.quantity
            }));

            // Calculate totals
            cartData.items.forEach(item => {
                const price = item.product.salePrice || item.product.regularPrice;
                cartData.subtotal += price * item.quantity;
                cartData.itemCount += item.quantity;
            });

            // Calculate tax (5%) and total
            cartData.tax = cartData.subtotal * 0.05;
            cartData.total = cartData.subtotal + cartData.tax;
        }

        res.render("cart", {
            user: userId,
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
            const existingItem = cart.items.find(item => 
                item.productId.toString() === productId
            );

            if (existingItem) {
                if (existingItem.quantity >= 5) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity limit reached",
                        toast: { type: 'warning', message: 'Maximum 5 items allowed per product' }
                    });
                }
                existingItem.quantity += 1;
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
};
 
 const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { prodId, action } = req.body;
        console.log('Action:', action);

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
                    toast: { type: 'warning', message: 'Maximum 5 items allowed per product' }
                });
            }
            newQuantity += 1;
        } else if (action === 'decrease') {
            if (newQuantity <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity",
                    toast: { type: 'error', message: 'Quantity must be at least 1' }
                });
            }
            newQuantity -= 1;
        }

        // Update the quantity
        cart.items[itemIndex].quantity = newQuantity;

        // Save the cart
        await cart.save();

        // Populate product details
        await cart.populate('items.productId');
        
        let subtotal = 0;
        let itemCount = 0;
        
        cart.items.forEach(item => {
            const price = item.productId.salePrice || item.productId.regularPrice;
            subtotal += price * item.quantity;
            itemCount += item.quantity;
        });

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        res.json({
            success: true,
            cartCount: itemCount,
            itemSubtotal: subtotal,
            tax: tax,
            total: total,
            toast: { type: 'success', message: 'Cart updated successfully' }
        });

    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update cart",
            toast: { type: 'error', message: 'Failed to update cart' }
        });
    }
};

 const removeFromCart = async(req,res) => {
   
   try {

      const {cartItemId} = req.body;
      const user = req.session.userId;
      console.log(user)
      

      await Cart.findOneAndUpdate(
         {userId : user},
         {$pull:{items:{productId:cartItemId}}},
         {new:true}
      );
      console.log("item removed from the cart");

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
    updateCartQuantity,
    removeFromCart,
 }