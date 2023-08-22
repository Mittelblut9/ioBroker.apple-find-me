const { getDevices } = require('../Apple/getDevices');
const createOrUpdateDevices = require('./createOrUpdateDevices');

module.exports.refreshDevices = async function (adapter, myCloud) {
    return new Promise(async (resolve, reject) => {
        try {
            adapter.log.info('Refreshing devices...');

            const response = await getDevices(myCloud);
            const devices = response.content;

            if (devices) {
                createOrUpdateDevices(devices, adapter);

                adapter.log.info(
                    `Found ${devices.length} devices associated with your account and successfully refreshed them.`
                );
                adapter.setState('Connection', true, true);
            } else {
                adapter.setState('Connection', false, true);

                adapter.log.error(
                    'No devices found or an error occurred while fetching your devices.'
                );
            }
            return resolve(true);
        } catch (err) {
            adapter.log.error('Error while refreshing devices: ' + JSON.stringify(err));
            return resolve(false);
        }
    });
};
