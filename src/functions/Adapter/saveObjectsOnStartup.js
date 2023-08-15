const { Adapter } = require('../../data/adapter');

module.exports.saveObjectsOnStartup = async function () {
    await Adapter.setObjectNotExistsAsync('LastJsonResponse', {
        type: 'state',
        common: {
            role: 'text',
            def: '',
            type: 'object',
            read: true,
            write: false,
            name: 'LastJsonResponse',
            desc: 'Last Response from Apple iCloud',
        },
        native: {},
    });

    await Adapter.setObjectNotExistsAsync('Connection', {
        type: 'state',
        common: {
            name: 'Connection',
            role: 'indicator.connected',
            type: 'boolean',
            read: true,
            write: false,
            desc: 'Connection to iCloud',
            def: false,
        },
        native: {},
    });

    await Adapter.setObjectNotExistsAsync('Account', {
        type: 'state',
        common: {
            name: 'Account',
            role: 'meta',
            type: 'string',
            read: true,
            write: false,
            desc: 'iCloud Account',
        },
        native: {},
    });

    Adapter.setState('Account', Adapter.config.username, true);

    await Adapter.setObjectNotExistsAsync('Devices', {
        type: 'state',
        common: {
            name: 'Devices',
            role: 'meta',
            type: 'number',
            read: true,
            write: false,
            desc: 'Number of devices',
            def: 0,
        },
        native: {},
    });

    await Adapter.setObjectNotExistsAsync('Refresh', {
        type: 'state',
        common: {
            name: 'Refresh',
            role: 'button',
            type: 'boolean',
            read: true,
            write: true,
            desc: 'Reload data from the iCloud',
            def: false,
        },
        native: {},
    });
    Adapter.setState('Refresh', false, true);
};
