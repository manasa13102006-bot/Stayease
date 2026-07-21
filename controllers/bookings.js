const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { sendBookingEmails } = require("../utils/email");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports.renderReviewPage = async (req, res) => {
    try {
        const { id } = req.params;
        const { checkIn, checkOut } = req.body.booking;

        if (!checkIn || !checkOut) {
            req.flash("error", "Please select valid check-in and check-out dates.");
            return res.redirect(`/listings/${id}`);
        }

        const requestedCheckIn = new Date(checkIn);
        const requestedCheckOut = new Date(checkOut);
        
        if (requestedCheckIn < new Date().setHours(0,0,0,0) || requestedCheckOut <= requestedCheckIn) {
            req.flash("error", "Invalid dates selected. Please try again.");
            return res.redirect(`/listings/${id}`);
        }

        const listing = await Listing.findById(id);
        
        const timeDifference = requestedCheckOut.getTime() - requestedCheckIn.getTime();
        const nights = Math.ceil(timeDifference / (1000 * 3600 * 24));
        const totalPrice = nights * listing.price;

        // 🎯 FIX 1: Corrected field name from 'status' to 'bookingStatus'
        const overlappingBookings = await Booking.find({
            listing: id,
            bookingStatus: { $in: ['pending', 'confirmed'] },
            checkIn: { $lt: requestedCheckOut },
            checkOut: { $gt: requestedCheckIn }
        });

        if (overlappingBookings.length > 0) {
            req.flash("error", "These dates are already taken.");
            return res.redirect(`/listings/${id}`);
        }

        res.render("bookings/review.ejs", { 
            listing, 
            checkIn, 
            checkOut, 
            nights, 
            totalPrice 
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect(`/listings/${req.params.id}`);
    }
};

module.exports.createBooking = async (req, res) => {
    const { id } = req.params; 
    const { checkIn, checkOut } = req.body; 
    
    if (!checkIn || !checkOut) {
        req.flash("error", "Please select valid dates.");
        return res.redirect(`/listings/${id}`);
    }

    const requestedCheckIn = new Date(checkIn);
    const requestedCheckOut = new Date(checkOut);

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 🎯 THE BULLETPROOF LOCK
        // By incrementing the native __v field, we force MongoDB to lock this Listing document.
        // If User B arrives 1 millisecond later, their transaction is paused until User A finishes.
        const listing = await Listing.findOneAndUpdate(
            { _id: id },
            { $inc: { __v: 1 } }, 
            { new: true, session }
        );

        if (!listing) {
            throw new Error("Listing not found.");
        }

        const timeDifference = requestedCheckOut.getTime() - requestedCheckIn.getTime();
        const nights = Math.ceil(timeDifference / (1000 * 3600 * 24));
        
        if (nights <= 0) {
            throw new Error("Checkout date must be after check-in date.");
        }
        
        const totalPrice = nights * listing.price;

        // Because of the lock above, by the time User B's transaction is unpaused, 
        // this query will now accurately detect User A's newly saved pending booking.
        const overlappingBookings = await Booking.find({
            listing: id,
            bookingStatus: { $in: ['pending', 'confirmed', 'paid'] }, 
            checkIn: { $lt: requestedCheckOut }, 
            checkOut: { $gt: requestedCheckIn }
        }).session(session); 

        if (overlappingBookings.length > 0) {
            // Throwing this error automatically aborts User B's transaction
            throw new Error("Just missed it! These dates were booked seconds ago by someone else.");
        }

        const newBooking = new Booking({
            listing: id,
            guest: req.user._id,
            checkIn: requestedCheckIn,
            checkOut: requestedCheckOut,
            totalPrice: totalPrice,
            bookingStatus: 'pending',
            paymentStatus: 'pending'
        });

        await newBooking.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Start Stripe Checkout (Database operations are completely finished)
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr", 
                        product_data: {
                            name: `Stay at ${listing.title}`,
                            description: `${nights} nights from ${requestedCheckIn.toLocaleDateString('en-IN')} to ${requestedCheckOut.toLocaleDateString('en-IN')}`
                        },
                        unit_amount: totalPrice * 100, 
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${req.protocol}://${req.get("host")}/bookings/${newBooking._id}/success`,
            cancel_url: `${req.protocol}://${req.get("host")}/listings/${id}`,
            client_reference_id: newBooking._id.toString(), 
        });

        newBooking.stripeSessionId = stripeSession.id;
        await newBooking.save();

        res.redirect(303, stripeSession.url);

    } catch (e) {
        await session.abortTransaction();
        session.endSession();
        
        console.error("Booking Transaction Failed:", e);
        
        // Catch MongoDB WriteConflict errors specifically
        if (e.hasErrorLabel && e.hasErrorLabel('TransientTransactionError')) {
            req.flash("error", "High traffic detected for this listing. Please try selecting dates again.");
        } else {
            req.flash("error", e.message || "Something went wrong while booking.");
        }
        
        res.redirect(`/listings/${id}`);
    }
};

module.exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = session.client_reference_id; 

        try {
            const confirmedBooking = await Booking.findByIdAndUpdate(bookingId, {
                bookingStatus: 'confirmed',
                paymentStatus: 'paid',
                $unset: { reservationExpiresAt: "" } 
            }, { new: true })
            .populate({
                path: "listing",
                populate: { path: "owner" }
            })
            .populate("guest");

            console.log(`[SUCCESS] Booking ${bookingId} confirmed via Webhook!`);

            if (confirmedBooking) {
                sendBookingEmails(confirmedBooking);
            }

        } catch (e) {
            console.error("Database error while confirming booking:", e);
        }
    }

    res.status(200).send();
};

module.exports.paymentSuccess = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findById(id).populate("listing");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/");
        }

        res.render("bookings/success.ejs", { booking });
    } catch (e) {
        console.error(e);
        req.flash("error", "Something went wrong loading your confirmation.");
        res.redirect("/");
    }
};