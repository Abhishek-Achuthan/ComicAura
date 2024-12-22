const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    address:[{
        name: {
            type : String,
            required : true,
        },
        phoneNumber : {
            type : Number,
            required : true,
        },
        country: {
            type : String,
            required : true,
        },
        state : {
            type : String,
            required : true,
        },
        city : {
            type : String,
            required : true,
        },
        street : {
            type : String,
            required : true,
        },
        pinCode : {
            type : Number,
            required : true,
        },
        addressType: {
            type: String,
            enum: ['home', 'work', 'other'],
            required: true
        },
        isDefault : {
            type : Boolean,
            required : true,
        }
    }]
    
});

module.exports = mongoose.model("Address",addressSchema);
