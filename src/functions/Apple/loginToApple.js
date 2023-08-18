const iCloud = require('apple-icloud');
const exampleData = require('../../data/device.example.json');

module.exports.loginToApple = async function (adapter) {
    return new Promise(async (resolve, reject) => {
        if (adapter.config.developerMode === '1') {
            return resolve({
                statusCode: 200,
                developerMode: true,
                device: [exampleData],
            });
        }

        const username = adapter.config.username;
        const password = adapter.config.password;

        if (!username || !password) {
            adapter.log.error('Username or password is missing');
            return resolve({
                statusCode: 401,
                message: 'Username or password is missing',
            });
        }

        adapter.log.info('Logging in to iCloud...');
        adapter.log.info('Username: ' + username);

        try {
            let session = await getICloudSession(adapter);

            if (!session) {
                adapter.log.warn(
                    'Trying to login with empty Session. If this warn appears often (without an Instance restart), please stop the Instance and open an issue on GitHub.'
                );
                session = {};
            }

            myCloud.securityCode = adapter.config.securityCode || null;

            myCloud = new iCloud(session, username, password);

            myCloud.on('ready', async function () {
                if (!myCloud.loggedIn) {
                    adapter.log.error('Login failed. Please check your credentials.');
                    return resolve({
                        statusCode: 401,
                        message: 'Login failed. Please check your credentials.',
                    });
                }

                adapter.log.info('Logged in to iCloud');

                const twoFactorAuthRequired = myCloud.twoFactorAuthenticationIsRequired;

                if (!isAuthenticated) {
                    return resolve({
                        statusCode: 404,
                        message: 'Missing two factor authentication code.',
                    });
                }

                const newSession = myCloud.exportSession();
                adapter.setState('iCloudAccountSession', JSON.stringify(newSession), true);

                errCount = 0;
                return resolve({
                    statusCode: 200,
                    message: 'Logged in to iCloud',
                    myCloud,
                });
            });
        } catch (err) {
            adapter.log.error('Error while trying to create the iCloud connection' + err);
            errCount = errCount + 1;
            if (errCount == 5) {
                adapter.log.error(
                    `Error on HTTP-Request. Please check your credentials. StatusCode: ${err.statusCode}`
                );
                adapter.log.error(
                    'HTTP request failed for the third time, adapter is deactivated to prevent deactivation of the iCloud account.'
                );
                adapter.setForeignState(`system.adapter.${adapter.namespace}.alive`, false);
            } else {
                adapter.log.error(
                    `Error on HTTP-Request. Please check your credentials. StatusCode: ${
                        err.statusCode
                    } Retry in ${adapter.config.refresh} minutes. (${errCount.toString()}/3)`
                );
                return { statusCode: err.statusCode, message: err };
            }
        }
    });
};

function getICloudSession(adapter) {
    return new Promise((resolve, reject) => {
        //TODO add session to a permanent storage
        adapter.getState('iCloudAccountSession', (err, state) => {
            const newSession = state?.val || null;

            if (!newSession) {
                return resolve(null);
            }

            adapter.log.info('session test 1: ' + JSON.stringify(newSession));
            adapter.setState('iCloudAccountSession', newSession, true);
            return resolve(newSession ? JSON.parse(newSession) : {});
        });
    });
}
