class LudoGame {
    constructor() {
        this.colors = ['red', 'green', 'yellow', 'blue'];
        this.playerNames = ['Red', 'Green', 'Yellow', 'Blue'];
        this.currentPlayer = 0;
        this.diceValue = 0;
        this.isRolling = false;
        this.selectedToken = null;
        this.gameStarted = false;
        this.numPlayers = 4;
        this.isAI = [false, true, true, true];
        this.consecutiveSixes = 0;
        this.winner = null;

        this.tokens = {
            red: [-1, -1, -1, -1],
            green: [-1, -1, -1, -1],
            yellow: [-1, -1, -1, -1],
            blue: [-1, -1, -1, -1]
        };

        this.startPositions = {
            red: 0,
            green: 13,
            yellow: 26,
            blue: 39
        };

        this.safeCells = [0, 8, 13, 21, 26, 34, 39, 47];

        this.init();
    }

    init() {
        this.showStartScreen();
        this.setupEventListeners();
    }

    showStartScreen() {
        const startScreen = document.createElement('div');
        startScreen.className = 'start-screen';
        startScreen.id = 'startScreen';
        startScreen.innerHTML = `
            <h1>🎲 LUDO</h1>
            <p class="subtitle">Select number of players</p>
            <div class="player-select">
                <div class="player-option selected" data-players="2">2 Players</div>
                <div class="player-option" data-players="3">3 Players</div>
                <div class="player-option" data-players="4">4 Players</div>
            </div>
            <button class="start-btn" id="startBtn">Start Game</button>
        `;
        document.body.appendChild(startScreen);

        document.querySelectorAll('.player-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.player-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.numPlayers = parseInt(opt.dataset.players);
            });
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        document.getElementById('startScreen').style.display = 'none';
        this.gameStarted = true;
        this.setupBoard();
        this.updatePlayerPanel();
        this.log('🎮 Game started! Red goes first.');
        this.highlightCurrentPlayer();
    }

    setupBoard() {
        const board = document.getElementById('ludoBoard');
        board.innerHTML = '';

        const redHome = this.createHomeArea('red');
        const greenHome = this.createHomeArea('green');
        const blueHome = this.createHomeArea('blue');
        const yellowHome = this.createHomeArea('yellow');

        const topPath = this.createVerticalPath('green');
        const bottomPath = this.createVerticalPath('blue');
        const leftPath = this.createHorizontalPath('red');
        const rightPath = this.createHorizontalPath('yellow');

        const center = this.createCenter();

        board.appendChild(redHome);
        board.appendChild(topPath);
        board.appendChild(greenHome);
        board.appendChild(leftPath);
        board.appendChild(center);
        board.appendChild(rightPath);
        board.appendChild(blueHome);
        board.appendChild(bottomPath);
        board.appendChild(yellowHome);

        this.placeAllTokens();
    }

    createHomeArea(color) {
        const area = document.createElement('div');
        area.className = `home-area ${color}`;
        area.dataset.color = color;

        for (let i = 0; i < 4; i++) {
            const inner = document.createElement('div');
            inner.className = 'home-inner';
            inner.dataset.color = color;
            inner.dataset.index = i;
            area.appendChild(inner);
        }

        return area;
    }

    createVerticalPath(color) {
        const path = document.createElement('div');
        path.className = 'path-area vertical';

        for (let i = 0; i < 18; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.pathIndex = this.getVerticalPathIndex(color, i);

            const pathIdx = parseInt(cell.dataset.pathIndex);
            if (this.safeCells.includes(pathIdx)) {
                cell.classList.add('star');
            }

            if (color === 'green' && i >= 12) {
                cell.classList.add('home-path-green');
            } else if (color === 'blue' && i >= 12) {
                cell.classList.add('home-path-blue');
            }

            path.appendChild(cell);
        }

        return path;
    }

    createHorizontalPath(color) {
        const path = document.createElement('div');
        path.className = 'path-area horizontal';

        for (let i = 0; i < 18; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.pathIndex = this.getHorizontalPathIndex(color, i);

            const pathIdx = parseInt(cell.dataset.pathIndex);
            if (this.safeCells.includes(pathIdx)) {
                cell.classList.add('star');
            }

            if (color === 'red' && i >= 12) {
                cell.classList.add('home-path-red');
            } else if (color === 'yellow' && i >= 12) {
                cell.classList.add('home-path-yellow');
            }

            path.appendChild(cell);
        }

        return path;
    }

    getVerticalPathIndex(color, position) {
        const basePaths = {
            green: [12, 11, 10, 9, 8, 7, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63],
            blue: [38, 37, 36, 35, 34, 33, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]
        };
        return basePaths[color][position];
    }

    getHorizontalPathIndex(color, position) {
        const basePaths = {
            red: [1, 2, 3, 4, 5, 6, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87],
            yellow: [27, 28, 29, 30, 31, 32, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]
        };
        return basePaths[color][position];
    }

    createCenter() {
        const center = document.createElement('div');
        center.className = 'center-area';
        center.innerHTML = `
            <div class="center-triangle red"></div>
            <div class="center-triangle green"></div>
            <div class="center-triangle yellow"></div>
            <div class="center-triangle blue"></div>
        `;
        return center;
    }

    placeAllTokens() {
        document.querySelectorAll('.token').forEach(t => t.remove());

        this.colors.forEach(color => {
            this.tokens[color].forEach((pos, index) => {
                if (pos === -1) {
                    this.placeTokenInHome(color, index);
                } else {
                    this.placeTokenOnPath(color, index, pos);
                }
            });
        });
    }

    placeTokenInHome(color, index) {
        const homeArea = document.querySelector(`.home-area[data-color="${color}"]`);
        const homeInner = homeArea.querySelector(`.home-inner[data-index="${index}"]`);

        const token = document.createElement('div');
        token.className = `token ${color}`;
        token.dataset.color = color;
        token.dataset.index = index;
        token.textContent = index + 1;
        token.addEventListener('click', () => this.onTokenClick(color, index));

        homeInner.appendChild(token);
    }

    placeTokenOnPath(color, index, position) {
        const cell = this.getCellByPosition(position);
        if (!cell) return;

        const token = document.createElement('div');
        token.className = `token ${color}`;
        token.dataset.color = color;
        token.dataset.index = index;
        token.textContent = index + 1;
        token.addEventListener('click', () => this.onTokenClick(color, index));

        const existingTokens = cell.querySelectorAll('.token');
        const offset = existingTokens.length * 4;
        token.style.transform = `translate(${offset}px, ${offset}px)`;

        cell.appendChild(token);
    }

    getCellByPosition(position) {
        let cell;

        if (position >= 52 && position <= 63) {
            const idx = position - 52 + 6;
            const path = document.querySelectorAll('.path-area.vertical')[0];
            cell = path.children[idx];
        } else if (position >= 64 && position <= 75) {
            const idx = position - 64 + 6;
            const path = document.querySelectorAll('.path-area.vertical')[1];
            cell = path.children[idx];
        } else if (position >= 76 && position <= 87) {
            const idx = position - 76 + 6;
            const path = document.querySelectorAll('.path-area.horizontal')[0];
            cell = path.children[idx];
        } else if (position >= 88 && position <= 99) {
            const idx = position - 88 + 6;
            const path = document.querySelectorAll('.path-area.horizontal')[1];
            cell = path.children[idx];
        } else {
            cell = document.querySelector(`.cell[data-path-index="${position}"]`);
        }

        return cell;
    }

    onTokenClick(color, index) {
        if (!this.gameStarted || this.winner) return;
        if (this.isAI[this.currentPlayer]) return;
        if (this.colors[this.currentPlayer] !== color) return;
        if (this.diceValue === 0) return;

        const pos = this.tokens[color][index];

        if (!this.isValidMove(color, index, this.diceValue)) {
            return;
        }

        this.moveToken(color, index, this.diceValue);
    }

    isValidMove(color, index, steps) {
        const pos = this.tokens[color][index];

        if (pos === -1) {
            return steps === 6;
        }

        const newPos = pos + steps;
        const maxPos = this.getMaxPosition(color);

        if (newPos > maxPos) {
            return false;
        }

        return true;
    }

    getMaxPosition(color) {
        const maxPositions = {
            red: 87,
            green: 63,
            yellow: 99,
            blue: 75
        };
        return maxPositions[color];
    }

    moveToken(color, index, steps) {
        const pos = this.tokens[color][index];
        let newPos;

        if (pos === -1) {
            newPos = this.startPositions[color];
            this.consecutiveSixes = 0;
        } else {
            newPos = pos + steps;
        }

        this.removeToken(color, index);
        this.tokens[color][index] = newPos;
        this.placeTokenOnPath(color, index, newPos);

        if (pos !== -1) {
            this.checkCapture(color, newPos);
        }

        if (this.checkWin(color)) {
            this.handleWin(color);
            return;
        }

        if (steps === 6 && this.consecutiveSixes < 2) {
            this.consecutiveSixes++;
            this.log(`${this.playerNames[this.colors.indexOf(color)]} rolled a 6! Roll again.`);
            this.diceValue = 0;
            this.selectedToken = null;

            if (this.isAI[this.currentPlayer]) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        } else {
            this.consecutiveSixes = 0;
            this.nextTurn();
        }

        this.diceValue = 0;
        this.clearHighlights();
    }

    removeToken(color, index) {
        const token = document.querySelector(`.token[data-color="${color}"][data-index="${index}"]`);
        if (token) token.remove();
    }

    checkCapture(color, position) {
        if (this.safeCells.includes(position)) return;
        if (position >= 52) return;

        this.colors.forEach(otherColor => {
            if (otherColor === color) return;

            this.tokens[otherColor].forEach((pos, idx) => {
                if (pos === position) {
                    this.tokens[otherColor][idx] = -1;
                    this.removeToken(otherColor, idx);
                    this.placeTokenInHome(otherColor, idx);

                    const capturer = this.playerNames[this.colors.indexOf(color)];
                    const captured = this.playerNames[this.colors.indexOf(otherColor)];
                    this.log(`🔥 ${capturer} captured ${captured}'s token!`, 'capture');

                    this.consecutiveSixes = 0;
                }
            });
        });
    }

    checkWin(color) {
        return this.tokens[color].every(pos => pos > this.getMaxPosition(color) - 6);
    }

    handleWin(color) {
        this.winner = color;
        const winnerName = this.playerNames[this.colors.indexOf(color)];
        this.log(`🏆 ${winnerName} wins the game!`, 'win');
        this.showWinModal(winnerName);
        this.createConfetti();
    }

    showWinModal(winnerName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h2>🎉 ${winnerName} Wins!</h2>
                <p>Congratulations! ${winnerName} has successfully guided all tokens home.</p>
                <button class="modal-btn" onclick="location.reload()">Play Again</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    createConfetti() {
        const colors = ['#ff4757', '#2ed573', '#ffa502', '#1e90ff', '#feca57', '#ff6b81'];
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                document.body.appendChild(confetti);

                setTimeout(() => confetti.remove(), 5000);
            }, i * 30);
        }
    }

    rollDice() {
        if (this.isRolling || this.winner) return;
        if (this.isAI[this.currentPlayer]) return;

        this.isRolling = true;
        const dice = document.getElementById('dice');
        const rollBtn = document.getElementById('rollBtn');

        dice.classList.add('rolling');
        rollBtn.disabled = true;

        let rolls = 0;
        const rollInterval = setInterval(() => {
            dice.textContent = Math.floor(Math.random() * 6) + 1;
            rolls++;

            if (rolls >= 10) {
                clearInterval(rollInterval);
                this.diceValue = Math.floor(Math.random() * 6) + 1;
                dice.textContent = this.diceValue;
                dice.classList.remove('rolling');

                const playerName = this.playerNames[this.currentPlayer];
                this.log(`${playerName} rolled a ${this.diceValue}`);

                this.handleDiceRoll();
            }
        }, 100);
    }

    handleDiceRoll() {
        const color = this.colors[this.currentPlayer];
        const hasValidMove = this.tokens[color].some((pos, index) =>
            this.isValidMove(color, index, this.diceValue)
        );

        if (!hasValidMove) {
            this.log(`${this.playerNames[this.currentPlayer]} has no valid moves.`);
            setTimeout(() => {
                this.consecutiveSixes = 0;
                this.nextTurn();
            }, 1500);
            return;
        }

        this.highlightValidMoves(color);

        if (this.isAI[this.currentPlayer]) {
            setTimeout(() => this.aiMakeMove(), 1000);
        } else {
            document.getElementById('rollBtn').disabled = false;
        }

        this.isRolling = false;
    }

    highlightValidMoves(color) {
        this.clearHighlights();

        this.tokens[color].forEach((pos, index) => {
            if (this.isValidMove(color, index, this.diceValue)) {
                if (pos === -1) {
                    const homeInner = document.querySelector(
                        `.home-area[data-color="${color}"] .home-inner[data-index="${index}"]`
                    );
                    homeInner.style.boxShadow = '0 0 0 3px #feca57';
                    homeInner.style.cursor = 'pointer';
                } else {
                    const cell = this.getCellByPosition(pos);
                    if (cell) {
                        cell.classList.add('valid-move');
                    }
                }

                const token = document.querySelector(
                    `.token[data-color="${color}"][data-index="${index}"]`
                );
                if (token) token.classList.add('selected');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });
        document.querySelectorAll('.token.selected').forEach(token => {
            token.classList.remove('selected');
        });
        document.querySelectorAll('.home-inner').forEach(inner => {
            inner.style.boxShadow = '';
            inner.style.cursor = '';
        });
    }

    aiTurn() {
        if (!this.gameStarted || this.winner) return;

        this.isRolling = true;
        const dice = document.getElementById('dice');
        const rollBtn = document.getElementById('rollBtn');

        dice.classList.add('rolling');
        rollBtn.disabled = true;

        setTimeout(() => {
            this.diceValue = Math.floor(Math.random() * 6) + 1;
            dice.textContent = this.diceValue;
            dice.classList.remove('rolling');

            const playerName = this.playerNames[this.currentPlayer];
            this.log(`🤖 ${playerName} (AI) rolled a ${this.diceValue}`);

            this.handleDiceRoll();
        }, 800);
    }

    aiMakeMove() {
        const color = this.colors[this.currentPlayer];
        const validMoves = [];

        this.tokens[color].forEach((pos, index) => {
            if (this.isValidMove(color, index, this.diceValue)) {
                validMoves.push({ index, pos });
            }
        });

        if (validMoves.length === 0) {
            this.consecutiveSixes = 0;
            this.nextTurn();
            return;
        }

        let bestMove = validMoves[0];
        let bestScore = -1;

        validMoves.forEach(move => {
            let score = 0;
            const newPos = move.pos === -1 ? this.startPositions[color] : move.pos + this.diceValue;

            if (move.pos === -1) score += 50;

            if (newPos < 52 && !this.safeCells.includes(newPos)) {
                this.colors.forEach(otherColor => {
                    if (otherColor === color) return;
                    this.tokens[otherColor].forEach(pos => {
                        if (pos === newPos) score += 100;
                    });
                });
            }

            score += newPos * 0.5;

            if (this.safeCells.includes(newPos)) score += 30;

            if (move.pos >= 0 && move.pos < 52 && !this.safeCells.includes(move.pos)) {
                this.colors.forEach(otherColor => {
                    if (otherColor === color) return;
                    this.tokens[otherColor].forEach(otherPos => {
                        if (otherPos >= 0 && otherPos < 52 && Math.abs(otherPos - move.pos) <= 6) {
                            score += 40;
                        }
                    });
                });
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });

        this.moveToken(color, bestMove.index, this.diceValue);
    }

    nextTurn() {
        this.diceValue = 0;
        this.selectedToken = null;
        this.clearHighlights();

        let nextPlayer = (this.currentPlayer + 1) % 4;
        let attempts = 0;

        while (attempts < 4) {
            if (nextPlayer < this.numPlayers) {
                this.currentPlayer = nextPlayer;
                break;
            }
            nextPlayer = (nextPlayer + 1) % 4;
            attempts++;
        }

        this.updatePlayerPanel();
        this.highlightCurrentPlayer();

        const playerName = this.playerNames[this.currentPlayer];
        this.log(`➡️ ${playerName}'s turn`);

        document.getElementById('rollBtn').disabled = false;

        if (this.isAI[this.currentPlayer]) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    highlightCurrentPlayer() {
        document.querySelectorAll('.player-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.currentPlayer);
        });
    }

    updatePlayerPanel() {
        const panel = document.getElementById('playersList');
        panel.innerHTML = '';

        for (let i = 0; i < this.numPlayers; i++) {
            const color = this.colors[i];
            const activeTokens = this.tokens[color].filter(p => p !== -1 && p <= this.getMaxPosition(color)).length;
            const homeTokens = this.tokens[color].filter(p => p === -1).length;
            const finishedTokens = this.tokens[color].filter(p => p > this.getMaxPosition(color) - 6).length;

            const item = document.createElement('div');
            item.className = `player-item ${i === this.currentPlayer ? 'active' : ''}`;
            item.innerHTML = `
                <div class="player-color ${color}"></div>
                <div class="player-info">
                    <div class="player-name">${this.playerNames[i]} ${this.isAI[i] ? '🤖' : '👤'}</div>
                    <div class="player-status">Home: ${homeTokens} | Board: ${activeTokens} | Done: ${finishedTokens}</div>
                </div>
            `;
            panel.appendChild(item);
        }
    }

    log(message, type = '') {
        const log = document.getElementById('gameLog');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        log.insertBefore(entry, log.firstChild);

        while (log.children.length > 20) {
            log.removeChild(log.lastChild);
        }
    }

    setupEventListeners() {
        document.getElementById('rollBtn').addEventListener('click', () => this.rollDice());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new LudoGame();
});
