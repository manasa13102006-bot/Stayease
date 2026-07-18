const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    otpCode: {
        type: String,
        required: true,
    },
    // 🎯 KEY FOCUS 1: The TTL Index
    // This tells MongoDB to automatically delete this document 600 seconds (10 minutes) after it is created.
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 
    }
});

module.exports = mongoose.model("OTP", otpSchema);