'use strict'

//ONLY FOR DEBUG!!!!
// async function resetWatchStats() {
//     chrome.storage.local.set({"lmwAverage": 0})

//     chrome.storage.local.set({"lmwSessionHistory": []})

//     chrome.storage.local.set({"totalLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({"totalWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({"averageWatchTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({ "savedTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({ "sessionLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({ "sessionWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})

//     chrome.storage.local.set({ "sessionLmwWatchTimeHistory": []})

//     chrome.storage.local.set({ "sessionWafWatchTimeHistory": []})

//     console.log(await chrome.storage.local.get())
// } 

// resetWatchStats();

let stats;

window.addEventListener('load', async function(event) {
    stats = new Stats();
    addPageButtonsListeners();
    await stats.drawPages();
    await setMode();
    setListeners();
});

function setListeners() {
    const infoBtn = document.getElementById("info-btn");
    const settingsBtn = document.getElementById("settings-btn");

    infoBtn.addEventListener("click", () => {
        chrome.tabs.create({url: "extension://llbeomiepdfkkldghiinkibjkdkanknl/info.html"});
    });

    settingsBtn.addEventListener("click", async () => {
        createSettingsOverlay();
        const iframe = document.getElementById('iframe-settings');
        iframe.onload = () => {
            const closeBtn = iframe.contentDocument.getElementById('close-btn');
            closeBtn.onclick = () => {
                iframe.remove();
            };
        };
    });


}



function createSettingsOverlay() {
    var iframe = document.createElement('iframe');

    iframe.id = "iframe-settings";
    iframe.src = "/options.html";

    document.body.prepend(iframe);
}
 
function addPageButtonsListeners() {
    const nextPageButton = document.querySelector("#next-page");
    const prevPageButton = document.querySelector("#prev-page");

    nextPageButton.addEventListener('click', async () => {
        if (stats.page < 2) {
            stats.page++;
        }
        else {stats.page = 0;}
        await stats.drawPages()
    })

    prevPageButton.addEventListener('click', async () => {
        if (stats.page > 0) {
            stats.page--;
        }
        else {stats.page = 2;}
        await stats.drawPages()
    })
}


class Stats {
    constructor () {
        this.page = 0;

        this.statsFirstTitle = document.querySelector('#infocontainer-stats-firsttitle');
        this.statsSecondTitle = document.querySelector('#infocontainer-stats-secondtitle');
        this.statsField = document.querySelector('#infocontainer-stats-field');
    }

    async drawPages() {
        if (this.page == 0) await this.setEscapes();
        if (this.page == 1) await this.setSavedTime();
        if (this.page == 2) await this.setCountersDifference();
    }

    async setCountersDifference() {
        const {"watchSessionsDifference": difference} = await chrome.storage.local.get("watchSessionsDifference");
         
        this.statsFirstTitle.innerHTML = 'ON AVERAGE, YOU WATCH'
        this.statsSecondTitle.innerHTML = 'LESS IN THE LIMITER MODE'
        this.statsField.innerHTML = difference == 1 ? difference + " VIDEO" : difference + " VIDEOS";   
    }

    async setEscapes() {
        const {"numberOfEscapes": escapes} = await getStorageData("numberOfEscapes");

        this.statsSecondTitle.innerHTML = escapes > 0 ? 'KEEP THAT MOMENTUM!' : "START USING AND BOOST PRODUCTIVITY!" 
        if (escapes == 0) {
            this.statsField.innerHTML = "NO DATA";
        }
        else {
            this.statsField.innerHTML = escapes == 1 ? escapes + ' TIME' : escapes + ' TIMES';   
        }
        
        this.statsFirstTitle.innerHTML = escapes > 0 ? "YOU'VE ESCAPED SCROLLING" : "WELCOME TO DESCROLLIFY";
    }
    
    async setSavedTime() {
        const {"savedTime": savedWatchTime} = await chrome.storage.local.get("savedTime");

        this.statsFirstTitle.innerHTML = 'ON AVERAGE YOU SAVE'
        this.statsSecondTitle.innerHTML = 'WHILE IN THE LIMITER MODE'
        this.statsField.innerHTML = this.formatToString(savedWatchTime);   
    }
    
    formatToString(timeObject) {
        if (!timeObject) return "0 SECONDS";
        
        let timeStat;
        if (timeObject.minutes > 0 || timeObject.hours > 0) {
            const time = Math.round((timeObject.hours * 60) + timeObject.minutes + (timeObject.seconds / 60));
            timeStat = time == 1 ? time + " MINUTE" : time + " MINUTES" 
        }
        else {
            timeStat = Math.round(timeObject.seconds) + " SECONDS";
        }
        return timeStat;
    }
}

async function setMode() {
    let buttons = document.getElementsByClassName('popup-modeselector-btn');
    let modeSelector = document.querySelector('#mode-pointer-box');

    const {mode: mode} = await chrome.storage.local.get("mode")
    if (!mode) {
        chrome.storage.local.set({"mode": "WATCH A FEW MODE"});
        return;
    }

    //TODO: Add deletion function on popup close
    for (let button = 0; button < buttons.length; button++) {
        const buttonText = buttons[button].querySelector('.modeselector-text');
        let rect = buttons[button].getBoundingClientRect();
        console.log(rect)

        if (buttonText.id === mode) {
            setModePointerPosition(modeSelector, rect);
            modeSelector.hidden = false;
        }

        buttons[button].onclick = async function() {
            setModePointerPosition(modeSelector, rect);
            const response = await chrome.runtime.sendMessage({mode: buttonText.id});
        }
        
    }
}

function setModePointerPosition(modeSelector, rectPos) {
    modeSelector.style.top = rectPos.top + 'px';
    modeSelector.style.bottom = rectPos.bottom + 'px';
    modeSelector.style.right = rectPos.right + 'px';
    modeSelector.style.left = rectPos.left + 'px';
}



async function getStorageData() {
    const storageData = await chrome.storage.local.get();
    return storageData;
}



