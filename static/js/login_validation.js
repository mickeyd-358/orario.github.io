document.querySelector('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const result = await postForm('/login', e.target);

    if (!result.success) {
        showError(result.error);
    } else {
        window.location.href = result.redirect;
    }
});