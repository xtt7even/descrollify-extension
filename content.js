'use strict';

let videoTimer;

function locateShort() {
    // Returns a promise to asynchronously locate an element by its ID
    return new Promise((resolve, reject) => {
        let intervalIterations = 0; // Counter to track iterations for the interval
        const waitForShort = setInterval(() => {
            //Check if maximum number of iterations reached
            if (intervalIterations > 3) {
                clearInterval(waitForShort);
                reject();
            }

            const element = document.getElementById("shorts-inner-container");
            // If the element is found, stop the interval and resolve the promise with the element
            if (element) { 
                clearInterval(waitForShort);
                resolve(element);
            }
            
            intervalIterations++;
        }, 1000);
    });
}

/**
 * Function that checks if user is allowed to watch a video
 * @returns True - allowed to watch, false - not allowed to watch
 */
async function isAllowedToWatch () {
    const storage = await chrome.storage.local.get();
    if (!(storage.watchedVideosCounter > storage.watchedVideosLimit)) {
        return true;
    }
    return false;
}

async function addVideoWatch() {
    const storage = await chrome.storage.local.get();
    console.log(storage);
    await chrome.storage.local.set({"watchedVideosCounter": storage.watchedVideosCounter + 1});
}

window.onload = () => {
    videoTimer = new VideoTimer();
};
// Event listener for page change
window.addEventListener('yt-navigate-finish', async function() {
    removeBlocker()
    
    const videoElement = document.querySelector('video');
    videoTimer.stopWatchTimer();


    //for debugging only!!!!!!
        const storage = await chrome.storage.local.get();
        console.log(storage);
    //for debugging only!!!!!!

    const url = new URL(window.location.href);
    const pagePosition = await chrome.storage.local.get("isOnShortPage");
    if (url.href.includes('shorts')) {
        // If URL includes "shorts" set isOnShortPage to true (session based storage)
        addVideoListeners(videoElement);
        scanForShort();
        videoTimer.startWatchTimer();
        chrome.storage.local.set({"isOnShortPage": true})
    }
    //if the page doesn't include "short" but isOnShortPage WAS true before, that means the user closed or exited short page, so we need to update LMW mode averages
    else if (pagePosition.isOnShortPage) {
        chrome.storage.local.set({"isOnShortPage": false})

        removeVideoListeners(videoElement);

        updateLmwAverage();
        await chrome.storage.local.set({"watchedVideosCounter": 0});
        
    }

});

function removeBlocker() {
    if (document.getElementById("blocker-container")) {
        document.getElementById("blocker-container").remove();
    }
}
// !!!
// ___IMPORTANT TODO___: Refactor all the mess inside scanForShort, locateShort and functions related to the blocker building!
// !!!

// Function to scan for short video element
async function scanForShort () {
    if (await isAllowedToWatch()) {
        addVideoWatch()
        console.log("Allowed to watch because of the mode");
        throw 0;
    }

    let short = await locateShort();
    console.log(short)
    if (!short) {
        console.error("No short located on this page"); 
        throw 0;
    }
    const blocker = await buildBlocker(short);
    short.prepend(blocker);
    pauseVideo();
    removeUnecessaryElements();
}

function pickASetOfLines() {
    return fetch(chrome.runtime.getURL('/lines.json'))
        .then(response => response.json())
        .then(data => {
            const lines = data;
            const random = Math.floor(Math.random() * lines.upper_lines.length);
            return { upperline: lines.upper_lines[random], lowerline: lines.lower_lines[random] };
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
            throw error; 
        });
}

function pauseVideo() {
    const videoElement = document.querySelector('video');
    // If a video element is found and it's currently playing
    if (videoElement && !videoElement.paused) {
        videoElement.click();
        videoElement.pause();
    }
}

//Function to remove video sequence to prevent scrolling, and short video overlay. 
function removeUnecessaryElements() {
    //Getting video sequence array (usually 4-10 videos), and then delete all elements except the first.
    const sequenceElements = document.getElementsByClassName('reel-video-in-sequence style-scope ytd-shorts');
    for (let i = sequenceElements.length - 1; i > 0; i--) {
        sequenceElements[i].remove();
        console.log("Blocker: removed video sequence and overlay");
    }

    //Deleting overlay elements
    const overlayElements = document.getElementsByClassName('action-container style-scope ytd-reel-player-overlay-renderer');
    
    for (let i = overlayElements.length - 1; i >= 0; i--) {
        overlayElements[i].remove();   
    }
}



async function buildBlocker(short) {
    const blockerContainer = buildBlockerContainer(short);

    try {
        //generating a set of randomly picked upper and lower lines
        const linesSet = await pickASetOfLines();

        //upper line
        const blockerUpperText = buildBlockerText(linesSet.upperline);
        blockerContainer.appendChild(blockerUpperText);

        //logo
        const blockerLogo = buildBlockerLogo();
        blockerContainer.append(blockerLogo);

        blockerLogo.addEventListener('click', () => {
            (async () => {
                const response = await chrome.runtime.sendMessage({greeting: "escapedscrolling"});
                window.location.href = ".."
            })(); 
        })

        //lower line
        const blockerLowerText = buildBlockerText(linesSet.lowerline);
        blockerContainer.appendChild(blockerLowerText);

        return blockerContainer;
    } catch (error) {
        // Handle errors if necessary
        console.error('Error building blocker:', error);
        throw error; // re-throwing the error to propagate it further if needed
    }
}
function buildBlockerContainer(short) {
    const blockerContainer = document.createElement("div");
    blockerContainer.setAttribute("id", "blocker-container");   

    const width = short.offsetWidth;
    const height = short.offsetHeight - (short.offsetHeight * 0.05);

    blockerContainer.style.width = width.toString() + 'px';
    blockerContainer.style.height = height.toString() + 'px';
        return blockerContainer;
    }

function buildBlockerText(text) {
    const textContainer = document.createElement('div');
    textContainer.setAttribute('id', 'text-container')
    
    const blockerText = document.createElement("h2");
    blockerText.innerText = text;
    blockerText.setAttribute('id', 'big-text')

    textContainer.append(blockerText);

    return textContainer;
}


function buildBlockerLogo() {
    const blockerLogo = document.createElement("img");
    blockerLogo.src = chrome.runtime.getURL("./images/logo_transparent_white.png");
    blockerLogo.alt = "logo";
    // blockerLogo.setAttribute('onclick', "window.location.href = 'https://www.youtube.com'");
    blockerLogo.setAttribute('id', 'blocker-logo');
    return blockerLogo;
}

//Stats retriever functions

async function statsUpdater() {
    const storage = await chrome.storage.local.get();
    console.log(storage)
    if (storage.mode === "LET ME WATCH MODE") {
        lmwAvgUpdater(storage);
    }
}

function addVideoListeners (videoElement) {

    if (videoElement) {
        videoElement.addEventListener('pause', handleVideoPause);
        videoElement.addEventListener('play', handleVideoPlay);
    }   
    console.log("[Short Blocker] Added video event listeners")
}

function removeVideoListeners (videoElement) {
    if (videoElement) {
        videoElement.removeEventListener('pause', handleVideoPause);
        videoElement.removeEventListener('play', handleVideoPlay);
    }   
    console.log("[Short Blocker] Removed video event listeners")
}

async function handleVideoPause() {
    console.log("Video Pause");
    videoTimer.stopWatchTimer();
}

async function handleVideoPlay() {
    console.log("Video Play")
    videoTimer.startWatchTimer();
}

//TODO: Fix video counter stats calculation, it doesn't work anymore
async function updateLmwAverage() {
    let sessionSum = 0;

    const storage = await chrome.storage.local.get();

    // Append lmw counter only if watchedVideosCounter is greater than 2, 
    //      becuase user can accidentally open short page, watch 0 videos, and therefore fill the lmw history with zeros changing average value
    //      watching at least 2 videos usually means that user is scrolling intentionally
    if (storage.watchedVideosCounter > 2) { 
        appendLmwCounter(storage)
    }
    chrome.storage.local.set({"watchedVideosCounter": 0})

    for (let i = 0; i < storage.lmwSessionHistory.length; i++) {
        sessionSum += parseInt(storage.lmwSessionHistory[i]);        
        console.log(sessionSum);
    }

    const average = sessionSum / storage.lmwSessionHistory.length; 
    console.log(average)
    chrome.storage.local.set({"lmwAverage": average});
}

async function appendLmwCounter(storage) {
    let sessionArray = storage["lmwSessionHistory"];
    sessionArray.push(storage.watchedVideosCounter);
    chrome.storage.local.set({"lmwSessionHistory": sessionArray})
}


// Quick comment: function returns watched duration of the video by user, fires on yt-navigation event, neccessary to calculate average watchtime
// TODO: Finish getWatchedTime()!!!

class VideoTimer {
    constructor() {
        this.watchInterval = null;

        this.isStarted = false;

        this.startTime = null;
        this.endTime = null;

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
        }

        console.log("started watchtimer")
    }

    /**
     *  Stops the watch timer, calculates elapsed time in ms and saves watch time if necessary.
     */
    async stopWatchTimer() {
        if (this.isStarted) {    
            this.endTime = Date.parse(new Date());
            const elapsedTime = (this.endTime - this.startTime) // * 8; // multiplier is only for debugging, to test time formatting
            
            if (elapsedTime > 0) {
                await this.saveWatchTime(elapsedTime); 
                // await calculateSavedTime(); 
            } 

            this.isStarted = false;
            console.log("[Short Blocker] Video paused, elapsed time: ", elapsedTime);
        }
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
     * Resets session time (both LMW and WAF modes)
     */
    async resetSessionTime() {
        chrome.storage.local.set({"sessionLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}});
        chrome.storage.local.set({"sessionWafWatchTime": {hours: 0, minutes: 0, seconds: 0}});
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