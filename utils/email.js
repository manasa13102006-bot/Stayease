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

// 🎯 KEY FOCUS 2: The Dispatcher Function
// We export this asynchronous function so our Auth Controller can use it later.
module.exports.sendOTP = async (userEmail, otpCode) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: userEmail, // The email the user typed into the signup form
            subject: "Verify Your Marketplace Account",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to the Marketplace!</h2>
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