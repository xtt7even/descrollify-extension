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
    await chrome.storage.local.set({"watchedVideosCounter": storage.watchedVideosCounter + 1});
}

// Event listener for page change
window.addEventListener('yt-navigate-finish', function() {
    removeBlocker()

    const url = new URL(window.location.href);
    if (url.href.includes('shorts')) {
        scanForShort();
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


//just for fun, not necessary
function justAFunnyConsoleStuff() {
    console.log("Blocker: *WOOOOOOOP*... *WOOOOOOOOP*... SHORT VIDEO DETECTED, TAKE ACTIONS IMMEDIATELY!")
    console.log("Blocker: Trying to inject the BLOCKER, AAAAUGH IT'S HARD!!!!")
    console.log("Blocker: CAPTAIN! Injected THE ANTI-SHORT BLOCKER!!! FOR NOW WE'RE SAFE CAPTAIN!")
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

function parseRawDuration(rawDuration) {
    const rawMinSec = rawDuration.slice(2, rawDuration.length - 1);
    console.log(rawMinSec);
    const minSecArr = rawMinSec.split('M');
    console.log(minSecArr);
    return {minutes: minSecArr[0], seconds: minSecArr[1]}; 
}