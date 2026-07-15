const Listing=require("./models/listing.js");
const {listingSchema}=require("./schema.js");
const {reviewSchema}=require("./schema.js");
const ExpressError = require("./utils/ExpressError");
module.exports.isLoggedIn=(req,res,next)=>{
     if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
     req.flash("error","you must be login!");
    return res.redirect("/login");
    }
    next();
};
module.exports.saveRedirectUrl=(req,res,next)=>{
     if( req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};
module.exports.validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
};
module.exports.validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
};
module.exports.isOwner=async(req,res,next)=>{
    let {id}=req.params;
      let listing=await Listing.findById(id);
        if(!listing.owner._id.equals(res.locals.currUser._id)){
         req.flash("error","you don't have permission");
         return res.redirect(`/listings/${id}`);
        }
    next();
}
module.exports.isReviewAuthor=async(req,res,next)=>{
    let {id,reviewId}=req.params;
      let review=await Review.findById(reviewId);
        if(!review.author._id.equals(res.locals.currUser._id)){
         req.flash("error","only owner have access to delete");
         return res.redirect(`/listings/${id}`);
        }
    next();
}
// Add this function at the very bottom of your middleware.js file

module.exports.isHost = (req, res, next) => {
    // 🎯 KEY FOCUS 1: Role Verification Logic
    // Check if a user is authenticated and if their role is strictly 'host'
    if (req.user && req.user.role !== "host") {
        req.flash("error", "Access Denied! You must register as a Host account to manage properties.");
        return res.redirect("/listings");
    }
    
    // If the check passes, pass control execution to the next function in line
    next();
};