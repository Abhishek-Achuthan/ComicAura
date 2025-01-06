const Category = require('../../models/categoryModel');

const createCategoryOffer = async (req, res) => {
    try {
        const { category: categoryId, discountPercentage, startDate, endDate } = req.body;

        if (!categoryId || !discountPercentage || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        if (endDateTime <= startDateTime) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date"
            });
        }

        // Check if category exists and has active offer
        const existingCategory = await Category.findOne({
            _id: categoryId,
            'offer.isActive': true,
            'offer.endDate': { $gt: new Date() }
        });

        if (existingCategory && existingCategory.offer && existingCategory.offer.isActive) {
            return res.status(400).json({
                success: false,
                message: "An active offer already exists for this category"
            });
        }

        // Update the category with new offer using findByIdAndUpdate
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                $set: {
                    'offer.discountType': 'percentage',
                    'offer.discountValue': Number(discountPercentage),
                    'offer.startDate': startDateTime,
                    'offer.endDate': endDateTime,
                    'offer.isActive': true
                }
            },
            { 
                new: true,
                runValidators: false // Disable validation since we're only updating the offer
            }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        res.status(201).json({
            success: true,
            message: "Category offer created successfully",
            offer: updatedCategory.offer
        });

    } catch (error) {
        console.error("Create category offer error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create category offer"
        });
    }
};

const getCategoryOffers = async (req, res) => {
    try {
        const categories = await Category.find({
            'offer.isActive': true,
            'offer.endDate': { $gt: new Date() }
        }).select('name offer');

        res.json({
            success: true,
            offers: categories
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

        const updatedCategory = await Category.findByIdAndUpdate(
            offerId,
            {
                $set: {
                    'offer.discountValue': Number(discountPercentage),
                    'offer.startDate': new Date(startDate),
                    'offer.endDate': new Date(endDate)
                }
            },
            { 
                new: true,
                runValidators: false
            }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category offer updated successfully',
            offer: updatedCategory.offer
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
        
        const updatedCategory = await Category.findByIdAndUpdate(
            offerId,
            {
                $set: {
                    'offer.isActive': false,
                    'offer.discountValue': 0,
                    'offer.startDate': null,
                    'offer.endDate': null
                }
            },
            { 
                new: true,
                runValidators: false
            }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category offer removed successfully'
        });
    } catch (error) {
        console.error('Delete category offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove category offer'
        });
    }
};

module.exports = {
    createCategoryOffer,
    getCategoryOffers,
    updateCategoryOffer,
    deleteCategoryOffer
};
