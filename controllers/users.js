const User=require("../models/user");
const Listing = require("../models/listing");
module.exports. renderSignupForm=async(req,res)=>{
    res.render("users/signup.ejs");
}
module.exports.signup = async(req, res, next) => {
  try {
    // 1. Extract ALL fields from the submitted form
    let { username, email, password, firstName, lastName, contactNumber, bio, role } = req.body;
    
    // 2. Pass all the new fields into the User blueprint
    const newUser = new User({ 
        email, 
        username, 
        firstName, 
        lastName, 
        contactNumber, 
        bio, 
        role 
    });
    
    // 3. Register the user with Passport
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);
    
    // 4. Log them in automatically
    req.login(registeredUser, (err) => {
        if(err) {
            return next(err);
        }
        req.flash("success", "Welcome to StayScape!");
        res.redirect("/listings");
    });
  } catch(e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
}

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