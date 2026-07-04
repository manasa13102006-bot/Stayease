const express=require("express");
const router=express.Router();
const wrapAsync=require("../utils/wrapAsync.js");
const Listing=require("../models/listing.js");
const {reviewSchema}=require("../schema.js");
const {isLoggedIn}=require("../middleware.js");
const {isOwner}=require("../middleware.js");
const {validateListing}=require("../middleware.js");
const listingController=require("../controllers/listings.js");
const multer=require("multer");
const {storage}=require("../cloudConfig.js");
const upload=multer({storage});
router.route("/" )                                // common route
.get(wrapAsync (listingController.index))    // INDEX ROUTE
.post((req,res,next) =>{
    console.log("reached");
    next();
},                                // CREATE ROUTE
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
);
// NEW ROUTE
router.get("/new",isLoggedIn ,wrapAsync(listingController.renderNewForm));
router.route("/:id")
.get(wrapAsync(listingController.showListing))   // SHOW ROUTE
.put(isLoggedIn,isOwner,
    upload.single("listing[image]"),
    validateListing,          // UPDATE ROUTE
    wrapAsync(listingController.updateListing))           
.delete(                                          // DELETE ROUTE         
    isLoggedIn,isOwner,wrapAsync(listingController.deleteListing));
// EDIT ROUTE
router.get("/:id/edit",
    isLoggedIn,isOwner,
     wrapAsync(listingController.renderEditForm));
module.exports=router;