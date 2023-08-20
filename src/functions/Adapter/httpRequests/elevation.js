const urllib = require('urllib');
const { getRandomObject } = require('../../../utils/getRandomObject');

module.exports.elevationRequest = (lat, lng) => {
    return new Promise(async (resolve, reject) => {
        try {
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

            const { data, res } = await urllib.request(openEvaltionAPIUrl.url, {
                method: 'GET',
                rejectUnauthorized: false,
                dataType: 'json',
            });

            if (res.statusCode === 200) {
                const elevationVal = parseFloat(data.results[0].elevation.toFixed(2));
                return resolve({
                    url: openEvaltionAPIUrl.url,
                    elevation: elevationVal,
                });
            }
            return reject(
                `Error in elevation request, status code: ${
                    res.statusCode
                }. Full response: ${JSON.stringify(res)}`
            );
        } catch (error) {
            return reject(error);
        }
    });
};
