module.exports.getDevices = async function (myCloud) {
    if (!myCloud?.loggedIn) {
        return null;
    }

    return await myCloud.FindMe.get();
};
