const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const Review=require("./review.js");
const ListingSchema=new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    image:{
    url:String,
    filename:String,
    },   
    price: Number,
    location:String,
    country:String,
    geometry: {
    lat: {
        type: Number,
        required: true,
    },
    lng: {
        type: Number,
        required: true,
    },
},
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:"Review",
        },
    ],
    owner:{
      type:Schema.Types.ObjectId,
            ref:"User",
         },
});
ListingSchema.post("findOneAndDelete",async(listing)=>{
    if(listing){
        await Review.deleteMany({_id:{$in:listing.reviews}});
    }

});
const Listing=mongoose.model("Listing",ListingSchema);
module.exports=Listing;