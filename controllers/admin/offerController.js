const ProductOffer = require('../../models/productOfferModel');
const CategoryOffer = require('../../models/categoryOfferModel');
const Product = require('../../models/productSchema');
const Category = require('../../models/categoryModel');

// Product Offer Controllers
const createProductOffer = async (req, res) => {
    try {
        const { productId, discountPercentage, startDate, endDate } = req.body;

        // Validate product existence
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check for existing active offer
        const existingOffer = await ProductOffer.findOne({
            productId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'An active offer already exists for this product'
            });
        }

        const offer = new ProductOffer({
            productId,
            discountPercentage,
            startDate,
            endDate
        });

        await offer.save();

        res.status(201).json({
            success: true,
            message: 'Product offer created successfully',
            offer
        });
    } catch (error) {
        console.error('Create product offer error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create product offer'
        });
    }
};

const getProductOffers = async (req, res) => {
    try {
        const offers = await ProductOffer.find()
            .populate('productId', 'name price')
            .sort('-createdAt');

        res.json({
            success: true,
            offers
        });
    } catch (error) {
        console.error('Get product offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product offers'
        });
    }
};

const updateProductOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { discountPercentage, startDate, endDate, isActive } = req.body;

        const offer = await ProductOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        offer.discountPercentage = discountPercentage;
        offer.startDate = startDate;
        offer.endDate = endDate;
        offer.isActive = isActive;

        await offer.save();

        res.json({
            success: true,
            message: 'Product offer updated successfully',
            offer
        });
    } catch (error) {
        console.error('Update product offer error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update product offer'
        });
    }
};

const deleteProductOffer = async (req, res) => {
    try {
        const { offerId } = req.params;

        const offer = await ProductOffer.findByIdAndDelete(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Product offer deleted successfully'
        });
    } catch (error) {
        console.error('Delete product offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product offer'
        });
    }
};

// Category Offer Controllers
const createCategoryOffer = async (req, res) => {
    try {
        const { category, discountPercentage, startDate, endDate } = req.body;

        // Validate input
        if (!category || !discountPercentage || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Convert string dates to Date objects
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        // Validate dates
        if (endDateTime <= startDateTime) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Check if there's an existing active offer for this category
        const existingOffer = await CategoryOffer.findOne({
            category,
            endDate: { $gt: new Date() },
            isActive: true
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'An active offer already exists for this category'
            });
        }

        // Create new offer
        const newOffer = new CategoryOffer({
            category,
            discountPercentage: Number(discountPercentage),
            startDate: startDateTime,
            endDate: endDateTime
        });

        await newOffer.save();

        res.status(201).json({
            success: true,
            message: 'Category offer created successfully',
            offer: newOffer
        });
    } catch (error) {
        console.error('Create category offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category offer'
        });
    }
};

const getCategoryOffers = async (req, res) => {
    try {
        const offers = await CategoryOffer.find()
            .populate('category', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            offers
        });
    } catch (error) {
        console.error('Get category offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category offers'
        });
    }
};

const updateCategoryOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { discountPercentage, startDate, endDate } = req.body;

        const offer = await CategoryOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        // Update offer
        offer.discountPercentage = Number(discountPercentage);
        offer.startDate = new Date(startDate);
        offer.endDate = new Date(endDate);

        await offer.save();

        res.json({
            success: true,
            message: 'Category offer updated successfully',
            offer
        });
    } catch (error) {
        console.error('Update category offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category offer'
        });
    }
};

const deleteCategoryOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        const result = await CategoryOffer.findByIdAndDelete(offerId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Category offer deleted successfully'
        });
    } catch (error) {
        console.error('Delete category offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category offer'
        });
    }
};

module.exports = {
    // Product Offer Controllers
    createProductOffer,
    getProductOffers,
    updateProductOffer,
    deleteProductOffer,

    // Category Offer Controllers
    createCategoryOffer,
    getCategoryOffers,
    updateCategoryOffer,
    deleteCategoryOffer
};
