const Product = require("../../models/productSchema.js");
const Category = require("../../models/categoryModel.js");
const User = require("../../models/userSchema.js");
const Cart = require("../../models/cartSchema.js");
const Wishlist = require("../../models/wishlistModel.js");

const loadShop = async (req, res) => {
    try {
        const userId = req.session.userId;
        let cartItems = [];
        let wishlistItems = [];

        if (userId) {
            const cart = await Cart.findOne({ userId });
            if (cart) {
                cartItems = cart.items.map(item => item.productId.toString());
            }

            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                wishlistItems = wishlist.items.map(item => item.toString());
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
            averageRating: 5,
            inCart: cartItems.includes(product._id.toString()),
            inWishlist: wishlistItems.includes(product._id.toString())
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
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Base query for non-blocked products
        let matchQuery = { isBlocked: false };

        // Get cart items for the logged-in user
        let cartItems = [];
        let wishlistItems = [];
        if (req.session.userId) {
            const cart = await Cart.findOne({ userId: req.session.userId });
            if (cart) {
                cartItems = cart.items.map(item => item.productId.toString());
            }

            const wishlist = await Wishlist.findOne({ userId: req.session.userId });
            if (wishlist) {
                wishlistItems = wishlist.items.map(item => item.toString());
            }
        }

        // Search filter - match products that start with the search term
        if (req.query.search) {
            const searchTerm = req.query.search.trim().replace(/\s+/g, ' ');
            if (searchTerm) {
                // Create a regex that matches from the start of the name
                matchQuery.name = new RegExp(`^${searchTerm}`, 'i');
            }
        }

        // Category filter
        if (req.query.category && req.query.category !== 'all') {
            matchQuery.category = new mongoose.Types.ObjectId(req.query.category);
        }

        // Price range filter
        if (req.query.minPrice || req.query.maxPrice) {
            const priceFilter = {};
            if (req.query.minPrice) {
                priceFilter.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                priceFilter.$lte = parseFloat(req.query.maxPrice);
            }
            matchQuery.$or = [
                { salePrice: { ...priceFilter, $ne: null, $gt: 0 } },
                { 
                    $and: [
                        { $or: [{ salePrice: null }, { salePrice: 0 }] },
                        { regularPrice: priceFilter }
                    ]
                }
            ];
        }

        // Rating filter
        if (req.query.rating && req.query.rating !== 'all') {
            matchQuery.averageRating = { $gte: parseFloat(req.query.rating) };
        }

        // Create aggregation pipeline
        let aggregationPipeline = [
            { $match: matchQuery },
            {
                $addFields: {
                    effectivePrice: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $ne: ["$salePrice", null] },
                                    { $gt: ["$salePrice", 0] }
                                ]
                            },
                            then: "$salePrice",
                            else: "$regularPrice"
                        }
                    }
                }
            }
        ];

        // Apply sorting
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-low':
                    aggregationPipeline.push({ $sort: { effectivePrice: 1 } });
                    break;
                case 'price-high':
                    aggregationPipeline.push({ $sort: { effectivePrice: -1 } });
                    break;
                case 'newest':
                    aggregationPipeline.push({ $sort: { createdAt: -1 } });
                    break;
                case 'rating':
                    aggregationPipeline.push({ $sort: { averageRating: -1 } });
                    break;
                case 'name-asc':
                    aggregationPipeline.push({ $sort: { name: 1 } });
                    break;
                case 'name-desc':
                    aggregationPipeline.push({ $sort: { name: -1 } });
                    break;
                default:
                    aggregationPipeline.push({ $sort: { createdAt: -1 } });
            }
        } else {
            aggregationPipeline.push({ $sort: { createdAt: -1 } });
        }

        // Add lookup for category
        aggregationPipeline.push({
            $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'category'
            }
        });

        // Unwind category array
        aggregationPipeline.push({
            $unwind: {
                path: '$category',
                preserveNullAndEmptyArrays: true
            }
        });

        // Get total count before pagination
        const totalCount = await Product.aggregate([
            { $match: matchQuery },
            { $count: 'total' }
        ]);

        const total = totalCount.length > 0 ? totalCount[0].total : 0;

        // Add pagination
        aggregationPipeline.push(
            { $skip: skip },
            { $limit: limit }
        );

        // Execute aggregation
        let products = await Product.aggregate(aggregationPipeline);

        // Transform products for response
        products = products.map(product => ({
            ...product,
            price: product.effectivePrice,
            inCart: cartItems.includes(product._id.toString()),
            inWishlist: wishlistItems.includes(product._id.toString())
        }));

        // Send response
        res.json({
            success: true,
            products,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            filters: {
                search: req.query.search || '',
                category: req.query.category || 'all',
                minPrice: req.query.minPrice || '',
                maxPrice: req.query.maxPrice || '',
                rating: req.query.rating || 'all',
                sort: req.query.sort || 'newest'
            }
        });
    } catch (error) {
        console.error('Error in filterProducts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to filter products',
            message: error.message 
        });
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

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            isBlocked: false
        })
        .limit(8)
        .lean();

        const formatPrice = (price) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(price);
        };

        const userId = req.session.userId;
        let wishlistItems = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                wishlistItems = wishlist.items.map(item => item.toString());
            }
        }

        const transformedProduct = {
            ...product,
            formattedRegularPrice: formatPrice(product.regularPrice),
            formattedSalePrice: product.salePrice ? formatPrice(product.salePrice) : null,
            averageRating: 5,
            discount: product.salePrice 
                ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
                : 0,
            inWishlist: wishlistItems.includes(product._id.toString())
        };

        const transformedRelatedProducts = relatedProducts.map(prod => ({
            ...prod,
            formattedRegularPrice: formatPrice(prod.regularPrice),
            formattedSalePrice: prod.salePrice ? formatPrice(prod.salePrice) : null,
            discount: prod.salePrice 
                ? Math.round(((prod.regularPrice - prod.salePrice) / prod.regularPrice) * 100)
                : 0,
            inWishlist: wishlistItems.includes(prod._id.toString())
        }));

        res.render('productDetail', {
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
