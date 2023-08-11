"use strict";

/*
 * Created by Daniel Pfister 2022
 */

/**
 * Load modules
 */
const utils = require("@iobroker/adapter-core");
const urllib = require("urllib");
const moment = require('moment-timezone');
const GeoPoint = require('geopoint'); 
const iCloud = require('apple-icloud');
const CreateOrUpdateDevices = require("./functions/createOrUpdateDevices");


/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

let myCloud;

var errCount = 0;
var RefreshTimeout = 5000;

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: "apple-find-me",
        ready: onReady, // Main method defined below for readability

        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: (callback) => {
            try {
                clearTimeout(RefreshTimeout);
                callback();
            } catch (e) {
                callback();
            }
        },
        // is called if a subscribed state changes
        stateChange: (id, state) => {
            if (state) {
                if(!state.ack){
                    // The state was changed with no ack
                    const idArray = id.split(".");

                    if(idArray[idArray.length-1] == "PlaySound"){
                        const buildDeviceID = id.replace(idArray[idArray.length-1], "DeviceID");
                        adapter.getState(buildDeviceID, (error, state) => {
                            let DeviceID = state.val;
                            adapter.log.info("PlaySound on device: " + DeviceID);
                            PlaySound(DeviceID);
                            adapter.setState(id, false, true);
                        });
                    }else if(idArray[idArray.length-1] == "Refresh"){  
                        Refresh(false, true);
                    }
                }
            }
        },
    }));
}

function getICloudSession() {
    return new Promise((resolve, reject) => {
        adapter.getState("iCloudAccountSession", (err, state) => {
            const newSession = state.val || {};
            adapter.log.info('session test 1: ' + newSession);
            adapter.setState("iCloudAccountSession", newSession, true);
            return resolve(newSession ? JSON.parse(newSession) : {});
        });
    })
}

async function loginToApple() {
    const username = adapter.config.username;
    const password = adapter.config.password;

    if (!username || !password) {
        adapter.log.error('Username or password is missing');
        return;
    }

    adapter.log.info('Logging in to iCloud...');
    adapter.log.info('Username: ' + username);

    try {
        const session = await getICloudSession();

        if(session === {}) {
            adapter.log.info('Trying to  login with empty Session');
        }
        
        myCloud = new iCloud(session, username, password);

        if(!myCloud.loggedIn) {
            adapter.log.error('Login failed. Please check your credentials.');
            return;
        }

        if (myCloud.twoFactorAuthenticationIsRequired) {
            prompt.get(["Security Code"], async function(err, input) {
              if (err) {
                adapter.log.error(`Error. Please check the Security Code. StatusCode: ${res.statusCode} (${errCount.toString()}/3)`);    
              }
              const code = input["Security Code"];
              myCloud.securityCode = code;
            });
        }

        const newSession = myCloud.exportSession();
        adapter.setState("iCloudAccountSession", JSON.stringify(newSession), true);

        adapter.log.info('Logged in to iCloud');

        errCount = 0;
        return {
            "statusCode": 200,
            "response": "Logged in to iCloud"
        }

    }catch(err) {
        adapter.log.info('error' + err);
        errCount = errCount + 1;
        if (errCount == 5) {
            adapter.log.error(`Error on HTTP-Request. Please check your credentials. StatusCode: ${err.statusCode} Retry in ${adapter.config.refresh} minutes. (${errCount.toString()}/3)`);
            adapter.log.error("HTTP request failed for the third time, adapter is deactivated to prevent deactivation of the iCloud account.");
            adapter.setForeignState(`system.adapter.${adapter.namespace}.alive`, false);
        } else {
            adapter.log.error(`Error on HTTP-Request. Please check your credentials. StatusCode: ${err.statusCode} Retry in ${adapter.config.refresh} minutes. (${errCount.toString()}/3)`);
            return { "statusCode": err.statusCode, "response": null }
        }
    }
}

/**
 * 
 * Function to play sound on Apple-Device (Find my iPhone)
 * 
 */
 function PlaySound(DeviceID) {

    const user = adapter.config.username;
    const pass = adapter.config.password;

    var headers = {
        "Accept-Language": "de-DE",
        "User-Agent": "FindMyiPhone/500 CFNetwork/758.4.3 Darwin/15.5.0",
        "Authorization": "Basic " + Buffer.from(user + ":" + pass).toString('base64'),
        "X-Apple-Realm-Support": "1.0",
        "X-Apple-AuthScheme": "UserIDGuest",
        "X-Apple-Find-API-Ver": "3.0"
    }; 

    var RequestContent = { "clientContext": { "appVersion": "7.0", "fmly": true }, "device": DeviceID, "subject": "IoBroker (Find-Me)" };

    return new Promise(rtn => {
        urllib.request('https://fmipmobile.icloud.com/fmipservice/device/' + user + '/playSound', {
            method: 'POST',
            headers: headers,
            rejectUnauthorized: false,
            dataType: 'json',
            content: JSON.stringify(RequestContent)
        }, function(err, data, res) {
            if (!err && res.statusCode == 200) {
                rtn({ "status": "successfully", "statusCode": 0, "message": "Sound was played successfully" })
            } else {
                //Ignore StatusCode -2
                if (res.statusCode == -2) {
                    rtn({ "statusCode": res.statusCode, "response": null });
                } else if (res.statusCode == 500) {
                    rtn({ "status": "failed", "statusCode": res.statusCode, "message": res.statusMessage });
                } else {
                    rtn({ "status": "failed", "statusCode": res.statusCode, "message": res.statusMessage });
                }
            }
        });
    });
}





/**
 * OnReady Function
 * it called at Startup the Adapter
 */
function onReady() {
    adapter.getForeignObject("system.config", (err, obj) => {
        main();
    });
}
/**
 * Function to Sleep
 * @param {*} milliseconds 
 * @returns 
 */
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

/**
 * Get Random Object from an Object Array
 * @param {*} ObjectArray 
 * @returns 
 */
 function getRandomObject(ObjectArray) {

    // get random index value
    const randomIndex = Math.floor(Math.random() * ObjectArray.length);

    // get random object
    const obj = ObjectArray[randomIndex];

    return obj;
}

/**
 * Main Function
 */
async function main() {
    //Clear errCount
    errCount = 0;

    adapter.log.info("Starting Adapter Apple-Find-Me");
    if(adapter.config.refresh != "none"){
        adapter.log.info(`Refresh every ${adapter.config.refresh} minutes`);
    }else{
        adapter.log.info("Automatic Refresh is disabled");
    }

    await adapter.setObjectNotExistsAsync("LastJsonResponse", {
        type: "state",
        common: {
            role: "text",
            def: "",
            type: "object",
            read: true,
            write: false,
            name: "LastJsonResponse",
            desc: "Last Response from Apple iCloud",
        },
        native: {},
    });

    await adapter.setObjectNotExistsAsync("Connection", {
        type: "state",
        common: {
            name: "Connection",
            role: "indicator.connected",
            type: "boolean",
            read: true,
            write: false,
            desc: "Connection to iCloud",
            def: false

        },
        native: {},
    });

    await adapter.setObjectNotExistsAsync("Account", {
        type: "state",
        common: {
            name: "Account",
            role: "meta",
            type: "string",
            read: true,
            write: false,
            desc: "iCloud Account"
        },
        native: {},
    });

    adapter.setState("Account", adapter.config.username, true);

    await adapter.setObjectNotExistsAsync("Devices", {
        type: "state",
        common: {
            name: "Devices",
            role: "meta",
            type: "number",
            read: true,
            write: false,
            desc: "Number of devices",
            def: 0
        },
        native: {},
    });

    await adapter.setObjectNotExistsAsync("Refresh", {
        type: "state",
        common: {
            name: "Refresh",
            role: "button",
            type: "boolean",
            read: true,
            write: true,
            desc: "Reload data from the iCloud",
            def: false
        },
        native: {},
    });
    adapter.setState("Refresh", false, true);

    adapter.subscribeStates('Refresh');

    const response = await loginToApple();
    adapter.log.info("Login to Apple: " + JSON.stringify(response));

    if (response.statusCode == 200) {
        adapter.setState("Connection", true, true);
        
        const devices = await myCloud.FindMe.get(adapter.config.username, adapter.config.password);
        adapter.log.info("Devices: " + JSON.stringify(devices));

        return;
        let foundDevs = [];
        Result.response.content.forEach(element => {
            foundDevs.push(element.deviceDisplayName); 
        });
        adapter.log.info(JSON.stringify(Result.response.content.length) + " Device(s) found (" + foundDevs.join(", ") + ")");

        adapter.setState("Devices", Result.response.content.length, true);
        adapter.setState("LastJsonResponse", JSON.stringify(Result.response), true);

        CreateOrUpdateDevices(Result.response);
    }else{
        adapter.setState("Connection", false, true);
    }
   
    Refresh(true, false);
}


/***
 * Refresh function (Reset Data Collector Timer and run Data Collector)
***/
async function Refresh(init, manual){
    try {

        if(init == true){
            if(adapter.config.refresh != "none"){
                adapter.log.debug("Initial Data Collector");
                RefreshTimeout = setTimeout(function() { Refresh(false, false); }, adapter.config.refresh * 60000);
            }
        }else{
            if(manual == true){
                adapter.log.debug("Manual Data Collector");
                var Result = await RequestData(true);
                if (Result.statusCode == 200) {
                    adapter.setState("Connection", true, true);
                    CreateOrUpdateDevices(Result.response);
                }else{
                    adapter.setState("Connection", false, true);
                }
            }else{
                adapter.log.debug("Interval Data Collector");
                var Result = await RequestData(false);
                if (Result.statusCode == 200) {
                    adapter.setState("Connection", true, true);
                    CreateOrUpdateDevices(Result.response);
                }else{
                    adapter.setState("Connection", false, true);
                }
                if(adapter.config.refresh != "none"){
                    RefreshTimeout = setTimeout(function() { Refresh(false, false); }, adapter.config.refresh * 60000);
                }
            }
        } 

    }catch(err){
        adapter.log.error("Error on Refresh: " + err);
        //Reset the Timeout else Adapter gets "stuck"
        if(adapter.config.refresh != "none"){
            RefreshTimeout = setTimeout(function() { Refresh(false, false); }, adapter.config.refresh * 60000);
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
