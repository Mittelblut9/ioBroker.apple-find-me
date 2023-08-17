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

class FindMy extends utils.Adapter {
    myCloud;

    errCount = 0;
    refreshTimeout = 5000;
    timeout;

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'apple-find-me',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.getForeignObject('system.config', (err, obj) => {
            main();
            Adapter = this;
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            clearTimeout(this.timeout);
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            if (!state.ack) {
                // The state was changed with no ack
                const idArray = id.split('.');

                if (idArray[idArray.length - 1] == 'PlaySound') {
                    const buildDeviceID = id.replace(idArray[idArray.length - 1], 'DeviceID');
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
    }

    async main() {
        //Clear errCount
        this.errCount = 0;

        this.log.info('Starting Adapter Apple-Find-Me');
        if (this.config.refresh != 'none') {
            this.log.info(`Refresh every ${this.config.refresh} minutes`);
        } else {
            this.log.info('Automatic Refresh is disabled');
        }

        await saveObjectsOnStartup();

        this.subscribeStates('Refresh');

        const response = await loginToApple();

        // DEBUG
        this.log.info(
            `Login to Apple: ${JSON.stringify(response)} ${
                response?.developerMode ? '(Developer Mode)' : ''
            }`
        );

        if (response.statusCode == 200) {
            this.setState('Connection', true, true);

            this.myCloud = response?.myCloud;

            let devices = null;
            try {
                devices =
                    process.env.NODE_ENV === 'development'
                        ? response.device
                        : await getDevices(myCloud);
            } catch (err) {
                this.log.error(err);
                this.log.error(
                    'An error occurred while fetching your devices. This is most likely due no devices being associated with your account. Please check your account and try again.'
                );
                return;
            }

            this.log.info(
                `Found ${
                    devices.content.length
                } devices associated with your account. (${devices.content
                    .map((device) => device.name)
                    .join(', ')})`
            );

            this.setState('Devices', foundDevices.length, true);
            this.setState('LastJsonResponse', response, true);

            this.log.info(
                'Creating or updating devices. This may take a while depending on the number of devices you have.'
            );
            createOrUpdateDevices(devices);
        } else {
            this.setState('Connection', false, true);
        }

        this.refresh(true);
    }

    async refresh(init) {
        try {
            if (init == true && this.config.refresh != 'none') {
                this.log.debug('Initial Data Collector');
                this.timeout = setTimeout(function () {
                    this.refresh(false);
                }, this.config.refresh * 60000);
            } else {
                const devices = await getDevices(myCloud);
                if (devices) {
                    this.setState('Connection', true, true);
                    createOrUpdateDevices(devices);
                } else {
                    this.setState('Connection', false, true);

                    this.log.error(
                        'No devices found or an error occurred while fetching your devices.'
                    );
                }
            }
        } catch (err) {
            this.log.error('Error on refresh: ' + err);
            //Reset the Timeout else Adapter gets "stuck"
            if (this.config.refresh != 'none') {
                this.timeout = setTimeout(function () {
                    this.refresh(false);
                }, this.config.refresh * 60000);
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new FindMy(options);
} else {
    // otherwise start the instance directly
    new FindMy();
}
