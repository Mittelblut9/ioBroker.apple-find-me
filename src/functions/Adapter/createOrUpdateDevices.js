const { sleep } = require('../../utils/sleep');
const moment = require('moment-timezone');
const GeoPoint = require('geopoint');
const { addressRequest } = require('./httpRequests/address');
const { getDistanceToGeoPoint } = require('../../utils/getDistanceToGeoPoint');

/**
 * Function to parse Request-Content and create or update states
 * Input: data (Json-String)
 *
 */
function createOrUpdateDevices(data, adapter) {
    data.forEach(async (element) => {
        //Sleep for 5 Seconds to prevent Rate-Limits
        sleep(5000);

        const deviceNameWithId = `${element.name.replace(/[^a-zA-Z0-9]/g, '')}${element.id.replace(
            /[^a-zA-Z0-9]/g,
            ''
        )}`;

        //Build Dummy discoveryId Issue https://github.com/PfisterDaniel/ioBroker.apple-find-me/issues/6
        const dummyDiscoveryId = `0E112CBF-D1B1-0001-B12E-${deviceNameWithId.substring(0, 12)}`;
        const discoveryId = element.deviceDiscoveryId || dummyDiscoveryId;

        adapter.log.debug('Device: ' + element.rawDeviceModel + ' Discovery ID: ' + discoveryId);

        if (discoveryId != '') {
            await adapter.setObjectNotExistsAsync(element.deviceClass, {
                type: 'device',
                common: {
                    name: 'Apple ' + element.deviceClass + "'s",
                    read: true,
                    write: false,
                },
                native: {},
            });

            adapter.log.debug('Set class: ' + element.deviceClass);

            await adapter.setObjectNotExistsAsync(element.deviceClass + '.' + discoveryId, {
                type: 'device',
                common: {
                    name: element.name,
                    read: true,
                    write: false,
                },
                native: {},
            });

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.ModelType',
                {
                    type: 'state',
                    common: {
                        role: 'text',
                        def: '',
                        type: 'string',
                        read: true,
                        write: false,
                        name: 'ModelType',
                        desc: 'Model Typ-Name',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.ModelType',
                element.rawDeviceModel,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.PlaySound',
                {
                    type: 'state',
                    common: {
                        name: 'PlaySound',
                        role: 'button',
                        type: 'boolean',
                        read: true,
                        write: true,
                        desc: 'Play Sound on Device',
                        def: false,
                    },
                    native: {},
                }
            );
            adapter.setState(element.deviceClass + '.' + discoveryId + '.PlaySound', false, true);
            adapter.subscribeStates('*.PlaySound');

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.ModelName',
                {
                    type: 'state',
                    common: {
                        role: 'text',
                        def: '',
                        type: 'string',
                        read: true,
                        write: false,
                        name: 'ModelName',
                        desc: 'Model Name',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.ModelName',
                element.deviceDisplayName,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.BatteryLevel',
                {
                    type: 'state',
                    common: {
                        name: 'BatteryLevel',
                        role: 'value.battery',
                        type: 'number',
                        min: 0,
                        max: 100,
                        unit: '%',
                        read: true,
                        write: false,
                        desc: 'Battery Charging-Level',
                        def: 0,
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.BatteryLevel',
                parseInt((element.batteryLevel * 100).toString().split('.')[0]),
                true
            );
            adapter.log.debug(
                element.deviceClass +
                    '.' +
                    discoveryId +
                    '.BatteryLevel' +
                    ' -> ' +
                    element.batteryLevel
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.BatteryState',
                {
                    type: 'state',
                    common: {
                        name: 'BatteryState',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'Battery State',
                        def: '',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.BatteryState',
                element.batteryStatus,
                true
            );
            adapter.log.debug(
                element.deviceClass +
                    '.' +
                    discoveryId +
                    '.BatteryState' +
                    ' -> ' +
                    element.batteryStatus
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.DeviceID',
                {
                    type: 'state',
                    common: {
                        name: 'DeviceID',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'Device Identifiere',
                        def: '',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.DeviceID',
                element.id,
                true
            );

            if (
                !element.hasOwnProperty('location') ||
                element.location === undefined ||
                element.location === null ||
                element.location.isOld ||
                element.location.isInaccurate
            ) {
                return;
            }

            adapter.log.debug(
                'Device: ' +
                    element.rawDeviceModel +
                    ' Discovery ID: ' +
                    discoveryId +
                    ' -> has location information'
            );

            //Build Channel Location
            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location',
                {
                    type: 'channel',
                    common: {
                        name: 'Location',
                    },
                    native: {},
                }
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.Latitude',
                {
                    type: 'state',
                    common: {
                        name: 'Latitude',
                        role: 'value.gps.latitude',
                        type: 'number',
                        read: true,
                        write: false,
                        desc: 'Latitude',
                        def: 0,
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.Latitude',
                element.location.latitude,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.Longitude',
                {
                    type: 'state',
                    common: {
                        name: 'Longitude',
                        role: 'value.gps.longitude',
                        type: 'number',
                        read: true,
                        write: false,
                        desc: 'Longitude',
                        def: 0,
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.Longitude',
                element.location.longitude,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.Position',
                {
                    type: 'state',
                    common: {
                        name: 'Position',
                        role: 'value.gps',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'Position',
                        def: '0, 0',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.Position',
                element.location.latitude.toString() + ', ' + element.location.longitude.toString(),
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.PositionType',
                {
                    type: 'state',
                    common: {
                        name: 'PositionType',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'PositionTyp',
                        def: 'Unknown',
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.PositionType',
                element.location.positionType,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.Altitude',
                {
                    type: 'state',
                    common: {
                        name: 'Altitude',
                        role: 'value.gps.altitude',
                        type: 'number',
                        unit: 'm',
                        min: 0,
                        read: true,
                        write: false,
                        desc: 'Height',
                        def: 0,
                    },
                    native: {},
                }
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.Accuracy',
                {
                    type: 'state',
                    common: {
                        name: 'Accuracy',
                        role: 'sensor',
                        type: 'number',
                        read: true,
                        write: false,
                        min: 0,
                        desc: 'Position accuracy',
                        unit: 'm',
                        def: 0,
                    },
                    native: {},
                }
            );
            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.Accuracy',
                Math.round(element.location.horizontalAccuracy),
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.TimeStamp',
                {
                    type: 'state',
                    common: {
                        name: 'TimeStamp',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'TimeStamp of last position search',
                        def: '',
                    },
                    native: {},
                }
            );

            const timeStampString = moment(element.location.timeStamp)
                .tz(adapter.config.timezone)
                .format(adapter.config.timeformat);

            adapter.setState(
                `${element.deviceClass}.${discoveryId}.Location.TimeStamp`,
                timeStampString,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.RefreshTimeStamp',
                {
                    type: 'state',
                    common: {
                        name: 'RefreshTimeStamp',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'TimeStamp of last refresh',
                        def: '',
                    },
                    native: {},
                }
            );

            const refreshTimeStampString = moment(new Date())
                .tz(adapter.config.timezone)
                .format(adapter.config.timeformat);

            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.RefreshTimeStamp',
                refreshTimeStampString,
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.CurrentAddress',
                {
                    type: 'state',
                    common: {
                        name: 'CurrentAddress',
                        role: 'text',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'Current address',
                        def: '',
                    },
                    native: {},
                }
            );

            adapter.setState(
                element.deviceClass + '.' + discoveryId + '.Location.CurrentAddress',
                element.location.addresses.en.formattedAddressLines.join(', '),
                true
            );

            await adapter.setObjectNotExistsAsync(
                element.deviceClass + '.' + discoveryId + '.Location.CurrentLocation',
                {
                    type: 'state',
                    common: {
                        name: 'CurrentLocation',
                        role: 'location',
                        type: 'string',
                        read: true,
                        write: false,
                        desc: 'Current Location',
                        def: 'Unknown',
                    },
                    native: {},
                }
            );

            getDistanceToGeoPoint(adapter, {
                element: element,
                discoveryId: discoveryId,
            });
        }
    });
}

module.exports = createOrUpdateDevices;
