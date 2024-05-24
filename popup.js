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
    await setEscapes();
    await setMode();
});

async function setEscapes() {
    const storage = await getStorageData();
    const counter = document.getElementById('infocontainer-escape-counter');
    counter.innerHTML = storage.numberOfEscapes + ' TIMES';   
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



