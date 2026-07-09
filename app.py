from flask import Flask, render_template, abort

app = Flask(__name__)

# Centralized registry of all games shown on the homepage shelf.
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
        "tagline": "Flap through neon pipes in a cyberpunk cityscape.",
        "icon": "🐦",
        "status": "playable",
    },
    {
        "slug": "snake",
        "name": "EvaSnake",
        "tagline": "Classic 90s brick phone arcade snake.",
        "icon": "🐍",
        "status": "playable",
    },
    {
        "slug": "knife",
        "name": "EvaKnife",
        "tagline": "Throw knives, shatter target logs, timing is everything.",
        "icon": "🗡️",
        "status": "playable",
    }
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
    game = next((g for g in GAMES if g["slug"] == slug), None)
    
    if not game or game["status"] != "playable":
        abort(404)
        
    return render_template(f"{slug}.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    
