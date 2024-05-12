'use strict';

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

// Event listener for page change
window.addEventListener('yt-navigate-finish', async function() {
    removeBlocker()
    
    const url = new URL(window.location.href);
    const isOnShort = await chrome.storage.local.get("isOnShortPage");
    console.log(isOnShort);
    if (url.href.includes('shorts')) {
        // If URL includes "shorts" set isOnShortPage to true (session based storage)
        updateWatchedTime(false);
        console.log("on short page = true")
        chrome.storage.local.set({"isOnShortPage": true})
        scanForShort();
    }
    //if the page doesn't include "short" but isOnShortPage WAS true before, that means the user closed or exited short page, so we need to update LMW mode averages
    else if (isOnShort) {
        console.log("Updating LMW storage");
        chrome.storage.local.set({"isOnShortPage": false})
        updateLmwAverage();
        
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

function getVideoDuration () {
    const durationElement = document.querySelector('meta[itemprop="duration"]');
    if (durationElement) {
        const rawDuration = durationElement.getAttribute('content');
        const result = parseRawDuration(rawDuration);
        console.log(result);
        return result;
    } else {
        return "Duration not found";
    }
}

// Quick comment: function returns watched duration of the video by user, fires on yt-navigation event, neccessary to calculate average watchtime
// TODO: Finish getWatchedTime()!!!
function updateWatchedTime(flagToExit) {
    const watchInterval = setInterval(() => {
        if (flagToExit) {
            clearInterval(watchInterval);
            //reset currentVideoWatchTime to 0 somehow here
        }

        const progressBar = document.querySelector(".progress-bar-played");
        const styleString = progressBar.style.cssText;
    
        const watchedRatio = styleString.match(/(?:\d*\.)?\d+/g);
        // console.log(watchedRatio);

        const videoDuration = getVideoDuration()
        // console.log(parseFloat(watchedRatio));
        const watchedTime = videoDuration.minutes === 1 ? {minites: 0, seconds: 60 / parseInt(watchedRatio)} : {minites: 0, seconds: videoDuration.seconds * parseFloat(watchedRatio)};
        chrome.storage.local.set({"currentVideoWatchTime": watchedTime});
        // console.log(watchedTime);
    }, 1000);
}

function parseRawDuration(rawDuration) {
    const rawMinSec = rawDuration.slice(2, rawDuration.length - 1);
    const minSecArr = rawMinSec.split('M');
    return {minutes: minSecArr[0], seconds: minSecArr[1]}; 
}