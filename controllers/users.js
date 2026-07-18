const User = require("../models/user");
const OTP = require("../models/otp"); // 🎯 NEW
const emailUtil = require("../utils/email"); // 🎯 NEW
const Listing = require("../models/listing");
const Booking = require("../models/booking");
module.exports. renderSignupForm=async(req,res)=>{
    res.render("users/signup.ejs");
}
module.exports.signup = async (req, res) => {
    try {
        // NOTE: Make sure your HTML form inputs are named exactly "username" and "email"
        // If they are named something like "user[username]", this extraction will fail!
        let { username, email, password, firstName, lastName } = req.body;

        // 1. EXACT USERNAME CHECK (Stops here if taken)
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
            req.flash("error", "That username is already taken. Please choose another.");
            // The 'return' keyword instantly stops the function. No OTP will be sent.
            return res.redirect("/signup"); 
        }

        // 2. EXACT EMAIL CHECK (Stops here if taken)
        const existingEmail = await User.findOne({ email: email });
        if (existingEmail) {
            req.flash("error", "An account with that email already exists.");
            // Stops the function. No OTP will be sent.
            return res.redirect("/signup"); 
        }

        // ==========================================
        // If the code reaches this line, it means BOTH the username 
        // and email are 100% unique and safe to use.
        // ==========================================

        // 3. Clean up any old abandoned OTPs for this email
        await OTP.deleteMany({ email: email });

        // 4. Generate the new code
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

        const newOTP = new OTP({
            email: email,
            otpCode: generatedOTP
        });
        await newOTP.save();

        // 5. Store in the holding pen
        req.session.pendingUser = { username, email, password, firstName, lastName };
        
        // 6. Send the email
        await emailUtil.sendOTP(email, generatedOTP);

        // 7. Finally, redirect to the verify screen
        req.flash("success", "OTP sent! Please check your email.");
        res.redirect("/verify-otp");

    } catch (e) {
        console.error("Signup Error:", e);
        req.flash("error", e.message || "An error occurred during sign up.");
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm=(req,res)=>{
    res.render("users/login.ejs");
}
module.exports.login=async(req,res)=>{
      req.flash("success","Welcome to wonderLust");
      let redirectUrl  =res.locals.redirectUrl || "/listings";
      res.redirect(redirectUrl);
      
}
module.exports.logout=(req,res)=>{
   req.logout((err)=>{
    if(err){
      return next(err);
    }
      req.flash("success","Your logged out");
      res.redirect("/listings");
   })
}
module.exports.renderProfile = async (req, res) => {
    // Search the Listing collection for any documents where the 'owner' field matches the logged-in user's ID
    const userListings = await Listing.find({ owner: req.user._id });
    
    // Pass those listings to the EJS template
    res.render("users/profile.ejs", { userListings });
};
module.exports.renderEditProfile = async (req, res) => {
    // We already have the logged-in user's data inside req.user
    res.render("users/edit-profile.ejs");
};

module.exports.updateProfile = async (req, res) => {
    try {
        // 1. Extract the updated text from the form
        const { firstName, lastName, contactNumber, bio } = req.body;
        
        // 2. Find the user in the database by their ID and update their fields
        await User.findByIdAndUpdate(req.user._id, {
            firstName, 
            lastName, 
            contactNumber, 
            bio
        });
        
        // 3. Show a success message and send them back to their profile
        req.flash("success", "Profile updated successfully!");
        res.redirect("/profile");
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/profile/edit");
    }
};
// Add this new function at the bottom of the file
module.exports.renderTrips = async (req, res) => {
    
    //KEY FOCUS .populate("listing")
    const trips = await Booking.find({ guest: req.user._id }).populate("listing");
    
    res.render("users/trips.ejs", { trips });
};
module.exports.renderReservations = async (req, res) => {
    // 🎯 KEY FOCUS 1: Find all properties owned by this host
    const myListings = await Listing.find({ owner: req.user._id });
    
    // Extract just the IDs of those listings into an array
    const listingIds = myListings.map(listing => listing._id);
    
    // 🎯 KEY FOCUS 2: Find bookings where the listing ID is IN our array
    // We also .populate("guest") so we can see the name of the person who booked it!
    const reservations = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("guest");
        
    res.render("users/reservations.ejs", { reservations });
};
// 🎯 KEY FOCUS 2: The Toggle Like Logic
module.exports.toggleLike = async (req, res) => {
    const { id } = req.params; // The listing ID
    if(!req.user) {
        // Queue up the server-side flash message for the subsequent page load
        req.flash("error", "You must be logged in to manage your wishlist!");
        // Return a JSON response telling the frontend exactly where to go
        return res.json({ redirect: "/login" });
    }
    const user = await User.findById(req.user._id);
    
    // Check if the listing is already in the user's wishlist
    const isLiked = user.wishlist.includes(id);
    if (isLiked) {
        // If already liked, remove it (Unlike)
        user.wishlist.pull(id);
        await user.save();
        res.json({ liked: false }); // Send JSON response back to the browser
    } else {
        // If not liked, add it (Like)
        user.wishlist.push(id);
        await user.save();
        res.json({ liked: true });
    }
};
// 🎯 KEY FOCUS 1: The Final Merge (Verification Logic)
module.exports.verifyOTP = async (req, res, next) => {
    try {
        const { otp } = req.body;
        const pendingUser = req.session.pendingUser;

        if (!pendingUser) {
            req.flash("error", "Session expired or already processing. Please sign up again.");
            return res.redirect("/signup");
        }

        const validOTP = await OTP.findOne({ email: pendingUser.email });

        if (!validOTP || validOTP.otpCode !== otp.trim()) {
            req.flash("error", "Invalid or expired OTP. Please try again.");
            return res.redirect("/verify-otp");
        }

        // 🎯 KEY FOCUS: The Concurrency / Double-Click Fix!
        // We MUST delete the session immediately BEFORE we try to register the user.
        // If the user double-clicks the verify button, the second click will fail 
        // the `!pendingUser` check at the top, preventing the Passport crash.
        delete req.session.pendingUser;
        
        // We also delete the OTP right now to lock the door behind them
        await OTP.deleteOne({ email: pendingUser.email });

        // Ensure we pass ALL fields (including firstName and lastName) to the database
        const newUser = new User({ 
            email: pendingUser.email, 
            username: pendingUser.username,
            firstName: pendingUser.firstName,
            lastName: pendingUser.lastName
        });

        // Register the user
        const registeredUser = await User.register(newUser, pendingUser.password);

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to the Marketplace! Account verified.");
            res.redirect("/listings");
        });

    } catch (e) {
        // If anything fails here, their session is already cleared, failing fast and securely.
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};