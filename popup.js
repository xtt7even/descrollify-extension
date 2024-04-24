'use strict'
window.addEventListener('load', async function(event) {
    await setEscapes();
    await setMode();
});

async function setEscapes() {
    const currentEscapes = await getCurrentEscapes();
    const counter = document.getElementById('infocontainer-escape-counter');
    counter.innerHTML = currentEscapes["numberOfEscapes"] + ' LIKES';   
}

async function setMode() {
    let buttons = document.getElementsByClassName('popup-modeselector-btn');

    chrome.storage.session.get(["mode"]).then((result) => {
        if (!Object.hasOwn(result, "mode")) {
            chrome.storage.session.set({"mode": "WATCH A FEW MODE"});
        }
    });

    for (let button = 0; button < buttons.length; button++) {
        buttons[button].onclick = async function() {
            const buttonElement = buttons[button].querySelector('.modeselector-text');
            const response = await chrome.runtime.sendMessage({mode: buttonElement.innerHTML});
        }
    }
}

function getCurrentEscapes() {
    return new Promise((resolve, reject) => {
        chrome.storage.session.get(["numberOfEscapes"])
        .then((result) => {
            
            const currentEscapes = Object.hasOwn(result, "numberOfEscapes") ? result : 0; //In case we got undefined, we just set it to
            console.log(currentEscapes);
            resolve(currentEscapes);
        }) 
    });
}



