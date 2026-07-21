const express = require("express");
const router = express.Router({ mergeParams: true });
const bookingController = require("../controllers/bookings");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");

// Step 1: Receives dates from the Listing page, calculates math, shows Review Page
router.post("/:id/review", isLoggedIn, wrapAsync(bookingController.renderReviewPage));

// Step 2: Receives confirmation from Review Page, executes ACID Transaction, goes to Stripe
router.post("/:id", isLoggedIn, wrapAsync(bookingController.createBooking));
router.get("/:id/success", isLoggedIn, wrapAsync(bookingController.paymentSuccess));
module.exports = router;