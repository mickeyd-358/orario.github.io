const timeElement = document.getElementById('current-time');
const twelveHrTime = document.getElementById('12-hr');
const twentyfourHrTime = document.getElementById('24-hr')

function updateTime() {
    const options = { 
        hour: 'numeric', 
        minute: 'numeric', 
        second: 'numeric', 
        hour12: twelveHrTime.checked
    };
    
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', options);
    timeElement.textContent = formattedTime;
}

// Update the time immediately on load
updateTime();

// Update the time every second (1000 milliseconds)
setInterval(updateTime, 1000);