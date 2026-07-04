const express=require("express");
const Listing = require("../models/listing");
const router=express.Router({mergeParams:true});
const wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const Review=require("../models/review.js");
const {validateReview}=require("../middleware.js");
const {isLoggedIn}=require("../middleware.js");
const {isReviewAuthor}=require("../middleware.js");
// const { deleteReview } = require("../controllers/reviews.js");
const reviewcontroller=require("../controllers/reviews.js");
const review=require("../models/review.js");


// REVIEW ROUTE
router.post("/",isLoggedIn,validateReview,
    wrapAsync (reviewcontroller.createReview));
// REVIEW DELETE ROUTE
router.delete("/:reviewId",isLoggedIn,isReviewAuthor, wrapAsync (reviewcontroller.destroyReview));
module.exports=router;