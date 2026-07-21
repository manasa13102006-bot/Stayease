if(process.env.NODE_ENV !="production"){
    require("dotenv").config();
}
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const MONGO_URL="mongodb://127.0.0.1:27017/WanderLust";
const path=require("path");
const methodOverride=require("method-override");
const ejsmate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const listingsRouter=require("./routes/listing.js");
const reviewsRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");
const session=require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");
const bookingRouter = require("./routes/booking.js");
const dbUrl = process.env.ATLASDB_URL || MONGO_URL;
main()
.then(()=>{
    console.log("connected to database");
})
.catch((err) =>{console.log(err);});
async function main(){
    await mongoose.connect(dbUrl);
}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
const bookingController = require("./controllers/bookings.js");
app.post('/webhook', express.raw({type: 'application/json'}), bookingController.stripeWebhook);
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,"public")));
app.engine("ejs",ejsmate);
// 1. Create the Mongo connection for sessions (Version 3 Syntax)
const store = new MongoStore({
    url: dbUrl,
    secret: process.env.SECRET || "mysupersecret",
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

// 2. Pass the store into your session options
const sessionOption = {
    store, // 🎯 KEY FOCUS: This tells Express to save logins to Atlas!
    secret: process.env.SECRET || "mysupersecret",
    resave: false, // Changed to false (best practice for MongoStore)
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // Fixed the 60*60 math!
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
};
// app.get("/",(req,res)=>{
//     res.send("I AM THE ROOT");
// });
app.use(session(sessionOption));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
});
app.use("/bookings", bookingRouter);
app.use("/listings/:id/reviews",reviewsRouter);
app.use("/listings",listingsRouter);
app.use("/",userRouter);

app.all(/.*/,(req,res,next)=>{
    next(new ExpressError(404,"page not FOUND!"));
});
app.use((err,req,res,next)=>{
    console.log(err);
   let {statusCode=500,message="Something Went Wrong"}=err;
    res.status(statusCode).render("error.ejs",{message});
});
app.listen(8080,()=>{
    console.log("server is listening");
});
module.exports = app;