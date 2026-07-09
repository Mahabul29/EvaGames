from flask import Flask, render_template, abort

app = Flask(__name__)

# Centralized registry of games shown on the homepage.
# Add a new entry here whenever a new game is added to EvaGames.
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
        "slug": "coming-soon-1",
        "name": "???",
        "tagline": "Another game is being built.",
        "icon": "🕹️",
        "status": "soon",
    },
]

@app.route("/")
def home():
    return render_template("home.html", games=GAMES)

# Dynamic route that handles all playable games automatically based on their slug
@app.route("/games/<slug>")
def play_game(slug):
    # Find the game matching the URL slug
    game = next((g for g in GAMES if g["slug"] == slug), None)
    
    # Security check: if game doesn't exist or isn't playable, throw a 404
    if not game or game["status"] != "playable":
        abort(404)
        
    # Dynamically renders "ludo.html" or "car.html" based on the slug
    return render_template(f"{slug}.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    
