const Category = require('../../models/categoryModel');

const addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, discountValue, startDate, endDate, maxDiscountAmount } = req.body;
        
        const existingCategory = await Category.findOne({
            _id: categoryId,
            'offer.isActive': true,
            'offer.endDate': { $gt: new Date() }
        });

        if (existingCategory && existingCategory.offer && existingCategory.offer.isActive) {
            return res.status(400).json({
                success: false,
                message: 'An active offer already exists for this category'
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                offer: {
                    discountType: 'percentage',
                    discountValue: Number(discountValue),
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
                    isActive: true
                }
            },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category offer added successfully',
            offer: updatedCategory.offer
        });
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add category offer'
        });
    }
};

const getCategoryOffers = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            offer: category.offer
        });
    } catch (error) {
        console.error('Error fetching category offers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category offers'
        });
    }
};

module.exports = {
    addCategoryOffer,
    getCategoryOffers
};
