const User = require("../../models/userSchema.js");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Category = require("../../models/categoryModel");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletModel");
const Wishlist = require("../../models/wishlistModel");
const Order = require("../../models/orderSchema");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const debug = require("debug")("email-sender");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadProfile = async (req, res) => {
    try {
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        const wallet = await Wallet.findOne({user: userId}) || { balance: 0, transactions: [] };
        const addresses = await Address.findOne({userId}) || { address: [] };
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
        const totalOrders = await Order.countDocuments({ userId });
        
        const userObj = user.toObject();
        userObj.orderCount = totalOrders;
        userObj.wishlistCount = wishlist ? wishlist.products.length : 0;
        
        return res.render('profile', {
            title: "User Profile",
            user: userObj,
            wallet,
            addresses,
            wishlist,
            success: req.session.success,
            error: req.session.error
        });

        delete req.session.success;
        delete req.session.error;

    } catch (error) {
        console.error('Error in loadProfile:', error);
        res.status(500).render('error', { 
            message: 'Error loading profile', 
            error 
        });
    }
};

const addAddress = async (req,res) => {
    try {
        const address = req.body;
        const userId = req.session.userId;

        if(!address) {
            return res.status(400).json({
                success: false,
                message: "Required all fields"
            });
        }

        const existingAddresses = await Address.findOne({ userId: userId });
        
        if (existingAddresses && existingAddresses.address.length >= 5) {
            return res.status(400).json({
                success: false,
                message: "Maximum address limit reached (5 addresses)"
            });
        }

        const newAddress = {
            name: address.name,
            phoneNumber: address.phoneNumber,
            country: address.country,
            street: address.street,
            state: address.state,
            city: address.city,
            pinCode: address.pinCode,
            addressType: address.addressType,
            isDefault: address.isDefault
        };
        let userAddress = await Address.findOne({ userId: userId });

        if (userAddress) {
            if (newAddress.isDefault) {
                userAddress.address.forEach(addr => {
                    addr.isDefault = false;
                });
            }
            userAddress.address.push(newAddress);
        } else {
            userAddress = new Address({
                userId,
                address: [newAddress]
            });
        }

        await userAddress.save();
        
        return res.status(200).json({
            success: true,
            message: "Address saved successfully"
        });

     } catch (error) {
        console.error("Error while adding address:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to add address"
        });
     }
 }

 const updateAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.addressId;
        const editedAddress = req.body;

        const userAddress = await Address.findOne({ userId: userId });
        if (!userAddress) {
            return res.status(404).json({
                success: false,
                message: "No addresses found for this user"
            });
        }

        const address = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        Object.assign(address, {
            name: editedAddress.name || editedAddress.fullName, 
            phoneNumber: editedAddress.phoneNumber || editedAddress.phone, 
            street: editedAddress.street,
            city: editedAddress.city,
            state: editedAddress.state,
            country: editedAddress.country,
            pinCode: editedAddress.pinCode,
            addressType: editedAddress.addressType,
            isDefault: editedAddress.isDefault === 'true' || editedAddress.isDefault === true
        });

        if (!address.name) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        if (!address.phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        if (address.isDefault) {
            userAddress.address.forEach(addr => {
                if (addr._id.toString() !== addressId) {
                    addr.isDefault = false;
                }
            });
        }

        await userAddress.save();

        return res.status(200).json({
            success: true,
            message: "Address updated successfully"
        });
        
    } catch (error) {
        console.log('Error updating address:', error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.addressId;

        const userAddresses = await Address.findOne({ userId: userId });
        if (!userAddresses) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const addressIndex = userAddresses.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        userAddresses.address.splice(addressIndex, 1);
        await userAddresses.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete address" });
    }
};

function genarateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString(); 
}

const changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

    
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.json({success: true,message: 'Password updated successfully'});

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

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
            subject: "Verify your email change",
            text: `Your OTP for email change is ${otp}`,
            html: `<b>Your OTP for email change is ${otp}</b>`
        });

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending the email", error);
        return false;
    }
}

const sendEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { newEmail } = req.body;

        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "This email is already registered"
            });
        }

        const otp = genarateOtp();
        const otpExpiry = Date.now() + 600000;

        req.session.emailChangeOTP = otp;
        req.session.emailChangeOTPExpiry = otpExpiry;
        req.session.newEmail = newEmail;

        const emailSent = await sendVerificationEmail(newEmail, otp);

        if (!emailSent) {
            throw new Error("Failed to send OTP email");
        }

        res.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("Error in sendEmailChangeOTP:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP"
        });
    }
};

const changeEmail = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { newEmail, otp } = req.body;

        if (!req.session.emailChangeOTP || !req.session.newEmail || !req.session.emailChangeOTPExpiry) {
            return res.status(400).json({
                success: false,
                message: "Email change session expired. Please try again."
            });
        }

        if (Date.now() > req.session.emailChangeOTPExpiry) {
            delete req.session.emailChangeOTP;
            delete req.session.newEmail;
            delete req.session.emailChangeOTPExpiry;
            
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        if (otp !== req.session.emailChangeOTP) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }

        if (newEmail !== req.session.newEmail) {
            return res.status(400).json({
                success: false,
                message: "Email mismatch. Please try again."
            });
        }

        const user = await User.findById(userId);
        user.email = newEmail;
        await user.save();

        delete req.session.emailChangeOTP;
        delete req.session.newEmail;
        delete req.session.emailChangeOTPExpiry;

        res.json({
            success: true,
            message: "Email changed successfully"
        });

    } catch (error) {
        console.error("Error in changeEmail:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change email"
        });
    }
};

const initiateWalletAddMoney = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: 'wallet_' + Date.now(),
            notes: {
                userId: userId.toString(),
                type: 'wallet_recharge'
            }
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order: order,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error initiating wallet money addition:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initiate wallet money addition'
        });
    }
};

const verifyWalletPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        const userId = req.session.userId;
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const amount = order.amount / 100; // Convert paise to rupees

        const wallet = await Wallet.getOrCreateWallet( userId );
         
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        await wallet.addTransaction('CREDIT', amount, `Added ₹${amount} via Razorpay (${razorpay_payment_id})`);

        res.status(200).json({
            success: true,
            message: 'Payment verified and wallet updated successfully'
        });
    } catch (error) {
        console.error('Error verifying wallet payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify payment'
        });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;

        let wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                products: [productId]
            });
        } else if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
        }

        await wishlist.save();

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist'
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add to wishlist'
        });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;

        const wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();

        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove from wishlist'
        });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
        return wishlist ? wishlist.products : [];
    } catch (error) {
        console.error('Error getting wishlist:', error);
        return [];
    }
};

const getOrders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name images price'
            })
            .select('orderId items orderDate orderStatus returnStatus returnReason rejectionReason isReturned returnRequested deliveryDate paymentMethod totalAmount')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);

        const processedOrders = orders.map(order => ({
            ...order.toObject(),
            items: order.items || []
        }));

        return res.json({
            success: true,
            orders: processedOrders,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Get Orders Error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { firstName, lastName, phoneNumber } = req.body;

        if (!firstName || !lastName || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "First name, last name and phone number are required"
            });
        }

        // Validate phone number format
        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit phone number"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.phoneNumber = phoneNumber;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    loadProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    changePassword,
    sendEmailChangeOTP,
    changeEmail,
    initiateWalletAddMoney,
    verifyWalletPayment,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    getOrders,
    getOrderDetails,
    updateProfile
};  