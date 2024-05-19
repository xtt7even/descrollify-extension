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
    
    await videoTimer.saveWatchTime();
    videoTimer.stopWatchTimer();
    

    //for debugging only!!!!!!
        const storage = await chrome.storage.local.get();
        console.log(storage);
    //for debugging only!!!!!!

    const url = new URL(window.location.href);
    const pagePosition = await chrome.storage.local.get("isOnShortPage");
    if (url.href.includes('shorts')) {
        // If URL includes "shorts" set isOnShortPage to true (session based storage)
        scanForShort();
        videoTimer.startWatchTimer();
        chrome.storage.local.set({"isOnShortPage": true})
    }
    //if the page doesn't include "short" but isOnShortPage WAS true before, that means the user closed or exited short page, so we need to update LMW mode averages
    else if (pagePosition.isOnShortPage) {
        console.log("Updating LMW storage");
        chrome.storage.local.set({"isOnShortPage": false})
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
    getVideoDuration();
    const blocker = await buildBlocker(short);
    short.prepend(blocker);
    pauseVideo();
    removeUnecessaryElements();
    justAFunnyConsoleStuff();
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
    chrome.storage.local.set({"lmwSessionHistory": appendedSession})
}

//____IMPORTANT TODO____
//  meta[itemprop="duration"] IS NOT ALWAYS UPDATING, need to find another way of getting duration, for example by using Date();
function getVideoDuration () {
    const durationElement = document.querySelector('meta[itemprop="duration"]');
    if (durationElement) {
        const rawDuration = durationElement.getAttribute('content');
        const result = parseRawDuration(rawDuration);
        return result;
    } else {
        return "Duration not found";
    }
}

function convertSecToMin(currentSessionTime) {
    const convertedHours = currentSessionTime.seconds / 3600
    const convertedMinutes = currentSessionTime.seconds / 60;
    const convertedSeconds = currentSessionTime.seconds;

    return {hours: convertedHours, minutes: convertedMinutes, seconds: convertedSeconds};
}

async function updateTotalWatchtime() {
    // const fetchedTotalWatchTime = await chrome.storage.local.get("totalLmwWatchTime");
    // // console.log(fetchedTotalWatchTime)
    // const totalWatchTime = fetchedTotalWatchTime.totalLmwWatchTime;
    // console.log("totalWatchTime",totalWatchTime)
    // const fetchedSessionTime = await chrome.storage.local.get("currentVideoWatchTime");
    // // console.log( "fetchedSessionTime",fetchedSessionTime)
    // const currentSessionTime = fetchedSessionTime.currentVideoWatchTime;
    // console.log("non-converted", currentSessionTime)

    // const convertedSessionTime = convertSecToMin(currentSessionTime);
    // console.log("converted", convertedSessionTime)

    // const updatedTotalWatchTime = {
    //     hours: totalWatchTime.hours + convertedSessionTime.hours,
    //     minutes: totalWatchTime.minutes + convertedSessionTime.minutes, 
    //     seconds: totalWatchTime.seconds + convertedSessionTime.seconds
    // } 

    // console.log("updated total watch time:", updatedTotalWatchTime)

    // chrome.storage.local.set({"totalLmwWatchTime": updatedTotalWatchTime})
}

// Quick comment: function returns watched duration of the video by user, fires on yt-navigation event, neccessary to calculate average watchtime
// TODO: Finish getWatchedTime()!!!

class VideoTimer {
    constructor() {
        this.watchInterval = null;
        this.videoDuration = getVideoDuration();
    }

    startWatchTimer() {
        console.log("start watch timer")
        this.videoDuration = getVideoDuration();
        this.watchInterval = setInterval(() => {
            const watchedRatio = getWatchedRatio();
            console.log(this.videoDuration);

            const watchedTime = {
                hours: Math.floor(this.videoDuration.seconds * parseFloat(watchedRatio) / 3600), 
                minutes: Math.floor(this.videoDuration.seconds * parseFloat(watchedRatio) / 60), 
                seconds: Math.floor(this.videoDuration.seconds * parseFloat(watchedRatio))
            };
            console.log(watchedTime, watchedRatio)

            //TODO: Somehow save the time when video stoped playing but start the timer again each time, example below, but this is working only for 1 video cycle
            // if (watchedRatio >= 0.90) {
            //     console.log("watched full video")
            //     await this.saveWatchTime();
            //     this.stopWatchTimer();
            // } 

            chrome.storage.local.set({"currentVideoWatchTime": watchedTime});
        }, 1000);
    }

    stopWatchTimer() {
        clearInterval(this.watchInterval);
        console.log("stop watchtimer")
    }

    async saveWatchTime() {
        const fetchedTotalWatchTime = await chrome.storage.local.get("totalLmwWatchTime");
        const totalWatchTime = fetchedTotalWatchTime.totalLmwWatchTime;
        console.log("totalWatchTime",totalWatchTime)
        const fetchedSessionTime = await chrome.storage.local.get("currentVideoWatchTime");
        const currentSessionTime = fetchedSessionTime.currentVideoWatchTime;
        console.log("currentSessionTime", currentSessionTime)


        const updatedTotalWatchTime = {
            hours: totalWatchTime.hours + currentSessionTime.hours,
            minutes: totalWatchTime.minutes + currentSessionTime.minutes, 
            seconds: totalWatchTime.seconds + currentSessionTime.seconds
        } 
        
        chrome.storage.local.set({"totalLmwWatchTime": updatedTotalWatchTime})
        chrome.storage.local.set({"currentVideoWatchTime": {hours: 0, minutes: 0, seconds: 0}});
    }
}

function getWatchedRatio() {
    try {
        const progressBar = document.querySelector(".progress-bar-played"); 
        const styleString = progressBar.style.cssText;
    
        //Finds a number or decimal match in a raw style string
        const watchedRatio = styleString.match(/(?:\d*\.)?\d+/g); 
        return watchedRatio;
    } catch (error) {
        throw new Error("Unable to locate watchedRatio. error message:", error)
    }
}


function parseRawDuration(rawDuration) {
    const rawMinSec = rawDuration.slice(2, rawDuration.length - 1);
    const minSecArr = rawMinSec.split('M');
    return {minutes: parseInt(minSecArr[0]), seconds: parseInt(minSecArr[1])}; 
}

//debug only function!!! 
