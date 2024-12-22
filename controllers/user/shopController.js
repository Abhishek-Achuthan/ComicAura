const Product = require("../../models/productSchema.js");
const Category = require("../../models/categoryModel.js");
const User = require("../../models/userSchema.js");

const loadShop = async (req, res) => {
    try {
        const userId = req.session.userId;
        let cartItems = [];
        
        if (userId) {
            const Cart = require("../../models/cartSchema.js");
            const cart = await Cart.findOne({ userId });
            if (cart) {
                cartItems = cart.items.map(item => item.productId.toString());
            }
        }

        const products = await Product.find({ isBlocked: false })
            .populate('category')
            .lean();
        
        const categories = await Category.find({
            isActive: true,
            isDeleted: false
        }).lean();

        const transformedProducts = products.map(product => ({
            ...product,
            price: product.salePrice || product.regularPrice,
            averageRating: 5, // Default rating for now
            inCart: cartItems.includes(product._id.toString())
        }));

        const user = await User.findById(userId);

        res.render('shop', {
            products: transformedProducts,
            categories,
            user
        });
    } catch (error) {
        console.error('Error in loadShop:', error);
        res.status(500).render('error', { 
            message: 'Failed to load shop page' 
        });
    }
};

const filterProducts = async (req, res) => {
    try {
        console.log('Filter products request received:', req.query);
        const page = parseInt(req.query.page) || 1;
        const limit = 12; // Products per page
        const skip = (page - 1) * limit;

        let query = { isBlocked: false };

        // Get cart items
        let cartItems = [];
        if (req.session.userId) {
            const Cart = require("../../models/cartSchema.js");
            const cart = await Cart.findOne({ userId: req.session.userId });
            if (cart) {
                cartItems = cart.items.map(item => item.productId.toString());
            }
        }

        // Apply category filter
        if (req.query.category && req.query.category !== 'all') {
            query.category = req.query.category;
        }

        // Apply price filter
        if (req.query.minPrice || req.query.maxPrice) {
            query.regularPrice = {};
            if (req.query.minPrice) query.regularPrice.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.regularPrice.$lte = parseFloat(req.query.maxPrice);
        }

        // Apply search filter
        if (req.query.search) {
            query.name = { $regex: new RegExp(req.query.search, 'i') };
        }

        // Get total count for pagination
        const total = await Product.countDocuments(query);

        // Get products with pagination
        let products = await Product.find(query)
            .populate('category')
            .skip(skip)
            .limit(limit)
            .lean();

        // Add cart information and format products
        products = products.map(product => ({
            ...product,
            inCart: cartItems.includes(product._id.toString())
        }));

        // Sort products if needed
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-low-high':
                    products.sort((a, b) => (a.salePrice || a.regularPrice) - (b.salePrice || b.regularPrice));
                    break;
                case 'price-high-low':
                    products.sort((a, b) => (b.salePrice || b.regularPrice) - (a.salePrice || a.regularPrice));
                    break;
                case 'newest':
                    products.sort((a, b) => b.createdAt - a.createdAt);
                    break;
                // Add more sorting options as needed
            }
        }

        res.json({
            products,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error in filterProducts:', error);
        res.status(500).json({ error: 'Failed to filter products' });
    }
};

const loadProductDetail = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .lean();

        if (!product) {
            return res.status(404).render('error', { 
                message: 'Product not found' 
            });
        }

        // Fetch related products from the same category
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            isBlocked: false
        })
        .limit(8)
        .lean();

        // Format prices for display
        const formatPrice = (price) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(price);
        };

        // Transform product data
        const transformedProduct = {
            ...product,
            formattedRegularPrice: formatPrice(product.regularPrice),
            formattedSalePrice: product.salePrice ? formatPrice(product.salePrice) : null,
            discount: product.salePrice 
                ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
                : 0
        };

        // Transform related products
        const transformedRelatedProducts = relatedProducts.map(prod => ({
            ...prod,
            formattedRegularPrice: formatPrice(prod.regularPrice),
            formattedSalePrice: prod.salePrice ? formatPrice(prod.salePrice) : null,
            discount: prod.salePrice 
                ? Math.round(((prod.regularPrice - prod.salePrice) / prod.regularPrice) * 100)
                : 0
        }));

        res.render('user/productDetail', {
            product: transformedProduct,
            relatedProducts: transformedRelatedProducts,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error in loadProductDetail:', error);
        res.status(500).render('error', { 
            message: 'Failed to load product details' 
        });
    }
};

module.exports = {
    loadShop,
    filterProducts,
    loadProductDetail
};
