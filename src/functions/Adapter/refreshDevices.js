const { getDevices } = require('../Apple/getDevices');
const createOrUpdateDevices = require('./createOrUpdateDevices');

module.exports.refreshDevices = async function (adapter, myCloud) {
    return new Promise(async (resolve, reject) => {
        try {
            adapter.log.info('Refreshing devices...');

            const devices = (await getDevices(myCloud)).content;

            adapter.setState('Devices', JSON.stringify(devices), true);

            if (devices) {
                this.log.info(`Found ${devices.length} devices associated with your account.`);
                adapter.setState('Connection', true, true);
                createOrUpdateDevices(devices, adapter);
            } else {
                adapter.setState('Connection', false, true);

                adapter.log.error(
                    'No devices found or an error occurred while fetching your devices.'
                );
            }
            return resolve(true);
        } catch (err) {
            return resolve(false);
        }
    });
};
