'use strict'
window.addEventListener('load', async function(event) {
    await setEscapes();
    await setMode();
    setListeners();
});

function setListeners() {
    const infoBtn = document.getElementById("info-btn");
    const settingsBtn = document.getElementById("settings-btn");

    infoBtn.addEventListener("click", () => {
        chrome.tabs.create({url: "extension://llbeomiepdfkkldghiinkibjkdkanknl/info.html"});
        console.log("infobtn fired")
    });

    settingsBtn.addEventListener("click", () => {
        // window.location.href = "extension://llbeomiepdfkkldghiinkibjkdkanknl/options.html";
        // chrome.runtime.openOptionsPage();
        // chrome.windows.create({ url: chrome.runtime.getURL("/options.html"), type: 
        // "popup", height : 800, width : 500 });
        console.log("settingsbtn fired")
    });
}

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



