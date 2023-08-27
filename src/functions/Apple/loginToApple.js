const iCloud = require('apple-icloud');
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
            let session = await getICloudSession(adapter);

            if (!session || Object.keys(session).length === 0) {
                adapter.log.warn(
                    'Trying to login with empty Session. If this warn appears often (without an Instance restart), please stop the Instance and open an issue on GitHub.'
                );
                session = {};
            } else {
                logInfo(adapter, silent, 'Session found. Trying to login with existing Session.');
            }

            const maxLoginRequestReached = hasTooManyRequests();
            if (maxLoginRequestReached) {
                adapter.log.error(
                    '!!!!To many login requests. Waiting 30 Seconds to prevent deactivation of the iCloud account. Please check your credentials, stop the adapter or report the issue to the Developer!!!!!'
                );
                await sleep(30000);
            }

            const myCloud = new iCloud(session, username, password);

            myCloud.securityCode = adapter.config.securityCode || null;

            setTimeout(() => {
                if (!loggedIn && session && Object.keys(session).length > 0) {
                    adapter.log.error('Login timed out. Will try again with a new session');
                    increaseErrCount(adapter);
                    setICloudSession(adapter, {});
                    return loginToApple(adapter, silent);
                }
            }, 10000);

            myCloud.on('ready', async function () {
                loggedIn = true;

                if (!myCloud.loggedIn) {
                    adapter.log.error('Login failed. Please check your credentials.');
                    return resolve({
                        statusCode: 401,
                        message: 'Login failed. Please check your credentials.',
                    });
                }

                const twoFactorAuthRequired = myCloud.twoFactorAuthenticationIsRequired;

                if (!twoFactorAuthRequired && !myCloud.securityCode) {
                    return resolve({
                        statusCode: 404,
                        message: 'Missing two factor authentication code.',
                    });
                }

                logInfo(adapter, silent, 'Logged in to iCloud');

                setICloudSession(adapter, myCloud.exportSession());

                resetErrCount(adapter);

                return resolve({
                    statusCode: 200,
                    message: 'Logged in to iCloud',
                    myCloud,
                });
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

function getICloudSession(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getState('iCloudAccountSession', (err, state) => {
            if (err) {
                adapter.log.error('Error while reading Session from State: ' + err);
            }
            const decyptedSession = adapter.decrypt(state.val);

            if (decyptedSession) {
                try {
                    const session = JSON.parse(decyptedSession);
                    resolve(session);
                } catch (err) {
                    adapter.log.error('Error while parsing Session from State: (Its empty)' + err);
                    resolve({});
                }
            } else {
                resolve({});
            }
        });
    });
}

function setICloudSession(adapter, session) {
    const encryptedSession = adapter.encrypt(JSON.stringify(session));
    adapter.setState('iCloudAccountSession', encryptedSession, true);
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
