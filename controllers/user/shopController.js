const mongoose = require('mongoose');
const Product = require("../../models/productSchema.js");
const Category = require("../../models/categoryModel.js");
const User = require("../../models/userSchema.js");
const Cart = require("../../models/cartSchema.js");
const Wishlist = require("../../models/wishlistModel.js");

const loadShop = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const query = buildFilterQuery(req.query);
        const sortOptions = getSortOptions(req.query.sort);

        const [cartItems, wishlistItems] = await Promise.all([
            getCartItems(userId),
            getWishlistItems(userId)
        ]);

        const [products, totalProducts, categories] = await Promise.all([
            Product.find(query)
                .populate('category')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query),
            Category.find({ isActive: true, isDeleted: false })
        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        const processedCategories = processCategories(categories);
        const transformedProducts = transformProducts(products, cartItems, wishlistItems);
        const user = await User.findById(userId);
        res.render('shop', {
            user,
            products: transformedProducts,
            categories: processedCategories,
            currentPage: page,
            totalPages,
            totalProducts,
            hasPreviousPage: page > 1,
            hasNextPage: page < totalPages,
            previousPage: page - 1,
            nextPage: page + 1,
            query: req.query
        });
    } catch (error) {
        console.error('Error in loadShop:', error);
        res.status(500).render('error', { message: 'Internal server error' });
    }
};

const filterProducts = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const query = buildFilterQuery(req.query);
        const sortOptions = getSortOptions(req.query.sort);

        const [cartItems, wishlistItems] = await Promise.all([
            getCartItems(userId),
            getWishlistItems(userId)
        ]);

        const [products, totalProducts] = await Promise.all([
            Product.find(query)
                .populate('category')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        const transformedProducts = transformProducts(products, cartItems, wishlistItems);

        res.json({
            success: true,
            products: transformedProducts,
            currentPage: page,
            totalPages,
            totalProducts,
            hasPreviousPage: page > 1,
            hasNextPage: page < totalPages,
            previousPage: page - 1,
            nextPage: page + 1
        });
    } catch (error) {
        console.error('Error in filterProducts:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
            const wishlist = await Wishlist.findOne({ user: req.session.userId });
            if (wishlist) {
                wishlistItems = wishlist.products.map(item => item.toString());
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

function buildFilterQuery(queryParams) {
    const query = { isBlocked: false };

    if (queryParams.search) {
        query.$or = [
            { name: { $regex: queryParams.search, $options: 'i' } },
            { description: { $regex: queryParams.search, $options: 'i' } }
        ];
    }

    if (queryParams.category && queryParams.category !== 'all') {
        query.category = queryParams.category;
    }

    if (queryParams.rating && queryParams.rating !== 'all') {
        query.averageRating = { $gte: parseInt(queryParams.rating) };
    }

    if (queryParams.minPrice || queryParams.maxPrice) {
        query.regularPrice = {};
        if (queryParams.minPrice) query.regularPrice.$gte = parseFloat(queryParams.minPrice);
        if (queryParams.maxPrice) query.regularPrice.$lte = parseFloat(queryParams.maxPrice);
    }

    return query;
}

function getSortOptions(sortType) {
    switch (sortType) {
        case 'price-low':
            return { salePrice: 1 };
        case 'price-high':
            return { salePrice: -1 };
        case 'rating':
            return { averageRating: -1 };
        case 'oldest':
            return { createdAt: 1 };
        case 'newest':
            return { createdAt: -1 };
        case 'name-asc' :
            return {name: 1};
        case 'name-desc' :
            return {name: -1};
        default:
            return { createdAt: -1 };
    }
}

async function getCartItems(userId) {
    if (!userId) return [];
    const cart = await Cart.findOne({ userId });
    return cart ? cart.items.map(item => item.productId.toString()) : [];
}

async function getWishlistItems(userId) {
    if (!userId) return [];
    const wishlist = await Wishlist.findOne({ user: userId });
    return wishlist ? wishlist.products.map(item => item.toString()) : [];
}

function processCategories(categories) {
    const currentDate = new Date();
    
    return categories.map(category => {
        const categoryObj = category.toObject();
        
        // Check if category has an active offer and it's within the valid date range
        if (categoryObj.offer && categoryObj.offer.isActive) {
            const startDate = categoryObj.offer.startDate ? new Date(categoryObj.offer.startDate) : null;
            const endDate = categoryObj.offer.endDate ? new Date(categoryObj.offer.endDate) : null;
            
            // Check if the offer is currently valid
            const isValidOffer = (!startDate || currentDate >= startDate) && 
                               (!endDate || currentDate <= endDate);
            
            categoryObj.offer.isActive = isValidOffer;
            
            if (isValidOffer) {
                categoryObj.currentOffer = {
                    discountType: categoryObj.offer.discountType,
                    discountValue: categoryObj.offer.discountValue,
                    maxDiscountAmount: categoryObj.offer.maxDiscountAmount
                };
            } else {
                categoryObj.currentOffer = null;
            }
        } else {
            categoryObj.currentOffer = null;
        }
        
        return categoryObj;
    });
}

function transformProducts(products, cartItems, wishlistItems) {
    return products.map(product => {
        let effectivePrice = product.salePrice || product.regularPrice;
        let hasOffer = false;
        let offerDetails = null;
        
        if (product.category && product.category.offer && product.category.offer.isActive) {
            const now = new Date();
            const offerStartDate = product.category.offer.startDate ? new Date(product.category.offer.startDate) : null;
            const offerEndDate = product.category.offer.endDate ? new Date(product.category.offer.endDate) : null;
            
            if ((!offerStartDate || now >= offerStartDate) && (!offerEndDate || now <= offerEndDate)) {
                hasOffer = true;
                offerDetails = {
                    type: product.category.offer.discountType,
                    value: product.category.offer.discountValue,
                    maxAmount: product.category.offer.maxDiscountAmount,
                    endDate: product.category.offer.endDate
                };
                
                if (product.category.offer.discountType === 'percentage') {
                    const discountAmount = (effectivePrice * product.category.offer.discountValue) / 100;
                    effectivePrice = Math.max(effectivePrice - Math.min(discountAmount, product.category.offer.maxDiscountAmount || discountAmount), 0);
                } else if (product.category.offer.discountType === 'fixed') {
                    effectivePrice = Math.max(effectivePrice - product.category.offer.discountValue, 0);
                }
            }
        }

        return {
            ...product,
            price: effectivePrice,
            originalPrice: product.salePrice || product.regularPrice,
            hasOffer,
            offerDetails,
            inCart: cartItems.includes(product._id.toString()),
            inWishlist: wishlistItems.includes(product._id.toString())
        };
    });
}

module.exports = {
    loadShop,
    filterProducts,
    loadProductDetail
};
