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

async function blockShortThumbnails() {
    const shortThumbnails = await document.querySelectorAll('ytd-rich-shelf-renderer');
    console.log(shortThumbnails);
    shortThumbnails.forEach((thumbnail) => {
        thumbnail.hidden = true;
    })
}



window.addEventListener('load', () => {

    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        console.log(message)
        // console.log(message == 'videoplayer closed', message == 'remove_shortcontainer')
        if (message.message == 'videoplayer closed') {
            await chrome.runtime.sendMessage({message: "save_sessions"});
        }
        if (message.message == 'remove_shortcontainer') {
            blockShortThumbnails();
            console.log("Sent");
        }
        if(message.message == 'mode_reminder') {
            alert("LMW mode reminder!")
        }
        if(message.message == 'redirect_back') {
            window.location.href = ".."  ;
        }
    });
});

// Event listener for page change
window.addEventListener('yt-navigate-finish', async function() {
    removeBlocker()

    const {isBlocked} = await chrome.storage.local.get("isBlocked");
    const videoElement = document.querySelector('video');

    //for debugging only!!!!!!
        const storage = await chrome.storage.local.get();
        console.log(storage);
    //for debugging only!!!!!!

    const url = new URL(window.location.href);
    const pagePosition = await chrome.storage.local.get("isOnShortPage");
    if (url.href.includes('shorts')) {
        // If URL includes "shorts" set isOnShortPage to true (session based storage)
        addVideoListeners(videoElement);
       
        const short = await scanForShort();
        //if previous location was short page, before starting the timer we stoping it and saving the timer.
        if (pagePosition.isOnShortPage) await chrome.runtime.sendMessage({message: "handle_video_pause"});
        await chrome.runtime.sendMessage({message: "handle_video_play"});
        await chrome.runtime.sendMessage({message: "add_video_watch"}, async function(response) {
            if (response.response == "block_video" || isBlocked) {
                await injectBlocker(short)
                console.log("Injected blocker");
                chrome.storage.local.set({"watchedVideosCounter": 0});
            }
        });

        chrome.storage.local.set({"isOnShortPage": true})
    }
    //if the page doesn't include "short" but isOnShortPage WAS true before, that means the user closed or exited short page, so we need to update LMW mode averages
    else if (pagePosition.isOnShortPage) {
        await chrome.runtime.sendMessage({message: "handle_video_pause"});
        chrome.storage.local.set({"isOnShortPage": false})
        removeVideoListeners(videoElement);
    }

});

async function injectBlocker(short) {
    console.log(short);
    pauseVideo();
    const blocker = await buildBlocker(short);
    removeUnecessaryElements();
    short.parentNode.prepend(blocker);
    await chrome.runtime.sendMessage({message: "blocker_appended"});
}

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
    let short = await locateShort();
    if (!short) {
        console.error("No short located on this page"); 
        return;
    }
    return short;
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
    sequenceElements[0].style.opacity = 0;

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
                const response = await chrome.runtime.sendMessage({type: "escapedscrolling"});
                await chrome.runtime.sendMessage({message: "save_sessions"});
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
    await chrome.runtime.sendMessage({message: "handle_video_pause"});
}

async function handleVideoPlay() {
    console.log("Video Play")
    await chrome.runtime.sendMessage({message: "handle_video_play"});
}

//TODO: Fix video counter stats calculation, it doesn't work anymore



// Quick comment: function returns watched duration of the video by user, fires on yt-navigation event, neccessary to calculate average watchtime
// TODO: Finish getWatchedTime()!!!
