from flask import Flask, render_template

app = Flask(__name__)

# Registry of games shown on the homepage.
# Add a new entry here whenever a new game is added to EvaGames.
GAMES = [
    {
        "slug": "ludo",
        "name": "EvaLudo",
        "tagline": "Roll, race, capture, repeat.",
        "icon": "🎲",
        "status": "playable",
        "route": "/games/ludo",
    },
    {
        "slug": "coming-soon-1",
        "name": "???",
        "tagline": "Another game is being built.",
        "icon": "🕹️",
        "status": "soon",
        "route": None,
    },
]


@app.route("/")
def home():
    return render_template("home.html", games=GAMES)


@app.route("/games/ludo")
def ludo():
    return render_template("ludo.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    
