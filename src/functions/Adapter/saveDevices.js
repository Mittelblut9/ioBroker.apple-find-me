module.exports.saveDevices = (adapter, devices) => {
    const tmpDevices = devices;

    let sanitizedDevices = [];

    for (let device of tmpDevices) {
        let tmpDevice = device;
        sanitizedDevices.push(dataTransformer(tmpDevice));
    }

    adapter.log.info(`Saving ${sanitizedDevices.length} devices to state.`);
    adapter.setState('Devices', JSON.stringify(sanitizedDevices), true);
};

function dataTransformer(device) {
    device.id = 'XXX';
    device.baUUID = 'XXX';
    device.deviceDiscoveryId = 'XXX';
    device.name = 'Some Phone Name';

    if (!device.location?.addresses || device.location === undefined) {
        device.location = 'No Location Data';
    } else {
        device.location.addresses = {
            en: {
                locality: 'Some City',
                formattedAddressLines: ['Some Street 1'],
                country: 'Some Country',
                administrativeArea: 'Some State',
                countryCode: 'XX',
            },
        };
    }

    device.location.latitude = 0;
    device.location.longitude = 0;

    return device;
}
