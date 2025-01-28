const User = require("../../models/userSchema.js")
const Product = require("../../models/productSchema.js")
const Cart = require("../../models/cartSchema.js");
const Category = require("../../models/categoryModel.js")
const Wishlist = require("../../models/wishlistModel.js")
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const debug = require("debug")("email-sender");
const bcrypt = require("bcrypt");

const securePassword = async (password) => {
    try {
        const hash = await bcrypt.hash(password, 10);
        return hash;
    } catch (error) {
        console.error("Error in password hashing:", error.message);
        throw new Error("Password hashing failed");
    }
}

const loadHomepage = async (req, res) => {
    try {
        const userId = req.session.userId;
        let cart = null;
        let wishlist = null;

        if (userId) {
            cart = await Cart.findOne({ userId });
            wishlist = await Wishlist.findOne({ user: userId });
        }

        const newArrivals = await Product.find({
            isBlocked: false,
            status: 'In Stock'
        })
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const productsWithStatus = newArrivals.map(product => {
            const productObj = product;
            if (cart) {
                productObj.inCart = cart.items.some(item => 
                    item.productId.toString() === product._id.toString()
                );
            }
            if (wishlist) {                                                             
                productObj.inWishlist = wishlist.products.some(id => 
                    id.toString() === product._id.toString()
                );
            }
            productObj.formattedRegularPrice = `₹${product.regularPrice.toLocaleString('en-IN')}`;
            if (product.salePrice) {
                productObj.formattedSalePrice = `₹${product.salePrice.toLocaleString('en-IN')}`;
                productObj.discount = Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100);
            }
            return productObj;
        });

        let userData = null;
        if (req.session.userId) {
            userData = await User.findById(req.session.userId).lean();
        }

        const categories = await Category.find({ isActive: true }).lean();

        res.render("home", {
            newArrivals: productsWithStatus,
            categories,
            user: userData
        });

    } catch (error) {
        console.error("Error in loadHomepage:", error);
        res.status(500).render("home", { error: "Failed to load homepage" });
    }
}

const loadLogin = async (req, res) => {
    try {
        res.render("login");
    } catch (error) {
        res.status(500).send("server error");
    }
}

const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        let findUser = await User.findOne({ email });
        if (!findUser) {
            return res.render("login", { 
                error: "Invalid email or password" 
            });
        }

        if (findUser.isBlocked) {
            return res.render("login", { 
                error: "Your account has been blocked. Please contact support." 
            });
        }

        let compare = await bcrypt.compare(password, findUser.password);

        if (!compare) {
            return res.render("login", { 
                error: "Invalid email or password" 
            });
        }

        req.session.userId = findUser._id;
        req.session.isBlocked = findUser.isBlocked;

        res.redirect('/');
    } catch (error) {
        console.error("Error during login:", error);
        res.render("login", { 
            error: "Server error occurred" 
        });
    }
}

const loadSignUp = async (req, res) => {
    try {
        res.render("signUp");
    } catch (error) {
        console.log('Signup not found');
        res.status(500).send("Server error");
    }
}

const loadOtp = async (req, res) => {
    try {
        res.render("otp");
    } catch (error) {
        res.status(500).send("Unable to load the page");
    }
}

function genarateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString(); 
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify you account",
            text: `Your OTP is ${otp}`,
            html: `<b> Your OTP is ${otp} </b>`
        });

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending the email", error);
        return false;
    }
}

const signUp = async (req, res) => {
    const { firstName, password, confirmPassword, email, lastName, phoneNumber } = req.body;
    try {
        if (password != confirmPassword) return res.render("signUp", { message: "password do not match" });
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render('signUp', { message: "user alredy exist" });
        }

        const otp = genarateOtp();

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { email, password, firstName, lastName, phoneNumber };

        res.render("otp");
    } catch (error) {
        console.error("signup error", error);
        res.redirect('/pageNotFound');
    }
}

const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    try {
        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({
                success: false,
                message: 'OTP verification failed. Please request a new OTP.'
            });
        }

        if (req.session.userOtp === otp) {
            const { email, password, firstName, lastName, phoneNumber } = req.session.userData;

            try {
                const hashedPassword = await securePassword(password);

                const newUser = new User({
                    email: email,
                    password: hashedPassword,
                    firstName: firstName,
                    lastName: lastName,
                    phoneNumber: phoneNumber,
                    isVerified: true
                });

                await newUser.save();

                req.session.user = newUser;

                delete req.session.userOtp;
                delete req.session.userData;

                return res.status(200).json({
                    success: true,
                    message: 'Account verified successfully!'
                });
            } catch (error) {
                console.error("Error in user creation:", error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create user account. Please try again.'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }
    } catch (error) {
        console.error('Error in OTP verification:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during verification. Please try again.'
        });
    }
}

const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData) {
            return res.status(400).json({
                success: false,
                message: 'User data not found. Please sign up again.'
            });
        }

        const otp = genarateOtp();

        const emailSent = await sendVerificationEmail(req.session.userData.email, otp);

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again.'
            });
        }

        req.session.userOtp = otp;

        return res.status(200).json({
            success: true,
            message: 'New OTP has been sent to your email'
        });
    } catch (error) {
        console.error('Error in resending OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while resending OTP'
        });
    }
}

const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId)
            .populate('category')
            .lean();

        if (!product || product.isBlocked) {
            return res.status(404).render('error', {
                message: 'Product not found or unavailable'
            });
        }

        product.formattedRegularPrice = `₹${product.regularPrice.toLocaleString('en-IN')}`;

        if (product.salePrice) {
            product.formattedSalePrice = `₹${product.salePrice.toLocaleString('en-IN')}`;
            product.discount = Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100);
        }

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
            isBlocked: false,
            status: 'In Stock'
        })
            .limit(4)
            .lean();

        const formattedRelatedProducts = relatedProducts.map(prod => ({
            ...prod,
            formattedRegularPrice: `₹${prod.regularPrice.toLocaleString('en-IN')}`,
            formattedSalePrice: prod.salePrice ? `₹${prod.salePrice.toLocaleString('en-IN')}` : null,
            discount: prod.salePrice
                ? Math.round(((prod.regularPrice - prod.salePrice) / prod.regularPrice) * 100)
                : 0
        }));

        res.render('productDetail', {
            product,
            relatedProducts: formattedRelatedProducts,
            user: req.session?.user || null
        });
    } catch (error) {
        console.error('Error in loadProductDetails:', error);
        return res.status(500).render('error', {
            message: 'Internal server error'
        });
    }
};

const logout = async (req, res) => {
    try {
        req.session.userId = null;
        res.redirect('/login');
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).render("error", { message: "Logout failed" });
    }
};

async function sendPasswordResetEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Reset Your Password - ComicAura",
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested to reset your password. Use the OTP below to reset it:</p>
                <h2 style="color: #FF4500; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>This OTP will expire in 10 minutes.</p>
            `
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending password reset email:", error);
        return false;
    }
}

const loadForgotPassword = async (req, res) => {
    try {
        res.render("forgotPassword");
    } catch (error) {
        console.error("Error loading forgot password page:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email address"
            });
        }

        const otp = genarateOtp();
        const otpExpiry = Date.now() + 600000; 

        req.session.resetPasswordEmail = email;
        req.session.resetPasswordOTP = otp;
        req.session.resetPasswordOTPExpiry = otpExpiry;

        const emailSent = await sendPasswordResetEmail(email, otp);

        if (!emailSent) {
            throw new Error("Failed to send password reset email");
        }

        res.json({
            success: true,
            message: "Password reset OTP sent to your email"
        });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process password reset request"
        });
    }
};

const verifyResetOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!req.session.resetPasswordOTP || !req.session.resetPasswordEmail || !req.session.resetPasswordOTPExpiry) {
            return res.status(400).json({
                success: false,
                message: "Password reset session expired. Please try again."
            });
        }

        if (Date.now() > req.session.resetPasswordOTPExpiry) {
            delete req.session.resetPasswordOTP;
            delete req.session.resetPasswordEmail;
            delete req.session.resetPasswordOTPExpiry;
            
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        if (otp !== req.session.resetPasswordOTP) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }

        res.json({
            success: true,
            message: "OTP verified successfully"
        });
    } catch (error) {
        console.error("Error verifying reset OTP:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify OTP"
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!req.session.resetPasswordEmail) {
            return res.status(400).json({
                success: false,
                message: "Password reset session expired. Please try again."
            });
        }

        const user = await User.findOne({ email: req.session.resetPasswordEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const hashedPassword = await securePassword(newPassword);
        user.password = hashedPassword;
        await user.save();

        delete req.session.resetPasswordOTP;
        delete req.session.resetPasswordEmail;
        delete req.session.resetPasswordOTPExpiry;

        res.json({
            success: true,
            message: "Password has been reset successfully"
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password"
        });
    }
};

module.exports = {
    loadHomepage,
    loadSignUp,
    signUp,
    loadLogin,
    login,
    loadOtp,
    verifyOtp,
    resendOtp,
    loadProductDetails,
    logout,
    loadForgotPassword,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
};
