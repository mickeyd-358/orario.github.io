const loader = document.getElementById("loader");
const progress = document.getElementById("progress");
const button = document.getElementById("loadButton");

document.querySelector("#flashcard-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loader.classList.add("active");
    button.disabled = true;
    button.textContent = "Generating...";

    // Random increments for progress bar
    let value = 0;
    const interval = setInterval(() => {
        if (value < 90) {
            value += Math.random() * 8;
            progress.style.width = value + "%";
        }
    }, 250);

    const form = e.target;

    const result = await postForm(form.getAttribute("action"), form);

    clearInterval(interval);

    // Unsuccessful attempt to show loader
    if (!result || !result.success) {
        loader.classList.remove("active");
        button.disabled = false;
        button.textContent = "Generate & Save";
        progress.style.width = "0%";
        showError(result?.error || "Something went wrong.");
        return;
    }

    progress.style.width = "100%";
    showSuccess(result.message);

    setTimeout(() => {
        window.location.href = result.redirect;
    }, 400);
});