const User = require("../../models/userSchema.js")
const Product = require("../../models/productSchema.js")
const Category = require("../../models/categoryModel.js")
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

const loadHomepage = async (req,res) => {
    try {
        const newArrivals = await Product.find({
            isBlocked: false,
            status: 'In Stock'
        })
        .populate('category', 'name')
        .sort({ createdAt: -1 }) 
        .limit(8)
        .lean();

        const formattedProducts = newArrivals.map(product => ({
            ...product,
            formattedRegularPrice: `₹${product.regularPrice.toLocaleString('en-IN')}`,
            formattedSalePrice: product.salePrice ? `₹${product.salePrice.toLocaleString('en-IN')}` : null,
            discount: product.salePrice 
                ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
                : 0
        }));

        let userData = null;
        if (req.session.userId) {
            userData = await User.findById(req.session.userId).lean();
        }

        const categories = await Category.find({ isActive: true }).lean();

        return res.render("home", {
            newArrivals: formattedProducts,
            categories,
            user: userData
        });
        
    } catch (error) {
        console.log("Error loading home page:", error);
        res.status(500).send("Server error");
    }    
}

const loadLogin = async (req,res) => {
   try {

      return res.render("login");
      
   } catch (error) {
      console.log("signup page not found");
      res.status(500).send("server error");     
   }   
}

const login = async (req,res) => {
   try {
      let {email,password} = req.body;

      let findUser = await User.findOne({email});
      if(!findUser) {
         return res.render("login", { message: "Invalid email or password"});
      }

      if(findUser.isBlocked) {
         return res.render("login", { message: "Your account has been blocked. Please contact support."});
      }

      let compare = await bcrypt.compare(password,findUser.password);
 
      if(!compare) {
         return res.render("login", { message: "Invalid email or password" });
      }

      // Set user session
      req.session.userId = findUser._id;
      req.session.isBlocked = findUser.isBlocked;
      
      res.redirect('/');
   } catch (error) {
      console.error("Error during login:", error);
      res.render("login", { message: "Server error occurred" }); 
   }   
}

const loadSignUp = async (req,res) => {
   try {
      
      return res.render("signUp");

   } catch (error) {
      console.log('Signup not found');
      res.status(500).send("Server error");
   }
}

const loadOtp = async (req,res) => {
   
   try {

      return res.render("otp");
      
   } catch (error) {
      console.log("Error loading the otp Page :",error.message);
      res.status(500).send("Unable to load the page");     
   }
}

function genarateOtp() {
   return Math.floor(1000 + Math.random() * 9000).toString(); // Ensures a 4-digit number
 }

 async function sendVerificationEmail(email,otp) {
   debug("Starting to send email to %s with OTP %s", email, otp);
      console.log("verification email and otp",email,otp)
      try {
         const transporter = nodemailer.createTransport({

            service : "gmail",
            port : 587,
            secure : false,
            requireTLS: true,
            auth:{
               user:process.env.NODEMAILER_EMAIL,
               pass:process.env.NODEMAILER_PASS,
            } 
         });

         const info = await transporter.sendMail({
            from : process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify you account",
            text: `Your OTP is ${otp}`,
            html:`<b> Your OTP is ${otp} </b>`
         });

         debug("Email sent successfully. Info: %O", info);
         return info.accepted.length>0
         
      } catch (error) {
         console.error("Error sending the email",error);
         return false;      
      }   
 }

const signUp = async (req,res) => {
      const {firstName,password,confirmPassword,email,lastName,phoneNumber} = req.body;
      try {
       
         console.log(req.body)
         if(password!=confirmPassword) return res.render("signUp",{message:"password do not match"});
         const findUser = await User.findOne({email});
         if(findUser) {
            return res.render('signUp',{message:"user alredy exist"});
         }

         const otp = genarateOtp();

         const emailSent = await sendVerificationEmail(email,otp);

         if(!emailSent) {
            return res.json("email-error");
         }

         req.session.userOtp = otp;
         req.session.userData = {email,password,firstName,lastName,phoneNumber};

         res.render("otp");
         console.log("Otp sent",otp);
         

         
      } catch (error) {
         console.error("signup error",error);
         res.redirect('/pageNotFound');
      }  
}

const verifyOtp = async (req,res) => {
   const {otp} = req.body;

   try {
      if (!req.session.userOtp || !req.session.userData) {
         return res.status(400).json({ 
            success: false, 
            message: 'OTP verification failed. Please request a new OTP.' 
         });
      }

      if (req.session.userOtp === otp) {
         
         const {email, password, firstName, lastName, phoneNumber} = req.session.userData;

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

const loadProuductDetails = async (req, res) => {
    try {

        const productId = req.params.id;
        
        const product = await Product.findById(productId)
            .populate('category')
            .lean();

        if (!product) {
            return res.status(404).render('error', { 
                message: 'Product not found' 
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

        return res.render('productDetail', {
            product,
            relatedProducts: formattedRelatedProducts,
            user: req.session?.user || null
        });

    } catch (error) {
        console.error('Error in loadProuductDetails:', error);
        return res.status(500).render('error', { 
            message: 'Internal server error' 
        });
    }
};

const logout = async (req, res) => {
    try {
        // Destroy the session
        req.session.destroy();
        res.redirect('/login');
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).render("error", { message: "Logout failed" });
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
    loadProuductDetails,
    logout
};
