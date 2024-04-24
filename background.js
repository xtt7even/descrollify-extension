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
            chrome.storage.session.get(["numberOfEscapes"])
            .then((result) => {
                updatedEscapes = Object.hasOwn(result, "numberOfEscapes") ? result["numberOfEscapes"] + 1: 0;
                chrome.storage.session.set({ "numberOfEscapes": updatedEscapes}).then(() => {
                    sendResponse({farewell: "good!"});
                });
            })
        }
        if (request.mode) {
            changeWatchMode(request.mode);
        }
    }
);

function changeWatchMode(newMode) {
    chrome.storage.session.get(["mode"]).then((result) => {
        chrome.storage.session.set({"mode": newMode});
    });
}

// function trackShortWatches () {

// }