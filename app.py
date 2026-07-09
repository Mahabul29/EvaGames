from flask import Flask, render_template, abort

app = Flask(__name__)

# Centralized registry of games shown on the homepage.
# Simply add or modify entries here to update the cartridge shelf.
GAMES = [
    {
        "slug": "ludo",
        "name": "EvaLudo",
        "tagline": "Roll, race, capture, repeat.",
        "icon": "🎲",
        "status": "playable",
    },
    {
        "slug": "car",
        "name": "EvaDrive",
        "tagline": "Endless drive through mountains and bridges.",
        "icon": "🚗",
        "status": "playable",
    },
    {
        "slug": "stack",
        "name": "EvaStack",
        "tagline": "Drop blocks, build high, don't let it tumble.",
        "icon": "🏗️",
        "status": "playable",
    },
    {
        "slug": "bird",
        "name": "EvaBird",
        "tagline": "Flap through neon pipes in a high-fidelity cyberpunk cityscape.",
        "icon": "🐦",
        "status": "playable",
    },
    {
        "slug": "coming-soon-1",
        "name": "???",
        "tagline": "Another game is being built.",
        "icon": "🕹️",
        "status": "soon",
    },
]

@app.route("/")
def home():
    """Renders the main arcade shelf landing page."""
    return render_template("home.html", games=GAMES)

@app.route("/games/<slug>")
def play_game(slug):
    """
    Dynamic routing handler. Maps incoming game requests safely
    to their respective templates using the game's unique slug.
    """
    # Look for a match in the GAMES registry
    game = next((g for g in GAMES if g["slug"] == slug), None)
    
    # Validation guard: Ensure game exists and is fully playable
    if not game or game["status"] != "playable":
        abort(404)
        
    # Dynamically streams ludo.html, car.html, stack.html, or bird.html
    return render_template(f"{slug}.html")

if __name__ == "__main__":
    # Runs the platform locally with debug logs active
    app.run(host="0.0.0.0", port=5000, debug=True)
    
