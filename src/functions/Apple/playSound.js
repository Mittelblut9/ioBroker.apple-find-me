/**
 *
 * Function to play sound on Apple-Device (Find my iPhone)
 *
 */
async function playSound(adapter, deviceID, myCloud) {
    try {
        await myCloud.FindMe.playSound(deviceID);
    } catch (error) {
        adapter.log.error(error);
    }

    return;
}

module.exports = playSound;
