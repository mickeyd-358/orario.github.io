document.addEventListener('DOMContentLoaded', () => {
    const streakCounter = document.getElementById('streak-counter');
    const streakSubtitle = document.getElementById('streak-subtitle');

    const outerFlame = document.querySelector('.flame.outer');
    const innerFlame = document.querySelector('.flame.inner');
    const coreFlame = document.querySelector('.flame.core');
    const fireContainer = document.querySelector('.fire-container');

    async function displayStreak() {
        try {
            const response = await fetch('/api/calculate_streak');

            if (!response.ok) {
                throw new Error('Failed to retrieve streak.');
            }

            const data = await response.json();

            // Update streak number
            streakCounter.textContent = data.streak;

            if (data.streak === 0) {
                streakSubtitle.textContent = 'Study today to light the flame!';

                outerFlame.classList.add('dead');
                innerFlame.classList.add('dead');
                coreFlame.classList.add('dead');
                fireContainer.classList.add('dead');
            } else {
                // Motivational messages
                if (data.streak < 7) {
                    streakSubtitle.textContent = 'Keep the momentum going!';
                } else if (data.streak < 30) {
                    streakSubtitle.textContent = 'Fantastic consistency!';
                } else if (data.streak < 100) {
                    streakSubtitle.textContent = "You're on fire!";
                } else {
                    streakSubtitle.textContent = 'Legendary dedication!';
                }

                outerFlame.classList.remove('dead');
                innerFlame.classList.remove('dead');
                coreFlame.classList.remove('dead');
                fireContainer.classList.remove('dead');
            }

        } catch (error) {
            console.error('Error loading streak:', error);

            streakCounter.textContent = '--';
            streakSubtitle.textContent = 'Unable to load streak.';
        }
    }

    displayStreak();

    // Refresh every 10 seconds
    setInterval(displayStreak, 10000);
});