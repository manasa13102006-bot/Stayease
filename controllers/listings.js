const Listing=require("../models/listing");
module.exports.index=async(req,res)=>{ 
    const allListings=await Listing.find({});
    res.render("listings/index.ejs",{ allListings });
};
module.exports.renderNewForm=async(req,res)=>{  //added async
     res.render("listings/new.ejs");
};
module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "listing does not exist");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", {
        listing,
        MAPTILER_API_KEY: process.env.MAPTILER_API_KEY,
    });
};
module.exports.createListing=async(req,res,next)=>{
     let url=req.file.path;
    console.log(req.file);
    console.log("createListing called");
     let filename=req.file.filename;
     console.log(url,filename);
     const newlisting=new Listing(req.body.listing);
     newlisting.owner=req.user._id;
     newlisting.image={url,filename};
     const address = `${newlisting.location}, ${newlisting.country}`;

const apiKey = process.env.GEOCODE_API_KEY;

const response = await fetch(
    `https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${apiKey}`
);

const data = await response.json();

if (!data.length) {
    req.flash("error", "Invalid location.");
    return res.redirect("/listings/new");
}

newlisting.geometry = {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
};  
    console.log(newlisting);
    await newlisting.save();
    req.flash("success","New Listing added");
    res.redirect("/listings");
};
module.exports.renderEditForm=async(req,res)=>{  
    let {id}=req.params;
    const listing=await Listing.findById(id);
     if (!listing) {
        req.flash("error","listing does not exist");
        return res.redirect("/listings");
    }
    let originalImagUrl=listing.image.url;
    originalImagUrl=originalImagUrl.replace("/upload","/upload/w_250"); //cloudinary API
    res.render("listings/edit.ejs",{listing,originalImagUrl});
};
module.exports.updateListing=async (req,res)=>{ 
    let {id}=req.params;
    
let listing = await Listing.findById(id);
Object.assign(listing, req.body.listing);

const address = `${listing.location}, ${listing.country}`;

const apiKey = process.env.GEOCODE_API_KEY;

const response = await fetch(
    `https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${apiKey}`
);

const data = await response.json();

if (data.length) {
    listing.geometry = {
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
    };
}
if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
}
await listing.save();
    console.log(listing);
    req.flash("success","Listing updated");
    res.redirect(`/listings/${id}`);
};
module.exports.deleteListing=async(req,res)=>{  // want add next
    let { id }=req.params;
    let deletedlisting=await Listing.findByIdAndDelete(id);
    console.log(deletedlisting);
    req.flash("success","Listing Deleted");
    res.redirect("/listings");
}