document.addEventListener('DOMContentLoaded', () => {
    const leaderboardBody = document.getElementById('leaderboard-body');
    const groupName = document.getElementById('group-metadata')?.dataset.group;

    if (!leaderboardBody || !groupName) return;

    // Helper function to convert raw minutes into hours/minutes string
    function formatTime(totalMinutes) {
        if (!totalMinutes || totalMinutes <= 0) return "0 mins";
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours} hr ${minutes} mins`;
        }
        return `${minutes} mins`;
    }

    // Function to fetch the JSON from Flask and fill the table
    async function fetchLiveLeaderboard() {
        try {
            const response = await fetch(`/api/leaderboard_data?group=${encodeURIComponent(groupName)}`);
            const data = await response.json();

            if (!data.success) {
                console.error("Server error loading leaderboard:", data.error);
                return;
            }

            // Clear loading placeholder text or old user rankings
            leaderboardBody.innerHTML = '';

            if (data.leaderboard.length === 0) {
                leaderboardBody.innerHTML = `<tr><td colspan="3">Nobody has studied in this group today yet!</td></tr>`;
                return;
            }

            // Loop through ranked users
            data.leaderboard.forEach((user, index) => {
                const row = document.createElement('tr');
                row.className = "rank-row";

                const statusDot = user.is_studying ? `<div class='dot' style="--i:0"></div>` : '';
                
                if (index + 1 === 1) {
                    row.innerHTML = `
                        <td style="background-color: #ffd700"><strong>#${index + 1}🥇</strong></td>
                        <td style="background-color: #ffd700">${user.name}</td>
                        <td style="background-color: #ffd700">${formatTime(user.total_minutes)}${statusDot}</td>
                    `;
                } else if (index + 1 === 2) {
                    row.innerHTML = `
                    <td style="background-color: #c0c0c0"><strong>#${index + 1}🥈</strong></td>
                    <td style="background-color: #c0c0c0">${user.name}</td>
                    <td style="background-color: #c0c0c0">${formatTime(user.total_minutes)}${statusDot}</td>
                `;
                } else if (index + 1 === data.leaderboard.length) {
                    row.innerHTML = `
                    <td style="background-color: #695532"><strong>#${index + 1}: 1st loser</strong></td>
                    <td style="background-color: #695532">${user.name}</td>
                    <td style="background-color: #695532">${formatTime(user.total_minutes)}${statusDot}</td>
                `;                    
                } else {
                row.innerHTML = `
                    <td><strong>#${index + 1}</strong></td>
                    <td>${user.name}${statusDot}</td>
                    <td>${formatTime(user.total_minutes)}</td>
                `;
                }
                leaderboardBody.appendChild(row);
            });

        } catch (error) {
            console.error("Network error updating live leaderboard:", error);
            showError("There was an error updating the leaderboard. Try refreshing.")
        }
    }

    fetchLiveLeaderboard();
    setInterval(fetchLiveLeaderboard, 10000); 
});