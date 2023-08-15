const iCloud = require('apple-icloud');
const { Adapter } = require('../../data/adapter');

module.exports.loginToApple = function loginToApple() {
    return new Promise(async (resolve, reject) => {
        const username = Adapter.config.username;
        const password = Adapter.config.password;

        if (!username || !password) {
            Adapter.log.error('Username or password is missing');
            return resolve({
                statusCode: 401,
                message: 'Username or password is missing',
            });
        }

        Adapter.log.info('Logging in to iCloud...');
        Adapter.log.info('Username: ' + username);
        Adapter.log.info('Password: ' + password);

        try {
            let session = await getICloudSession();

            if (!session) {
                Adapter.log.info('Trying to login with empty Session');
                session = {};
            }

            myCloud = new iCloud(session, username, password);

            myCloud.on('ready', async function () {
                if (!myCloud.loggedIn) {
                    Adapter.log.error('Login failed. Please check your credentials.');
                    return resolve({
                        statusCode: 401,
                        message: 'Login failed. Please check your credentials.',
                    });
                }

                Adapter.log.info('Logged in to iCloud');

                const isAuthenticated = await handleTwoFactorAuth(myCloud);

                const newSession = myCloud.exportSession();
                Adapter.setState('iCloudAccountSession', JSON.stringify(newSession), true);

                errCount = 0;
                return resolve({
                    statusCode: 200,
                    message: 'Logged in to iCloud',
                    myCloud,
                });
            });
        } catch (err) {
            Adapter.log.info('error' + err);
            errCount = errCount + 1;
            if (errCount == 5) {
                Adapter.log.error(
                    `Error on HTTP-Request. Please check your credentials. StatusCode: ${err.statusCode}`
                );
                Adapter.log.error(
                    'HTTP request failed for the third time, Adapter is deactivated to prevent deactivation of the iCloud account.'
                );
                Adapter.setForeignState(`system.Adapter.${Adapter.namespace}.alive`, false);
            } else {
                Adapter.log.error(
                    `Error on HTTP-Request. Please check your credentials. StatusCode: ${
                        err.statusCode
                    } Retry in ${Adapter.config.refresh} minutes. (${errCount.toString()}/3)`
                );
                return { statusCode: err.statusCode, message: err };
            }
        }
    });
};

async function handleTwoFactorAuth(myCloud) {
    if (myCloud.twoFactorAuthenticationIsRequired) {
        const code = prompt('Please enter your two-factor authentication code');
        myCloud.securityCode = code;
        return false;
    } else {
        return true;
    }
}

function getICloudSession() {
    return new Promise((resolve, reject) => {
        Adapter.getState('iCloudAccountSession', (err, state) => {
            const newSession = state?.val || null;

            if (!newSession) {
                return resolve(null);
            }

            Adapter.log.info('session test 1: ' + JSON.stringify(newSession));
            Adapter.setState('iCloudAccountSession', newSession, true);
            return resolve(newSession ? JSON.parse(newSession) : {});
        });
    });
}
