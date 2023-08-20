const urllib = require('urllib');
const { getRandomObject } = require('../../../utils/getRandomObject');

module.exports.elevationRequest = (lat, lng) => {
    return new Promise(async (resolve, reject) => {
        try {
            const apis = [
                {
                    id: 1,
                    url: `https://api.opentopodata.org/v1/eudem25m?locations=${lat.toString()},${lng.toString()}`,
                },
                {
                    id: 2,
                    url: `https://api.open-elevation.com/api/v1/lookup?locations=${lat.toString()},${lng.toString()}`,
                },
            ];

            const openEvaltionAPIUrl = getRandomObject(apis);

            const { data, res } = await urllib.request(openEvaltionAPIUrl.url, {
                method: 'GET',
                rejectUnauthorized: false,
                dataType: 'json',
            });

            if (res.status === 200) {
                const elevationVal = parseFloat(data.results[0].elevation.toFixed(2));
                return resolve({
                    url: openEvaltionAPIUrl.url,
                    elevation: elevationVal,
                });
            }

            if (res.status === 429) {
                return reject(
                    `Too many requests to ${openEvaltionAPIUrl.url}. The request will be retried at the next refresh.`
                );
            }

            return reject(
                `Error in elevation request, status code: ${
                    res.status
                }. Full response: ${JSON.stringify(res)}`
            );
        } catch (error) {
            return reject(error);
        }
    });
};
