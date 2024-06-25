'use strict';


//Following 2 functions are only for using during development to stop myself from distracting while testing/debugging extension.
// function SaveDeveloperFromScrolling() {
//     const existingBlockers = document.querySelectorAll('.developer-saver-debug-descrollify');
//     existingBlockers.forEach(blocker => blocker.remove());

//     injectDebugBlocker();
// }



// function injectDebugBlocker() {
//     const sequenceElements = document.getElementsByClassName('reel-video-in-sequence style-scope ytd-shorts');

//     for (let i = sequenceElements.length - 1; i >= 0; i--) {
//         const sequenceElement = sequenceElements[i];

//         const existingBlocker = sequenceElement.querySelector('.developer-saver-debug-descrollify');
//         if (!existingBlocker) {
//             const overlay = document.createElement('div');
//             overlay.className = 'developer-saver-debug-descrollify';

//             const textElement = document.createElement('div');
//             textElement.id = 'debugging-blocker-text';
//             textElement.innerText = 'THIS IS THE DEBUGGING BLOCKER!';
//             textElement.style.background = 'rgba(0, 0, 0, 0.7)';
//             textElement.style.padding = '10px 20px';
//             textElement.style.borderRadius = '10px';

//             overlay.appendChild(textElement);

//             overlay.style.position = 'absolute';
//             overlay.style.top = '0';
//             overlay.style.left = '0';
//             overlay.style.width = '100%';
//             overlay.style.height = '100%';
//             overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
//             overlay.style.backdropFilter = 'blur(30px)';
//             overlay.style.zIndex = '9999';
//             overlay.style.display = 'flex';
//             overlay.style.alignItems = 'center';
//             overlay.style.justifyContent = 'center';
//             overlay.style.color = 'white';
//             overlay.style.fontSize = '24px';
//             overlay.style.fontWeight = 'bold';
//             overlay.style.textAlign = 'center';

//             sequenceElement.style.position = 'relative';
//             sequenceElement.prepend(overlay);
//         }
//     }
// }


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



window.addEventListener('load', async () => {

    const {awaitingRedirectNotification} = await chrome.storage.local.get("awaitingRedirectNotification");
    if (awaitingRedirectNotification) {
        drawRedirectBackNotification();
        setTimeout(() => {
            hideRedirectBackNotification();
            chrome.storage.local.set({"awaitingRedirectNotification": false});
        }, 7000)
    }
    else {
        hideRedirectBackNotification();
    }

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
            alert('[DESCROLLIFY REMINDER]\nYOU CURRENTLY WATCHING SHORT VIDEOS IN "LET ME WATCH" MODE! CONSIDER SWITCHING TO THE "WATCH A FEW MODE" TO AVOID ENDLESS SCROLLING')
        }
        if(message.message == 'redirect_back') {
            await chrome.storage.local.set({"awaitingRedirectNotification": true});
            window.location.href = ".."  ;
        }
        return true
    });
});

function hideRedirectBackNotification() {
    const totalFocusNote = document.querySelector(".totalfocus-notification");
    if (totalFocusNote) {
        totalFocusNote.remove();
    }
}

function drawRedirectBackNotification() {

    const div = document.createElement('div');
    div.className = 'totalfocus-notification';


    const headerContainer = document.createElement('div');
    headerContainer.className = 'totalfocus-header-container';

    const header = document.createElement('h1');
    header.className = 'totalfocus-notification-header';
    header.innerText = 'DESCROLLIFY';


    headerContainer.appendChild(header);
    const noteContainer = document.createElement('div');
    noteContainer.className = 'totalfocus-note-container';

    const note = document.createElement('p');
    note.className = 'totalfocus-note';
    note.innerText = 'TOTAL FOCUS MODE PREVENTED YOU TO FROM SCROLLING, AND REDIRECTED YOU BACK, YOU CAN TURN THIS MODE OFF IN THE DESCROLLIFY POPUP';

    noteContainer.appendChild(note);

    div.appendChild(headerContainer);
    div.appendChild(noteContainer);

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    // Create progress animation bar
    const progress = document.createElement('div');
    progress.className = 'progress';
    progressBar.appendChild(progress);

    // Append progress bar to the main div
    div.appendChild(progressBar);

    document.body.appendChild(div);
}

function addListenersToCommentsButtons(buttons) {
    buttons.forEach(button => {
        button.addEventListener('click', handleCommentsOpen);
    });
}

function removeListenersFromCommentsButtons(buttons) {
    buttons.forEach(button => {
        button.removeEventListener('click', handleCommentsOpen);
    });
}

function observeDOMChanges() {
    const videoContainer = document.querySelector('ytd-watch-flexy');

    if (!videoContainer) return;

    const observer = new MutationObserver(mutationsList => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const newCommentsButtons = Array.from(mutation.addedNodes)
                    .filter(node => node.matches('div#comments-button.button-container.style-scope.ytd-reel-player-overlay-renderer'));

                addListenersToCommentsButtons(newCommentsButtons);
            }
        }
    });

    const config = { childList: true, subtree: true };
    observer.observe(videoContainer, config);
}
document.addEventListener('DOMContentLoaded', () => {

});

// Event listener for page change
window.addEventListener('yt-navigate-finish', async function() {

    removeBlocker()
    // SaveDeveloperFromScrolling();

    const {isBlocked} = await chrome.storage.local.get("isBlocked");
    const videoElement = document.querySelector('video');

    //for debugging only!!!!!!
        const storage = await chrome.storage.local.get();
        console.log(storage);
    //for debugging only!!!!!!

    const url = new URL(window.location.href);
    const pagePosition = await chrome.storage.local.get("isOnShortPage");
    if (url.href.includes('shorts')) {

        observeDOMChanges();
        addVideoListeners(videoElement);

        const initialCommentsButtons = Array.from(document.querySelectorAll('div#comments-button.button-container.style-scope.ytd-reel-player-overlay-renderer'));
        addListenersToCommentsButtons(initialCommentsButtons);
       
        const short = await scanForShort();
        //if previous location was short page, before starting the timer we stoping it and saving the timer.
        if (pagePosition.isOnShortPage) await chrome.runtime.sendMessage({message: "handle_video_pause"});
        await chrome.runtime.sendMessage({message: "handle_video_play"});
        await chrome.runtime.sendMessage({message: "add_video_watch"}, async function(response) {
            if (response.response == "block_video" || isBlocked) {
                await injectBlocker(short);
                console.log("Injected blocker");
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
    blockerLogo.setAttribute('id', 'blocker-logo');
    return blockerLogo;
}


function addVideoListeners (videoElement) {
    const commentsButton = document.querySelector('div#comments-button.button-container.style-scope.ytd-reel-player-overlay-renderer');
    if (commentsButton) commentsButton.addEventListener('click', handleCommentsOpen)
    if (videoElement) {
        videoElement.addEventListener('pause', handleVideoPause);
        videoElement.addEventListener('play', handleVideoPlay);
    }   
    console.log("[Short Blocker] Added video event listeners")
}

function removeVideoListeners (videoElement) {
    const commentsButton = document.querySelector('div#comments-button.button-container.style-scope.ytd-reel-player-overlay-renderer');
    if (commentsButton) commentsButton.removeEventListener('click', handleCommentsOpen);
    if (videoElement) {
        videoElement.removeEventListener('pause', handleVideoPause);
        videoElement.removeEventListener('play', handleVideoPlay);
    }   
    console.log("[Short Blocker] Removed video event listeners")
}

async function handleCommentsOpen() {
    await chrome.runtime.sendMessage({message: "handle_comments_open"});
    console.log("handle_comments_open")
    const closeComments = document.querySelector('div#visibility-button.style-scope.ytd-engagement-panel-title-header-renderer');
    if (closeComments) {
        closeComments.addEventListener('click', handleCommentsClose);
    }
}

async function handleCommentsClose() {
    const videoElement = document.querySelector('video'); 
    if (videoElement.paused) {
        await chrome.runtime.sendMessage({message: "handle_comments_close"});
    }

    const closeComments = document.querySelector('div#visibility-button.style-scope.ytd-engagement-panel-title-header-renderer');
    // const commentsButton = document.querySelector('div#comments-button.button-container.style-scope.ytd-reel-player-overlay-renderer');
    try {
        closeComments.removeEventListener('click', handleCommentsClose);
        console.log("Removed close btn listener")
    } catch (error) {
        console.error(error);
    }
}

async function handleVideoPause() {
    // console.log("Video Pause");
    const commentSection = document.querySelector('ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]');
    if (commentSection == null) {
        await chrome.runtime.sendMessage({message: "handle_video_pause"});
    }
}

async function handleVideoPlay() {
    // console.log("Video Play")
    await chrome.runtime.sendMessage({message: "handle_video_play"});
}
