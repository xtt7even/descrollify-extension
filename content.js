'use strict';

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
    //I was very tired when I add this async await, so I have 0 clue how does that helps me here, but without it it doesn't work (self-reminder to figure it out)
    .then(async () => {
        const blocker = await buildBlocker(short);
        short.prepend(blocker);
        pauseVideo();
        removeUnecessaryElements();
        justAFunnyConsoleStuff();
    })
    .catch(() => {
        // The case when short video element cannot be located
        console.log("Blocker: No SHORT VIDEOS (*face of disgust*) in sight, captain, we're safe!")
    });
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
        videoElement.pause();
    }
}

//injecting google Roboto Condensed font for the popup
//??? Try to move it to the popup.html, what does it has to do with the content.js and why do we need it in the accessed website DOM
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
