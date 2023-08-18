const { adapter } = require('@iobroker/adapter-core');

let errCount = 0;

function increaseErrCount(adapter) {
    errCount++;
    adapter.setState('iCloudAccountErrorCount', errCount, true);
}

function resetErrCount(adapter) {
    errCount = 0;
    adapter.setState('iCloudAccountErrorCount', errCount, true);
}

function getErrCount(adapter) {
    return adapter.getState('iCloudAccountErrorCount')?.val || errCount || 0;
}

module.exports = {
    increaseErrCount,
    resetErrCount,
    getErrCount,
};
