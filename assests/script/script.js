mapboxgl.accessToken =
    'pk.eyJ1IjoicmljaHRvdGhlcmVzY3VlIiwiYSI6ImNrYTAzMTdiejBsYTczZXBvd3ZodTE3bGQifQ.M2ZreZbu-Q5OpJaEFw_r5w';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
});

mapboxgl.accessToken = 'pk.eyJ1IjoicmljaHRvdGhlcmVzY3VlIiwiYSI6ImNrYTAzMTdiejBsYTczZXBvd3ZodTE3bGQifQ.M2ZreZbu-Q5OpJaEFw_r5w';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.5, 40], // starting position
    zoom: 9 // starting zoom
});

map.addControl(new mapboxgl.NavigationControl());

map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    })
);

map.addControl(
    new MapboxDirections({
        accessToken: mapboxgl.accessToken
    }),
    'top-left'
);

// Holds visible airport features for filtering
var parks = [];

// Create a popup, but don't add it to the map yet.
var popup = new mapboxgl.Popup({
    closeButton: false
});

var filterEl = document.getElementById('feature-filter');
var listingEl = document.getElementById('feature-listing');

function renderListings(features) {
    var empty = document.createElement('p');
    // Clear any existing listings
    listingEl.innerHTML = '';
    if (features.length) {
        features.forEach(function (feature) {
            var prop = feature.properties;
            var item = document.createElement('a');
            item.href = prop.wikipedia;
            item.target = '_blank';
            item.textContent = prop.name + ' (' + prop.abbrev + ')';
            item.addEventListener('mouseover', function () {
                // Highlight corresponding feature on the map
                popup
                    .setLngLat(feature.geometry.coordinates)
                    .setText(
                        feature.properties.name +
                        ' (' +
                        feature.properties.abbrev +
                        ')'
                    )
                    .addTo(map);
            });
            listingEl.appendChild(item);
        });

        // Show the filter input
        filterEl.parentNode.style.display = 'block';
    } else if (features.length === 0 && filterEl.value !== '') {
        empty.textContent = 'No results found';
        listingEl.appendChild(empty);
    } else {
        empty.textContent = 'Drag the map to populate results';
        listingEl.appendChild(empty);

        // Hide the filter input
        filterEl.parentNode.style.display = 'none';

        // remove features filter
        map.setFilter('park', ['has', 'abbrev']);
    }
}

function normalize(string) {
    return string.trim().toLowerCase();
}

function getUniqueFeatures(array, comparatorProperty) {
    var existingFeatureKeys = {};
    // Because features come from tiled vector data, feature geometries may be split
    // or duplicated across tile boundaries and, as a result, features may appear
    // multiple times in query results.
    var uniqueFeatures = array.filter(function (el) {
        if (existingFeatureKeys[el.properties[comparatorProperty]]) {
            return false;
        } else {
            existingFeatureKeys[el.properties[comparatorProperty]] = true;
            return true;
        }
    });

    return uniqueFeatures;
}

map.on('load', function () {
    map.addSource('parks', {
        'type': 'vector',
        'url': 'mapbox://mapbox.04w69w5j'
    });
    map.addLayer({
        'id': 'park',
        'source': 'parks',
        'source-layer': 'ne_10m_airports',
        'type': 'symbol',
        'layout': {
            'icon-image': 'airport-15',
            'icon-padding': 0,
            'icon-allow-overlap': true
        }
    });

    map.on('moveend', function () {
        var features = map.queryRenderedFeatures({ layers: ['park'] });

        if (features) {
            var uniqueFeatures = getUniqueFeatures(features, 'iata_code');
            // Populate features for the listing overlay.
            renderListings(uniqueFeatures);

            // Clear the input container
            filterEl.value = '';

            // Store the current features in sn `airports` variable to
            // later use for filtering on `keyup`.
            parks = uniqueFeatures;
        }
    });

    map.on('mousemove', 'park', function (e) {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        // Populate the popup and set its coordinates based on the feature.
        var feature = e.features[0];
        popup
            .setLngLat(feature.geometry.coordinates)
            .setText(
                feature.properties.name +
                ' (' +
                feature.properties.abbrev +
                ')'
            )
            .addTo(map);
    });

    map.on('mouseleave', 'park', function () {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });

    filterEl.addEventListener('keyup', function (e) {
        var value = normalize(e.target.value);

        // Filter visible features that don't match the input value.
        var filtered = parks.filter(function (feature) {
            var name = normalize(feature.properties.name);
            var code = normalize(feature.properties.abbrev);
            return name.indexOf(value) > -1 || code.indexOf(value) > -1;
        });

        // Populate the sidebar with filtered results
        renderListings(filtered);

        // Set the filter to populate features into the layer.
        if (filtered.length) {
            map.setFilter('park', [
                'match',
                ['get', 'abbrev'],
                filtered.map(function (feature) {
                    return feature.properties.abbrev;
                }),
                true,
                false
            ]);
        }
    });

    // Call this function on initialization
    // passing an empty array to render an empty state
    renderListings([]);
});



