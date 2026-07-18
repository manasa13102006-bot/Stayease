const express=require("express");
const router=express.Router();
const User=require("../models/user.js");
const OTP = require("../models/otp"); // 🎯 NEW
const emailUtil = require("../utils/email"); // 🎯 NEW
const wrapAsync = require("../utils/wrapAsync.js");
const passport=require("passport");
const {isLoggedIn}=require("../middleware.js");
const { saveRedirectUrl } = require("../middleware.js");
const userController=require("../controllers/users.js");

router
.route("/signup")
.get(userController.renderSignupForm)
.post(wrapAsync(userController.signup));
router.route("/login")
.get(userController.renderLoginForm)
.post(
    saveRedirectUrl,
    passport.authenticate("local",{failureRedirect:'/login',failureFlash:true}), 
    userController.login);
router.get("/logout",userController.logout);
router.get("/profile", isLoggedIn, userController.renderProfile);
router.get("/profile/edit", isLoggedIn, userController.renderEditProfile);
router.put("/profile", isLoggedIn, wrapAsync(userController.updateProfile));
router.get("/trips", isLoggedIn, wrapAsync(userController.renderTrips));
router.get("/reservations", isLoggedIn, wrapAsync(userController.renderReservations));
// Route to handle the asynchronous heart click
router.post("/wishlist/:id", wrapAsync(userController.toggleLike));// Route to handle the asynchronous heart click
// Route to display the OTP input screen
router.get("/verify-otp", (req, res) => {
    // If they somehow get here without submitting the signup form, kick them back
    if (!req.session.pendingUser) {
        req.flash("error", "Please sign up first.");
        return res.redirect("/signup");
    }
    res.render("users/verifyOTP.ejs", { email: req.session.pendingUser.email });
});
// 🎯 KEY FOCUS 2: New POST route to process the submitted code
router.post("/verify-otp", wrapAsync(userController.verifyOTP));
module.exports = router;
