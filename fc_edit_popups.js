// --- POPUP DISPLAY LOGIC ---
function openFcPopup(fcId, front, back) {
    document.getElementById("edit-fc-id").value = fcId;
    document.getElementById("edit-front").value = front;
    document.getElementById("edit-back").value = back;
    
    const errorBox = document.getElementById('error-message');
    if (errorBox) errorBox.style.display = 'none';
    
    const successBox = document.getElementById('success-message');
    if (successBox) successBox.style.display = 'none';
    
    document.getElementById("editFlashcardPopupOverlay").style.display = "block";
}

function closeEditPopup() {
    document.getElementById("editFlashcardPopupOverlay").style.display = "none";
}

window.onclick = function(event) {
    const editOverlay = document.getElementById("editFlashcardPopupOverlay");
    if (event.target === editOverlay) closeEditPopup();
};

// --- FORM SUBMISSION LOGIC ---
document.querySelector('#edit-fc-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fcId = document.getElementById("edit-fc-id").value;
    const url = `/api/edit_flashcard/${fcId}`;

    const result = await postForm(url, e.target);

    if (result.success) {
        const successBox = document.getElementById('success-message');
        if (successBox) {
            successBox.innerText = "Flashcard updated!";
            successBox.style.display = "block";
        }
        setTimeout(() => {
            closeEditPopup();
            window.location.reload();
        }, 800);
    } else {
        const errorBox = document.getElementById('error-message');
        if (errorBox) {
            errorBox.innerText = result.error || "Update failed";
            errorBox.style.display = "block";
        }
    }
});