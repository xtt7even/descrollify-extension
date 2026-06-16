'use strict';

// YouTube's internal markup changes over time; if these break, fix them here.
// Prefer ytd-* element tags and stable ids over utility classes like "style-scope".
const SELECTORS = {
    commentsButton: 'ytd-reel-player-overlay-renderer #comments-button',
    closeComments: 'ytd-engagement-panel-title-header-renderer #visibility-button',
    commentsPanelExpanded: 'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]',
    watchFlexy: 'ytd-watch-flexy',
};

// Toast message shown after Total Focus mode redirects the user off a Short.
const FOCUS_NOTIFICATION = 'TOTAL FOCUS MODE PREVENTED YOU FROM SCROLLING AND REDIRECTED YOU BACK. YOU CAN TURN THIS MODE OFF IN THE DESCROLLIFY POPUP';

// How long the explanatory toast stays up before we leave the page.
const LEAVE_DELAY_MS = 3000;

async function blockShortThumbnails() {
    const shortThumbnails = await document.querySelectorAll('ytd-rich-shelf-renderer');
    console.log(shortThumbnails);
    shortThumbnails.forEach((thumbnail) => {
        thumbnail.hidden = true;
    })
}



window.addEventListener('load', async () => {
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.message == 'videoplayer closed') {
            await chrome.runtime.sendMessage({message: "save_sessions"});
        }
        if (message.message == 'remove_shortcontainer') {
            blockShortThumbnails();
        }
        if(message.message == 'redirect_back') {
            showToastThenLeave(FOCUS_NOTIFICATION);
        }
        return true
    });
});

/**
 * Pauses the Short, shows the explanatory toast, then leaves to the user's
 * configured destination. DOM-independent — only touches <video> and <body>.
 */
async function showToastThenLeave(noteText) {
    const {options} = await chrome.storage.local.get("options");
    const dest = (options && options.blockRedirect) || "youtube";

    const video = document.querySelector('video');
    if (video) video.pause();

    drawNotification(noteText, LEAVE_DELAY_MS);

    setTimeout(() => leaveTo(dest, options), LEAVE_DELAY_MS);
}

// Ensures a custom destination is an absolute URL; a bare "example.com" would
// otherwise resolve relative to the Short and loop straight back into Shorts.
function normalizeUrl(url) {
    if (!url) return null;
    return /^(https?:|about:)/i.test(url) ? url : "https://" + url;
}

// Navigates away per the user's "When blocked, go to" setting (default: YouTube home).
function leaveTo(dest, options) {
    switch (dest) {
        case "close":
            chrome.runtime.sendMessage({message: "close_tab"});
            break;
        case "blank":
            window.location.href = "about:blank";
            break;
        case "custom": {
            const target = normalizeUrl(options && options.blockRedirectUrl);
            window.location.href = target || "https://www.youtube.com";
            break;
        }
        default: // "youtube"
            window.location.href = "https://www.youtube.com";
    }
}

function hideNotification() {
    const note = document.querySelector(".totalfocus-notification");
    if (note) {
        note.remove();
    }
}

function drawNotification(noteText, durationMs) {
    hideNotification(); // avoid stacking duplicates

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
    note.innerText = noteText;

    noteContainer.appendChild(note);

    div.appendChild(headerContainer);
    div.appendChild(noteContainer);

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    // Create progress animation bar; match its duration to the leave delay.
    const progress = document.createElement('div');
    progress.className = 'progress';
    if (durationMs) progress.style.animationDuration = (durationMs / 1000) + 's';
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
    const videoContainer = document.querySelector(SELECTORS.watchFlexy);

    if (!videoContainer) return;

    const observer = new MutationObserver(mutationsList => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const newCommentsButtons = Array.from(mutation.addedNodes)
                    .filter(node => node.nodeType === Node.ELEMENT_NODE && typeof node.matches === 'function' && node.matches('#comments-button'));

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

    const {isBlocked} = await chrome.storage.local.get("isBlocked");
    const videoElement = document.querySelector('video');

    const url = new URL(window.location.href);
    const pagePosition = await chrome.storage.local.get("isOnShortPage");
    if (url.href.includes('shorts')) {

        observeDOMChanges();
        addVideoListeners(videoElement);

        const initialCommentsButtons = Array.from(document.querySelectorAll(SELECTORS.commentsButton));
        addListenersToCommentsButtons(initialCommentsButtons);

        //if previous location was short page, before starting the timer we stoping it and saving the timer.
        if (pagePosition.isOnShortPage) await chrome.runtime.sendMessage({message: "handle_video_pause"});
        await chrome.runtime.sendMessage({message: "handle_video_play"});
        await chrome.runtime.sendMessage({message: "add_video_watch"}, async function(response) {
            if (response.response == "block_video" || isBlocked) {
                await blockShort();
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

// Called when the watch limit is reached. Tells the background to mark the
// session blocked (which also starts the unblock timer), then redirects off the
// Short with a toast built from a random pair of lines.
async function blockShort() {
    await chrome.runtime.sendMessage({message: "blocker_appended"});

    let note = "YOU'VE REACHED YOUR SHORTS LIMIT. TIME TO STEP AWAY AND STAY FOCUSED!";
    try {
        const lines = await pickASetOfLines();
        note = `${lines.upperline} ${lines.lowerline}`;
    } catch (error) {
        console.error('[Descrollify] Could not load lines, using default message:', error);
    }

    showToastThenLeave(note);
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

function addVideoListeners (videoElement) {
    const commentsButton = document.querySelector(SELECTORS.commentsButton);
    if (commentsButton) commentsButton.addEventListener('click', handleCommentsOpen)
    if (videoElement) {
        videoElement.addEventListener('pause', handleVideoPause);
        videoElement.addEventListener('play', handleVideoPlay);
    }   
    console.log("[Short Blocker] Added video event listeners")
}

function removeVideoListeners (videoElement) {
    const commentsButton = document.querySelector(SELECTORS.commentsButton);
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
    const closeComments = document.querySelector(SELECTORS.closeComments);
    if (closeComments) {
        closeComments.addEventListener('click', handleCommentsClose);
    }
}

async function handleCommentsClose() {
    const videoElement = document.querySelector('video'); 
    if (videoElement.paused) {
        await chrome.runtime.sendMessage({message: "handle_comments_close"});
    }

    const closeComments = document.querySelector(SELECTORS.closeComments);
    try {
        closeComments.removeEventListener('click', handleCommentsClose);
        console.log("Removed close btn listener")
    } catch (error) {
        console.error(error);
    }
}

async function handleVideoPause() {
    // console.log("Video Pause");
    const commentSection = document.querySelector(SELECTORS.commentsPanelExpanded);
    if (commentSection == null) {
        await chrome.runtime.sendMessage({message: "handle_video_pause"});
    }
}

async function handleVideoPlay() {
    // console.log("Video Play")
    await chrome.runtime.sendMessage({message: "handle_video_play"});
}
