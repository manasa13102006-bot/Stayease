const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/booking");
const { sendBookingEmails } = require("../utils/email"); // The email file we just made!

module.exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // 1. Verify the cryptographic signature using the RAW body
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the specific event: Checkout Session Completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = session.client_reference_id; 

        try {
            // 3. Finalize the Booking & Fetch User/Host details for the email
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

            // 4. Fire the confirmation emails
            if (confirmedBooking) {
                sendBookingEmails(confirmedBooking);
            }

        } catch (e) {
            console.error("Database error while confirming booking:", e);
        }
    }

    // 5. Acknowledge receipt to Stripe
    res.status(200).send();
};