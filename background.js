/**
 * Calls initializeStorage() if user just installed the extension
 */
chrome.runtime.onInstalled.addListener((details) => {
    //details.reason === "update" is ONLY FOR DEBUGGING!!!
    if (details.reason === "install" || details.reason === "update") { 
        console.log("First initialization!")
        initializeStorage();
    }

    const tabHandler = new TabHandler();
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

    if (!Object.hasOwn(storageData, "wafSessionHistory")) {
        chrome.storage.local.set({"wafSessionHistory": []})
    }

    if (!Object.hasOwn(storageData, "lmwAverage")) {
        chrome.storage.local.set({"lmwAverage": 0})
    }

    if (!Object.hasOwn(storageData, "totalWafWatchTime")) {
        chrome.storage.local.set({ "totalWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }
    
    if (!Object.hasOwn(storageData, "totalLmwWatchTime")) {
        chrome.storage.local.set({"totalLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }
    if (!Object.hasOwn(storageData, "savedTime")) {
        chrome.storage.local.set({ "savedTime": {hours: 0, minutes: 0, seconds: 0}})
    }

    if (!Object.hasOwn(storageData, "watchSessionsDifference")) {
        chrome.storage.local.set({ "watchSessionsDifference": 0})
    }

    if (!Object.hasOwn(storageData, "sessionLmwWatchTime")) {
        chrome.storage.local.set({ "sessionLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }
    
    if (!Object.hasOwn(storageData, "sessionWafWatchTime")) {
        chrome.storage.local.set({ "sessionWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})
    }

    if (!Object.hasOwn(storageData, "sessionLmwWatchTimeHistory")) {
        chrome.storage.local.set({ "sessionLmwWatchTimeHistory": []})
    }
    
    if (!Object.hasOwn(storageData, "sessionWafWatchTimeHistory")) {
        chrome.storage.local.set({ "sessionWafWatchTimeHistory": []})
    }
}

/**
 * Function which appends a session to the array of all sessions in the storage 
 * @param {String} storageHistory Storage history array variable, in which we store saved sessions
 * @param {String} storageSession Current session time variable, which we append into storage history array 
 */


//NOTE: What even is this function?
// async function statsUpdater() {
//     const storage = await chrome.storage.local.get();
//     console.log(storage)
//     if (storage.mode === "LET ME WATCH MODE") {
//         lmwAvgUpdater(storage);
//     }
// }

class TabHandler {
    constructor () {
        this.openedTabs = [];

        this.changedTabUrl = null;
        this.isChangedUrlLogged = false;
        
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              this.openedTabs.push({
                "id": tab.id, 
                "url": tab.url
              });
            });
        });

        //TODO: DO SOMTHING WITH THIS GIGA-IF-TREE
        chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
            for (let i = 0; i < this.openedTabs.length; i++) {
                if (this.openedTabs[i].id == tabId) {
                    const closedTabUrl = this.openedTabs[i].url;
                    this.openedTabs.splice(i, 1);
                    if (closedTabUrl.includes("youtube") && closedTabUrl.includes("short")) {
                        this.sendCloseMessage()
                    }
                }
            }
        });
        
        chrome.tabs.onCreated.addListener((tab) => {
            this.openedTabs.push(
                {
                    "id": tab.id, 
                    "url": tab.url
                }
            );

            console.log(tab.url);
        });

        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            // console.log("-------------------------Change Detected!----------------------")
            // console.log("--------------------Status: ", changeInfo.status, "-----------------------")
            if (changeInfo.status === 'loading' && !this.isChangedUrlLogged && changeInfo.url){
                this.changedTabUrl = this.openedTabs.find(obj => {
                    return obj.id === tabId;
                });

                //Example: If previous page was youtube.com/shorts and current page is not the short page (to prevent session saving each new short video watch) 
                if ((this.changedTabUrl.url.includes("youtube") && this.changedTabUrl.url.includes("short")) && !changeInfo.url.includes("short")) {
                    await this.sendCloseMessage();      
                }

                this.isChangedUrlLogged = true;
            }

            if (!changeInfo.status){
                this.changedTabUrl = null;
                this.isChangedUrlLogged = false;
                // console.log("Reseted previous url")
            }

            // console.log("tabChanged", tabChanged);
            if (changeInfo.url) {

                // console.log("changeInfo.url", changeInfo, changeInfo.url);

                await chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab, i) => {
                        this.openedTabs[i].url = tab.url;
                    });
                });
                // console.log("Changed url of the tab: " + tabId, this.openedTabs);
            }
        });

        
    }

    async sendCloseMessage() {
        let timeoutCounter = 0;
        const waitForActiveTab = setInterval(async () => {
            await chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                console.log("Waiting for active tab");
                if (timeoutCounter > 1000) {
                    console.log("No active tab timeout")
                    clearInterval(waitForActiveTab);
                }
                if (tabs.length > 0) {
                  const activeTab = tabs[0];
                  const response = await chrome.tabs.sendMessage(activeTab.id, {message: "videoplayer closed"});
                  console.log("Found active tab")
                  clearInterval(waitForActiveTab);
                }
                timeoutCounter++;
            });
        }, 500);
    }
}

class SessionsHandler {
    constructor (history, session, average) {
        this.sessionSum = 0;

        this.sessionHistory = history;
        this.sessionValue = session;
        this.storageAvg = average;
    }

    getAverageInSeconds(sessionHistory) {
        let totalSeconds = 0;
        for (let i = 0; i < sessionHistory.length; i++) {
            totalSeconds += timeToSeconds(sessionHistory[i]);
        }
        const avgInSeconds = totalSeconds / sessionHistory.length;
    
        return Math.floor(avgInSeconds);
    }

    async updateSavedTime() {
        const {sessionLmwWatchTimeHistory: lmwSessionHistory} = await chrome.storage.local.get("sessionLmwWatchTimeHistory");
        const {sessionWafWatchTimeHistory: wafSessionHistory} = await chrome.storage.local.get("sessionWafWatchTimeHistory");
    
        const lmwAverage = this.getAverageInSeconds(lmwSessionHistory);
        const wafAverage = this.getAverageInSeconds(wafSessionHistory);
        // console.log("Averages (LMW/WAF):", lmwAverage, wafAverage);
    
        //NOTE: To format time it's better to move some functions from the timer to background.js as a separate class 
        const savedInSeconds = lmwAverage - wafAverage;
        const savedTime = secondsToTime(savedInSeconds);
    
        // console.log(savedTime);
    
        chrome.storage.local.set({"savedTime": savedTime});
    }

    async appendSession() {
        
        const {[this.sessionHistory]: sessionHistory} = await chrome.storage.local.get(this.sessionHistory);
        const {[this.sessionValue]: currentSession} = await chrome.storage.local.get(this.sessionValue);
        // console.log("Appending session: ", "Current session:", currentSession);
        sessionHistory.push(currentSession);
    
        const {"watchedVideosCounter": videoCounter} = await chrome.storage.local.get("watchedVideosCounter");
        // console.log(videoCounter);
        if (videoCounter > 1) {
            chrome.storage.local.set({[this.sessionHistory]: sessionHistory});
        }

        if (this.storageAvg != null) {
            // console.log("updateCounterAverage")
            this.updateCounterAverage();
        }
        else {
            // console.log("updateSavedTime")
            this.updateSavedTime();
        }
    }

    async updateCounterAverage() {
        // console.log("updateCounterAverage");
        const {[this.sessionHistory]: sessionHistory} = await chrome.storage.local.get(this.sessionHistory);
        // const {[this.sessionValue]: sessionCounter} = await chrome.storage.local.get(this.sessionValue);
    
        for (let i = 0; i < sessionHistory.length; i++) {
            this.sessionSum += parseInt(sessionHistory[i]);
            // console.log(sessionHistory[i],this.sessionSum);
        }

        const average = this.sessionSum / sessionHistory.length; 
        // console.log("Session average", average)
        chrome.storage.local.set({[this.storageAvg]: Math.round(average)});

        this.updateVideoSessionsDiff();
    }

    async updateVideoSessionsDiff() {
        const {"lmwAverage": lmwAverage} = await chrome.storage.local.get("lmwAverage");
        const {"wafAverage": wafAverage} = await chrome.storage.local.get("wafAverage");

        const difference = Math.max(0, lmwAverage - wafAverage);
        
        chrome.storage.local.set({"watchSessionsDifference": difference})
    }
}


function secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    return { hours: hours, minutes: minutes, seconds: seconds};
}


function timeToSeconds (time) {
    return time.hours * 3600 + time.minutes * 60 + time.seconds;
}

/**
 * Listener for a different messages sent from content.js or the popup.js
 */
chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if (request.type === "escapedscrolling") {
            chrome.storage.local.get(["numberOfEscapes"])
            .then((result) => {
                chrome.storage.local.set({ "numberOfEscapes": result.numberOfEscapes + 1});
            })
        }
        if (request.mode) {
            changeWatchMode(request.mode);
        }
        if (request.type == "append_session") {
            let sessionHandler = new SessionsHandler(
                request.storageHistory,
                request.storageSession,
                request.storageAvg
            );
            await sessionHandler.appendSession();
            sessionHandler = null;
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