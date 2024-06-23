/**
 * Calls initializeStorage() if user just installed the extension
 */
let reminder;
let tabHandler;
let videoTimer;

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") { 
        console.log("First initialization!");
        initializeStorage();
    }
    initializeInstances();
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Browser has started");
    startBlockerInterval();
    reminder.toggleReminderInterval();
});

function initializeInstances() {
    reminder = reminder ? reminder : new Reminder();
    tabHandler = tabHandler ? tabHandler : new TabHandler();
    videoTimer = videoTimer ? videoTimer : new VideoTimer();
    console.log("Initialized instances");
}

async function startBlockerInterval () {
    const {options} = await chrome.storage.local.get('options');
    if (options.blocker_remove_timestamp != null) {
        const blockerInterval = setInterval(async () => {
            const timerEnd = await checkTimerEnd(options.blocker_remove_timestamp, options.removeBlockerTimer);
            if (timerEnd) {
                chrome.storage.local.set({isBlocked: false});
                options.blocker_remove_timestamp = null
                chrome.storage.local.set({options: options});
                // console.log("Unblocked");
                clearInterval(blockerInterval);
            }
        }, 1000)
    }
}

/**
 * Initializes the storage if there is no necessary params in it
 */
async function initializeStorage() {
    const storageData = await chrome.storage.local.get();
    // console.log(storageData)

    if (!Object.hasOwn(storageData, "isBlocked")) {
        chrome.storage.local.set({"isBlocked": false});
    }

    if (!Object.hasOwn(storageData, "options")){
        chrome.storage.local.set({
            "options": {
                "hideThumbnails": false,
                "autoRedirect": false,
                "maxVideosAllowed": 15,
                "removeBlockerTimer": {hours: 0, minutes: 15, seconds: 0},
                "remindAboutLmwMode": false,
                "blocker_remove_timestamp": null
            }
        });
    }

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

        this.previousUrl = null;
        this.isChangedUrlLogged = false;

        this.hideContainerTimerId = null;
        this.isContainerHidden = false;
        
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
            // console.log("Tab removed");
            for (let i = 0; i < this.openedTabs.length; i++) {
                if (this.openedTabs[i].id == tabId) {
                    const closedTabUrl = this.openedTabs[i].url;
                    console.log(closedTabUrl);
                    this.openedTabs.splice(i, 1);
                    if (closedTabUrl.includes("youtube") && closedTabUrl.includes("short")) {
                        const sessionHandler = new SessionsHandler();
                        sessionHandler.saveSessions();
                    }
                }
            }
        });
        
        /**
         * On tab created event listener. Activates everytime user creates a tab, necessary for keeping track of active tab for saving sessions
        */
        chrome.tabs.onCreated.addListener(async (tab) => {
            // console.log("Tab created", tab);
            setTimeout(() => {
                this.redirectBack(tab);
            }, 2000)


            this.openedTabs.push(
                {
                    "id": tab.id, 
                    "url": tab.pendingUrl
                }
            );

        });

        /**
         * On tab updated event listener. Activates everytime there is a change in the tab props (for example url change), 
         * We use it to detect url changes to save sessions 
         * (if, for example youtube page has been closed => that means that user has stopped watching short videos)
        */
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (!this.isChangedUrlLogged && changeInfo.url){
                this.isContainerHidden = false;

                this.previousUrl = await this.openedTabs.find(obj => {
                    return obj.id === tabId;
                });

                //Example: If previous page was youtube.com/shorts and current page is not the short page (to prevent session saving each new short video watch) 
                if ((this.previousUrl.url.includes("youtube") && this.previousUrl.url.includes("short")) && !changeInfo.url.includes("short")) {
                    const sessionHandler = new SessionsHandler();
                    sessionHandler.saveSessions();
                }

                this.isChangedUrlLogged = true;
            }

            if (changeInfo.url) {
                await chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab, i) => {
                        this.openedTabs[i].url = tab.url;
                    });
                });


            }


            if (changeInfo.status === 'complete' && !this.isContainerHidden) {
                // Clear the previous timer if it exists
                if (this.hideContainerTimerId) {
                    clearTimeout(this.hideContainerTimerId);
                }
                this.hideContainerTimerId = setTimeout(async () => {
                    const { options } = await chrome.storage.local.get("options");
                    // console.log(options);
                    
                    if (tab.url.includes("youtube") && options.hideThumbnails && !tab.url.includes("short")) {
                        await this.sendRequest("remove_shortcontainer")
                        this.isContainerHidden = true;
                    }


        
                    this.previousUrl = null;
                    this.isChangedUrlLogged = false;
                }, 1000);
                if (tab.url.includes("short")) {
                    this.redirectBack(tab);
                }
            }
        });

        
    }

    async redirectBack(tab) {
        const {options: options} = await chrome.storage.local.get("options");
        const {mode} = await chrome.storage.local.get("mode"); 
        // console.log(mode);
        if (options.autoRedirect && mode == "TOTAL FOCUS MODE" && tab.url.includes("short")) {
            // console.log("Redirecting back");
            await this.sendRequest("redirect_back");
        }
    }

    /**
     * Sends a session save request to the content of the first active tab found
     * Content script then sends a saveSession request back to the background.js with all the props
     *
     * 
     *                                  --------------IMPORTANT NOTE--------------
     *      I think almost everything in the content.js, related to session saving, can be done here
     *          with no need to send message requests to the content.js
     *      If I have something that triggers the session save from the content.js (pressing the blocker logo for example), I could just send 
     *          the message to background.js and do the saving here.
     */
    async sendRequest(message) {
        let activeTab = await this.getActiveTab();  
        if (activeTab.url.includes("youtube")) {
            const response = await chrome.tabs.sendMessage(activeTab.id, {message: message});
            return response;
        }
    }

    async getActiveTab() { 
        return new Promise((resolve, reject) => {
            let timeoutCounter = 0;
            const waitingForActiveTab = setInterval(async () => {
                await chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                    // console.log("Waiting for active tab");
                    if (timeoutCounter >= 30) {
                        reject("No active tab timeout")
                        clearInterval(waitingForActiveTab);
                    }
                    if (tabs.length > 0) {
                        // console.log("Found active tab")
                        clearInterval(waitingForActiveTab);
                        resolve(tabs[0]);
                    }
                    timeoutCounter++;
                });
            }, 500);
        });
    }
}

class VideoTimer {
    constructor() {

        this.isStarted = false;

        this.startTime = null;
        this.endTime = null;

        this.inCommentsInterval = null;
    }

    /**
     * Converts elapsed time in ms to an object {hours: , minutes: , seconds:}
     * @param {Number} elapsedTime Elapsed time in ms
     * @returns 
     */
    formatElapsedTime(elapsedTime) {
        const convertedToSeconds = Math.floor(elapsedTime / 1000);

        const result = this.formatSeconds(convertedToSeconds);
        return result;
    }

    startWatchTimer() {
        if (!this.isStarted) {
            this.startTime = Date.parse(new Date());
            this.isStarted = true;
            console.log("[Short Blocker] Started Timer");
        }
    }
    
    /**
     *  Stops the watch timer, calculates elapsed time in ms and saves watch time if necessary.
     */
    async stopWatchTimer() {
        if (this.isStarted) {    
            this.endTime = Date.parse(new Date());
            const elapsedTime = (this.endTime - this.startTime) //* 8; // multiplier is only for debugging, to test time formatting
            
            if (elapsedTime > 0) {
                await this.saveWatchTime(elapsedTime); 
            }  

            this.isStarted = false;
            console.log("[Short Blocker] Video paused, elapsed time: ", elapsedTime);
        }
        const storage = await chrome.storage.local.get();
        console.log(storage); 
    }

    /**
     * Saves watch times based on current mode
     * @param {Number} elapsedTime Elapsed time in ms
     */
    async saveWatchTime(elapsedTime) {
        const { mode: currentMode } = await chrome.storage.local.get("mode");
        if (currentMode == "WATCH A FEW MODE") {
            this.saveTime(elapsedTime, "totalWafWatchTime");
            this.saveTime(elapsedTime, "sessionWafWatchTime");
        }
        else if (currentMode == "LET ME WATCH MODE") {
            this.saveTime(elapsedTime, "totalLmwWatchTime");
            this.saveTime(elapsedTime, "sessionLmwWatchTime");
        }
    }

    /**
     * Saves elapsed time to a provided storage value
     * @param {Number} elapsedTime Elapsed time in ms 
     * @param {String} timeMode Time value in the storage to save to, for example "sessionLmwWatchTime" or "totalWafWatchTime"
     */
    async saveTime(elapsedTime, timeMode){
        const { [timeMode]: totalWatchTime } = await chrome.storage.local.get(timeMode);
        const convertedElapsedTime = this.formatElapsedTime(elapsedTime);

        let updatedTime = this.formatTotalTime({
            hours: totalWatchTime.hours + convertedElapsedTime.hours,
            minutes: totalWatchTime.minutes + convertedElapsedTime.minutes, 
            seconds: totalWatchTime.seconds + convertedElapsedTime.seconds
        });

        chrome.storage.local.set({[timeMode]: updatedTime});
    }

    /**
     * Formats seconds value into an object {hours, minutes, seconds}
     * @param {Number} seconds Seconds value to turn format into an object
     * @returns 
     */
    formatSeconds(seconds) {
        const formatedHours = Math.floor(seconds / 3600);
        const formatedMinutes = Math.floor(seconds / 60);
        const secondsRemaining = seconds % 60; 

        return {hours: formatedHours, minutes: formatedMinutes, seconds: secondsRemaining};
    }

    /**
     * Formats provided object {hours, minutes, seconds} into an usual clock type format (60 seconds, 60 minutes)
     * @param {Object} timeToFormat Object {hours, minutes, seconds} to format 
     * @returns 
     */
    formatTotalTime(timeToFormat) {
        let formatedHours;
        let formatedMinutes;
        let secondsRemaining;
        let minutesRemaining;

        if (timeToFormat.minutes >= 60) {
            formatedHours = timeToFormat.hours + Math.floor(timeToFormat.minutes / 60);
            minutesRemaining = timeToFormat.minutes % 60;
        }
        else {
            formatedHours = timeToFormat.hours + Math.floor(timeToFormat.seconds / 3600);
        }

        if (timeToFormat.seconds >= 60) {
            formatedMinutes = timeToFormat.minutes + Math.floor(timeToFormat.seconds / 60);
            secondsRemaining = timeToFormat.seconds % 60; 
        }
        //TODO: figure out if it's neccessary as there time calculations became wrong for some reason 
        else {
            formatedMinutes = timeToFormat.minutes + Math.floor(timeToFormat.seconds / 60);
        }


        return {
            hours: formatedHours, 
            minutes: minutesRemaining ? minutesRemaining : formatedMinutes, 
            seconds: secondsRemaining ? secondsRemaining : timeToFormat.seconds
        };
    }
}



// TODO: Make some description for the SessionsHandler class
class SessionsHandler {
    constructor () {
        this.sessionSum = 0;

        this.sessionHistory = null;
        this.sessionValue = null;
        this.storageAvg = null;
    }

    async isAllowedToWatch () {
        const storage = await chrome.storage.local.get();
        // console.log(storage.watchedVideosCounter, storage.watchedVideosLimit, !(storage.watchedVideosCounter > storage.watchedVideosLimit));
        if (!(storage.watchedVideosCounter > storage.watchedVideosLimit)) {
            return true;
        }
        return false;
    }

    async addVideoWatch() {
        const storage = await chrome.storage.local.get();
        await chrome.storage.local.set({"watchedVideosCounter": storage.watchedVideosCounter + 1});
    }

    async saveSessions() {
        console.log("[Descrollify]: Saving sessions");
        const { mode: currentMode } = await chrome.storage.local.get("mode");
            

    
        this.sessionHistory = currentMode == "LET ME WATCH MODE" ? "sessionLmwWatchTimeHistory" : "sessionWafWatchTimeHistory";
        this.sessionValue = currentMode == "LET ME WATCH MODE" ? "sessionLmwWatchTime" : "sessionWafWatchTime";
        this.storageAvg = null;
        await this.appendSession();

        this.sessionHistory = currentMode == "LET ME WATCH MODE" ? "lmwSessionHistory" : "wafSessionHistory";
        this.sessionValue = "watchedVideosCounter";
        this.storageAvg = currentMode == "LET ME WATCH MODE" ? "lmwAverage" : "wafAverage";
        await this.appendSession();

        const {watchedVideosCounter} = await chrome.storage.local.get("watchedVideosCounter");
        chrome.storage.local.get(["numberOfEscapes"])
        .then((result) => {
            if (watchedVideosCounter > 1) {
                chrome.storage.local.set({ "numberOfEscapes": result.numberOfEscapes + 1 });
            }
        })
        .catch((error) => {
            console.error("Error updating numberOfEscapes:", error);
        });
        
        this.resetSessionTime();
        chrome.storage.local.set({"watchedVideosCounter": 0});
    }
    
    async resetSessionTime() {
        chrome.storage.local.set({"sessionLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}});
        chrome.storage.local.set({"sessionWafWatchTime": {hours: 0, minutes: 0, seconds: 0}});
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
        console.log("Averages (LMW/WAF):", lmwAverage, wafAverage);
    
        if (Number.isNaN(lmwAverage) || Number.isNaN(wafAverage)) {
            return;
        }

        //NOTE: To format time it's better to move some functions from the timer to background.js as a separate class 
        const savedInSeconds = lmwAverage - wafAverage;
        const savedTime = secondsToTime(savedInSeconds);
    
        chrome.storage.local.set({"savedTime": savedTime});
    }

    async appendSession() {
        let {[this.sessionHistory]: sessionHistory} = await chrome.storage.local.get(this.sessionHistory);
        let {[this.sessionValue]: currentSession} = await chrome.storage.local.get(this.sessionValue);
        if (this.sessionValue == "watchedVideosCounter") currentSession -= 1;
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

class Reminder {
    constructor() {
        this.reminderInterval = null;
        this.waitingForAlert = false;
    }

    async toggleReminderInterval() {
        const {options} = await chrome.storage.local.get('options');
        const {mode} = await chrome.storage.local.get('mode');

        // Clear the existing interval if it exists
        if (this.reminderInterval !== null) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }

        // Check if we need to set a new interval
        if (options.remindAboutLmwMode && mode === "LET ME WATCH MODE" && !this.waitingForAlert) {
            this.reminderInterval = setInterval(async () => {
                const activeTab = await tabHandler.getActiveTab().catch(() => {
                    console.log("[Descrollify]: No active tab timeout");
                });
                this.waitingForAlert = true;
                if (activeTab && activeTab.url.includes("youtube") && activeTab.url.includes("short")) {
                    tabHandler.sendRequest("mode_reminder");
                }
                this.waitingForAlert = false;
            }, 600000);
        }
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


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.mode) {
        changeWatchMode(request.mode);
    }

    if (request.type === "append_session") {
        handleAppendSession(request);
    }

    if (request.message === "toggle_mode_reminder") {
        reminder.toggleReminderInterval();
    }

    if (request.message === "blocker_appended") {
        handleBlockerAppended();
    }


    if (request.message === "set_watch_limit") {
        chrome.storage.local.get("mode")
            .then((result) => {
                const currentMode = result.mode;
                setWatchLimit(currentMode);
            })
            .catch((error) => {
                console.error("Error setting watch limit:", error);
            });
    }

    if (request.message === "handle_video_play") {
        // console.log("Handling video play in the background");
        videoTimer.startWatchTimer();
        console.log("handle_video_play")
    }

    if (request.message === "handle_comments_open") {
        videoTimer.startWatchTimer();
        console.log("handle_comments_open")
    }
    
    if (request.message === "handle_comments_close") {
        videoTimer.stopWatchTimer();
        console.log("handle_comments_close")
    }

    if (request.message === "handle_video_pause") {
        handleVideoPause();
        console.log("handle_video_pause")
    }

    if (request.message === "add_video_watch") {
        handleAddVideo(sendResponse);
        return true;
    }

    return false; 
});

async function handleReminderToggle() {
    reminder.toggleReminderInterval();
}

async function handleAppendSession(request) {
    let sessionHandler = new SessionsHandler(
        request.storageHistory,
        request.storageSession,
        request.storageAvg
    );
    await sessionHandler.appendSession();
    sessionHandler = null;
}

async function checkTimerEnd(blocker_timestamp, timer) { 
    const timerInMs = timer.hours * 3600000 + timer.minutes * 60000 + timer.seconds * 1000
    if (Date.now()- blocker_timestamp > timerInMs) {
        return true;
    }
    return false;
}

async function handleBlockerAppended() {
    chrome.storage.local.set({isBlocked: true});
    const {options} = await chrome.storage.local.get('options');
    if (options.blocker_remove_timestamp == null) {
        const dateNow = Date.now();
        options.blocker_remove_timestamp = dateNow;
        console.log("Created timer timestamp: ", dateNow);
        chrome.storage.local.set({options: options});
        const sessionHandler = new SessionsHandler();
        await sessionHandler.saveSessions();
        startBlockerInterval();
    }
}

async function handleVideoPause() {
    // console.log("Handling video pause in the background");
    await videoTimer.stopWatchTimer();
}


const handleAddVideo = async (sendResponse) => {
    //TODO: Create session when session initialized, not every video watch
    const sessionHandler = new SessionsHandler();
    if (await sessionHandler.isAllowedToWatch()) {
        // console.log("adding video watch");
        await sessionHandler.addVideoWatch();
        sendResponse({response: "allow_video"});
    }
    else {
        // console.log("Not allowed to watch");
        sendResponse({response: "block_video"});
    }
}

/**
 * Function that changes the watch mode in the storage
 * @param {string} newMode - New mode selected by an user 
 */
async function changeWatchMode(newMode) {
    const sessionHandler = new SessionsHandler();
    
    await chrome.storage.local.set({"mode": newMode});
    await chrome.storage.local.set({"watchedVideosCounter": 0});
    setWatchLimit(newMode);
    reminder.toggleReminderInterval();
    await sessionHandler.saveSessions();
}

/**
 * Function that is called by changeWatchMode to change the max allowed numbers of watched videos
 * @param {string} mode - Mode based on which we set our watch limit
 * @returns void
 */
async function setWatchLimit (mode) {
    
    if (mode === "TOTAL FOCUS MODE") {
        chrome.storage.local.set({"watchedVideosLimit": 0});
        return;
    }

    if (mode === "WATCH A FEW MODE") {
        const {options: options} = await chrome.storage.local.get('options');
        // console.log(options);
        chrome.storage.local.set({"watchedVideosLimit": options.maxVideosAllowed});
        return;
    }

    if (mode === "LET ME WATCH MODE") {
        chrome.storage.local.set({"watchedVideosLimit": Number.MAX_VALUE});
        return;
    }
}

initializeInstances();