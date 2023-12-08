const iCloud = require('icloud.js');
const exampleData = require('../../data/device.example.json');
const { increaseErrCount, getErrCount, resetErrCount } = require('../../data/errCount');
const { sleep } = require('../../utils/sleep');

let loginRequest = 0;
let maxLoginRequestPerMin = 3;
let requestsInLastMin = [];

let loggedIn = false;

module.exports.loginToApple = async function (adapter, silent = false) {
    return new Promise(async (resolve, reject) => {
        if (adapter.config.developerMode === '1') {
            adapter.log.info('Developer mode is active. Using example data.');
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

        logInfo(adapter, silent, 'Logging in to iCloud...');
        logInfo(adapter, silent, 'Username: ' + username);

        try {
            const maxLoginRequestReached = hasTooManyRequests();
            if (maxLoginRequestReached) {
                adapter.log.error(
                    '!!!!To many login requests. Waiting 30 Seconds to prevent deactivation of the iCloud account. Please check your credentials, stop the adapter or report the issue to the Developer!!!!!'
                );
                await sleep(30000);
            }

            const myCloud = new iCloud({
                username,
                password,
                saveCredentials: true,
                trustDevice: true,
                authMethod: 'srp',
            });

            await myCloud.authenticate();

            if (iCloud.status === "MfaRequested" && !adapter.config.securityCode) {
                return resolve({
                    statusCode: 404,
                    message: 'Missing two factor authentication code. Please enter the code in the adapter settings.',
                });
            }

            if(iCloud.status === "MfaRequested") {
                await myCloud.provideMfaCode(adapter.config.securityCode);
            }

            await iCloud.awaitReady;

            logInfo(adapter, silent, 'Logged in to iCloud');

            resetErrCount(adapter);

            return resolve({
                statusCode: 200,
                message: 'Logged in to iCloud',
                myCloud,
            });
        } catch (err) {
            adapter.log.error('Error while trying to create the iCloud connection ' + err);
            increaseErrCount(adapter);
            const currentErrCount = await getErrCount(adapter);
            if (currentErrCount >= 3) {
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
                    } Retry in ${adapter.config.refresh} minutes. (${currentErrCount.toString()}/3)`
                );
                return { statusCode: err.statusCode, message: err };
            }
        }
    });
};

function logInfo(adapter, silent, message) {
    if (!silent) {
        adapter.log.info(message);
    } else {
        adapter.log.debug(message);
    }
}

function hasTooManyRequests() {
    const now = new Date().getTime();
    requestsInLastMin = requestsInLastMin.filter((time) => time > now - 60000);
    if (requestsInLastMin.length >= maxLoginRequestPerMin) {
        loginRequest++;
        if (loginRequest >= maxLoginRequestPerMin) {
            loginRequest = 0;
            return true;
        }
    } else {
        loginRequest = 0;
    }
    requestsInLastMin.push(now);
    return false;
}
