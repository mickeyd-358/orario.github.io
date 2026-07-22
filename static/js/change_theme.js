const toggleSwitch = document.getElementById('toggleCheckbox');
const body = document.body;
const word = document.getElementById("light-dark-indicator");

function toggleDarkMode(isDark) {
    const targetTheme = isDark ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', targetTheme);
    
    localStorage.setItem('theme', targetTheme);
}

function sendAlert() {
    // Checked means light mode is active
    const isLightModeActive = toggleSwitch.checked;
    
    toggleDarkMode(!isLightModeActive);
    
    if (!isLightModeActive) {
        console.log('dark mode enabled!');
    } else {
        console.log('light mode enabled!');
    }
}

const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggleSwitch.checked = false;
} else {
    document.documentElement.setAttribute('data-theme', 'light');
    toggleSwitch.checked = true;
}

toggleSwitch.addEventListener('change', sendAlert);