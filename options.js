'use strict'

function resetStats(resetButton) {
    if (isResetConfirmed(resetButton)) {
        chrome.storage.local.set({"lmwSessionHistory": []});
        chrome.storage.local.set({"wafSessionHistory": []});
        chrome.storage.local.set({"lmwAverage": 0});
        chrome.storage.local.set({"wafAverage": 0});
        chrome.storage.local.set({ "totalLmwWatchTime": {hours: 0, minutes: 0, seconds: 0}})
        chrome.storage.local.set({ "totalWafWatchTime": {hours: 0, minutes: 0, seconds: 0}})
        chrome.storage.local.set({ "savedTime": {hours: 0, minutes: 0, seconds: 0}})
        chrome.storage.local.set({ "watchSessionsDifference": 0})
        chrome.storage.local.set({ "sessionLmwWatchTimeHistory": []})
        chrome.storage.local.set({ "sessionWafWatchTimeHistory": []})
        chrome.storage.local.set({ "numberOfEscapes": 0})

        resetButton.innerHTML = "<p>RESET SUCCESSFULLY</p>";
        setTimeout(() => {
            resetButton.innerHTML = "<p>RESET STATISTICS</p>";
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
        resetButton.innerHTML = "<p>RESET STATISTICS</p>";
        return true;
    }
    resetButton.innerHTML = "<p>PRESS TO CONFIRM</p>";
    return false;
}

window.addEventListener("load", async function() {
    const {options} = await chrome.storage.local.get('options');

    // Reset statistics
    const resetButton = document.getElementById("reset-btn");
    resetButton.addEventListener('click', () => resetStats(resetButton));

    // Toggles
    initToggle("hideThumbnails-toggle", "hideThumbnails", options, () => {
        const hint = document.getElementById("hideThumbnails-hint");
        hint.textContent = "Refresh open YouTube tabs to apply";
        setTimeout(() => { hint.textContent = ""; }, 3000);
    });

    // Max videos allowed to watch
    const maxVideos = document.getElementById("maxVideos");
    maxVideos.value = options.maxVideosAllowed;
    ["change", "blur"].forEach(ev => maxVideos.addEventListener(ev, async () => {
        validateInput(maxVideos);
        await setAllowedVideos(maxVideos.value);
    }));

    // "Unblock after" timer
    const hourSelector = document.getElementById('hours-select');
    const minuteSelector = document.getElementById('minutes-select');
    const secondSelector = document.getElementById('seconds-select');
    fillTimeSelectList(hourSelector, 0, 24);
    fillTimeSelectList(minuteSelector, 0, 60);
    fillTimeSelectList(secondSelector, 0, 60);
    setTimeSelectors(hourSelector, minuteSelector, secondSelector);
    hourSelector.addEventListener("blur", () => saveTimerField("hours", hourSelector.value));
    minuteSelector.addEventListener("blur", () => saveTimerField("minutes", minuteSelector.value));
    secondSelector.addEventListener("blur", () => saveTimerField("seconds", secondSelector.value));

    // "When blocked, go to" destination
    await setupBlockRedirect();
});

// Reads the stored value into the checkbox and persists changes; onChange runs after save.
async function initToggle(checkboxId, optionKey, options, onChange) {
    const checkbox = document.getElementById(checkboxId);
    checkbox.checked = !!options[optionKey];
    checkbox.addEventListener("change", async () => {
        await saveOption(optionKey, checkbox.checked);
        if (onChange) onChange(checkbox.checked);
    });
}

async function setTimeSelectors(hours, minutes, seconds) {
    const {options} = await chrome.storage.local.get("options");
    hours.value = options.removeBlockerTimer.hours;
    minutes.value = options.removeBlockerTimer.minutes;
    seconds.value = options.removeBlockerTimer.seconds;
}

async function saveTimerField(field, value) {
    const {options} = await chrome.storage.local.get("options");
    options.removeBlockerTimer[field] = parseInt(value);
    await chrome.storage.local.set({options});
}

async function setupBlockRedirect() {
    const select = document.getElementById("block-redirect-select");
    const urlRow = document.getElementById("blockRedirectUrlRow");
    const urlInput = document.getElementById("block-redirect-url");

    const {options} = await chrome.storage.local.get("options");
    select.value = options.blockRedirect || "youtube";
    urlInput.value = options.blockRedirectUrl || "";
    urlRow.style.display = select.value === "custom" ? "" : "none";

    select.addEventListener("change", async () => {
        urlRow.style.display = select.value === "custom" ? "" : "none";
        await saveOption("blockRedirect", select.value);
    });

    urlInput.addEventListener("blur", async () => {
        const cleaned = normalizeRedirectUrl(urlInput.value.trim());
        urlInput.value = cleaned;
        await saveOption("blockRedirectUrl", cleaned);
    });
}

// Prepend https:// when the user omits a scheme, so the URL isn't treated as a
// path relative to the YouTube page (which would loop back into Shorts).
function normalizeRedirectUrl(url) {
    if (!url) return "";
    return /^(https?:|about:)/i.test(url) ? url : "https://" + url;
}

async function saveOption(key, value) {
    const {options} = await chrome.storage.local.get("options");
    options[key] = value;
    await chrome.storage.local.set({options});
}

function validateInput(input) {
    const regex = /^\d+$/;
    if (input.value > 30) input.value = 30;
    if (input.value < 1) input.value = 1;
    if (!regex.test(input.value)) input.value = 1;
}

async function setAllowedVideos(value) {
    const {options} = await chrome.storage.local.get('options');
    options.maxVideosAllowed = parseInt(value);
    await chrome.storage.local.set({options});
    await chrome.runtime.sendMessage({message: "set_watch_limit"});
}

function fillTimeSelectList(list, min, max) {
    for (let i = min; i < max; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = i;
        list.add(option);
    }
}
