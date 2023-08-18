const { getRandomObject } = require('../../utils/getRandomObject');
const { sleep } = require('../../utils/sleep');
const urllib = require('urllib');
const moment = require('moment');
const GeoPoint = require('geopoint');

/**
 * Function to parse Request-Content and create or update states
 * Input: data (Json-String)
 *
 */
function createOrUpdateDevices(data, adapter) {
    data.forEach(async (element) => {
        //Sleep for 5 Seconds to prevent Rate-Limits
        sleep(5000);

        const deviceColor = element.deviceColor ? element.deviceColor : '';
        const deviceNameWithId = `${element.name.replace(/[^a-zA-Z0-9]/g, '')}${element.id.replace(
            /[^a-zA-Z0-9]/g,
            ''
        )}`;

        //Build Dummy discoveryId Issue https://github.com/PfisterDaniel/ioBroker.apple-find-me/issues/6
        const dummyDiscoveryId = `0E112CBF-D1B1-0001-B12E-${deviceNameWithId.substring(0, 12)}`;
        const discoveryId = element.deviceDiscoveryId || dummyDiscoveryId;

        adapter.log.debug('Device: ' + element.rawDeviceModel + ' Discovery ID: ' + discoveryId);

        const deviceClass = element.deviceClass || 'unknown';
        const deviceId = element.id || 'unknown';
        const name = element.name || 'unknown';
        const batteryStatus = element.batteryStatus || 'unknown';
        const batteryLevel = element.batteryLevel || 'unknown';

        //location
        const location = element.location || 'unknown';

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

            //Device has location information
            if (
                element.hasOwnProperty('location') &&
                element.location != undefined &&
                element.location != null
            ) {
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
                //Build Channel Distances
                await adapter.setObjectNotExistsAsync(
                    element.deviceClass + '.' + discoveryId + '.Location.Distances',
                    {
                        type: 'channel',
                        common: {
                            name: 'Distances',
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
                    element.location.latitude.toString() +
                        ', ' +
                        element.location.longitude.toString(),
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

                if (element.location.altitude == 0.0) {
                    var UrlArray = [
                        {
                            id: 1,
                            url: `https://api.opentopodata.org/v1/eudem25m?locations=${element.location.latitude.toString()},${element.location.longitude.toString()}`,
                        },
                        {
                            id: 2,
                            url: `https://api.open-elevation.com/api/v1/lookup?locations=${element.location.latitude.toString()},${element.location.longitude.toString()}`,
                        },
                    ];

                    const OpenEvaltionAPIUrl = getRandomObject(UrlArray);

                    adapter.log.debug('Using Elevation-Address: ' + OpenEvaltionAPIUrl.url);

                    urllib.request(
                        OpenEvaltionAPIUrl.url,
                        {
                            method: 'GET',
                            rejectUnauthorized: false,
                            dataType: 'json',
                        },
                        function (err, data, res) {
                            if (!err && res.statusCode == 200) {
                                var AltValue = parseFloat(data.results[0].elevation.toFixed(2));
                                adapter.setState(
                                    element.deviceClass + '.' + discoveryId + '.Location.Altitude',
                                    AltValue,
                                    true
                                );
                            } else {
                                adapter.setState(
                                    element.deviceClass + '.' + discoveryId + '.Location.Altitude',
                                    0,
                                    true
                                );
                            }
                        }
                    );
                } else {
                    adapter.setState(
                        element.deviceClass + '.' + discoveryId + '.Location.Altitude',
                        element.location.altitude,
                        true
                    );
                }

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

                //TODO moment.tz is not working
                // var timeStampString = moment(new Date(element.location.timeStamp))
                //     .tz(adapter.config.timezone)
                //     .format(adapter.config.timeformat);
                // adapter.setState(
                //     element.deviceClass + '.' + discoveryId + '.Location.TimeStamp',
                //     timeStampString,
                //     true
                // );

                // await adapter.setObjectNotExistsAsync(
                //     element.deviceClass + '.' + discoveryId + '.RefreshTimeStamp',
                //     {
                //         type: 'state',
                //         common: {
                //             name: 'RefreshTimeStamp',
                //             role: 'text',
                //             type: 'string',
                //             read: true,
                //             write: false,
                //             desc: 'TimeStamp of last refresh',
                //             def: '',
                //         },
                //         native: {},
                //     }
                // );
                // var refreshTimeStampString = moment(new Date())
                //     .tz(adapter.config.timezone)
                //     .format(adapter.config.timeformat);
                // adapter.setState(
                //     element.deviceClass + '.' + discoveryId + '.RefreshTimeStamp',
                //     refreshTimeStampString,
                //     true
                // );

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

                var MapApiUrl = '';
                if (adapter.config.mapprovider === 'osm') {
                    MapApiUrl =
                        'https://nominatim.openstreetmap.org/reverse?format=json&accept-language=de-DE&lat=' +
                        element.location.latitude +
                        '&lon=' +
                        element.location.longitude +
                        '&zoom=18&addressdetails=1';
                } else if (adapter.config.mapprovider === 'bing') {
                    MapApiUrl =
                        'https://dev.virtualearth.net/REST/v1/Locations/' +
                        element.location.latitude.toFixed(6) +
                        ',' +
                        element.location.longitude.toFixed(6) +
                        '?incl=ciso2&inclnb=1&key=' +
                        adapter.config.apikey;
                } else if (adapter.config.mapprovider === 'here') {
                    MapApiUrl =
                        'https://revgeocode.search.hereapi.com/v1/revgeocode?at=' +
                        element.location.latitude.toFixed(6) +
                        ',' +
                        element.location.longitude.toFixed(6) +
                        '&apiKey=' +
                        adapter.config.apikey;
                } else if (adapter.config.mapprovider === 'google') {
                    MapApiUrl =
                        'https://maps.googleapis.com/maps/api/geocode/json?latlng=' +
                        element.location.latitude +
                        ',' +
                        element.location.longitude +
                        '&language=de&result_type=street_address&key=' +
                        adapter.config.apikey;
                } else if (adapter.config.mapprovider === 'geoapify') {
                    MapApiUrl =
                        'https://api.geoapify.com/v1/geocode/reverse?lat=' +
                        element.location.latitude +
                        '&lon=' +
                        element.location.longitude +
                        '&apiKey=' +
                        adapter.config.apikey;
                } else if (adapter.config.mapprovider === 'locationiq_eu') {
                    MapApiUrl =
                        'https://eu1.locationiq.com/v1/reverse?key=' +
                        adapter.config.apikey +
                        '&lat=' +
                        element.location.latitude +
                        '&lon=' +
                        element.location.longitude +
                        '&format=json';
                } else if (adapter.config.mapprovider === 'locationiq_usa') {
                    MapApiUrl =
                        'https://us1.locationiq.com/v1/reverse?key=' +
                        adapter.config.apikey +
                        '&lat=' +
                        element.location.latitude +
                        '&lon=' +
                        element.location.longitude +
                        '&format=json';
                } else if (adapter.config.mapprovider === 'positionstack') {
                    MapApiUrl =
                        'http://api.positionstack.com/v1/reverse?access_key=' +
                        adapter.config.apikey +
                        '&query=' +
                        element.location.latitude +
                        ',' +
                        element.location.longitude +
                        '&output=json&limit=1';
                } else if (adapter.config.mapprovider === 'tomtom') {
                    MapApiUrl =
                        'https://api.tomtom.com/search/2/reverseGeocode/' +
                        element.location.latitude +
                        '%2C' +
                        element.location.longitude +
                        '?key=' +
                        adapter.config.apikey +
                        '&ext=json';
                }

                adapter.log.debug('Using MapApiUrl-Address: ' + MapApiUrl);

                urllib.request(
                    MapApiUrl,
                    {
                        method: 'GET',
                        rejectUnauthorized: false,
                        dataType: 'json',
                    },
                    function (err, data, res) {
                        //if OpenStreetMap
                        if (adapter.config.mapprovider === 'osm') {
                            if (!err && res.statusCode == 200) {
                                var CurrentAddress = '';
                                if (data.hasOwnProperty('address')) {
                                    var AddressObject = data.address;
                                    if (AddressObject.hasOwnProperty('road')) {
                                        CurrentAddress += AddressObject.road;
                                        if (AddressObject.hasOwnProperty('house_number')) {
                                            CurrentAddress += ' ' + AddressObject.house_number;
                                        }
                                        CurrentAddress += ', ';
                                    }
                                    if (AddressObject.hasOwnProperty('postcode')) {
                                        CurrentAddress += AddressObject.postcode + ' ';
                                    }
                                    if (AddressObject.hasOwnProperty('village')) {
                                        CurrentAddress += AddressObject.village;
                                    } else {
                                        if (AddressObject.hasOwnProperty('town')) {
                                            CurrentAddress += AddressObject.town;
                                        }
                                    }
                                } else {
                                    CurrentAddress = 'Response has no Address Object';
                                }
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    CurrentAddress,
                                    true
                                );
                            } else {
                                adapter.log.warn('Error on getting address from OpenStreetMaps');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (adapter.config.mapprovider === 'bing') {
                            if (!err && res.statusCode == 200) {
                                var CurrentAddress =
                                    data.resourceSets[0].resources[0].address.formattedAddress;
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    CurrentAddress,
                                    true
                                );
                            } else {
                                if (res.statusCode == 401) {
                                    adapter.log.warn(
                                        'API-Key not valid. Please Validate your API-KEY!'
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< No valid API-KEY >',
                                        true
                                    );
                                }
                            }
                        } else if (adapter.config.mapprovider === 'here') {
                            if (!err && res.statusCode == 200) {
                                try {
                                    var CurrentAddress = data.items[0].address.label;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.warn(
                                        'Error on getting address from Here-Maps: ' + e
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error ' + e + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from Here-Maps');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (adapter.config.mapprovider === 'google') {
                            if (!err && res.statusCode == 200) {
                                if (data.status == 'OK') {
                                    var CurrentAddress = data.results[0].formatted_address;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } else {
                                    adapter.log.warn(
                                        'Error on getting address from Google-Maps (' +
                                            data.status +
                                            ') - ' +
                                            data.error_message
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error: ' + data.status + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from Google-Maps');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (adapter.config.mapprovider === 'geoapify') {
                            if (!err && res.statusCode == 200) {
                                try {
                                    var CurrentAddress = data.features[0].properties.formatted;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.warn(
                                        'Error on getting address from Geoapify: ' + e
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error ' + e + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from Geoapify');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (
                            adapter.config.mapprovider === 'locationiq_eu' ||
                            adapter.config.mapprovider === 'locationiq_usa'
                        ) {
                            if (!err && res.statusCode == 200) {
                                try {
                                    var CurrentAddress = data.display_name;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.warn(
                                        'Error on getting address from LocationIQ: ' + e
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error ' + e + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from LocationIQ');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (adapter.config.mapprovider === 'positionstack') {
                            if (!err && res.statusCode == 200) {
                                try {
                                    var CurrentAddress = data.data[0].label;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.warn(
                                        'Error on getting address from PositionStack: ' + e
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error ' + e + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from PositionStack');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        } else if (adapter.config.mapprovider === 'tomtom') {
                            if (!err && res.statusCode == 200) {
                                try {
                                    var CurrentAddress = data.addresses[0].address.freeformAddress;
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        CurrentAddress,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.warn(
                                        'Error on getting address from TomTom-API: ' + e
                                    );
                                    adapter.setState(
                                        element.deviceClass +
                                            '.' +
                                            discoveryId +
                                            '.Location.CurrentAddress',
                                        '< Error ' + e + ' >',
                                        true
                                    );
                                }
                            } else {
                                adapter.log.warn('Error on getting address from TomTom-API');
                                adapter.setState(
                                    element.deviceClass +
                                        '.' +
                                        discoveryId +
                                        '.Location.CurrentAddress',
                                    '< ErrorCode ' + res.statusCode + ' >',
                                    true
                                );
                            }
                        }
                    }
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

                let activeLocationsWithDistance = [];
                var currentLocation = new GeoPoint(
                    element.location.latitude,
                    element.location.longitude
                );

                if (adapter.config.locations) {
                    for (let i = 0; i < adapter.config.locations.length; i++) {
                        //Check if an location is active
                        if (adapter.config.locations[i].active) {
                            await adapter.setObjectNotExistsAsync(
                                element.deviceClass +
                                    '.' +
                                    discoveryId +
                                    '.Location.Distances.' +
                                    adapter.config.locations[i].name,
                                {
                                    type: 'state',
                                    common: {
                                        name: 'Location_' + i,
                                        role: 'text',
                                        type: 'number',
                                        read: true,
                                        write: false,
                                        min: 0,
                                        desc: 'Distance to the ' + i + ' defined location',
                                        unit: 'm',
                                    },
                                    native: {},
                                }
                            );

                            adapter.log.debug(
                                'Location ' + adapter.config.locations[i].name + ' is active'
                            );
                            let distanceObj = {
                                id: i,
                                name: adapter.config.locations[i].name,
                                distance: 0,
                            };
                            var LocationCoordinates = new GeoPoint(
                                parseFloat(adapter.config.locations[i].latitude),
                                parseFloat(adapter.config.locations[i].longitude)
                            );
                            distanceObj.distance = parseInt(
                                (currentLocation.distanceTo(LocationCoordinates, true) * 1000)
                                    .toString()
                                    .split('.')[0]
                            );
                            //Add Distance to State
                            adapter.setState(
                                element.deviceClass +
                                    '.' +
                                    discoveryId +
                                    '.Location.Distances.' +
                                    adapter.config.locations[i].name,
                                distanceObj.distance,
                                true
                            );

                            activeLocationsWithDistance.push(distanceObj);
                        } else {
                            adapter.delObject(
                                element.deviceClass +
                                    '.' +
                                    discoveryId +
                                    '.Location.Distances.' +
                                    adapter.config.locations[i].name
                            );
                        }
                    }
                }
                //Retrive smallest distance of locations where set as active
                if (activeLocationsWithDistance.length > 0) {
                    const smallestDistanceValue = activeLocationsWithDistance.reduce((acc, loc) =>
                        acc.distance < loc.distance ? acc : loc
                    );

                    if (smallestDistanceValue.distance < adapter.config.radius) {
                        adapter.setState(
                            element.deviceClass + '.' + discoveryId + '.Location.CurrentLocation',
                            smallestDistanceValue.name,
                            true
                        );
                    } else {
                        adapter.setState(
                            element.deviceClass + '.' + discoveryId + '.Location.CurrentLocation',
                            'Unknown',
                            true
                        );
                    }
                } else {
                    adapter.setState(
                        element.deviceClass + '.' + discoveryId + '.Location.CurrentLocation',
                        '< No Places Defined >',
                        true
                    );
                }
            }
        }
    });
}

module.exports = createOrUpdateDevices;
