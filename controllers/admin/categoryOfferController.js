const CategoryOffer = require('../../models/categoryOfferModel');

// Add new category offer
exports.addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, discountPercentage, startDate, endDate } = req.body;
        
        // Check if an active offer already exists for this category
        const existingOffer = await CategoryOffer.findOne({
            category: categoryId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'An active offer already exists for this category'
            });
        }

        const offer = await CategoryOffer.create({
            category: categoryId,
            discountPercentage,
            startDate,
            endDate
        });

        res.json({
            success: true,
            message: 'Category offer added successfully',
            offer
        });
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add category offer'
        });
    }
};

// Get category offers
exports.getCategoryOffers = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const offers = await CategoryOffer.find({ category: categoryId })
            .sort('-createdAt');
        
        res.json({
            success: true,
            offers
        });
    } catch (error) {
        console.error('Error fetching category offers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category offers'
        });
    }
};
