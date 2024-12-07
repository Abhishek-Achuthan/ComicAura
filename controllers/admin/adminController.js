const User = require("../../models/userSchema.js");
const Category = require("../../models/categoryModel.js");
const Product = require("../../models/productSchema.js");
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
            return res.render("adminLogin", { message: "Invalid email or password" });
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
        const users = await User.find({ isAdmin: false });
        return res.render("user", { users });
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
        
        // Validate input
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required"
            });
        }

        // Check for existing category
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        
        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Category with this name already exists!"
            });
        }

        // Create and save new category
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
        const products = await Product.find()
            .populate('category', 'name') // This will populate category with its name
            .lean(); 
        // Add full image URLs to products
        const productsWithImages = products.map(product => ({
            ...product,
            images: product.images.map(image => image.startsWith('http') ? image : image) // Keep image paths as is if they're URLs
        }));

        res.render("product", { products: productsWithImages });
    } catch (error) {
        console.log("Error loading products:", error.message);
        res.status(500).json({ message: "Failed to load products" });
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
        
        // Validate required fields
        if (!name || !category || !regularPrice || !stock) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }

        // Check if files were uploaded
        if (!req.files || req.files.length <=3) {
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
        const { name, description, regularPrice, salePrice, category } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const existingImagesCount = product.images.length;
        const newImagesCount = req.files?.images ? (Array.isArray(req.files.images) ? req.files.images.length : 1) : 0;
        const totalImagesCount = existingImagesCount + newImagesCount;

        if (totalImagesCount < 3) {
            return res.status(400).json({ 
                success: false, 
                message: `Product must have at least 3 images. Current: ${existingImagesCount}, New: ${newImagesCount}, Required: ${3 - totalImagesCount} more` 
            });
        }

        if (req.files?.images) {
            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const uploadPromises = images.map(async (file) => {
                const imagePath = `/uploads/products/${Date.now()}-${file.originalname}`;
                await sharp(file.buffer)
                    .resize(800, 800, { fit: 'cover' })
                    .toFile(`./public${imagePath}`);
                return imagePath;
            });

            const newImages = await Promise.all(uploadPromises);
            product.images.push(...newImages);
        }

        product.name = name;
        product.description = description;
        product.regularPrice = regularPrice;
        product.salePrice = salePrice || regularPrice;
        product.category = category;

        await product.save();
        return res.status(200).json({ success: true, message: "Product updated successfully" });
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

const loadDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalProducts = await Product.countDocuments();
        const totalCategories = await Category.countDocuments();
        
        res.render('dashboard', {
            totalUsers,
            totalProducts,
            totalCategories
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
}

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
    logout,
    loadDashboard
};