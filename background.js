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
        chrome.storage.local.set({"mode": "WATCH A FEW MODE"});
    }

    if (!Object.hasOwn(storageData, "numberOfEscapes")) {
        chrome.storage.local.set({ "numberOfEscapes": 0})
    }

    if (Object.hasOwn(storageData, "watchedVideosCounter")) {
        chrome.storage.local.set({ "watchedVideosCounter": 0})
    }

    if (!Object.hasOwn(storageData, "watchedVideosLimit")) {
        chrome.storage.local.set({ "watchedVideosLimit": 3})
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
        if (request.greeting === "escapedscrolling") {
            chrome.storage.local.get(["numberOfEscapes"])
            .then((result) => {
                // updatedEscapes = Object.hasOwn(result, "numberOfEscapes") ? result["numberOfEscapes"] + 1: 0;
                chrome.storage.local.set({ "numberOfEscapes": result.numberOfEscapes + 1});
            })
        }
        if (request.mode) {
            changeWatchMode(request.mode);
        }
    }
);

async function changeWatchMode(newMode) {
    await chrome.storage.local.get(["mode"]).then(async (result) => {
        await chrome.storage.local.set({"mode": newMode});
        await chrome.storage.local.set({"watchedVideosCounter": 0});
    });
    setWatchLimit(newMode);
}

function setWatchLimit (mode) {
    
    if (mode === "TOTAL FOCUS MODE") {
        chrome.storage.local.set({"watchedVideosLimit": 0});
    }

    if (mode === "WATCH A FEW MODE") {
        chrome.storage.local.set({"watchedVideosLimit": 3});
    }

    if (mode === "LET ME WATCH MODE") {
        chrome.storage.local.set({"watchedVideosLimit": Number.MAX_VALUE});
    }
}