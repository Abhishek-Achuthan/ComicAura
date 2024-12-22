const User = require("../../models/userSchema.js");
const Product = require("../../models/productSchema.js");
const Cart = require("../../models/cartSchema.js");
const Category = require("../../models/categoryModel.js");
const Address = require("../../models/addressSchema.js");


const loadProfile = async (req, res) => {

    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
       if(!user) {
    
       return res.status(404).json({
          success:false,
          messages:"user not found"
       });
      }
      const addresses = await Address.findOne({userId:userId});
 
      return res.render('profile', {user : user,addresses});
       
    } catch (error) {
      console.log(error.message);
 
      return res.status(500).json({
       success:false,
       message:"Inter server error"
      });      
    }
 }

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
                message: "You can only add up to 5 addresses. Please delete an existing address to add a new one."
            });
        }

        const newAddress = {
            name: address.fullName,
            phoneNumber: address.phone,
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

 const updateAddress = async (req,res) => {
    try {
        console.log("hiii")
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

        const addressIndex = userAddress.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        userAddress.address[addressIndex] = {
            ...userAddress.address[addressIndex].toObject(),
            name: editedAddress.name,
            phoneNumber: editedAddress.phoneNumber,
            street: editedAddress.street,
            city: editedAddress.city,
            state: editedAddress.state,
            country: editedAddress.country,
            pinCode: editedAddress.pinCode,
            addressType: editedAddress.addressType,
            isDefault: editedAddress.isDefault === 'true' || editedAddress.isDefault === true
        };

        if (userAddress.address[addressIndex].isDefault) {
            userAddress.address.forEach((addr, index) => {
                if (index !== addressIndex) {
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
        console.error('Error updating address:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const deleteAddress = async (req, res) => {
    try {
        console.log("deleting address");
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

module.exports = {
    loadProfile,
    addAddress,
    updateAddress,
    deleteAddress
};