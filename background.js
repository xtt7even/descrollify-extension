/**
 * Calls initializeStorage() if user just installed the extension
 */
chrome.runtime.onInstalled.addListener((details) => {
    //details.reason === "update" is ONLY FOR DEBUGGING!!!
    if (details.reason === "install" || details.reason === "update") { 
        console.log("First initialization!")
        initializeStorage();
    }
});

/**
 * Initializes the storage if there is no necessary params in it
 */
async function initializeStorage() {
    const storageData = await chrome.storage.local.get();
    console.log(storageData)

    if (!Object.hasOwn(storageData, "mode")) {
        chrome.storage.local.set({"mode": "WATCH A FEW MODE"});
    }

    if (!Object.hasOwn(storageData, "numberOfEscapes")) {
        chrome.storage.local.set({ "numberOfEscapes": 0})
    }

    if (!Object.hasOwn(storageData, "watchedVideosCounter")) {
        chrome.storage.local.set({ "watchedVideosCounter": 0})
    }

    if (!Object.hasOwn(storageData, "watchedVideosLimit")) {
        chrome.storage.local.set({ "watchedVideosLimit": 3})
    }

    if (!Object.hasOwn(storageData, "lmwSessionHistory")) {
        chrome.storage.local.set({"lmwSessionHistory": []})
    }

    if (!Object.hasOwn(storageData, "lmwAverage")) {
        chrome.storage.local.set({"lmwAverage": 0})
    }

    if (!Object.hasOwn(storageData, "currentVideoWatchTime")) {
        chrome.storage.local.set({"currentVideoWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }
    
    if (!Object.hasOwn(storageData, "totalLmwWatchTime")) {
        chrome.storage.local.set({"totalLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }

    if (!Object.hasOwn(storageData, "averageWatchTime")) {
        chrome.storage.local.set({"averageWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }

    if (!Object.hasOwn(storageData, "savedTime")) {
        chrome.storage.local.set({ "savedTime": {hours: 0, minutes: 0, seconds: 0}})
    }
}

// Debugging stuff
// chrome.storage.onChanged.addListener((changes, namespace) => {
//     for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
//         console.log(
//             `Storage key "${key}" in namespace "${namespace}" changed.`,
//             `Old value was "${oldValue}", new value is "${newValue}".`
//         );
//     }
// });

/**
 * Listener for a different messages sent from content.js or the popup.js
 */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting === "escapedscrolling") {
            chrome.storage.local.get(["numberOfEscapes"])
            .then((result) => {
                chrome.storage.local.set({ "numberOfEscapes": result.numberOfEscapes + 1});
            })
        }
        if (request.mode) {
            changeWatchMode(request.mode);
        }
    }
);

/**
 * Function that changes the watch mode in the storage
 * @param {string} newMode - New mode selected by an user 
 */
async function changeWatchMode(newMode) {
    await chrome.storage.local.set({"mode": newMode});
    await chrome.storage.local.set({"watchedVideosCounter": 0});
    setWatchLimit(newMode);
}

/**
 * Function that is called by changeWatchMode to change the max allowed numbers of watched videos
 * @param {string} mode - Mode based on which we set our watch limit
 * @returns void
 */
function setWatchLimit (mode) {
    
    if (mode === "TOTAL FOCUS MODE") {
        chrome.storage.local.set({"watchedVideosLimit": 0});
        return;
    }

    if (mode === "WATCH A FEW MODE") {
        chrome.storage.local.set({"watchedVideosLimit": 3});
        return;
    }

    if (mode === "LET ME WATCH MODE") {
        chrome.storage.local.set({"watchedVideosLimit": Number.MAX_VALUE});
        return;
    }
}