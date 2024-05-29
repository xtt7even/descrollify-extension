'use strict'

function resetStats(resetButton) {
    if (isResetConfirmed(resetButton)) {
        // chrome.storage.local.set({"lmwSessionHistory": []});
        // chrome.storage.local.set({"wafSessionHistory": []});
        // chrome.storage.local.set({"lmwAverage": 0});
        // chrome.storage.local.set({"wafAverage": 0});
        // chrome.storage.local.set({ "totalLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})
        // chrome.storage.local.set({ "totalWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})
        // chrome.storage.local.set({ "savedTime": {hours: 0, minutes: 0, seconds: 0}})
        // chrome.storage.local.set({ "watchSessionsDifference": 0})
        // chrome.storage.local.set({ "sessionLmwWatchTimeHistory": []})
        // chrome.storage.local.set({ "sessionWafWatchTimeHistory": []})
        // chrome.storage.local.set({ "numberOfEscapes": 0})

        console.log("Reset")
        resetButton.firstChild.parentElement.innerHTML = "<p>RESET SUCCESSFULLY<p>"
        const successfulReset = setTimeout(() => {
            resetButton.firstChild.parentElement.innerHTML = "<p>RESET STATISTICS<p>";
        }, 3000);
    }
}

const countClicks = (function () {
    let resetClicked = 0;
    return function () {
        resetClicked++;
        return resetClicked;
    }
})();

function isResetConfirmed(resetButton) {
    if (countClicks() % 2 == 0) {
        resetButton.firstChild.parentElement.innerHTML = "<p>RESET STATISTICS<p>";
        return true;
    } 
    else {
        console.log(resetButton.firstChild, resetButton.firstChild.innerText);
        resetButton.firstChild.parentElement.innerHTML = "<p>PRESS TO CONFIRM<p>";
    }
    return false;
}

window.addEventListener("load", function() {
    const resetButton = document.getElementById("reset-btn");
    resetButton.addEventListener('click', () => {
        resetStats(resetButton);
    });

    const hideThumbnailsBtn = document.getElementById("hideThumbnails");
    hideThumbnailsBtn.addEventListener('click', async () => {
        const hideThumbnailsRadioButton = hideThumbnailsBtn.querySelector("input[type='radio']");
        setToggleOption('hideThumbnails', hideThumbnailsRadioButton);
    });

    const autoRedirectBtn = document.getElementById("autoRedirect");
    autoRedirect.addEventListener('click', async () => {
        const autoRedirectRadioButton = autoRedirectBtn.querySelector("input[type='radio']");
        setToggleOption('autoRedirect', autoRedirectRadioButton);
    });

});

async function setToggleOption(option, radio) {
    await chrome.storage.local.get('options', function(result) {
        let options = result.options || {};

        options[option] = !options[option];

        radio.checked = options[option];

        chrome.storage.local.set({ options: options });
    });
}
