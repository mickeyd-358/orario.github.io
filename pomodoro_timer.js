const workInput = document.getElementById('work_time');
const shortInput = document.getElementById('short_time');
const longInput = document.getElementById('long_time');

let work_length = Number(workInput.value) || 25;
let short_length = Number(shortInput.value) || 5;
let long_length = Number(longInput.value) || 15;

// Global state trackers
const COLORS = { work: '#e74c3c', short: '#f97316', long: '#6b8e23' };
const CIRCUMFERENCE = 2 * Math.PI * 90;

let currentMode = 'work';
let interval = null;
let sessions = 0;

let MODES = { work: work_length * 60, short: short_length * 60, long: long_length * 60 };
let timeLeft = MODES.work;
let totalTime = MODES.work;

async function saveStudySession(minutesSpent) {
    const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;
    
    try {
        const response = await fetch('/api/save_study_time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ minutes: minutesSpent })
        });
        
        const data = await response.json();
        if (!data.success) {
            console.error("Failed to log study time:", data.error);
        }
    } catch (error) {
        console.error("Error logging study time:", error);
    }
}

workInput.addEventListener('input', function() {
    work_length = Number(this.value);
    MODES.work = work_length * 60;
    if (currentMode === 'work' && !interval) resetTimer(); // Auto-update timer display if idle
});

shortInput.addEventListener('input', function() {
    short_length = Number(this.value);
    MODES.short = short_length * 60;
    if (currentMode === 'short' && !interval) resetTimer();
});

longInput.addEventListener('input', function() {
    long_length = Number(this.value);
    MODES.long = long_length * 60;
    if (currentMode === 'long' && !interval) resetTimer();
});

const display = document.getElementById('timer-display');
const progress = document.getElementById('progress');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

function updateDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    display.textContent = `${m}:${s}`;
    
    // Guard against dividing by zero if an input is cleared
    const percent = totalTime > 0 ? timeLeft / totalTime : 0;
    const offset = CIRCUMFERENCE * (1 - percent);
    progress.style.strokeDashoffset = offset;
}

function updateTabs() {
    ['work','short','long'].forEach(mode => {
        const tab = document.getElementById('tab-' + (mode === 'short' ? 'short' : mode === 'long' ? 'long' : 'work'));
        if (!tab) return;
        if (mode === currentMode) {
            tab.style.background = COLORS[mode];
            tab.style.color = '#fff';
        } else {
            tab.style.background = '#f0c0bd';
            tab.style.color = '#000000';
        }
    });
    progress.style.stroke = COLORS[currentMode];
}

function switchMode(mode) {
    clearInterval(interval); interval = null;
    currentMode = mode;
    timeLeft = MODES[mode];
    totalTime = MODES[mode];
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    if (currentMode === 'work') {
        toggleActivity(true);
    } else {
        toggleActivity(false);
    }
    updateDisplay();
    updateTabs();
}

async function toggleActivity(newStatus) {
    const csrf_token = document.querySelector('input[name="csrf_token"]')?.value;
    try {
        const response = await fetch('/api/toggle_activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token
            },
            body: JSON.stringify({ is_studying: newStatus })
        });

        const data = await response.json();

    } catch (error) {
        showError("Error updating status.");
        console.log(error)
    }
}

function startTimer() {
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    
    if (timeLeft === totalTime) {
        timeLeft = MODES[currentMode];
        totalTime = MODES[currentMode];
    }
    if (currentMode === 'work') {
        toggleActivity(true);
    } else {
        toggleActivity(false);
    }

    interval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(interval); interval = null;
            playChime();
            
            if (currentMode === 'work') {
                sessions++;
                document.getElementById('session-count').textContent = sessions;

                saveStudySession(work_length); 
                
                switchMode(sessions % 4 === 0 ? 'long' : 'short');
                toggleActivity(false);
            } else {
                switchMode('work');
                toggleActivity(true);
            }
        startTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(interval); interval = null;
    pauseBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
    toggleActivity(false);
}

function resetTimer() {
    clearInterval(interval); interval = null;
    timeLeft = MODES[currentMode];
    totalTime = MODES[currentMode];
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    updateDisplay();
    toggleActivity(false);
}

function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 830;
        o.type = 'sine';
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        o.start(); o.stop(ctx.currentTime + 0.8);
    } catch(e) {}
}

document.querySelector('#add-group-name')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentForm = e.currentTarget;
    const groupName = currentForm.querySelector('input[name="group_name"]').value.trim();

    const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;

    if (groupName.length > 50 || groupName.length === 0) {
        showError("Please enter a group that is between 1 and 50 characters.");
        return;
    }

    try {
        const response = await fetch('/api/update_group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ group: groupName })
        });

        const data = await response.json();
        
        if (data.success) {
            window.location.reload();
            setTimeout(() => { showSuccess("Group updated successfully!"); }, 1000);
        } else {
            showError(data.error || "Failed to update group name");
        }
    } catch (error) {
        showError("Error updating group name.");
    }
});

updateDisplay();
updateTabs();