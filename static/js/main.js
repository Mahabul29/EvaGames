/**
 * EvaGames Arcade Shell
 * Intercepts hard links to prevent browser white flashes (Anti-Blink Interface)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🕹️ Arcade Shell Interface Operational.');
    displayHighScoresOnShelf();
    setupSmoothTransitions();
});

function setupSmoothTransitions() {
    document.querySelectorAll('a.cartridge').forEach(link => {
        link.addEventListener('click', async (e) => {
            const targetUrl = link.getAttribute('href');
            if (!targetUrl || targetUrl.startsWith('#')) return;

            e.preventDefault(); // Stop standard blinking layout rebuild
            document.body.style.opacity = '0'; // Clean drop fade out
            
            setTimeout(async () => {
                try {
                    const response = await fetch(targetUrl);
                    const htmlText = await response.text();
                    
                    const parser = new DOMParser();
                    const newDoc = parser.parseFromString(htmlText, 'text/html');
                    
                    // Replace runtime document assets smoothly
                    document.body.innerHTML = newDoc.body.innerHTML;
                    document.title = newDoc.title;
                    window.history.pushState({}, '', targetUrl);
                    
                    // Compile scripts found within incoming templates
                    const scripts = document.body.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                    
                    document.body.style.opacity = '1'; // Bring opacity back online safely
                    
                } catch (error) {
                    console.warn("AJAX routing exception, running fallback:", error);
                    window.location.href = targetUrl;
                }
            }, 150);
        });
    });
}

function displayHighScoresOnShelf() {
    let scoreData = {};
    try {
        scoreData = JSON.parse(localStorage.getItem('eva_arcade_scores')) || {};
    } catch (e) {
        scoreData = {};
    }
    
    document.querySelectorAll('a.cartridge').forEach(cartridge => {
        const href = cartridge.getAttribute('href');
        if (!href) return;
        
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
