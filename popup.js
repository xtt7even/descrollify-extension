'use strict'
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

    chrome.storage.local.get(["mode"]).then((result) => {
        if (!Object.hasOwn(result, "mode")) {
            chrome.storage.local.set({"mode": "WATCH A FEW MODE"});
        }
    });

    for (let button = 0; button < buttons.length; button++) {
        buttons[button].onclick = async function() {
            const radioButton =  buttons[button].querySelector('.mode-selector');
            radioButton.checked = true;

            const buttonElement = buttons[button].querySelector('.modeselector-text');
            const response = await chrome.runtime.sendMessage({mode: buttonElement.innerHTML});
        }
    }
}

async function getStorageData() {
    const storageData = await chrome.storage.local.get();
    return storageData;
    console.log(storageData)
}



