const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require("../controllers/admin/adminController");
const adminAuth = require("../middleware/adminAuth");

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

router.get("/", adminAuth.isadminLogin, adminController.loadLogin);
router.post("/login", adminController.login);

router.get("/dashboard", adminAuth.isAdmin, adminController.loadDashboard);

router.get("/user", adminAuth.isAdmin, adminController.loadUser);
router.post("/user/:userId", adminAuth.isAdmin, adminController.toggleBlockUser);

router.get("/category", adminAuth.isAdmin, adminController.loadCategory);
router.post("/addCategory", adminAuth.isAdmin, adminController.addCategory);
router.post("/category/:id", adminAuth.isAdmin, adminController.toggleCategory);
router.delete("/category/:id", adminAuth.isAdmin, adminController.deleteCategory);
router.get("/editCategory/:id", adminAuth.isAdmin, adminController.loadEditCategory);
router.put("/category/:id", adminAuth.isAdmin, adminController.updateCategory);

router.get("/product", adminAuth.isAdmin, adminController.loadProduct);
router.get("/addProduct", adminAuth.isAdmin, adminController.loadAddProduct);
router.post("/addProduct", adminAuth.isAdmin, upload.array('images', 10), adminController.addProduct);
router.post("/product/:id", adminAuth.isAdmin, adminController.toggleBlockProduct);
router.get("/editProduct/:id", adminAuth.isAdmin, adminController.loadEditProduct);
router.post("/editProduct/:id", adminAuth.isAdmin, upload.array('images', 10), adminController.updateProduct);
router.post("/product/:productId/deleteImage", adminAuth.isAdmin, adminController.deleteProductImage);
router.put('/product/:id/delete', adminAuth.isAdmin, adminController.deleteProduct);

router.get("/logout", adminAuth.isAdmin, adminController.logout);

module.exports = router;
