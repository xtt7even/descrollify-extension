//Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
    //details.reason === "update" is ONLY FOR DEBUGGING!!!
    if (details.reason === "install" || details.reason === "update") { 
        console.log("First initialization!")
        initializeStorage();
    }
});

async function initializeStorage() {
    const storageData = await chrome.storage.local.get();
    console.log(storageData)

    if (!Object.hasOwn(storageData, "mode")) {
        chrome.storage.session.set({"mode": "WATCH A FEW MODE"});
    }

    if (!Object.hasOwn(storageData, "numberOfEscapes")) {
        chrome.storage.session.set({ "numberOfEscapes": 0})
    }

    if (!Object.hasOwn(storageData, "watchedVideosCounter")) {
        chrome.storage.session.set({ "watchedVideosCounter": 0})
    }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
        `Storage key "${key}" in namespace "${namespace}" changed.`,
        `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        initializeStorage();
        if (request.greeting === "escapedscrolling") {
            chrome.storage.local.get(["numberOfEscapes"])
            .then((result) => {
                // updatedEscapes = Object.hasOwn(result, "numberOfEscapes") ? result["numberOfEscapes"] + 1: 0;
                chrome.storage.local.set({ "numberOfEscapes": result + 1});
            })
        }
        if (request.mode) {
            changeWatchMode(request.mode);
        }
    }
);

function changeWatchMode(newMode) {
    chrome.storage.local.get(["mode"]).then((result) => {
        chrome.storage.local.set({"mode": newMode});
    });
}

function trackShortWatches () {

}