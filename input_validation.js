const passwordInput = document.getElementById('password');

const requirements = {
    length: { re: /^.{8,64}$/, element: document.getElementById('length') },
    uppercase: { re: /[A-Z]/, element: document.getElementById('uppercase') },
    lowercase: {re: /[a-z]/, element: document.getElementById('lowercase')},
    number: { re: /[0-9]/, element: document.getElementById('number') },
    special: { re: /[!@#\-_=+.\$%\^&\*]/, element: document.getElementById('special') }
};

    
function updateRequirements() {
    const value = passwordInput.value;

    for (const key in requirements) {
        const item = requirements[key];
        if (item.re.test(value)) {
            item.element.style.color = 'green';
            item.element.innerHTML = `✔ ${item.element.innerText.slice(2)}`;
        } else {
            item.element.style.color = 'red';
            item.element.innerHTML = `✖ ${item.element.innerText.slice(2)}`;
        }
    }
    if (Object.values(requirements).every(item => item.re.test(value))) {
        const successBox = document.getElementById('success-message')
        successBox.innerText = 'Valid password!';
        successBox.style.display = 'block';
        successBox.style.opacity = '100';
        setTimeout(() => {
            successBox.style.opacity = '0';
            setTimeout(() => { successBox.style.display = 'none'; }, 3000);
        }, 10000);

    }
};

document.querySelector('#register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const result = await postForm('/register', e.target);

    if (!result.success) {
        showError(result.error);
    } else {
        window.location.href = result.redirect;
    }
});


passwordInput.addEventListener('input', updateRequirements)