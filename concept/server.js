const express=require("express");
const app=express();
const session=require("express-session");
const flash=require("connect-flash");
const path=require("path");
const sessionOptions={
    secret:"mysuperserectstring",
    resave:false,
    saveUninitialized:true,
};
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(session(sessionOptions));
app.use(flash());
app.use((req,res,next)=>{
    res.locals.successMsg=req.flash("success");
  res.locals.errorMsg=req.flash("error");
  next();
});
app.get("/register" ,(req,res) =>{
  let {name="self"}=req.query;
   req. session.name=name;
   if(name==="self"){
     req.flash("success","user not registered ");
   }else req.flash("error","user registered sucessfully");
  res.redirect("/hello");
});
app.get("/hello" ,(req,res) =>{
  res.render("page.ejs",{name:req.session.name });
});
app.get("/test",(req,res)=>{
    res.send("test sucessfull");
});
app.listen(8080,()=>{
    console.log("port is listening");
});