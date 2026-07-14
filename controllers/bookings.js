const Booking = require("../models/booking");
const Listing = require("../models/listing");

module.exports.createBooking = async (req, res) => {
    // 1. Find the specific listing being booked
    let { id } = req.params;
    const listing = await Listing.findById(id);

    // 2. Extract the dates from the form
    const { checkIn, checkOut } = req.body.booking;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // 3. Security Guard: Prevent time travel (Checkout must be after Checkin)
    if (checkOutDate <= checkInDate) {
        req.flash("error", "Check-out date must be after check-in date.");
        return res.redirect(`/listings/${id}`);
    }

    // 4. Calculate total days and total price
    const diffTime = Math.abs(checkOutDate - checkInDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const totalPrice = diffDays * listing.price;

    // 5. Build the Booking document
    const newBooking = new Booking({
        listing: listing._id,
        guest: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: totalPrice
    });

    // 6. Save and redirect
    await newBooking.save();
    req.flash("success", "Booking request sent successfully!");
    res.redirect(`/listings/${id}`); 
};