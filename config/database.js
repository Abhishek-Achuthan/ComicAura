const mongoose = require("mongoose");
const env = require("dotenv").config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB conncected");
    } catch (error) {
        console.log("DB connection error",error.message);
        process.exitCode(1);
    }
}

module.exports = connectDB;