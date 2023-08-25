const { getDevices } = require('../Apple/getDevices');
const { loginToApple } = require('../Apple/loginToApple');
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

            adapter.log.info('Refreshing devices failed. Please check your credentials.' + err.code);

            if (err.code === 11) {
                adapter.log.debug('Error code 11. Trying to login again.');
                adapter.setState('Connection', false, true);
                await loginToApple(adapter, true)
                    .then(async (response) => {
                        if (response.statusCode === 200) {
                            adapter.log.debug('Login successful. Refreshing devices again.');
                            await this.refreshDevices(adapter, myCloud);
                        } else {
                            adapter.log.error('Login failed. Please check your credentials.');
                            return resolve(false);
                        }
                    })
                    .catch((err) => {
                        return resolve(false);
                    })
            }

            adapter.log.error('Error while refreshing devices: ' + JSON.stringify(err));
            return resolve(false);
        }
    });
};
