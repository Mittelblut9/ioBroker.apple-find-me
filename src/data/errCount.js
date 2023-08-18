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
    return new Promise((resolve, reject) => { 
        adapter.getState('iCloudAccountErrorCount', (err, state) => {
            if (state && state.val) {
                resolve(state.val);
            } else {
                resolve(errCount);
            } 
        });
    });
}

module.exports = {
    increaseErrCount,
    resetErrCount,
    getErrCount,
};
