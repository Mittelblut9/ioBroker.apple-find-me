module.exports.saveObjectsOnStartup = async function (adapter) {
    await adapter.setObjectNotExistsAsync('LastJsonResponse', {
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

    await adapter.setObjectNotExistsAsync('Connection', {
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

    await adapter.setObjectNotExistsAsync('Account', {
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

    adapter.setState('Account', adapter.config.username, true);

    await adapter.setObjectNotExistsAsync('Devices', {
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

    await adapter.setObjectNotExistsAsync('Refresh', {
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
    adapter.setState('Refresh', false, true);
};
