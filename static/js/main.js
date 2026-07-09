document.addEventListener('DOMContentLoaded', () => {
    console.log('🕹️ EvaGames Arcade Shell initialized.');
    displayHighScoresOnShelf();
});

function displayHighScoresOnShelf() {
    const scoreData = JSON.parse(localStorage.getItem('eva_arcade_scores')) || {};
    
    // Find all links that go to playable game paths
    document.querySelectorAll('a.cartridge').forEach(cartridge => {
        const href = cartridge.getAttribute('href');
        if (!href) return;
        
        // Extract game slug from the URL route (e.g., /games/bird -> bird)
        const slug = href.split('/').pop(); 
        const highScore = scoreData[slug] || 0;
        
        if (highScore > 0) {
            const tag = cartridge.querySelector('.cartridge-tag');
            if (tag) {
                tag.innerHTML = `🏆 Best: ${highScore}`;
                tag.style.color = 'var(--gold)';
            }
        }
    });
}
