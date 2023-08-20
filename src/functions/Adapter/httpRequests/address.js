const urllib = require('urllib');

const apis = {
    osm: 'https://nominatim.openstreetmap.org/reverse?format=json&accept-language=de-DE&',
    bing: 'http://dev.virtualearth.net/REST/v1/Locations/',
    here: 'https://revgeocode.search.hereapi.com/v1/revgeocode?',
    google: 'https://maps.googleapis.com/maps/api/geocode/json?',
    geoapify: 'https://api.geoapify.com/v1/geocode/reverse?',
    locationiq_eu: 'https://eu1.locationiq.com/v1/reverse?',
    locationiq_usa: 'https://us1.locationiq.com/v1/reverse?',
    positionstack: 'http://api.positionstack.com/v1/reverse?',
    tomtom: 'https://api.tomtom.com/search/2/reverseGeocode/',
};

module.exports.addressRequest = ({ mapProvider, apiKey, lat, lng }) => {
    return new Promise((resolve, reject) => {
        const apiUrl = dataTransformer(mapProvider, apiKey, lat, lng);

        urllib.request(
            apiUrl,
            {
                method: 'GET',
                rejectUnauthorized: false,
                dataType: 'json',
            },
            function (err, data, res) {
                if (err || !res.statusCode == 200) {
                    return reject(err);
                }

                if (!data.hasOwnerProperty('address')) {
                    return reject('No address found');
                }

                const currentAdress = responseDataTransformer(mapProvider, data);

                return resolve({
                    url: apiUrl,
                    address: currentAdress,
                });
            }
        );
    });
};

function dataTransformer(mapProvider, apiKey, lat, lng) {
    let url = apis[mapProvider];

    switch (mapProvider) {
        case 'osm':
            url += `${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            break;
        case 'bing':
            url += `${lat},${lng}?incl=ciso2&inclnb=1&key=${apiKey}`;
            break;
        case 'here':
            url += `at=${lat},${lng}&apiKey=${apiKey}`;
            break;
        case 'google':
            url += `latlng=${lat},${lng}&language=de&result_type=street_address&key=${apiKey}`;
            break;
        case 'geoapify':
            url += `lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
            break;
        case 'locationiq_eu':
            url += `key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
            break;
        case 'locationiq_usa':
            url += `key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
            break;
        case 'positionstack':
            url += `access_key=${apiKey}&query=${lat},${lng}&output=json&limit=1`;
            break;
        case 'tomtom':
            url += `${lat}%2C${lng}?key=${apiKey}&ext=json`;
            break;

        default:
            break;
    }
    return url;
}

function responseDataTransformer(mapProvider, res) {
    const data = res.data[0];

    const providers = {
        osm: [
            data.address.road,
            data.address.house_number ? ` ${data.address.house_number}` : '',
            data.address.postcode ? `, ${data.address.postcode}` : '',
            data.address.village ? `, ${data.address.village}` : '',
            data.address.town ? `, ${data.address.town}` : '',
        ]
            .filter(Boolean)
            .join(''),
        bing: res.resourceSets[0].resources[0].address.formattedAddress,
        here: res.items[0].address.label,
        google: res.results[0].formatted_address,
        geoapify: res.features[0].properties.formatted,
        locationiq_eu: res.display_name,
        locationiq_usa: res.display_name,
        positionstack: res.data[0].label,
        tomtom: res.addresses[0].address.freeformAddress,
    };

    return providers[mapProvider] || '';
}
