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

async function remindAboutLmwMode() {
    const {options: options} = await chrome.storage.local.get('options');
    if (options.reminder_timestamp) {
        const timerFinish = new Date.now()
        if (timerFinish - options.reminder_timestamp > 30000) {
            alert("REMINDING YOU ABOUT LMW!!!!")
            options.reminder_timestamp = null;
            chrome.storage.local.set({options: options});
        }
    }
    else {
        options.reminder_timestamp = new Date.now();
        chrome.storage.local.set({options: options});
    }
} 

let reminderInterval;
let reminderIntervalCounter = 0;

window.addEventListener("load", async function() {
    const resetButton = document.getElementById("reset-btn");
    resetButton.addEventListener('click', () => {
        resetStats(resetButton);
    });


    const remindAboutLmwBtn = document.getElementById("remindAboutLmwMode");

    const remindAboutLmwRadioButton  = remindAboutLmwBtn.querySelector("input[type='radio']");
    setToggleOption('remindAboutLmwMode', remindAboutLmwRadioButton, false);

    remindAboutLmwBtn.addEventListener('click', async () => {
        setToggleOption('remindAboutLmwMode', remindAboutLmwRadioButton, true);
        chrome.runtime.sendMessage({message: "toggle_mode_reminder"});
    });

    //--------------------------------------
    // Hide thumbnail button
    const hideThumbnailsBtn = document.getElementById("hideThumbnails");

    const hideThumbnailsRadioButton = hideThumbnailsBtn.querySelector("input[type='radio']");
    setToggleOption('hideThumbnails', hideThumbnailsRadioButton, false);

    hideThumbnailsBtn.addEventListener('click', async () => {
        setToggleOption('hideThumbnails', hideThumbnailsRadioButton, true);

        const button = document.querySelector("#hideThumbnails");
        const paragraph = button.querySelector("p");
    
        paragraph.innerText = "PAGE REFRESH REQUIRED";
    
        setTimeout(() => {
            paragraph.innerText = "Also hide short videos thumbnails and previews";
        }, 3000);
    });

    //--------------------------------------
    // Automatically redirect back on short video open button
    const autoRedirectBtn = document.getElementById("autoRedirect");

    const autoRedirectRadioButton = autoRedirectBtn.querySelector("input[type='radio']");
    setToggleOption('autoRedirect', autoRedirectRadioButton, false);

    autoRedirect.addEventListener('click', async () => {
        setToggleOption('autoRedirect', autoRedirectRadioButton, true);

        const button = document.querySelector("#autoRedirect");
        const paragraph = button.querySelector("p");
    });

    //--------------------------------------
    // "Remove blocker after" timer
    const hourSelector = document.querySelector('#hours-select');
    fillTimeSelectList(hourSelector, 0, 24);

    const minuteSelector = document.querySelector('#minutes-select');
    fillTimeSelectList(minuteSelector, 0, 60);

    const secondSelector = document.querySelector('#seconds-select');
    fillTimeSelectList(secondSelector, 0, 60);


    //--------------------------------------
    // Max videos allowed to watch
    const digitSelector = document.querySelector(".onedigit-number");
    const {options: fetchedOptions} = await chrome.storage.local.get('options');
    console.log(fetchedOptions);
    digitSelector.value = fetchedOptions.maxVideosAllowed;

    digitSelector.addEventListener('change', async () => {    
        validateInput(digitSelector)
        await setAllowedVideos(digitSelector.value);
    });

    digitSelector.addEventListener('mouseout', async () => {    
        validateInput(digitSelector)
        await setAllowedVideos(digitSelector.value);
    });

    digitSelector.addEventListener('blur', async () => {    
        validateInput(digitSelector)
        await setAllowedVideos(digitSelector.value);
    });


    //--------------------------------------
});

function validateInput (digitSelector) {
    let regex = /^\d+$/;
    if (digitSelector.value > 30) digitSelector.value = 30;
    if (digitSelector.value < 1) digitSelector.value = 1;
    if (!regex.test(digitSelector.value)) digitSelector.value = 0;
}

async function setAllowedVideos(digitSelectorValue) {
    await chrome.storage.local.get('options', async function(result) {
        let options = result.options || {};

        options['maxVideosAllowed'] = parseInt(digitSelectorValue);
        console.log(options);
        await chrome.storage.local.set({ options: options });
        await chrome.runtime.sendMessage({message: "set_watch_limit"});
    });
}

async function setToggleOption(option, radio, isToSwitch) {
    await chrome.storage.local.get('options', function(result) {
        let options = result.options || {};

        //If function being called onclick we toggle the option value, instead we just set radio button to on/off
        if (isToSwitch) {
            options[option] = !options[option];
            chrome.storage.local.set({ options: options });
        }


        radio.checked = options[option];


    });
}

function fillTimeSelectList(list, min, max) {
    // const list = document.querySelector('#'+listid);
     
    for (let i = min; i < max; i++) {
        let option = document.createElement('option');
        option.value = i;
        option.text = i // if 1 => minute, if not => minuteS (minute + 's')

        list.add(option);
        
    }


}
