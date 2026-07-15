const Booking = require("../models/booking");
const Listing = require("../models/listing");
module.exports.createBooking = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);

    const { checkIn, checkOut } = req.body.booking;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // 🎯 KEY FOCUS 1: Allow same-day by changing <= to <
    if (checkOutDate < checkInDate) {
        req.flash("error", "Check-out date cannot be before check-in date.");
        return res.redirect(`/listings/${id}`);
    }

    // 🎯 KEY FOCUS 2: Use $lte and $gte so same-day overlaps are caught
    const overlappingBookings = await Booking.find({
        listing: listing._id,
        status: { $ne: 'cancelled' }, 
        $and: [
            { checkIn: { $lte: checkOutDate } },
            { checkOut: { $gte: checkInDate } }
        ]
    });

    if (overlappingBookings.length > 0) {
        req.flash("error", "Sorry, these dates are already booked! Please select different dates.");
        return res.redirect(`/listings/${id}`);
    }

    // 🎯 KEY FOCUS 3: Handle Same-Day Pricing (Minimum 1 day)
    const diffTime = Math.abs(checkOutDate - checkInDate);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 0) {
        diffDays = 1; // If check-in and check-out are the same day, charge for 1 day
    }
    
    const totalPrice = diffDays * listing.price;

    const newBooking = new Booking({
        listing: listing._id,
        guest: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: totalPrice
    });

    await newBooking.save();
    req.flash("success", "Booking request sent successfully!");
    res.redirect(`/listings/${id}`); 
};