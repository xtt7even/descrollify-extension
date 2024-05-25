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

window.addEventListener('load', async function(event) {
    const stats = new Stats();
    await stats.setSavedTime();
    await setMode();
});


class Stats {
    constructor () {
        this.page = 1;
    }

    async setEscapes() {
        const storage = await getStorageData();
        const statsTitle = document.getElementById('infocontainer-stats-title');
        const counter = document.getElementById('infocontainer-stats-field');
        counter.innerHTML = storage.numberOfEscapes + ' TIMES';   
        statsTitle.innerHTML = "YOU'VE ESCAPED SCROLLING"
    }
    
    async setSavedTime() {
        const {"savedTime": savedWatchTime} = await chrome.storage.local.get("savedTime");
        console.log(savedWatchTime);
        const statsFirstTitle = document.getElementById('infocontainer-stats-firsttitle');
        const statsSecondTitle = document.getElementById('infocontainer-stats-secondtitle');
        const statsField = document.getElementById('infocontainer-stats-field');

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



