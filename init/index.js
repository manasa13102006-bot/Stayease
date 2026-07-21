
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const dbUrl = process.env.ATLASDB_URL;
main()
  .then(() => {
    console.log("connected to database");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

const coordinates = {
  "Malibu": { lat: 34.0259, lng: -118.7798 },
  "New York City": { lat: 40.7128, lng: -74.0060 },
  "Aspen": { lat: 39.1911, lng: -106.8175 },
  "Florence": { lat: 43.7696, lng: 11.2558 },
  "Portland": { lat: 45.5152, lng: -122.6784 },
  "Cancun": { lat: 21.1619, lng: -86.8515 },
  "Lake Tahoe": { lat: 39.0968, lng: -120.0324 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Verbier": { lat: 46.0960, lng: 7.2286 },
  "Serengeti National Park": { lat: -2.3333, lng: 34.8333 },
  "Amsterdam": { lat: 52.3676, lng: 4.9041 },
  "Fiji": { lat: -17.7134, lng: 178.0650 },
  "Cotswolds": { lat: 51.8330, lng: -1.8433 },
  "Boston": { lat: 42.3601, lng: -71.0589 },
  "Bali": { lat: -8.3405, lng: 115.0920 },
  "Banff": { lat: 51.1784, lng: -115.5708 },
  "Miami": { lat: 25.7617, lng: -80.1918 },
  "Phuket": { lat: 7.8804, lng: 98.3923 },
  "Scottish Highlands": { lat: 57.1200, lng: -4.7100 },
  "Dubai": { lat: 25.2048, lng: 55.2708 },
  "Montana": { lat: 46.8797, lng: -110.3626 },
  "Mykonos": { lat: 37.4467, lng: 25.3289 },
  "Costa Rica": { lat: 9.7489, lng: -83.7534 },
  "Charleston": { lat: 32.7765, lng: -79.9311 },
  "Tokyo": { lat: 35.6762, lng: 139.6503 },
  "New Hampshire": { lat: 43.1939, lng: -71.5724 },
  "Maldives": { lat: 3.2028, lng: 73.2207 },
};

const categories = [
  "Trending",
  "Rooms",
  "Iconic Cities",
  "Mountains",
  "Castles",
  "Amazing Pools",
  "Camping",
  "Farms",
  "Arctic",
];

const getRandomCategory = () => {
  return categories[Math.floor(Math.random() * categories.length)];
};
const initdb = async () => {
  await Listing.deleteMany({});

  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "6a5d0942d1a4e90d4aebd3bb",
    geometry: coordinates[obj.location],
    category: getRandomCategory(),
  }));

  await Listing.insertMany(initData.data);
  console.log("data was initialized successfully");
};

initdb();