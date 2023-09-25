/**
 * 
 * @param {HTMLElement[]} elementIds
 */
function writeLocalizedDateToElements(...elements) {
    for(let dateElement of elements) {
        let dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        let timeOptions = { hour: "numeric", minute: "2-digit" };
        const date = new Date(dateElement.innerHTML);
    
        dateElement.innerHTML = 
            date.toLocaleDateString(undefined, dateOptions) + " at " +
            date.toLocaleTimeString(undefined, timeOptions);
    }
}

/**
 * 
 * @param {string} id 
 * @param {string[]} exceptions
 */
function writeLocalizedDateOfElementsStartingWith(id, ...exceptions) {
    writeLocalizedDateToElements(...document.querySelectorAll(`[id^="${id}"]`, ...exceptions.map(e => `:not([id="${e}])`)));
}

