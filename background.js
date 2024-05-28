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

        /**
         * On tab removed event listener. Activates everytime user closes tabs
         */
        chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
            console.log("Tab removed");
            for (let i = 0; i < this.openedTabs.length; i++) {
                if (this.openedTabs[i].id == tabId) {
                    const closedTabUrl = this.openedTabs[i].url;
                    this.openedTabs.splice(i, 1);
                    if (closedTabUrl.includes("youtube") && closedTabUrl.includes("short")) {
                        this.sendSaveRequest()
                    }
                }
            }
        });
        
        /**
         * On tab created event listener. Activates everytime user creates a tab, necessary for keeping track of active tab for saving sessions
        */
        chrome.tabs.onCreated.addListener((tab) => {
            this.openedTabs.push(
                {
                    "id": tab.id, 
                    "url": tab.url
                }
            );

            console.log(tab.url);
        });

        /**
         * On tab updated event listener. Activates everytime there is a change in the tab props (for example url change), 
         * We use it to detect url changes to save sessions 
         * (if, for example youtube page has been closed => that means that user has stopped watching short videos)
        */
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            console.log("Tab updated");
            if (changeInfo.status === 'loading' && !this.isChangedUrlLogged && changeInfo.url){
                this.changedTabUrl = this.openedTabs.find(obj => {
                    return obj.id === tabId;
                });

                //Example: If previous page was youtube.com/shorts and current page is not the short page (to prevent session saving each new short video watch) 
                if ((this.changedTabUrl.url.includes("youtube") && this.changedTabUrl.url.includes("short")) && !changeInfo.url.includes("short")) {
                    await this.sendSaveRequest();      
                }

                this.isChangedUrlLogged = true;
            }

            if (!changeInfo.status){
                this.changedTabUrl = null;
                this.isChangedUrlLogged = false;
            }
            if (changeInfo.url) {
                await chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab, i) => {
                        this.openedTabs[i].url = tab.url;
                    });
                });
                // console.log("Changed url of the tab: " + tabId, this.openedTabs);
            }
        });

        
    }

    /**
     * Sends a session save request to the content of the first tab, activated after Youtube short page has been closed/url changed
     * Content script then sends a saveSession request back to the background.js with all the props
     *
     * 
     *                                  --------------IMPORTANT NOTE--------------
     *      I think almost everything in the content.js, related to session saving, can be done here
     *          with no need to send message requests to the content.js
     *      If I have something that triggers the session save from the content.js (pressing the blocker logo for example), I could just send 
     *          the message to background.js and do the saving here.
     */
    async sendSaveRequest() {
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

// TODO: Make some description for the SessionsHandler class
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
        console.log("Append session")
        const {[this.sessionHistory]: sessionHistory} = await chrome.storage.local.get(this.sessionHistory);
        const {[this.sessionValue]: currentSession} = await chrome.storage.local.get(this.sessionValue);
        sessionHistory.push(currentSession);
    
        const {"watchedVideosCounter": videoCounter} = await chrome.storage.local.get("watchedVideosCounter");
        if (videoCounter > 1) {
            chrome.storage.local.set({[this.sessionHistory]: sessionHistory});
        }

        if (this.storageAvg != null) {
            this.updateCounterAverage();
        }
        else {
            this.updateSavedTime();
        }
    }

    async updateCounterAverage() {
        const {[this.sessionHistory]: sessionHistory} = await chrome.storage.local.get(this.sessionHistory);
    
        for (let i = 0; i < sessionHistory.length; i++) {
            this.sessionSum += parseInt(sessionHistory[i]);
        }

        const average = this.sessionSum / sessionHistory.length; 
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