const GeoPoint = require('geopoint');

module.exports.getDistanceToGeoPoint = async (adapter, { element, discoveryId }) => {
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

    const currentLocation = new GeoPoint(element.location.latitude, element.location.longitude);

    if (!adapter.config.locations) {
        adapter.log.debug('No locations defined');
        return;
    }
    let activeLocationsWithDistance = [];
    for (let i = 0; i < adapter.config.locations.length; i++) {
        if (!adapter.config.locations[i].active) {
            adapter.delObject(
                element.deviceClass +
                    '.' +
                    discoveryId +
                    '.Location.Distances.' +
                    adapter.config.locations[i].name
            );
            return;
        }

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

        adapter.log.debug('Location ' + adapter.config.locations[i].name + ' is active');
        let distanceObj = {
            id: i,
            name: adapter.config.locations[i].name,
            distance: 0,
        };
        const locationCoordinates = new GeoPoint(
            parseFloat(adapter.config.locations[i].latitude),
            parseFloat(adapter.config.locations[i].longitude)
        );
        distanceObj.distance = parseInt(
            (currentLocation.distanceTo(locationCoordinates, true) * 1000).toString().split('.')[0]
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
    }

    if (activeLocationsWithDistance.length === 0) {
        adapter.setState(
            element.deviceClass + '.' + discoveryId + '.Location.CurrentLocation',
            '< No Places Defined >',
            true
        );
    }

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
};
