document.querySelector('#logout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const result = await postForm('/logout', e.target);

    if (!result.success) {
        if (result.error && result.error.includes("CSRF")) {
            window.location.href = "/login";
            return;
        }

        showError(result.error);
    } else {
        window.location.href = result.redirect;
    }
});