(() => {
  "use strict";

  /* ================= BOARD GEOMETRY ================= */

  const PATH = [
    [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],
    [14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],
    [8,1],[8,0],[7,0],[6,0]
  ];

  const HOME_COLS = {
    red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  };

  const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
  const SAFE_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const CENTER = [7, 7];

  const YARD_RANGE = {
    red:    { r0: 0, r1: 5, c0: 0, c1: 5 },
    green:  { r0: 0, r1: 5, c0: 9, c1: 14 },
    yellow: { r0: 9, r1: 14, c0: 9, c1: 14 },
    blue:   { r0: 9, r1: 14, c0: 0, c1: 5 },
  };

  const YARD_SLOTS = {
    red:    [[1,1],[1,4],[4,1],[4,4]],
    green:  [[1,10],[1,13],[4,10],[4,13]],
    yellow: [[10,10],[10,13],[13,10],[13,13]],
    blue:   [[10,1],[10,4],[13,1],[13,4]],
  };

  const ALL_COLORS = ["red", "green", "yellow", "blue"];
  const NAMES = { red: "Red", green: "Green", yellow: "Yellow", blue: "Blue" };

  const key = (r, c) => r + "-" + c;

  const pathKeySet = new Set(PATH.map(([r, c]) => key(r, c)));
  const homeKeySet = {};
  ALL_COLORS.forEach(col => {
    homeKeySet[col] = new Set(HOME_COLS[col].map(([r, c]) => key(r, c)));
  });

  /* ================= SOUND (synthesized, no audio files needed) ================= */

  let audioCtx = null;
  let masterGain = null;
  let soundOn = true;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.9;
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // Smooth-envelope tone with a gentle lowpass to take the harsh edge off
  // synthesized waveforms (avoids the thin/buzzy sound of raw square/saw).
  function playTone(freq, duration, type, startGain, delay, glideTo) {
    if (!soundOn) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.max(freq * 3.2, 900), t0);
    filter.Q.value = 0.5;
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(startGain || 0.15, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain || ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  // Short filtered noise burst — used for the dice-tick and capture thump so
  // they sound like a physical tap/knock instead of a synth beep.
  function playNoise(duration, startGain, delay, filterFreq, filterType) {
    if (!soundOn) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType || "bandpass";
    filter.frequency.value = filterFreq || 1800;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(startGain || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain || ctx.destination);
    src.start(t0);
  }

  const sfx = {
    rollTick() { playNoise(0.05, 0.07, 0, 1100 + Math.random() * 300, "lowpass"); },
    move() { playTone(520, 0.1, "triangle", 0.12, 0, 440); },
    capture() {
      playNoise(0.12, 0.16, 0, 600, "lowpass");
      playTone(150, 0.2, "sawtooth", 0.1, 0.03, 65);
    },
    finish() {
      playTone(660, 0.12, "triangle", 0.13);
      playTone(880, 0.18, "triangle", 0.09, 0.09);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.38, "triangle", 0.13, i * 0.12));
    },
    click() { playTone(440, 0.045, "square", 0.06); },
  };

  function setSoundOn(on) {
    soundOn = on;
    const btn = document.getElementById("mute-btn");
    if (btn) btn.textContent = soundOn ? "🔊" : "🔇";
  }

  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      ensureAudioCtx();
      setSoundOn(!soundOn);
    });
  }

  const backLinkBtn = document.getElementById("back-link");
  if (backLinkBtn) {
    backLinkBtn.addEventListener("click", () => {
      window.location.href = "/games";
    });
  }

  /* ================= STATE ================= */

  let state = null; // set on start

  function buildInitialState(colors, kinds, names) {
    const players = colors.map((color, i) => ({
      color,
      kind: kinds[i], // 'human' | 'ai'
      name: names[i],
      tokens: [0, 1, 2, 3].map(slot => ({ step: -1, slotIndex: slot })),
      finishedCount: 0,
    }));
    return {
      players,
      turn: 0,
      dice: null,
      consecutiveSixes: 0,
      canRoll: true,
      movableTokens: [], // indices into current player's tokens array
      gameOver: false,
    };
  }

  /* ================= DOM: BOARD ================= */

  const boardEl = document.getElementById("board");

  function cellClassFor(r, c) {
    const k = key(r, c);
    if (r === CENTER[0] && c === CENTER[1]) return "center";
    if (pathKeySet.has(k)) return "path" + (SAFE_INDEXES.has(PATH.findIndex(p => p[0] === r && p[1] === c)) ? " safe" : "");
    for (const col of ALL_COLORS) {
      if (homeKeySet[col].has(k)) return "home-" + col;
    }
    for (const col of ALL_COLORS) {
      const y = YARD_RANGE[col];
      if (r >= y.r0 && r <= y.r1 && c >= y.c0 && c <= y.c1) return "yard-" + col;
    }
    return "filler";
  }

  function buildBoardDOM() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = document.createElement("div");
        cell.className = "cell " + cellClassFor(r, c);
        cell.style.gridRowStart = r + 1;
        cell.style.gridColumnStart = c + 1;
        boardEl.appendChild(cell);
      }
    }
  }

  /* ================= TOKEN POSITION / RENDER ================= */

  function coordsForToken(color, token) {
    if (token.step === -1) return YARD_SLOTS[color][token.slotIndex];
    if (token.step === 56) return CENTER;
    if (token.step <= 50) return PATH[(START_INDEX[color] + token.step) % 52];
    return HOME_COLS[color][token.step - 51];
  }

  function renderTokens() {
    boardEl.querySelectorAll(".token").forEach(t => t.remove());

    const occupancy = {};
    state.players.forEach((p, pi) => {
      p.tokens.forEach((t, ti) => {
        if (t.step === 56) return; // finished tokens rest in center, drawn separately below
        const [r, c] = coordsForToken(p.color, t);
        const k = key(r, c);
        occupancy[k] = occupancy[k] || [];
        occupancy[k].push({ pi, ti, r, c });
      });
    });

    const current = state.players[state.turn];
    const movableSet = new Set(state.movableTokens);

    Object.values(occupancy).forEach(list => {
      list.forEach((item, idx) => {
        const p = state.players[item.pi];
        const t = p.tokens[item.ti];
        const el = document.createElement("div");
        el.className = "token tok-" + p.color;
        el.style.gridRowStart = item.r + 1;
        el.style.gridColumnStart = item.c + 1;

        if (list.length > 1) {
          const spread = 22;
          const angle = (idx / list.length) * Math.PI * 2;
          const dx = Math.cos(angle) * spread * 0.01;
          const dy = Math.sin(angle) * spread * 0.01;
          el.style.transform = `translate(${dx * 100}%, ${dy * 100}%) scale(0.82)`;
        }

        if (p === current && current.kind === "human" && movableSet.has(item.ti)) {
          el.classList.add("movable");
          el.addEventListener("click", () => onTokenChosen(item.ti));
        }

        boardEl.appendChild(el);
      });
    });

    // finished tokens, stacked small in the center
    let finIdx = 0;
    state.players.forEach(p => {
      p.tokens.forEach(t => {
        if (t.step !== 56) return;
        const el = document.createElement("div");
        el.className = "token tok-" + p.color;
        el.style.gridRowStart = CENTER[0] + 1;
        el.style.gridColumnStart = CENTER[1] + 1;
        el.style.transform = `scale(0.55) translate(${(finIdx % 4) * 10 - 15}%, ${Math.floor(finIdx / 4) * 10 - 15}%)`;
        boardEl.appendChild(el);
        finIdx++;
      });
    });
  }

  /* ================= PER-PLAYER DICE ROWS ================= */

  let diceRowRefs = []; // { rowEl, diceEl, hintEl }, indexed like state.players

  const PIP_LAYOUT = {
    1: ["p22"],
    2: ["p11", "p33"],
    3: ["p11", "p22", "p33"],
    4: ["p11", "p13", "p31", "p33"],
    5: ["p11", "p13", "p22", "p31", "p33"],
    6: ["p11", "p13", "p21", "p23", "p31", "p33"],
  };

  function setDiceFace(diceEl, value) {
    if (!value) { diceEl.textContent = "?"; return; }
    diceEl.innerHTML = `<div class="dice-face">${PIP_LAYOUT[value].map(p => `<span class="pip ${p}"></span>`).join("")}</div>`;
  }

  // Each color has a fixed corner slot in the markup (matches its yard
  // quadrant), so panels line up with that player's home area regardless
  // of turn order.
  function buildPlayerDiceRows() {
    ["red", "green", "blue", "yellow"].forEach(color => {
      const el = document.getElementById("corner-" + color);
      if (el) { el.innerHTML = ""; el.classList.add("hidden"); }
    });

    diceRowRefs = state.players.map((p, i) => {
      const panel = document.getElementById("corner-" + p.color);
      panel.classList.remove("hidden");
      panel.innerHTML = "";

      const pin = document.createElement("div");
      pin.className = "corner-chip pin-chip pin-" + p.color;
      pin.innerHTML = `<span class="corner-pin-dot"></span>`;

      const diceBtn = document.createElement("button");
      diceBtn.className = "corner-chip dice-chip";
      diceBtn.setAttribute("aria-label", "Roll dice for " + p.name);
      diceBtn.textContent = "?";
      diceBtn.addEventListener("click", () => handleRoll(i));

      const chips = document.createElement("div");
      chips.className = "corner-chips";
      chips.addEventListener("click", () => handleRoll(i));
      // Mirror the chip order for the right-hand corners so the dice sits
      // toward the board edge on both sides, like a physical Ludo set.
      if (p.color === "green" || p.color === "yellow") {
        chips.appendChild(diceBtn);
        chips.appendChild(pin);
      } else {
        chips.appendChild(pin);
        chips.appendChild(diceBtn);
      }

      const name = document.createElement("div");
      name.className = "corner-name";
      name.textContent = p.name;

      const hint = document.createElement("div");
      hint.className = "corner-hint";

      panel.appendChild(chips);
      panel.appendChild(name);
      panel.appendChild(hint);

      return { rowEl: panel, diceEl: diceBtn, hintEl: hint };
    });
  }

  function updateDiceUI() {
    state.players.forEach((p, i) => {
      const ref = diceRowRefs[i];
      if (!ref) return;
      const isCurrent = i === state.turn;
      const isHumanTurn = isCurrent && p.kind === "human" && !state.gameOver;

      ref.rowEl.classList.toggle("current", isCurrent && !state.gameOver);
      ref.rowEl.classList.toggle("done", p.finishedCount === 4);

      ref.diceEl.disabled = !(isHumanTurn && state.canRoll);
      setDiceFace(ref.diceEl, isCurrent ? state.dice : null);

      if (state.gameOver) {
        ref.hintEl.textContent = "";
      } else if (!isCurrent) {
        ref.hintEl.textContent = "";
      } else if (p.kind !== "human") {
        ref.hintEl.textContent = "thinking…";
      } else if (state.canRoll) {
        ref.hintEl.textContent = "your turn — roll";
      } else if (state.movableTokens.length) {
        ref.hintEl.textContent = "tap a token";
      } else {
        ref.hintEl.textContent = "passing…";
      }
    });
  }

  function rollDice(diceEl, callback) {
    diceEl.classList.add("rolling");
    const totalTicks = 6;
    let tick = 0;
    function nextTick() {
      setDiceFace(diceEl, 1 + Math.floor(Math.random() * 6));
      sfx.rollTick();
      tick++;
      if (tick <= totalTicks) {
        // Slow down as it "settles" — later ticks are spaced further apart.
        const delay = 55 + tick * 18;
        setTimeout(nextTick, delay);
      } else {
        diceEl.classList.remove("rolling");
        const value = 1 + Math.floor(Math.random() * 6);
        setDiceFace(diceEl, value);
        callback(value);
      }
    }
    nextTick();
  }

  /* ================= GAME LOGIC ================= */

  function legalMoves(player, diceValue) {
    const moves = [];
    player.tokens.forEach((t, i) => {
      if (t.step === 56) return;
      if (t.step === -1) {
        if (diceValue === 6) moves.push(i);
        return;
      }
      if (t.step + diceValue <= 56) moves.push(i);
    });
    return moves;
  }

  function applyMove(playerIndex, tokenIndex, diceValue) {
    const player = state.players[playerIndex];
    const token = player.tokens[tokenIndex];
    const wasYard = token.step === -1;
    token.step = wasYard ? 0 : token.step + diceValue;

    if (token.step <= 50) {
      const commonIdx = (START_INDEX[player.color] + token.step) % 52;
      if (!SAFE_INDEXES.has(commonIdx)) {
        state.players.forEach((op, opi) => {
          if (opi === playerIndex) return;
          op.tokens.forEach(ot => {
            if (ot.step >= 0 && ot.step <= 50) {
              const otherIdx = (START_INDEX[op.color] + ot.step) % 52;
              if (otherIdx === commonIdx) {
                ot.step = -1;
                sfx.capture();
              }
            }
          });
        });
      }
    }

    if (token.step === 56) {
      player.finishedCount++;
      sfx.finish();
    } else {
      sfx.move();
    }
  }

  function checkWin() {
    const winner = state.players.find(p => p.finishedCount === 4);
    if (winner) {
      state.gameOver = true;
      showWin(winner);
      return true;
    }
    return false;
  }

  function nextTurn(extra) {
    if (!extra) {
      state.turn = (state.turn + 1) % state.players.length;
      state.consecutiveSixes = 0;
    }
    state.dice = null;
    state.movableTokens = [];
    state.canRoll = true;
    renderTokens();
    updateDiceUI();
    maybeRunAiTurn();
  }

  /* ================= DICE / TURN FLOW ================= */

  function handleRoll(playerIndex) {
    if (state.gameOver || !state.canRoll) return;
    if (playerIndex !== state.turn) return; // not this player's turn
    const cur = state.players[state.turn];
    if (cur.kind !== "human") return;
    state.canRoll = false;
    updateDiceUI();

    const diceEl = diceRowRefs[playerIndex].diceEl;
    rollDice(diceEl, value => {
      afterRoll(value);
    });
  }

  function afterRoll(value) {
    const cur = state.players[state.turn];
    state.dice = value;

    if (value === 6) {
      state.consecutiveSixes++;
      if (state.consecutiveSixes === 3) {
        setTimeout(() => nextTurn(false), 700);
        return;
      }
    }

    const moves = legalMoves(cur, value);
    state.movableTokens = moves;

    if (moves.length === 0) {
      updateDiceUI();
      setTimeout(() => nextTurn(value === 6), 700);
      return;
    }

    if (cur.kind === "ai") {
      const choice = chooseAiMove(cur, moves, value);
      setTimeout(() => performChosenMove(choice, value), 500);
      return;
    }

    if (moves.length === 1) {
      updateDiceUI();
      setTimeout(() => performChosenMove(moves[0], value), 350);
      return;
    }

    updateDiceUI();
    renderTokens();
  }

  function onTokenChosen(tokenIndex) {
    if (!state.movableTokens.includes(tokenIndex)) return;
    performChosenMove(tokenIndex, state.dice);
  }

  function performChosenMove(tokenIndex, diceValue) {
    const playerIndex = state.turn;
    applyMove(playerIndex, tokenIndex, diceValue);
    state.movableTokens = [];
    renderTokens();
    updateDiceUI();

    if (checkWin()) return;

    const again = diceValue === 6;
    setTimeout(() => nextTurn(again), 400);
  }

  /* ================= AI ================= */

  function chooseAiMove(player, moves, diceValue) {
    const scored = moves.map(i => {
      const t = player.tokens[i];
      let score = 0;
      const nextStep = t.step === -1 ? 0 : t.step + diceValue;

      if (nextStep === 56) score += 100;
      if (t.step === -1) score += 40;

      if (nextStep <= 50) {
        const commonIdx = (START_INDEX[player.color] + nextStep) % 52;
        if (!SAFE_INDEXES.has(commonIdx)) {
          state.players.forEach((op, opi) => {
            if (opi === state.turn) return;
            op.tokens.forEach(ot => {
              if (ot.step >= 0 && ot.step <= 50) {
                const otherIdx = (START_INDEX[op.color] + ot.step) % 52;
                if (otherIdx === commonIdx) score += 60;
              }
            });
          });
        } else {
          score += 8;
        }
      } else {
        score += 15; // progressing into home column is generally good
      }

      score += nextStep * 0.3;
      score += Math.random() * 3;
      return { i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].i;
  }

  function maybeRunAiTurn() {
    if (state.gameOver) return;
    const cur = state.players[state.turn];
    if (cur.kind !== "ai") return;
    state.canRoll = false;
    updateDiceUI();
    const diceEl = diceRowRefs[state.turn].diceEl;
    setTimeout(() => {
      rollDice(diceEl, value => afterRoll(value));
    }, 500);
  }

  /* ================= WIN OVERLAY ================= */

  const winOverlay = document.getElementById("win-overlay");
  const winText = document.getElementById("win-text");

  function showWin(winner) {
    winText.textContent = `${winner.name} wins!`;
    winOverlay.classList.remove("hidden");
    updateDiceUI();
    sfx.win();
  }

  document.getElementById("win-restart").addEventListener("click", () => {
    winOverlay.classList.add("hidden");
    goToSetup();
  });

  /* ================= SETUP SCREEN ================= */

  const setupView = document.getElementById("setup-view");
  const gameView = document.getElementById("game-view");
  const seatList = document.getElementById("seat-list");

  let cfg = { mode: "offline", players: "single", count: 4 };

  function wireChoiceRow(rowId, attr, onPick) {
    const row = document.getElementById(rowId);
    row.querySelectorAll(".choice-btn").forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        row.querySelectorAll(".choice-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        sfx.click();
        onPick(btn.dataset[attr]);
      });
    });
  }

  wireChoiceRow("mode-choice", "mode", v => { cfg.mode = v; });
  wireChoiceRow("players-choice", "players", v => { cfg.players = v; renderSeatList(); });
  wireChoiceRow("count-choice", "count", v => { cfg.count = Number(v); renderSeatList(); });

  function colorsForCount(count) {
    // Index 0 is always the human seat (blue, bottom-left) so "You" lines
    // up with the bottom-left corner panel, like a physical board.
    return count === 2 ? ["blue", "green"] : ["blue", "red", "green", "yellow"];
  }

  function renderSeatList() {
    const colors = colorsForCount(cfg.count);
    seatList.innerHTML = "";
    colors.forEach((color, i) => {
      const isHuman = cfg.players === "local" || i === 0;
      const row = document.createElement("div");
      row.className = "seat-row";
      row.innerHTML = `
        <div class="seat-left">
          <span class="seat-dot" style="background:var(--${color})"></span>
          <span class="seat-name">${NAMES[color]}</span>
        </div>
        <span class="seat-kind">${isHuman ? (cfg.players === "local" ? "Player " + (i + 1) : "You") : "Computer"}</span>
      `;
      seatList.appendChild(row);
    });
  }
  renderSeatList();

  function namesFor(colors, kinds) {
    let computerNum = 2;
    return kinds.map((kind, i) => {
      if (cfg.players === "local") return "Player " + (i + 1);
      if (kind === "human") return "You";
      return "Computer " + (computerNum++);
    });
  }

  document.getElementById("start-btn").addEventListener("click", () => {
    sfx.click();
    try {
      const colors = colorsForCount(cfg.count);
      const kinds = colors.map((_, i) => (cfg.players === "local" || i === 0) ? "human" : "ai");
      const names = namesFor(colors, kinds);
      startGame(colors, kinds, names);
    } catch (err) {
      alert("Couldn't start the game: " + err.message);
      console.error(err);
    }
  });

  document.getElementById("quit-btn").addEventListener("click", goToSetup);

  function goToSetup() {
    gameView.classList.add("hidden");
    setupView.classList.remove("hidden");
  }

  function startGame(colors, kinds, names) {
    state = buildInitialState(colors, kinds, names);
    setupView.classList.add("hidden");
    gameView.classList.remove("hidden");
    buildBoardDOM();
    renderYardLabels();
    buildPlayerDiceRows();
    renderTokens();
    updateDiceUI();
    maybeRunAiTurn();
  }

  function renderYardLabels() {
    boardEl.querySelectorAll(".yard-label, .entry-arrow").forEach(el => el.remove());
    state.players.forEach(p => {
      const y = YARD_RANGE[p.color];
      const label = document.createElement("div");
      label.className = "yard-label";
      label.style.gridRow = `${y.r0 + 1} / ${y.r1 + 2}`;
      label.style.gridColumn = `${y.c0 + 1} / ${y.c1 + 2}`;
      label.textContent = p.name;
      boardEl.appendChild(label);
    });

    const arrows = { red: "→", green: "↓", yellow: "←", blue: "↑" };
    const arrowCells = { red: [7, 1], green: [1, 7], yellow: [7, 13], blue: [13, 7] };
    ALL_COLORS.forEach(color => {
      const [r, c] = arrowCells[color];
      const el = document.createElement("div");
      el.className = "entry-arrow arrow-" + color;
      el.style.gridRowStart = r + 1;
      el.style.gridColumnStart = c + 1;
      el.textContent = arrows[color];
      boardEl.appendChild(el);
    });
  }
})();
