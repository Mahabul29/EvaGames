(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("canvas-wrap");

  const startOverlay = document.getElementById("start-overlay");
  const overOverlay = document.getElementById("over-overlay");
  const scoreValueEl = document.getElementById("score-value");
  const bestValueEl = document.getElementById("best-value");
  const overScoreEl = document.getElementById("over-score");
  const startBtn = document.getElementById("start-btn");
  const retryBtn = document.getElementById("retry-btn");
  const muteBtn = document.getElementById("mute-btn");
  const backLinkBtn = document.getElementById("back-link");

  /* ================= THEME COLORS ================= */

  const css = getComputedStyle(document.documentElement);
  const cv = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  const COLORS = {
    ink: cv("--ink", "#12101c"),
    panel: cv("--panel", "#1e1a30"),
    panel2: cv("--panel-2", "#262040"),
    paper: cv("--paper", "#f2e7d5"),
    gold: cv("--gold", "#d4a24c"),
    goldSoft: cv("--gold-soft", "#e9c98a"),
    muted: cv("--muted", "#9a92b8"),
    red: cv("--red", "#e6473f"),
  };

  /* ================= SOUND ================= */

  let audioCtx = null, masterGain = null, soundOn = true;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.85;
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, type, startGain, delay, glideTo) {
    if (!soundOn) return;
    const ctx2 = ensureAudioCtx();
    if (!ctx2) return;
    const t0 = ctx2.currentTime + (delay || 0);
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    const filter = ctx2.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.max(freq * 3, 900), t0);
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(startGain || 0.15, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain || ctx2.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function playNoise(duration, startGain, delay, filterFreq, filterType) {
    if (!soundOn) return;
    const ctx2 = ensureAudioCtx();
    if (!ctx2) return;
    const t0 = ctx2.currentTime + (delay || 0);
    const bufferSize = Math.max(1, Math.floor(ctx2.sampleRate * duration));
    const buffer = ctx2.createBuffer(1, bufferSize, ctx2.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx2.createBufferSource();
    src.buffer = buffer;
    const filter = ctx2.createBiquadFilter();
    filter.type = filterType || "bandpass";
    filter.frequency.value = filterFreq || 1200;
    filter.Q.value = 0.8;
    const gain = ctx2.createGain();
    gain.gain.setValueAtTime(startGain || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain || ctx2.destination);
    src.start(t0);
  }

  const sfx = {
    jump() { playTone(420, 0.12, "triangle", 0.14, 0, 620); },
    crash() {
      playNoise(0.25, 0.28, 0, 500, "lowpass");
      playTone(120, 0.3, "sawtooth", 0.16, 0.03, 45);
    },
    milestone() { playTone(720, 0.1, "triangle", 0.1); },
    click() { playTone(440, 0.045, "square", 0.06); },
  };

  function setSoundOn(on) {
    soundOn = on;
    muteBtn.textContent = soundOn ? "🔊" : "🔇";
  }
  muteBtn.addEventListener("click", () => { ensureAudioCtx(); setSoundOn(!soundOn); });

  backLinkBtn.addEventListener("click", () => { window.location.href = "/"; });

  /* ================= SIZING ================= */

  let W = 0, H = 0, groundY = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const cssW = wrap.clientWidth;
    const cssH = Math.round(cssW * 0.6);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW;
    H = cssH;
    groundY = Math.round(H * 0.76);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ================= STATE ================= */

  const GRAVITY = 0.95;
  const JUMP_VELOCITY = -13.5;
  const CAR_X = 0; // set relative to W in reset()

  let mode = "start"; // start | playing | over
  let speed, distance, score, best;
  let car, obstacles, spawnDistance, nextSpawnAt;
  let mtnFar = 0, mtnNear = 0, roadDash = 0;

  best = Number(localStorage.getItem("evadrive_best") || 0);
  bestValueEl.textContent = best;

  function reset() {
    speed = 6.2;
    distance = 0;
    score = 0;
    obstacles = [];
    spawnDistance = 0;
    nextSpawnAt = 260;
    car = {
      x: Math.round(W * 0.16),
      w: Math.round(W * 0.09),
      h: Math.round(W * 0.065),
      y: 0,
      vy: 0,
      jumping: false,
    };
    car.y = groundY - car.h;
    scoreValueEl.textContent = "0";
  }

  function jump() {
    if (mode !== "playing") return;
    if (!car.jumping) {
      car.vy = JUMP_VELOCITY;
      car.jumping = true;
      sfx.jump();
    }
  }

  /* ================= INPUT ================= */

  wrap.addEventListener("pointerdown", (e) => {
    if (mode === "playing") { e.preventDefault(); jump(); }
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
  });

  startBtn.addEventListener("click", () => {
    sfx.click();
    ensureAudioCtx();
    reset();
    mode = "playing";
    startOverlay.classList.add("hidden");
  });
  retryBtn.addEventListener("click", () => {
    sfx.click();
    reset();
    mode = "playing";
    overOverlay.classList.add("hidden");
  });

  /* ================= OBSTACLES ================= */

  function spawnObstacle() {
    const roll = Math.random();
    if (roll < 0.6) {
      const size = Math.round(W * (0.045 + Math.random() * 0.03));
      obstacles.push({ type: "rock", x: W + size, w: size, h: size });
    } else {
      const gapW = Math.round(W * (0.14 + Math.random() * 0.05));
      obstacles.push({ type: "bridge", x: W + gapW, w: gapW, crossed: false });
    }
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ================= UPDATE ================= */

  function update() {
    if (mode !== "playing") return;

    distance += speed;
    speed = Math.min(speed + 0.0018, 13);
    mtnFar = (mtnFar + speed * 0.18) % 100000;
    mtnNear = (mtnNear + speed * 0.42) % 100000;
    roadDash = (roadDash + speed) % 100000;

    const newScore = Math.floor(distance / 8);
    if (newScore !== score) {
      if (Math.floor(newScore / 25) !== Math.floor(score / 25)) sfx.milestone();
      score = newScore;
      scoreValueEl.textContent = score;
    }

    car.vy += GRAVITY;
    car.y += car.vy;
    if (car.y > groundY - car.h) {
      car.y = groundY - car.h;
      car.vy = 0;
      car.jumping = false;
    }

    spawnDistance += speed;
    if (spawnDistance >= nextSpawnAt) {
      spawnObstacle();
      spawnDistance = 0;
      nextSpawnAt = 190 + Math.random() * 170;
    }

    obstacles.forEach(o => { o.x -= speed; });
    obstacles = obstacles.filter(o => o.x + o.w > -60);

    for (const o of obstacles) {
      if (o.type === "rock") {
        const carBox = { x: car.x, y: car.y, w: car.w, h: car.h };
        const rockBox = { x: o.x, y: groundY - o.h, w: o.w, h: o.h };
        if (intersects(carBox, rockBox)) return crash();
      } else if (o.type === "bridge") {
        const carFrontX = car.x + car.w * 0.75;
        const onGround = car.y >= groundY - car.h - 2;
        if (onGround && carFrontX > o.x && carFrontX < o.x + o.w) return crash();
      }
    }
  }

  function crash() {
    mode = "over";
    sfx.crash();
    if (score > best) {
      best = score;
      localStorage.setItem("evadrive_best", String(best));
      bestValueEl.textContent = best;
    }
    overScoreEl.textContent = "Score: " + score + (score === best && score > 0 ? " — new best!" : "");
    overOverlay.classList.remove("hidden");
  }

  /* ================= DRAW ================= */

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, "#221c3a");
    g.addColorStop(1, COLORS.ink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, groundY);
  }

  function mountainPath(offset, baseY, amp, wavelength, seedShift) {
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    const step = 14;
    for (let x = -step; x <= W + step; x += step) {
      const worldX = x + offset;
      const y = baseY - amp * (0.55 +
        0.45 * Math.sin(worldX / wavelength + seedShift) +
        0.25 * Math.sin(worldX / (wavelength * 0.37) + seedShift * 1.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, baseY);
    ctx.closePath();
  }

  function drawMountains() {
    const baseY = groundY - H * 0.02;
    ctx.fillStyle = COLORS.panel;
    mountainPath(-mtnFar, baseY, H * 0.32, 90, 1.3);
    ctx.fill();
    ctx.fillStyle = COLORS.panel2;
    mountainPath(-mtnNear, baseY, H * 0.22, 60, 4.1);
    ctx.fill();
  }

  function drawRoad() {
    ctx.fillStyle = "#241f38";
    ctx.fillRect(0, groundY, W, H - groundY);

    // gaps punch through the road
    for (const o of obstacles) {
      if (o.type === "bridge") {
        ctx.clearRect(o.x, groundY, o.w, H - groundY);
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(o.x, groundY, o.w, H - groundY);
        drawBridgePost(o.x);
        drawBridgePost(o.x + o.w);
      }
    }

    // dashed center line for speed sensation
    ctx.strokeStyle = "rgba(242,231,213,.28)";
    ctx.lineWidth = Math.max(2, H * 0.012);
    ctx.setLineDash([H * 0.05, H * 0.05]);
    ctx.lineDashOffset = -roadDash;
    ctx.beginPath();
    ctx.moveTo(0, groundY + (H - groundY) * 0.35);
    ctx.lineTo(W, groundY + (H - groundY) * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBridgePost(x) {
    const postW = Math.max(4, W * 0.012);
    const postH = H - groundY;
    ctx.fillStyle = "#7a5b3a";
    ctx.fillRect(x - postW / 2, groundY - postH * 0.25, postW, postH * 1.25);
    ctx.fillStyle = "rgba(212,162,76,.5)";
    ctx.fillRect(x - postW / 2, groundY - postH * 0.25, postW, postW);
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.type === "rock") {
        const y = groundY - o.h;
        ctx.fillStyle = "#6b6478";
        ctx.beginPath();
        ctx.moveTo(o.x, groundY);
        ctx.lineTo(o.x + o.w * 0.15, y + o.h * 0.15);
        ctx.lineTo(o.x + o.w * 0.55, y);
        ctx.lineTo(o.x + o.w * 0.9, y + o.h * 0.25);
        ctx.lineTo(o.x + o.w, groundY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.55, y);
        ctx.lineTo(o.x + o.w * 0.9, y + o.h * 0.25);
        ctx.lineTo(o.x + o.w * 0.6, y + o.h * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawCar() {
    const x = car.x, y = car.y, w = car.w, h = car.h;
    const bounce = car.jumping ? 0 : Math.sin(distance * 0.35) * (h * 0.04);

    // shadow
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, groundY + h * 0.12, w * 0.55, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, bounce);

    // body
    ctx.fillStyle = COLORS.red;
    roundRect(x, y + h * 0.35, w, h * 0.5, h * 0.14);
    ctx.fill();

    // cabin
    ctx.fillStyle = COLORS.goldSoft;
    roundRect(x + w * 0.22, y, w * 0.52, h * 0.5, h * 0.12);
    ctx.fill();

    // wheels
    ctx.fillStyle = "#1a1624";
    const wheelR = h * 0.16;
    ctx.beginPath();
    ctx.arc(x + w * 0.24, y + h * 0.92, wheelR, 0, Math.PI * 2);
    ctx.arc(x + w * 0.78, y + h * 0.92, wheelR, 0, Math.PI * 2);
    ctx.fill();

    // headlight
    ctx.fillStyle = "#fff6dd";
    ctx.beginPath();
    ctx.arc(x + w * 0.96, y + h * 0.62, h * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawMountains();
    drawRoad();
    drawObstacles();
    drawCar();
  }

  /* ================= LOOP ================= */

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  reset();
  draw();
  requestAnimationFrame(loop);
})();
