const Listing = require("../models/listing");
const Booking = require("../models/booking");

module.exports.index = async (req, res) => { 
    const filterCategory = req.query.category;
    const searchQuery = req.query.search; // Extract the search term from the URL
    
    let allListings;
    
    if (filterCategory) {
        // If they clicked a category icon
        allListings = await Listing.find({ category: filterCategory });
    } else if (searchQuery) {
        // If they typed in the search bar
        // $options: 'i' makes the search case-insensitive!
        allListings = await Listing.find({
            $or: [
                { title: { $regex: searchQuery, $options: 'i' } },
                { location: { $regex: searchQuery, $options: 'i' } },
                { country: { $regex: searchQuery, $options: 'i' } }
            ]
        });
    } else {
        // If they just visited the homepage normally
        allListings = await Listing.find({});
    }
    
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = async (req, res) => {
     res.render("listings/new.ejs");
};

// Ensure this is at the top of your file: const Booking = require("../models/booking");

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");
        
    if (!listing) {
        req.flash("error", "Listing does not exist");
        return res.redirect("/listings");
    }

    const existingBookings = await Booking.find({ 
        listing: id,
        status: { $ne: 'cancelled' }
    });

    // 🎯 KEY FOCUS 1: The Review Eligibility Check
    let hasCompletedTrip = false;
    
    if (req.user) {
        // Look for a booking by this user for this listing where the checkout is in the past
        const pastBooking = await Booking.findOne({
            listing: id,
            guest: req.user._id,
            checkOut: { $lt: new Date() }, //$lt means "Less Than" (older than right now)
            status: { $ne: 'cancelled' }
        });
        
        if (pastBooking) {
            hasCompletedTrip = true;
        }
    }

    res.render("listings/show.ejs", {
        listing,
        existingBookings,
        hasCompletedTrip, // 🎯 KEY FOCUS 2: Pass this flag to the frontend
        MAPTILER_API_KEY: process.env.MAPTILER_API_KEY,
    });
};

module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    
    const newlisting = new Listing(req.body.listing);
    newlisting.owner = req.user._id;
    newlisting.image = { url, filename };
    
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
    
    await newlisting.save();
    req.flash("success", "New Listing added");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {  
    let { id } = req.params;
    const listing = await Listing.findById(id);
    
    if (!listing) {
        req.flash("error", "listing does not exist");
        return res.redirect("/listings");
    }
    
    let originalImagUrl = listing.image.url;
    originalImagUrl = originalImagUrl.replace("/upload", "/upload/w_250"); 
    res.render("listings/edit.ejs", { listing, originalImagUrl });
};

module.exports.updateListing = async (req, res) => { 
    let { id } = req.params;
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
    req.flash("success", "Listing updated");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
};