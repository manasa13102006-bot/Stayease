console.log(window.maptilersdk);
console.log(typeof maptilersdk);
maptilersdk.config.apiKey = MAPTILER_API_KEY;

const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: [LISTING.geometry.lng, LISTING.geometry.lat],
    zoom: 14,
});

new maptilersdk.Marker()
    .setLngLat([LISTING.geometry.lng, LISTING.geometry.lat])
    .addTo(map);