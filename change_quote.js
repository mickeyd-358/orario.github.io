const editButton = document.getElementById("name-edit");
const newQuote = document.getElementById('editable-quote');
const ENTER_KEY_CODE = 13;
const saveMsg = document.getElementById('save-msg');
const csrfToken = document.querySelector('input[name="csrf_token"]').getAttribute('value');

function saveQuote() {
    if (newQuote.contentEditable !== "true") return;

    const n_quote = newQuote.textContent.trim();

    if (n_quote.length > 250 || n_quote.length === 0) {
        alert("Please enter a quote that is between 1 and 250 characters.");
        return;
    }

    fetch('/api/update_quote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ quote: n_quote })
    });

    newQuote.contentEditable = "false";
    editButton.setAttribute('hidden', 'true');

    saveMsg.style.opacity = "1";
    setTimeout(() => {
        saveMsg.style.opacity = "0";
    }, 2000);
}

function handleInputKey(event) {
    if (event.key === 'Enter' || event.keyCode === ENTER_KEY_CODE) {
        event.preventDefault();
        newQuote.blur();
    }
}

function clickToEdit() {
    newQuote.contentEditable = "true";
    newQuote.focus();
    editButton.removeAttribute('hidden');
}

function showButton() {
    editButton.removeAttribute('hidden');
}

function hideButton() {
    editButton.setAttribute('hidden', 'true');
}

newQuote.addEventListener('click', clickToEdit);
newQuote.addEventListener('mouseover', showButton);
newQuote.addEventListener('mouseleave', hideButton);
newQuote.addEventListener('keydown', handleInputKey);
newQuote.addEventListener('blur', saveQuote);