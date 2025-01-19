const User = require("../../models/userSchema.js");
const Category = require("../../models/categoryModel.js");
const Product = require("../../models/productSchema.js");
const Order = require("../../models/orderSchema.js");
const sharp = require("sharp");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { isAdmin } = require("../../middleware/adminAuth.js");

const securePassword = async (password) => {
    try {
        const hash = await bcrypt.hash(password, 10);
        return hash;
    } catch (error) {
        console.error("Error in password hashing:", error.message);
        throw new Error("Password hashing failed");
    }
}

const loadLogin = async (req, res) => {
    try {
        return res.render("adminLogin");
    } catch (error) {
        console.log(error)
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const findId = await User.findOne({ email });
        if (!findId || !findId.isAdmin) {
            return res.render("adminLogin", { message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, findId.password);
        if (!isMatch) {
            return res.render("adminLogin", { message: "Invalid  password" });
        }
        
        req.session.admin = true;
        req.session.adminId = findId._id;
        
        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.render("adminLogin", { message: "Server error occurred" });
    }
}

const loadUser = async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let query = { isAdmin: false };
        
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query);
        return res.render("user", { users, searchQuery });
    } catch (error) {
        console.log(error);
        return res.status(500).render("error", { message: "Internal server error" });
    }
};

const toggleBlockUser = async (req,res) => {

    const userId = req.params.userId;

    try {

        const user = await  User.findById(userId);
        if(!user) {
            return res.status(404).json({success:false,message:"user not found"});
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({success:true,message:`User ${user.isBlocked?'blocked':'unblocked'} successfully`});

    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"Server error"});       
    }

}

const loadCategory = async (req,res) => {
    
    try {
        const categories = await Category.find({ isDeleted: { $ne: true } });
        res.render("category",{categories});
    } catch (error) {
        console.log("error occured in the loadCategory :",error.message);
        res.status(500).send({message:"failed to load category"});
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required"
            });
        }

        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        
        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Category with this name already exists!"
            });
        }

        const category = new Category({
            name: name.trim(),
            description: description.trim(),
            isActive: true
        });
        
        const savedCategory = await category.save();
        
        return res.status(201).json({
            success: true,
            message: "Category added successfully!",
            category: savedCategory
        });

    } catch (error) {
        console.error("Error in addCategory:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add category",
            error: error.message
        });
    }
};

const toggleCategory = async (req,res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        category.isActive = !category.isActive;
        await category.save();

        return res.json({
            success: true,
            message: `Category ${category.isActive ? 'listed' : 'unlisted'} successfully`
        });

    } catch (error) {
        console.error("Error in toggleCategory:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update category status"
        });
    }
}

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        category.isDeleted = true;
        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error('Error in deleteCategory:', error);
        return res.status(500).json({success:false,message:"Failed to edit category"});
    }
};

const loadEditCategory = async (req,res) => {

    try {

        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if(!category && category.isDeleted) {
            return res.redirect("/category");
        } else {
            res.render("editCategory",{category});
        }

    } catch (error) {
        console.log("failed to loadEditCategory :",error.message);     
        return res.status(500).json({success:false,message:"Failed to load editCategory"});  
    }
    
}

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }

        const existingCategory = await Category.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name}$`, 'i') }, 
            isDeleted: { $ne: true }
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json({ 
            message: 'Category updated successfully',
            category: updatedCategory 
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const loadProduct = async (req,res) => {
    try {
        const searchQuery = req.query.search;
        let query = {};

        if (searchQuery) {
            query = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { 'category.name': { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        const products = await Product.find(query)
            .populate('category', 'name')
            .lean();

        const productsWithImages = products.map(product => ({
            ...product,
            images: product.images.map(image => image.startsWith('http') ? image : image),
            stockStatus: product.stock <= 0 ? 'Out of Stock' : 'In Stock'
        }));

        res.render("product", { 
            products: productsWithImages,
            searchQuery: searchQuery || '',
            error: null
        });
    } catch (error) {
        console.log("Error loading products:", error.message);
        res.render("product", {
            products: [],
            searchQuery: searchQuery || '',
            error: "Failed to load products. Please try again."
        });
    }
}

const loadAddProduct = async (req,res) => {

    try {

       const categories = await Category.find();
       const products = await Product.find();
       console.log(categories);
       console.log(products.name);
       return  res.render("addProduct",{categories,products});
        
    } catch (error) {
        console.log("Error loading the add Product :",error.message);
        return res.status(500).json({messge:"Internal error"});         
    }
    
}

const addProduct = async (req, res) => {
    try {
        const { name, category, regularPrice, salePrice, stock, description, tags } = req.body;
        
        
        if (!name || !category || !regularPrice || !stock) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }

        if (!req.files || req.files.length <3) {
            return res.status(400).json({ 
                success: false,
                message: 'Please upload at least three images' 
            });
        }

        const uploadDir = 'public/uploads/products';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const imagePromises = req.files.map(async file => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = `${uniqueSuffix}-${file.originalname}`;
            const imagePath = `/uploads/products/${filename}`;
            
            await sharp(file.buffer)
                .resize(800, 800, { fit: 'contain' })
                .toFile(`public${imagePath}`);
            
            return imagePath;
        });

        const imagePaths = await Promise.all(imagePromises);

        let processedTags = [];
        if (tags) {
            try {
                processedTags = JSON.parse(tags);
            } catch (e) {
                processedTags = tags.split(',').map(tag => tag.trim());
            }
        }

        const product = new Product({
            name: name.trim(),
            category,
            regularPrice: Number(regularPrice),
            salePrice: salePrice ? Number(salePrice) : undefined,
            stock: Number(stock),
            description: description ? description.trim() : '',
            images: imagePaths,
            tags: processedTags,
            status: Number(stock) > 0 ? 'In Stock' : 'Out of Stock'
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product
        });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product',
            error: error.message
        });
    }
};

const toggleBlockProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        product.isBlocked = !product.isBlocked;
        await product.save();

        return res.json({
            success: true,
            message: `Product ${product.isBlocked ? 'blocked' : 'unblocked'} successfully`,
            isBlocked: product.isBlocked });

    } catch (error) {
        console.error("Error in toggleBlockProduct:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('category');
        const categories = await Category.find({ isDeleted: { $ne: true }, isActive: true });
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.render('editProduct', {
            product,
            categories
        });
    } catch (error) {
        console.error('Error in loadEditProduct:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, regularPrice, salePrice, category, stock } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const imagePath = `/uploads/products/${Date.now()}-${file.originalname}`;
                await sharp(file.buffer)
                    .resize(800, 800, { fit: 'cover' })
                    .toFile(`./public${imagePath}`);
                return imagePath;
            });

            const newImages = await Promise.all(uploadPromises);
            
            if (product.images && product.images.length > 0) {
                product.images = [...product.images, ...newImages];
            } else {
                product.images = newImages;
            }
        }

        if (product.images.length < 3) {
            return res.status(400).json({ 
                success: false, 
                message: `Product must have at least 3 images. Current: ${product.images.length}, Required: ${3 - product.images.length} more` 
            });
        }

        product.name = name;
        product.description = description;
        product.regularPrice = Number(regularPrice);
        product.salePrice = salePrice ? Number(salePrice) : Number(regularPrice);
        product.category = category;
        product.stock = Number(stock);
        product.status = Number(stock) > 0 ? 'In Stock' : 'Out of Stock';

        await product.save();
        
        return res.status(200).json({ 
            success: true, 
            message: "Product updated successfully",
            product: product
        });
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ success: false, message: "Error updating product" });
    }
};

const deleteProductImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const { imageUrl } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.images.length <= 3) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete the last image. Product must have at least 3 images.' 
            });
        }

        product.images = product.images.filter(img => img !== imageUrl);
        const imagePath = `public/${imageUrl}`;
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        await product.save();
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error in deleteProductImage:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndUpdate(productId, { isDeleted: true });
        res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error in deleteProduct:", error);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
};

const getDateRange = (timeFrame) => {
    const now = new Date();
    let startDate = new Date();
    const endDate = now;

    switch (timeFrame) {
        case 'daily':
            startDate.setDate(now.getDate() - 30); 
        case 'weekly':
            startDate.setDate(now.getDate() - (7 * 12)); 
            break;
        case 'monthly':
            startDate.setMonth(now.getMonth() - 12);
            break;
        case 'yearly':
            startDate.setFullYear(now.getFullYear() - 5);
            break;
        default:
            startDate.setDate(now.getDate() - 30); 
    }

   
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
};

const formatDateForGrouping = (date, timeFrame) => {
    const d = new Date(date);
    switch (timeFrame) {
        case 'daily':
            return d.toISOString().split('T')[0]; 
        case 'weekly':
            const weekStart = new Date(d);
            while (weekStart.getDay() !== 0) { 
                weekStart.setDate(weekStart.getDate() - 1);
            }
            return `Week of ${weekStart.toISOString().split('T')[0]}`;
        case 'monthly':
            return d.toLocaleString('default', { year: 'numeric', month: 'long' });
        case 'yearly':
            return d.getFullYear().toString();
        default:
            return d.toISOString().split('T')[0];
    }
};

const getSalesData = async (req, res) => {
    try {
        const timeFrame = req.query.timeFrame || 'daily';
        const { startDate, endDate } = getDateRange(timeFrame);
        
        console.log('Fetching sales data:', {
            timeFrame,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });

        let dateFormat, groupId;
        switch (timeFrame) {
            case 'daily':
                dateFormat = '%Y-%m-%d';
                groupId = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' },
                    day: { $dayOfMonth: '$orderDate' }
                };
                break;
            case 'weekly':
                dateFormat = '%Y-W%U';
                groupId = {
                    year: { $year: '$orderDate' },
                    week: { $week: '$orderDate' }
                };
                break;
            case 'monthly':
                dateFormat = '%Y-%m';
                groupId = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' }
                };
                break;
            case 'yearly':
                dateFormat = '%Y';
                groupId = {
                    year: { $year: '$orderDate' }
                };
                break;
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Delivered',
                    paymentStatus: 'Paid',
                    isReturned: { $ne: true },
                    orderDate: { 
                        $gte: startDate,
                        $lte: endDate 
                    }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: groupId,
                    revenue: {
                        $sum: {
                            $subtract: [
                                { $multiply: ['$items.price', '$items.quantity'] },
                                { $ifNull: ['$discountAmount', 0] }
                            ]
                        }
                    },
                    orderCount: { $sum: 1 },
                    itemCount: { $sum: '$items.quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: dateFormat,
                            date: {
                                $dateFromParts: {
                                    'year': '$_id.year',
                                    'month': { $ifNull: ['$_id.month', 1] },
                                    'day': { $ifNull: ['$_id.day', 1] }
                                }
                            }
                        }
                    },
                    revenue: 1,
                    orderCount: 1,
                    itemCount: 1
                }
            },
            {
                $sort: { 'date': 1 }
            }
        ]);

        console.log('Raw sales data:', salesData);

        let formattedData = new Map();

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            let key;
            switch (timeFrame) {
                case 'daily':
                    key = currentDate.toISOString().split('T')[0];
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    const weekNum = Math.ceil((currentDate.getDate() - 1) / 7);
                    key = `${currentDate.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'yearly':
                    key = currentDate.getFullYear().toString();
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
            }
            formattedData.set(key, 0);
        }

        // Fill in actual data
        salesData.forEach(data => {
            if (formattedData.has(data.date)) {
                formattedData.set(data.date, data.revenue);
            }
        });

        // Convert to arrays for response
        const labels = Array.from(formattedData.keys()).map(date => {
            switch (timeFrame) {
                case 'daily':
                    return new Date(date).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short'
                    });
                case 'weekly':
                    const [year, week] = date.split('-W');
                    return `Week ${week}`;
                case 'monthly':
                    return new Date(date + '-01').toLocaleDateString('en-IN', { 
                        month: 'short',
                        year: 'numeric'
                    });
                case 'yearly':
                    return date;
                default:
                    return date;
            }
        });

        const values = Array.from(formattedData.values());

        console.log('Formatted response:', {
            labels,
            values,
            timeFrame
        });

        res.json({
            success: true,
            labels,
            values
        });

    } catch (error) {
        console.error('Error getting sales data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get sales data',
            error: error.message 
        });
    }
};

const loadDashboard = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({ isDeleted: { $ne: true } });
        const totalUsers = await User.countDocuments({ isAdmin: false, isBlocked: false });
        
        const totalOrders = await Order.countDocuments();
        
        const revenueStats = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Delivered',
                    paymentStatus: 'Paid',
                    isRefunded: { $ne: true }
                }
            },
            {
                $unwind: '$items'  
            },
            {
                $group: {
                    _id: null,
                    itemsTotal: {
                        $sum: {
                            $multiply: ['$items.price', '$items.quantity'] 
                        }
                    },
                    shippingTotal: { $sum: '$shippingFee' },
                    discountTotal: { $sum: { $add: ['$discountAmount', { $ifNull: ['$coupon.discountAmount', 0] }] } },
                    totalItemsSold: { $sum: '$items.quantity' }
                }
            }
        ]);

        const totalRevenue = revenueStats[0] ? 
            (revenueStats[0].itemsTotal + (revenueStats[0].shippingTotal || 0) - revenueStats[0].discountTotal) : 0;
        const totalItemsSold = revenueStats[0]?.totalItemsSold || 0;

        const orderStats = await Order.aggregate([
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                    itemsRevenue: { 
                        $sum: { $multiply: ['$items.price', '$items.quantity'] }
                    },
                    shippingTotal: { $sum: '$shippingFee' },
                    discountTotal: { $sum: { $add: ['$discountAmount', { $ifNull: ['$coupon.discountAmount', 0] }] } }
                }
            }
        ]);

        const orderStatusCounts = {
            'Pending': { count: 0, revenue: 0 },
            'Processing': { count: 0, revenue: 0 },
            'Shipped': { count: 0, revenue: 0 },
            'Delivered': { count: 0, revenue: 0 },
            'Cancelled': { count: 0, revenue: 0 },
            'Returned': { count: 0, revenue: 0 }
        };

        orderStats.forEach(stat => {
            if (stat._id in orderStatusCounts) {
                const totalRevenue = stat.itemsRevenue + (stat.shippingTotal || 0) - (stat.discountTotal || 0);
                orderStatusCounts[stat._id] = {
                    count: stat.count,
                    revenue: parseFloat(totalRevenue.toFixed(2))
                };
            }
        });

        const recentOrders = await Order.find()
            .sort({ orderDate: -1 })
            .limit(5)
            .populate('userId', 'name email');

        res.render('dashboard', {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue: totalRevenue.toFixed(2),
            totalItemsSold,
            orderStatusCounts,
            recentOrders,
            averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
};

const getTopProducts = async (req, res) => {
    try {
        const orders = await Order.find({ 
            status: 'delivered',
            paymentStatus: 'completed',
            'items.product': { $exists: true }
        })
        .populate('items.product', 'name price images')
        .sort('-createdAt')
        .limit(100); 

        const productSales = new Map();
        
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!item.product) return;
                
                const productId = item.product._id.toString();
                const currentStats = productSales.get(productId) || {
                    name: item.product.name,
                    unitsSold: 0,
                    revenue: 0,
                    imageUrl: item.product.images?.[0] || ''
                };

                currentStats.unitsSold += item.quantity;
                currentStats.revenue += item.price * item.quantity;
                productSales.set(productId, currentStats);
            });
        });

        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map(product => ({
                ...product,
                revenue: parseFloat(product.revenue.toFixed(2)),
                unitsSold: parseInt(product.unitsSold)
            }));

        res.json({ 
            success: true, 
            products: topProducts 
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ success: false, message: 'Error fetching top products' });
    }
};

const getTopCategories = async (req, res) => {
    try {
        const categoryStats = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Delivered',
                    paymentStatus: 'Paid',
                    isRefunded: { $ne: true }
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $match: {
                    'category.isDeleted': { $ne: true }
                }
            },
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: '$category.name' },
                    sales: {
                        $sum: {
                            $subtract: [
                                { $multiply: ['$items.price', '$items.quantity'] },
                                { $ifNull: ['$discountAmount', 0] }
                            ]
                        }
                    },
                    unitsSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 10 }
        ]);

        console.log('Category stats:', categoryStats);

        res.json({
            success: true,
            categories: categoryStats.map(cat => ({
                name: cat.name,
                sales: parseFloat(cat.sales.toFixed(2)),
                unitsSold: cat.unitsSold
            }))
        });
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching category statistics'
        });
    }
};



const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).json({ message: "Logout failed" });
    }
};

module.exports = {
    loadLogin,
    login,
    loadUser,
    toggleBlockUser,
    loadCategory,
    addCategory,
    toggleCategory,
    deleteCategory,
    loadEditCategory,
    updateCategory,
    loadProduct,
    loadAddProduct,
    addProduct,
    toggleBlockProduct,
    loadEditProduct,
    updateProduct,
    deleteProductImage,
    deleteProduct,
    loadDashboard,
    getSalesData,
    getTopProducts,
    getTopCategories,
    logout
};