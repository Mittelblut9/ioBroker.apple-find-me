module.exports.getDevices = async function (myCloud) {
    if (!myCloud?.loggedIn) {
        return null;
    }

    myCloud.FindMe.initialized = false;

    return await myCloud.FindMe.get();
};
