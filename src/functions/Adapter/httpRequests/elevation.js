const urllib = require('urllib');
const { getRandomObject } = require('../../../utils/getRandomObject');

module.exports.elevationRequest = (lat, lng) => {
    return new Promise((resolve, reject) => {
        const apis = [
            {
                id: 1,
                url: `https://api.opentopodata.org/v1/eudem25m?locations=${element.location.latitude.toString()},${element.location.longitude.toString()}`,
            },
            {
                id: 2,
                url: `https://api.open-elevation.com/api/v1/lookup?locations=${element.location.latitude.toString()},${element.location.longitude.toString()}`,
            },
        ];

        const openEvaltionAPIUrl = getRandomObject(UrlArray);

        urllib.request(
            openEvaltionAPIUrl.url,
            {
                method: 'GET',
                rejectUnauthorized: false,
                dataType: 'json',
            },
            function (err, data, res) {
                if (!err && res.statusCode == 200) {
                    const elevationVal = parseFloat(data.results[0].elevation.toFixed(2));
                    return resolve({
                        url: openEvaltionAPIUrl.url,
                        elevation: elevationVal,
                    });
                } else {
                    return reject(err);
                }
            }
        );
    });
};
