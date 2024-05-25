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
});

function addPageButtonsListeners() {
    const nextPageButton = document.querySelector("#next-page");
    const prevPageButton = document.querySelector("#prev-page");

    nextPageButton.addEventListener('click', async () => {
        console.log(stats.page);
        if (stats.page < 1) {
            stats.page++;
        }
        else {stats.page = 0;}
        await stats.drawPages()
    })

    prevPageButton.addEventListener('click', async () => {
        console.log(stats.page);
        if (stats.page > 0) {
            stats.page--;
        }
        else {stats.page = 1;}
        await stats.drawPages()
    })
}


class Stats {
    constructor () {
        this.page = 0;
    }

    async drawPages() {
        if (this.page == 0) await this.setEscapes();
        if (this.page == 1) await this.setSavedTime();
    }

    async setEscapes() {
        const storage = await getStorageData();
        const statsTitle = document.querySelector('#infocontainer-stats-firsttitle');
        const statsSecondTitle = document.querySelector('#infocontainer-stats-secondtitle');
        const counter = document.querySelector('#infocontainer-stats-field');
        statsSecondTitle.innerHTML = ' '
        counter.innerHTML = storage.numberOfEscapes + ' TIMES';   
        statsTitle.innerHTML = "YOU'VE ESCAPED SCROLLING"
    }
    
    async setSavedTime() {
        const {"savedTime": savedWatchTime} = await chrome.storage.local.get("savedTime");
        console.log(savedWatchTime);
        const statsFirstTitle = document.querySelector('#infocontainer-stats-firsttitle');
        const statsSecondTitle = document.querySelector('#infocontainer-stats-secondtitle');
        const statsField = document.querySelector('#infocontainer-stats-field');


        statsFirstTitle.innerHTML = 'ON AVERAGE YOU SAVE'
        statsSecondTitle.innerHTML = 'USING "WATCH A FEW MODE"'
        statsField.innerHTML = this.formatToString(savedWatchTime);   
    }
    
    formatToString(timeObject) {
        let timeStat;
        if (timeObject.minutes > 0 || timeObject.hours > 0) {
            timeStat = Math.round((timeObject.hours * 60) + timeObject.minutes + (timeObject.seconds / 60)) + " MINUTES"
        }
        else {
            timeStat = Math.round(timeObject.seconds) + " SECONDS";
        }
        return timeStat;
    }
}

async function setMode() {
    let buttons = document.getElementsByClassName('popup-modeselector-btn');

    const modeObject = await chrome.storage.local.get(["mode"])
    if (!Object.hasOwn(modeObject, "mode")) {
        chrome.storage.local.set({"mode": "WATCH A FEW MODE"});
        return;
    }

    //TODO: Add deletion function on popup close
    for (let button = 0; button < buttons.length; button++) {
        const buttonText = buttons[button].querySelector('.modeselector-text');
        const radioButton =  buttons[button].querySelector('.mode-selector');

        if (buttonText.innerHTML === modeObject.mode) radioButton.checked = true;

        buttons[button].onclick = async function() {
            radioButton.checked = true;
            const response = await chrome.runtime.sendMessage({mode: buttonText.innerHTML});
        }
    }
}

async function getStorageData() {
    const storageData = await chrome.storage.local.get();
    return storageData;
}



