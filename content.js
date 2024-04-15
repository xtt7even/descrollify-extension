const appendBlocker = setInterval(() => {
    let short = getShort();
    // console.log(short);
    if (!short) short = getShort();
    else {
        console.log("Blocker: *WOOOOOOOP*... *WOOOOOOOOP*... SHORT VIDEO DETECTED, TAKE ACTIONS IMMEDIATELY!")

        const blocker = buildBlocker(short);
        console.log("Blocker: Trying to inject the BLOCKER, AAAAUGH IT'S HARD!!!!")
        short.prepend(blocker);

        removeUnecessaryElements();

        console.log("Blocker: CAPTAIN! Injected THE ANTI-SHORT BLOCKER!!!")
        console.log("Blocker: checking if everything is safe now")
        clearInterval(appendBlocker);
        console.log("Blocker: FOR NOW WE'RE SAFE CAPTAIN!")
        return;
    }
}, 1000);

var link = document.createElement('link');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('type', 'text/css');
link.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,100..900;1,100..900&display=swap');
document.head.appendChild(link);

function getShort() {
    const element = document.getElementById("shorts-inner-container");
    return element;
}

function buildBlocker(short) {

    const blockerContainer = buildBlockerContainer(short);

    // const blockerImage = buildBlockerLogo();
    // blockerContainer.append(blockerImage);

    const blockerText = buildBlockerText();
    blockerContainer.appendChild(blockerText);
    return blockerContainer;
}

function buildBlockerContainer(short) {
    const blockerContainer = document.createElement("div");
    blockerContainer.setAttribute("id", "blocker-container");   

    const width = short.offsetWidth;
    const height = short.offsetHeight - (short.offsetHeight * 0.05);

    blockerContainer.style.width = width.toString() + 'px';
    blockerContainer.style.height = height.toString() + 'px';
    return blockerContainer;
}

function buildBlockerText() {
    const textContainer = document.createElement('div');
    textContainer.setAttribute('id', 'text-container')
    
    const blockerText = document.createElement("h2");
    blockerText.innerText = "Pause the endless scroll: Is your time being spent on what truly matters?";
    blockerText.setAttribute('id', 'big-text')

    textContainer.append(blockerText);

    return textContainer;
}

function buildBlockerLogo() {
    // const imageCircle = document.createElement('div');
    // imageCircle.setAttribute('id', 'image-circle')
    
    return imageCircle
}

function removeUnecessaryElements() {
    const sequenceElements = document.getElementsByClassName('reel-video-in-sequence style-scope ytd-shorts');
    console.log(sequenceElements);

    for (let i = sequenceElements.length - 1; i > 0; i--) {
        sequenceElements[i].remove();
        console.log("Blocker: removed video sequence and overlay");
    }

    const overlayElements = document.getElementsByClassName('action-container style-scope ytd-reel-player-overlay-renderer');
    
    for (let i = overlayElements.length - 1; i >= 0; i--) {
        overlayElements[i].remove();   
    }
}