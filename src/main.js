'use strict';

/*
 * Created by Daniel Pfister 2022
 * Updated by Mittelblut9 2023
 */

const utils = require('@iobroker/adapter-core');
const createOrUpdateDevices = require('./functions/Adapter/createOrUpdateDevices');
const { loginToApple } = require('./functions/Apple/loginToApple');
const { saveObjectsOnStartup } = require('./functions/Adapter/saveObjectsOnStartup');
const { getDevices } = require('./functions/Apple/getDevices');
const playSound = require('./functions/Apple/playSound');
const { getErrCount } = require('./data/errCount');
const { refreshDevices } = require('./functions/Adapter/refreshDevices');
const { sleep } = require('./utils/sleep');

class FindMy extends utils.Adapter {
    myCloud;

    interval;

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
            this.main();
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            clearInterval(this.interval);
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
        if (!state || state.ack) return;

        // The state was changed with no ack
        const idArray = id.split('.');

        if (idArray[idArray.length - 1] == 'PlaySound') {
            const buildDeviceID = id.replace(idArray[idArray.length - 1], 'DeviceID');
            this.getState(buildDeviceID, async (error, state) => {
                const deviceID = state.val;
                await playSound(deviceID);

                this.log.info('PlaySound on device: ' + deviceID);
                this.setState(id, false, true);
            });
        } else if (idArray[idArray.length - 1] == 'Refresh') {
            this.refresh(true);
        }
    }

    async main() {
        //Clear errCount
        this.errCount = await getErrCount(this);

        this.log.info('Starting Adapter Apple-Find-Me');
        if (this.config.refresh != 'none') {
            this.log.info(`Refresh every ${this.config.refresh} minutes`);
        } else {
            this.log.info('Automatic Refresh is disabled');
        }

        await saveObjectsOnStartup(this);

        this.subscribeStates('Refresh');

        const response = await loginToApple(this);

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
                    this.config.developerMode === '1'
                        ? response.device
                        : (await getDevices(this.myCloud)).content;
            } catch (err) {
                this.log.error(err);
                this.log.error(
                    'An error occurred while fetching your devices. This is most likely due no devices being associated with your account. Please check your account and try again.'
                );
                return;
            }

            this.log.info(`Found ${devices.length} devices associated with your account.`);

            if (!this.config.developerMode === '1') {
                this.log.info(`
                    (${devices.map((device) => device.name).join(', ')})
                        `);
            }

            this.setState('Devices', JSON.stringify(devices), true);

            this.log.info(
                'Creating or updating devices. This may take a while depending on the number of devices you have.'
            );
            createOrUpdateDevices(devices, this);
        } else {
            this.setState('Connection', false, true);
        }

        //init refresh
        this.refresh(true);

        //refresh every x minutes
        this.refresh();
    }

    refresh(manualRefresh = false) {
        if (manualRefresh) {
            this.log.info('Manual Refresh triggered');
            refreshDevices(this, this.myCloud);
        } else {
            this.interval = this.setInterval(() => {
                try {
                    this.log.info('Automatic Refresh triggered');
                    refreshDevices(this, this.myCloud);
                } catch (err) {
                    this.log.error('Error on refresh: ' + err);
                    clearInterval(this.interval);
                    this.refresh();
                }
            }, this.config.refresh * 60000);
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
