document.querySelectorAll('.delete-group-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentForm = e.currentTarget; 
        
        const groupName = currentForm.dataset.groupName;
        const targetElementId = currentForm.dataset.targetId;

        if (!confirm(`Are you sure you want to delete the deck "${groupName}"?`)) {
            return;
        }

        const url = currentForm.action;

        const result = await postForm(url, currentForm);

        if (!result.success) {
            showError(result.error);
        } else {
            // Remove the card visually from the screen instantly
            const deckElement = document.getElementById(targetElementId);
            if (deckElement) {
                deckElement.remove();
            }

            showSuccess(`Successfully deleted "${groupName}"`);

            // If no decks are left, reload to show the empty placeholder message
            if (document.querySelectorAll('.deck-container').length === 0) {
                setTimeout(() => {window.location.reload();}, 700);
            }
        }
    });
});