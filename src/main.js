'use strict';

/*
 * Created by Daniel Pfister 2022
 * Updated by Mittelblut9 2023
 */

/**
 * Load modules
 */
const utils = require('@iobroker/adapter-core');
const urllib = require('urllib');
const moment = require('moment-timezone');
const GeoPoint = require('geopoint');
const createOrUpdateDevices = require('./functions/Adapter/createOrUpdateDevices');
const loginToApple = require('./functions/Apple/loginToApple');
const { Adapter } = require('./data/Adapter');
const { saveObjectsOnStartup } = require('./functions/Adapter/saveObjectsOnStartup');
const { getDevices } = require('./functions/Apple/getDevices');
const playSound = require('./functions/Apple/playSound');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let myCloud;

let errCount = 0;
let refreshTimeout = 5000;
let timeout;

/**
 * OnReady Function
 * it called at Startup the Adapter
 */
function onReady() {
    Adapter.getForeignObject('system.config', (err, obj) => {
        main();
    });
}

/**
 * Main Function
 */
async function main() {
    //Clear errCount
    errCount = 0;

    Adapter.log.info('Starting Adapter Apple-Find-Me');
    if (Adapter.config.refresh != 'none') {
        Adapter.log.info(`Refresh every ${Adapter.config.refresh} minutes`);
    } else {
        Adapter.log.info('Automatic Refresh is disabled');
    }

    await saveObjectsOnStartup();

    Adapter.subscribeStates('Refresh');

    const response = await loginToApple();

    // DEBUG
    Adapter.log.info(
        `Login to Apple: ${JSON.stringify(response)} ${
            response?.developerMode ? '(Developer Mode)' : ''
        }`
    );

    if (response.statusCode == 200) {
        Adapter.setState('Connection', true, true);

        myCloud = response?.myCloud;

        let devices = null;
        try {
            devices =
                process.env.NODE_ENV === 'development'
                    ? response.device
                    : await getDevices(myCloud);
        } catch (err) {
            Adapter.log.error(err);
            Adapter.log.error(
                'An error occurred while fetching your devices. This is most likely due no devices being associated with your account. Please check your account and try again.'
            );
            return;
        }

        Adapter.log.info(
            `Found ${
                devices.content.length
            } devices associated with your account. (${devices.content
                .map((device) => device.name)
                .join(', ')})`
        );

        Adapter.setState('Devices', foundDevices.length, true);
        Adapter.setState('LastJsonResponse', response, true);

        Adapter.log.info(
            'Creating or updating devices. This may take a while depending on the number of devices you have.'
        );
        createOrUpdateDevices(devices);
    } else {
        Adapter.setState('Connection', false, true);
    }

    refresh(true, false);
}

/***
 * Refresh function (Reset Data Collector Timer and run Data Collector)
 ***/
async function refresh(init, manual) {
    try {
        if (init == true && Adapter.config.refresh != 'none') {
            Adapter.log.debug('Initial Data Collector');
            timeout = setTimeout(function () {
                refresh(false, false);
            }, Adapter.config.refresh * 60000);
        } else {
            const devices = await getDevices(myCloud);
            if (devices) {
                Adapter.setState('Connection', true, true);
                createOrUpdateDevices(devices);
            } else {
                Adapter.setState('Connection', false, true);

                Adapter.log.error(
                    'No devices found or an error occurred while fetching your devices.'
                );
            }
        }
    } catch (err) {
        Adapter.log.error('Error on refresh: ' + err);
        //Reset the Timeout else Adapter gets "stuck"
        if (Adapter.config.refresh != 'none') {
            timeout = setTimeout(function () {
                refresh(false, false);
            }, Adapter.config.refresh * 60000);
        }
    }
}

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return (Adapter = utils.adapter(
        Object.assign({}, options, {
            name: 'apple-find-me',
            ready: onReady,

            // is called when adapter shuts down - callback has to be called under any circumstances!
            unload: (callback) => {
                try {
                    clearTimeout(timeout);
                } catch (e) {
                    Adapter.log.error('Error on unload: ' + e);
                }

                callback();
            },
            // is called if a subscribed state changes
            stateChange: (id, state) => {
                if (state) {
                    if (!state.ack) {
                        // The state was changed with no ack
                        const idArray = id.split('.');

                        if (idArray[idArray.length - 1] == 'PlaySound') {
                            const buildDeviceID = id.replace(
                                idArray[idArray.length - 1],
                                'DeviceID'
                            );
                            Adapter.getState(buildDeviceID, (error, state) => {
                                let DeviceID = state.val;
                                Adapter.log.info('PlaySound on device: ' + DeviceID);
                                playSound(DeviceID);
                                Adapter.setState(id, false, true);
                            });
                        } else if (idArray[idArray.length - 1] == 'Refresh') {
                            refresh(false, true);
                        }
                    }
                }
            },
        })
    ));
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter;
}
