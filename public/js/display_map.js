maptilersdk.config.apiKey = mapToken;

const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    
    // 🎯 KEY FOCUS 2: Changed LISTING to lowercase 'listing'
    center: [listing.geometry.lng, listing.geometry.lat], 
    zoom: 14,
});

const marker = new maptilersdk.Marker({ color: "#fc424d" })
    .setLngLat([listing.geometry.lng, listing.geometry.lat])
    .setPopup(new maptilersdk.Popup({ offset: 25 })
    .setHTML(`<h4>${listing.title}</h4><p>Exact location provided after booking.</p>`))
    .addTo(map);