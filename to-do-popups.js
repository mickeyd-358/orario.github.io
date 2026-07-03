// --- POPUP DISPLAY LOGIC ---
function addTaskPopup() {
    const errorBox = document.getElementById('error-message');
    if (errorBox) errorBox.style.display = 'none';
    document.getElementById("popupOverlay").style.display = "block";
}

function closeAddPopup() {
    document.getElementById("popupOverlay").style.display = "none";
}

function openEditPopup(taskId, title, description, dueDate, reminder, isComplete) {
    // Populate the edit form fields
    document.getElementById("edit-task-id").value = taskId;
    document.getElementById("edit-title").value = title;
    document.getElementById("edit-description").value = description;
    document.getElementById("edit-due-date").value = dueDate;
    document.getElementById("edit-reminder").checked = reminder;
    document.getElementById("edit-is-complete").checked = isComplete;
    
    // Clear old errors and show
    const errorBox = document.getElementById('error-message');
    if (errorBox) errorBox.style.display = 'none';
    document.getElementById("editPopupOverlay").style.display = "block";
}

function closeEditPopup() {
    document.getElementById("editPopupOverlay").style.display = "none";
}

// Close popups when clicking on the dark overlay
window.onclick = function(event) {
    const addOverlay = document.getElementById("popupOverlay");
    const editOverlay = document.getElementById("editPopupOverlay");
    if (event.target === addOverlay) closeAddPopup();
    if (event.target === editOverlay) closeEditPopup();
};


// --- FORM SUBMISSION LOGIC (Using api.js helpers) ---

// Handle Adding a Task
document.querySelector('#add-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Use the helper from api.js
    const result = await postForm('/api/add_task', e.target);

    if (result.success) {
        showSuccess("Task created!");
        setTimeout(() => {
            closeAddPopup();
            window.location.reload();
        }, 800);
    } else {
        showError(result.error || "Failed to create task");
    }
});

// Handle Editing a Task
document.querySelector('#edit-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById("edit-task-id").value;
    const url = `/api/edit_task/${taskId}`;

    const result = await postForm(url, e.target);

    if (result.success) {
        showSuccess("Task updated!");
        setTimeout(() => {
            closeEditPopup();
            window.location.reload();
        }, 800);
    } else {
        showError(result.error || "Update failed");
    }
});

async function toggleComplete(taskId, currentStatus) {
    const csrfToken = document.querySelector('input[name="csrf_token"]').getAttribute('value');

    const formData = new FormData();
    formData.append('is_complete', (!currentStatus).toString());
    formData.append('csrf_token', csrfToken);

    const response = await fetch(`/api/edit_task/${taskId}`, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: formData
    });

    const data = await response.json();
    if (data.success) {
        location.reload();
    } else {
        showError(data.error);
    }
}

async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    const csrfToken = document.querySelector('input[name="csrf_token"]').getAttribute('value');

    const response = await fetch(`/api/delete_task/${taskId}`, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken }
    });

    const data = await response.json();
    if (data.success) {
        location.reload();
    } else {
        showError(data.error);
    }
}


function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { 
            body: body,
            icon: '../static/img/o_logo.png'
        });
    }
}

function checkReminders() {
    fetch('/api/get_tasks')
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            const now = new Date().toISOString().split('T')[0];
            data.tasks.forEach(task => {
                if (task.due_date === now && task.reminder && !task.is_complete) {
                    showNotification("Task Reminder!", `${task.title} is due today!`);
                }
            });
        });
}

// Initialisations
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
    setInterval(checkReminders, 60000);
});