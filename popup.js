
window.addEventListener('load', async function(event) {
    const currentEscapes = await getCurrentEscapes();
    console.log(currentEscapes)
    const counter = document.getElementById('infocontainer-escape-counter');
    counter.innerHTML = currentEscapes["numberOfEscapes"] + ' TIMES';
});


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


