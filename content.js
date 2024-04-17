'use strict';

// (async () => {
//     const src = chrome.runtime.getURL("custom_libs/blockerBuilder.js");
//     const blockerBuilder = await import(src);
//     blockerBuilder.buildBlocker();
// }) ();

// import buildBlocker from 'custom_libs/blockerBuilder';

function locateShort() {
    // Returns a promise to asynchronously locate an element by its ID
    return new Promise((resolve, reject) => {
        let intervalIterations = 0; // Counter to track iterations for the interval
        const waitForShort = setInterval(() => {
            const url = new URL(window.location.href);
            //Check if either maximum iterations reached or the URL doesn't include the target substring
            if (intervalIterations > 3 || !url.href.includes('shorts')) {
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

// Event listener for initial page load
window.onload = (event) => {
    shortScanner();
}

// Event listener for page change
window.addEventListener('yt-navigate-finish', function() {
    shortScanner();
});

// Function to scan for short video element
function shortScanner () {
    if (document.getElementById("blocker-container")) {
        document.getElementById("blocker-container").remove();
    }

    let short;
    locateShort()
    .then((result) => short = result)
    .then(() => {
        const blocker = buildBlocker(short);
        short.prepend(blocker);
        removeUnecessaryElements();
        justAFunnyConsoleStuff();
    })
    .catch(() => {
        // The case when short video element cannot be located
        console.log("Blocker: No SHORT VIDEOS (*face of disgust*) in sight, captain, we're safe!")
    });
}

//just for fun, not necessary
function justAFunnyConsoleStuff() {
    console.log("Blocker: *WOOOOOOOP*... *WOOOOOOOOP*... SHORT VIDEO DETECTED, TAKE ACTIONS IMMEDIATELY!")
    console.log("Blocker: Trying to inject the BLOCKER, AAAAUGH IT'S HARD!!!!")
    console.log("Blocker: CAPTAIN! Injected THE ANTI-SHORT BLOCKER!!! FOR NOW WE'RE SAFE CAPTAIN!")
}

//injecting google Roboto Condensed font for the popup
var link = document.createElement('link');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('type', 'text/css');
link.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,100..900;1,100..900&display=swap');
document.head.appendChild(link);

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


function buildBlocker(short) {
    const blockerContainer = buildBlockerContainer(short);

    const blockerText = buildBlockerText();
    blockerContainer.appendChild(blockerText);
    return blockerContainer;
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

function buildBlockerText() {
    const textContainer = document.createElement('div');
    textContainer.setAttribute('id', 'text-container')
    
    const blockerText = document.createElement("h2");
    blockerText.innerText = "Pause the endless scroll: Is your time being spent on what truly matters?";
    blockerText.setAttribute('id', 'big-text')

    textContainer.append(blockerText);

    return textContainer;
}

function buildBlockerLogo() {
    return imageCircle
}
