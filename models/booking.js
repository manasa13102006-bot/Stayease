const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },
    guest: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    
    // 🎯 KEY FOCUS 1: The State Machine
    bookingStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },

    // 🎯 KEY FOCUS 2: Financial Audit Trail
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    
    // 🎯 KEY FOCUS 3: Stripe Integration Link
    stripeSessionId: {
        type: String,
        // Not required initially, as it gets generated AFTER the pending booking is saved
    },

    // 🎯 KEY FOCUS 4: The Reservation Lock Expiry
    reservationExpiresAt: {
        type: Date,
        // Automatically delete/release this document if it stays 'pending' for 15 minutes
        expires: 900 
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

// 🎯 KEY FOCUS 5: Query Optimization Index
bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Booking", bookingSchema);