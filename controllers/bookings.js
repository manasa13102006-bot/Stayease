const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { sendBookingEmails } = require("../utils/email");
// Initialize Stripe using the secret key from your environment
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// 🎯 KEY FOCUS 1: The Intermediate Review Controller
module.exports.renderReviewPage = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 🎯 FIX 2: Look inside req.body.booking (Because of your HTML form names)
        const { checkIn, checkOut } = req.body.booking;

        if (!checkIn || !checkOut) {
            req.flash("error", "Please select valid check-in and check-out dates.");
            return res.redirect(`/listings/${id}`);
        }

        const requestedCheckIn = new Date(checkIn);
        const requestedCheckOut = new Date(checkOut);
        
        // Ensure check-in is in the future, and checkout is after check-in
        if (requestedCheckIn < new Date().setHours(0,0,0,0) || requestedCheckOut <= requestedCheckIn) {
            req.flash("error", "Invalid dates selected. Please try again.");
            return res.redirect(`/listings/${id}`);
        }

        const listing = await Listing.findById(id);
        
        // Calculate the math for the user to review
        const timeDifference = requestedCheckOut.getTime() - requestedCheckIn.getTime();
        const nights = Math.ceil(timeDifference / (1000 * 3600 * 24));
        const totalPrice = nights * listing.price;

        // 🎯 KEY FOCUS 2: Pre-flight overlap check (Fail Fast)
        // If it's already booked, don't even let them see the review page
        const overlappingBookings = await Booking.find({
            listing: id,
            status: { $in: ['pending', 'confirmed', 'paid'] },
            checkIn: { $lt: requestedCheckOut },
            checkOut: { $gt: requestedCheckIn }
        });

        if (overlappingBookings.length > 0) {
            req.flash("error", "These dates are already taken.");
            return res.redirect(`/listings/${id}`);
        }

        // Send all this calculated data to the frontend intermediate page
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

    // 1. Start the MongoDB Session (The isolated bubble)
    const session = await mongoose.startSession();

    try {
        // 2. Start the Transaction
        session.startTransaction();

        // Pass { session } to run this query INSIDE the transaction bubble
        const listing = await Listing.findById(id).session(session);
        if (!listing) {
            throw new Error("Listing not found.");
        }

        const timeDifference = requestedCheckOut.getTime() - requestedCheckIn.getTime();
        const nights = Math.ceil(timeDifference / (1000 * 3600 * 24));
        
        if (nights <= 0) {
            throw new Error("Checkout date must be after check-in date.");
        }
        
        const totalPrice = nights * listing.price;

        // 3. The Concurrency Overlap Check (Strict lock)
        const overlappingBookings = await Booking.find({
            listing: id,
            status: { $in: ['pending', 'confirmed', 'paid'] }, 
            checkIn: { $lt: requestedCheckOut }, 
            checkOut: { $gt: requestedCheckIn }
        }).session(session); // MUST run inside the transaction

        if (overlappingBookings.length > 0) {
            throw new Error("These dates have just been booked by someone else. Please select new dates.");
        }

        // 4. Create the Pending Booking
        const newBooking = new Booking({
            listing: id,
            guest: req.user._id,
            checkIn: requestedCheckIn,
            checkOut: requestedCheckOut,
            totalPrice: totalPrice,
            bookingStatus: 'pending',
            paymentStatus: 'pending'
        });

        // 5. Save the booking inside the transaction
        await newBooking.save({ session });

        // 6. Commit the Transaction (Make it permanent!)
        await session.commitTransaction();
        session.endSession();

        // ==========================================
        // DATABASE LOCK RELEASED.
        // Now it is safe to talk to the Stripe API.
        // ==========================================

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

        // Attach Stripe ID to our database record (Outside the transaction)
        newBooking.stripeSessionId = stripeSession.id;
        await newBooking.save();

        res.redirect(303, stripeSession.url);

    } catch (e) {
        // 7. If ANYTHING goes wrong, instantly pop the bubble and revert all changes
        await session.abortTransaction();
        session.endSession();
        
        console.error("Booking Transaction Failed:", e);
        req.flash("error", e.message || "Something went wrong while booking.");
        res.redirect(`/listings/${id}`);
    }
};
// 🎯 KEY FOCUS: The Cryptographically Secure Webhook Receiver
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
            // 🎯 KEY FOCUS: Added { new: true } and the populate() chains
            const confirmedBooking = await Booking.findByIdAndUpdate(bookingId, {
                bookingStatus: 'confirmed',
                paymentStatus: 'paid',
                $unset: { reservationExpiresAt: "" } 
            }, { new: true })
            .populate({
                path: "listing",
                populate: { path: "owner" } // Fetches host's email
            })
            .populate("guest"); // Fetches guest's email

            console.log(`[SUCCESS] Booking ${bookingId} confirmed via Webhook!`);

            // 🎯 KEY FOCUS: Fire the emails!
            if (confirmedBooking) {
                sendBookingEmails(confirmedBooking);
            }

        } catch (e) {
            console.error("Database error while confirming booking:", e);
        }
    }

    res.status(200).send();
};
// 🎯 KEY FOCUS: The Success Page Controller
module.exports.paymentSuccess = async (req, res) => {
    try {
        const { id } = req.params; // This is the Booking ID from the URL
        
        // Find the booking and populate the listing details so we can show the title/image
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