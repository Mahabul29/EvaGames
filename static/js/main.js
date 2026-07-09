/**
 * EvaGames Arcade Platform Management
 * Handles anti-flash page transitions and high score registry
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🕹️ EvaGames Arcade Shell initialized.');
    displayHighScoresOnShelf();
    setupSmoothTransitions();
});

/**
 * Prevents the white/dark screen flash by fetching pages via AJAX
 */
function setupSmoothTransitions() {
    document.querySelectorAll('a.cartridge').forEach(link => {
        link.addEventListener('click', async (e) => {
            const targetUrl = link.getAttribute('href');
            if (!targetUrl || targetUrl.startsWith('#')) return;

            // Stop the standard browser page-reload
            e.preventDefault(); 
            
            // Fade out the body cleanly
            document.body.style.opacity = '0';
            
            // Wait for the quick fade-out animation to finish
            setTimeout(async () => {
                try {
                    const response = await fetch(targetUrl);
                    const htmlText = await response.text();
                    
                    // Parse incoming game document
                    const parser = new DOMParser();
                    const newDoc = parser.parseFromString(htmlText, 'text/html');
                    
                    // Update document content without refreshing styles
                    document.body.innerHTML = newDoc.body.innerHTML;
                    document.title = newDoc.title;
                    
                    // Push the new game route into browser history bar safely
                    window.history.pushState({}, '', targetUrl);
                    
                    // Re-execute scripts embedded inside the loaded game template
                    const scripts = document.body.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });
                        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                    
                    // Fade the new game interface back in smoothly
                    document.body.style.opacity = '1';
                    
                } catch (error) {
                    console.warn("Transition failed, falling back to basic navigation:", error);
                    window.location.href = targetUrl;
                }
            }, 150); // Matches the 0.15s transition time in your style.css
        });
    });
}

/**
 * Reads local storage records and hooks personal bests onto cartridge nodes
 */
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
