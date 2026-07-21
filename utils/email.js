const nodemailer = require("nodemailer");

// 🎯 KEY FOCUS 1: The Transporter
// This creates the secure connection tunnel to Google's servers using your .env credentials.
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// Professional HTML Template Generator
const generateEmailHTML = (title, mainMessage, booking, isHost) => {
    const checkIn = new Date(booking.checkIn).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const checkOut = new Date(booking.checkOut).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #fe424d; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Stayease</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333333; margin-top: 0;">${title}</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">${mainMessage}</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #333333; border-bottom: 1px solid #eeeeee; padding-bottom: 10px;">Reservation Details</h3>
                <p style="margin: 10px 0; color: #555555;"><strong>Property:</strong> ${booking.listing.title}</p>
                <p style="margin: 10px 0; color: #555555;"><strong>Check-in:</strong> ${checkIn}</p>
                <p style="margin: 10px 0; color: #555555;"><strong>Check-out:</strong> ${checkOut}</p>
                <p style="margin: 10px 0; color: #555555;"><strong>Total Amount:</strong> <span style="color: #28a745; font-weight: bold;">₹${booking.totalPrice.toLocaleString('en-IN')}</span></p>
                ${isHost ? `<p style="margin: 10px 0; color: #555555;"><strong>Guest Email:</strong> ${booking.guest.email || booking.guest.username}</p>` : ''}
            </div>
            
            <p style="color: #777777; font-size: 14px; text-align: center; margin-top: 30px;">
                Thank you for using Stayease!<br>
            </p>
        </div>
    </div>
    `;
};

module.exports.sendBookingEmails = async (booking) => {
    try {
        // 1. Email to the Guest
        await transporter.sendMail({
            from: `"Stayease Reservations" <${process.env.EMAIL_USER}>`,
            to: booking.guest.email || booking.guest.username, 
            subject: `Confirmed: Your stay at ${booking.listing.title}`,
            html: generateEmailHTML(
                "Payment Successful!", 
                "Your booking is officially confirmed. Get ready for an amazing trip!", 
                booking, 
                false
            )
        });

        // 2. Email to the Host
        await transporter.sendMail({
            from: `"stayease Hosts" <${process.env.EMAIL_USER}>`,
            to: booking.listing.owner.email || booking.listing.owner.username,
            subject: `New Booking Alert: ${booking.listing.title}`,
            html: generateEmailHTML(
                "You have a new booking!", 
                "Great news! A guest has successfully paid and booked your property.", 
                booking, 
                true
            )
        });

        console.log(`[SUCCESS] Emails dispatched for Booking ${booking._id}`);
    } catch (error) {
        console.error("[EMAIL ERROR] Failed to send transactional emails:", error);
    }
};
// 🎯 KEY FOCUS 2: The Dispatcher Function
// We export this asynchronous function so our Auth Controller can use it later.
module.exports.sendOTP = async (userEmail, otpCode) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: userEmail, // The email the user typed into the signup form
            subject: "Verify Your StayEase",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to the StayEase!</h2>
                    <p style="color: #555; font-size: 16px;">Your One-Time Password (OTP) for account verification is:</p>
                    <h1 style="color: #fc424d; letter-spacing: 8px; font-size: 36px; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">${otpCode}</h1>
                    <p style="color: #777; font-size: 14px;">This code will expire automatically in 10 minutes.</p>
                </div>
            `
        };

        // Await the network request to ensure Google accepts the email
        await transporter.sendMail(mailOptions);
        console.log(`[Email System]: OTP successfully dispatched to ${userEmail}`);
        
    } catch (error) {
        console.error("[Email System]: Critical failure dispatching email:", error);
        throw new Error("Could not send OTP email. Please try again later.");
    }
};