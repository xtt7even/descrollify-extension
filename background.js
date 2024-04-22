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
            let currentEscapes;
            chrome.storage.session.get(["numberOfEscapes"])
            .then((result) => {
                currentEscapes = result;
                updatedEscapes = Object.hasOwn(currentEscapes, "numberOfEscapes") ? currentEscapes["numberOfEscapes"] + 1: 0;
                chrome.storage.session.set({ "numberOfEscapes": updatedEscapes}).then(() => {
                    sendResponse({farewell: "good!"});
                });
            })
            

            
        }
    }
);