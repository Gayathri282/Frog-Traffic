/**
 * Core Game Engine for Frog Road Crossing
 * Cute edition — lively frog, rounded candy cars, grass flowers,
 * checkerboard finish, auto-pause on exit, pre-populated traffic.
 */

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 480;
  const H = 900;

  // HUD Elements
  const lvlEl = document.getElementById('lvl');
  const distEl = document.getElementById('dist');
  const coinEl = document.getElementById('coin');
  const soundBtn = document.getElementById('soundBtn');

  // Overlay Elements
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('title');
  const msg = document.getElementById('msg');
  const startBtn = document.getElementById('start');

  // Controls Elements
  const btnL = document.getElementById('L');
  const btnF = document.getElementById('F');
  const btnR = document.getElementById('R');

  // Game State
  let running = false;
  let isPaused = false;
  let lastTime = 0;
  let level = 1;
  let distance = 0;
  let coins = 0;
  let spawnTimer = 0;
  let coinSpawnTimer = 0;
  let globalTime = 0; // for ambient animations

  let cars = [];
  let coinsList = [];
  let frog = { x: W / 2, y: H - 130, targetX: W / 2, bob: 0 };

  const lanes = [350, 425, 500, 575, 650];

  // Cute car color palettes (body, accent)
  const carColors = [
    { body: '#ff6b6b', accent: '#ee5a5a' },  // coral red
    { body: '#feca57', accent: '#f0b723' },  // sunny yellow
    { body: '#48dbfb', accent: '#0abde3' },  // sky blue
    { body: '#ff9ff3', accent: '#f368e0' },  // bubblegum pink
    { body: '#54a0ff', accent: '#2e86de' },  // ocean blue
    { body: '#5f27cd', accent: '#341f97' },  // grape purple
    { body: '#1dd1a1', accent: '#10ac84' },  // mint green
    { body: '#ff9f43', accent: '#ee8520' },  // tangerine
  ];
  const truckColors = [
    { body: '#c44569', accent: '#b33650' },
    { body: '#e17055', accent: '#d05540' },
    { body: '#6c5ce7', accent: '#5a4bd1' },
    { body: '#00b894', accent: '#009975' },
  ];

  // Pre-generate random grass decorations (flowers, tufts)
  const grassDecorations = [];
  function generateGrassDecor() {
    grassDecorations.length = 0;
    const flowerEmojis = ['🌼', '🌸', '🌻', '🌺', '💐'];
    // Top grass zone (y 0-85)
    for (let i = 0; i < 10; i++) {
      grassDecorations.push({
        x: 15 + Math.random() * (W - 30),
        y: 8 + Math.random() * 65,
        type: Math.random() < 0.6 ? 'flower' : 'tuft',
        emoji: flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)],
        size: 10 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2
      });
    }
    // Bottom grass zone (y 710-H)
    for (let i = 0; i < 14; i++) {
      grassDecorations.push({
        x: 15 + Math.random() * (W - 30),
        y: 715 + Math.random() * (H - 730 - 70),
        type: Math.random() < 0.5 ? 'flower' : 'tuft',
        emoji: flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)],
        size: 10 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function roadY() {
    return 270;
  }

  function updateHud() {
    if (lvlEl) lvlEl.textContent = '⭐ Level ' + level;
    if (distEl) distEl.textContent = '🏃 ' + Math.floor(distance) + ' m';
    if (coinEl) coinEl.textContent = '🪙 ' + coins;
  }

  /**
   * Pre-populates all lanes with moving traffic.
   */
  function initLanesWithCars() {
    cars = [];
    lanes.forEach(y => {
      const carCount = Math.random() < 0.7 ? 2 : 1;
      const dir = Math.random() < 0.5 ? 1 : -1;

      for (let i = 0; i < carCount; i++) {
        const truck = Math.random() < Math.min(0.22, 0.08 + level * 0.012);
        const w = truck ? 105 : 52;
        const baseSpeed = 75 + level * 10;
        const speed = baseSpeed * (truck ? 0.78 : 1) * (0.8 + Math.random() * 0.35);

        const spacing = W / (carCount + 0.5);
        const x = 40 + i * spacing + (Math.random() - 0.5) * 60;

        const palette = truck
          ? truckColors[Math.floor(Math.random() * truckColors.length)]
          : carColors[Math.floor(Math.random() * carColors.length)];

        cars.push({
          x: Math.max(20, Math.min(W - 20, x)),
          y: y,
          dir: dir,
          w: w,
          truck: truck,
          speed: speed,
          color: palette.body,
          accent: palette.accent,
        });
      }
    });
  }

  function spawnCar() {
    const y = lanes[Math.floor(Math.random() * lanes.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const truck = Math.random() < Math.min(0.22, 0.08 + level * 0.012);
    const w = truck ? 105 : 52;
    const baseSpeed = 75 + level * 10;

    const palette = truck
      ? truckColors[Math.floor(Math.random() * truckColors.length)]
      : carColors[Math.floor(Math.random() * carColors.length)];

    cars.push({
      x: dir > 0 ? -w - 15 : W + w + 15,
      y: y,
      dir: dir,
      w: w,
      truck: truck,
      speed: baseSpeed * (truck ? 0.78 : 1) * (0.8 + Math.random() * 0.35),
      color: palette.body,
      accent: palette.accent,
    });
  }

  function spawnCoin() {
    coinsList.push({
      x: 30 + Math.random() * (W - 60),
      y: 300 + Math.random() * 370,
      spin: 0,
      live: true,
      glow: 0,
    });
  }

  function resetGame() {
    level = 1;
    distance = 0;
    coins = 0;
    spawnTimer = 0;
    coinSpawnTimer = 0;
    coinsList = [];
    globalTime = 0;
    resetVfx();

    frog.x = W / 2;
    frog.targetX = W / 2;
    frog.y = H - 130;

    generateGrassDecor();
    initLanesWithCars();
    updateHud();
  }

  function checkHit(a, b) {
    return Math.abs(a.x - b.x) < b.w / 2 + 17 && Math.abs(a.y - b.y) < 25;
  }

  // ─── Movements ───
  function moveSide(dx) {
    if (!running || isPaused) return;
    getAudioCtx();
    playHopSound();
    spawnHopDust(frog.x, frog.y);
    frog.targetX = Math.max(25, Math.min(W - 25, frog.targetX + dx));
    frog.bob = 0.8;
  }

  function forward() {
    if (!running || isPaused) return;
    getAudioCtx();
    playHopSound();
    spawnHopDust(frog.x, frog.y);

    const step = 48 + Math.min(34, (level - 1) * 3);
    frog.y -= step;
    distance += step * 0.25;
    frog.bob = 0.9;

    const prevLevel = level;
    level = Math.max(1, Math.floor(distance / 55) + 1);
    updateHud();

    if (level > prevLevel) {
      playLevelUpSound();
      triggerFlash('rgba(100, 255, 100, 0.3)', 0.35);
    }

    if (frog.y < roadY() - 10) {
      completeLevel();
    }
  }

  function completeLevel() {
    running = false;
    stopBgMusic();
    playLevelUpSound();
    spawnLevelUpVfx(W, H);

    title.textContent = '🎉 Level ' + level + '!';
    msg.textContent = 'You crossed safely! Traffic gets faster on the next level — be careful! 🐸';
    startBtn.textContent = 'Next Level';
    overlay.style.display = 'flex';
  }

  function gameOver() {
    running = false;
    stopBgMusic();
    playHitSound();
    spawnHitVfx(frog.x, frog.y);

    title.textContent = '💔 Oh no!';
    msg.textContent = 'You hopped ' + Math.floor(distance) + ' m and collected ' + coins + ' coins. You can do it! 🐸✨';
    startBtn.textContent = 'Try Again';
    overlay.style.display = 'flex';
  }

  // ─── Helper: draw rounded rect ───
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── Cute Frog Drawing ───
  function drawFrog(x, y) {
    ctx.save();
    ctx.translate(x, y + Math.sin(frog.bob) * 5);

    // Soft shadow underneath
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back legs (behind body)
    ctx.fillStyle = '#5dbd3e';
    roundRect(-22, 6, 12, 16, 4);
    ctx.fill();
    roundRect(10, 6, 12, 16, 4);
    ctx.fill();

    // Cute feet
    ctx.fillStyle = '#4caf35';
    ctx.beginPath();
    ctx.ellipse(-18, 22, 7, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, 22, 7, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Body — soft green oval
    const bodyGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
    bodyGrad.addColorStop(0, '#8de86c');
    bodyGrad.addColorStop(0.6, '#68d44e');
    bodyGrad.addColorStop(1, '#4fb838');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 21, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly highlight
    ctx.fillStyle = 'rgba(200,255,180,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye bumps (green base)
    ctx.fillStyle = '#68d44e';
    ctx.beginPath();
    ctx.arc(-10, -16, 10, 0, Math.PI * 2);
    ctx.arc(10, -16, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-10, -17, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -17, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (with subtle look-direction)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-9, -17, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -17, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye sparkle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-11, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Cute blush spots
    ctx.fillStyle = 'rgba(255, 150, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-16, -8, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, -8, 5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tiny smile
    ctx.strokeStyle = '#3a8a28';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }

  // ─── Cute Rounded Car Drawing ───
  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(0, 18, car.w * 0.42, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hw = car.w / 2;

    // Car body (rounded)
    ctx.fillStyle = car.color;
    roundRect(-hw, -14, car.w, 28, 9);
    ctx.fill();

    // Highlight strip on top
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(-hw + 4, -12, car.w - 8, 8, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(200, 230, 255, 0.65)';
    if (car.truck) {
      roundRect(-hw * 0.35, -10, car.w * 0.28, 10, 4);
      ctx.fill();
    } else {
      roundRect(-hw * 0.32, -10, car.w * 0.64, 10, 4);
      ctx.fill();
    }

    // Wheels (cute round)
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(-hw + 10, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hw - 10, 14, 6, 0, Math.PI * 2);
    ctx.fill();

    // Wheel hubs
    ctx.fillStyle = '#dfe6e9';
    ctx.beginPath();
    ctx.arc(-hw + 10, 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hw - 10, 14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Truck cargo
    if (car.truck) {
      ctx.fillStyle = car.accent;
      roundRect(hw * 0.05, -11, hw * 0.65, 22, 5);
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── Cute Coin Drawing ───
  function drawCoin(q) {
    ctx.save();
    ctx.translate(q.x, q.y);

    // Glow halo
    const glowSize = 18 + Math.sin(q.spin * 1.5) * 3;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(Math.sin(q.spin) * 0.2);

    // Outer ring
    ctx.fillStyle = '#f4c842';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // Inner shine
    const coinGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
    coinGrad.addColorStop(0, '#fff6d6');
    coinGrad.addColorStop(0.4, '#ffd700');
    coinGrad.addColorStop(1, '#daa520');
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Star center
    ctx.fillStyle = '#fff';
    ctx.font = '900 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0.5);

    ctx.restore();
  }

  // ─── Main Render ───
  function draw() {
    ctx.save();

    // Camera shake
    if (shakeTime > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 0.45);
      const sy = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 0.45);
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, W, H);

    // ─ Sky-tinted grass background ─
    const grassGrad = ctx.createLinearGradient(0, 0, 0, H);
    grassGrad.addColorStop(0, '#8fd16a');
    grassGrad.addColorStop(0.12, '#7bc75b');
    grassGrad.addColorStop(0.85, '#6abb4d');
    grassGrad.addColorStop(1, '#5dac40');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, W, H);

    // ─ Finish Zone (checkerboard!) ─
    ctx.fillStyle = '#c8e6a4';
    ctx.fillRect(0, 0, W, 85);
    // Mini checkerboard
    const tileS = 18;
    for (let tx = 0; tx < W; tx += tileS) {
      for (let ty = 55; ty < 85; ty += tileS) {
        if (((tx / tileS + ty / tileS) | 0) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
        }
        ctx.fillRect(tx, ty, tileS, tileS);
      }
    }
    // FINISH text with outline
    ctx.font = '900 17px Nunito, system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#3a6a20';
    ctx.lineWidth = 3;
    ctx.strokeText('🏁 FINISH 🏁', W / 2, 46);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏁 FINISH 🏁', W / 2, 46);

    // ─ Grass decorations (flowers & tufts) ─
    for (const d of grassDecorations) {
      ctx.save();
      ctx.translate(d.x, d.y);
      const sway = Math.sin(globalTime * 2 + d.phase) * 0.08;
      ctx.rotate(sway);
      if (d.type === 'flower') {
        ctx.font = Math.floor(d.size) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.emoji, 0, 0);
      } else {
        // Grass tuft
        ctx.strokeStyle = '#5aad38';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-3, 4); ctx.lineTo(-1, -5);
        ctx.moveTo(0, 4); ctx.lineTo(1, -7);
        ctx.moveTo(3, 4); ctx.lineTo(4, -4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ─ Road ─
    const roadGrad = ctx.createLinearGradient(0, roadY(), 0, roadY() + 430);
    roadGrad.addColorStop(0, '#3d4451');
    roadGrad.addColorStop(0.5, '#353b48');
    roadGrad.addColorStop(1, '#2d3436');
    ctx.fillStyle = roadGrad;
    roundRect(0, roadY(), W, 430, 0);
    ctx.fill();

    // Lane dashes (softer)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([28, 22]);
    for (const y of lanes) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Curb lines (soft yellow)
    ctx.fillStyle = '#f9ca24';
    ctx.fillRect(0, 260, W, 5);
    ctx.fillRect(0, 700, W, 5);
    // Curb edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 258, W, 2);
    ctx.fillRect(0, 705, W, 2);

    // ─ Draw Cars ─
    for (const car of cars) {
      drawCar(car);
    }

    // ─ Draw Coins ─
    for (const q of coinsList) {
      if (!q.live) continue;
      drawCoin(q);
    }

    // ─ Draw Frog ─
    drawFrog(frog.x, frog.y);

    // ─ VFX Layer ─
    drawVfx(ctx, W, H);

    ctx.restore();
  }

  // ─── Frame Update ───
  function frame(timestamp) {
    if (!running || isPaused) return;

    const dt = Math.min(0.033, Math.max(0.001, (timestamp - lastTime) / 1000 || 0));
    lastTime = timestamp;
    globalTime += dt;

    spawnTimer += dt;
    coinSpawnTimer += dt;

    const interval = Math.max(0.28, 0.82 - level * 0.025);
    if (spawnTimer > interval) {
      spawnCar();
      spawnTimer = 0;
    }

    if (coinSpawnTimer > Math.max(1.2, 3 - level * 0.08)) {
      spawnCoin();
      coinSpawnTimer = 0;
    }

    for (const car of cars) {
      car.x += car.dir * car.speed * dt;
    }
    cars = cars.filter(c => c.x > -160 && c.x < W + 160);

    for (const q of coinsList) {
      q.spin += dt * 5;
      if (q.live && Math.hypot(q.x - frog.x, q.y - frog.y) < 28) {
        q.live = false;
        coins++;
        distance += 4;
        updateHud();
        playCoinSound();
        spawnCoinVfx(q.x, q.y);
      }
    }
    coinsList = coinsList.filter(q => q.live);

    frog.x += (frog.targetX - frog.x) * Math.min(1, dt * 12);
    frog.bob = Math.max(0, frog.bob - dt * 3);

    updateVfx(dt);

    for (const car of cars) {
      if (checkHit(frog, car)) {
        gameOver();
        return;
      }
    }

    draw();
    requestAnimationFrame(frame);
  }

  // ─── Start / Resume ───
  function startGame(nextLevel = false) {
    getAudioCtx();

    if (!nextLevel) {
      resetGame();
    } else {
      distance = (level - 1) * 55;
      frog.y = H - 130;
      frog.x = W / 2;
      frog.targetX = W / 2;
      coinsList = [];
      resetVfx();
      generateGrassDecor();
      initLanesWithCars();
    }

    running = true;
    isPaused = false;
    startBgMusic();
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  // ─── Auto Pause ───
  function pauseGame() {
    if (!running || isPaused) return;
    isPaused = true;
    stopBgMusic();

    title.textContent = '⏸️ Paused';
    msg.textContent = 'Game paused! Come back and keep hopping 🐸💚';
    startBtn.textContent = 'Resume Game';
    overlay.style.display = 'flex';
  }

  function resumeGame() {
    if (!running) return;
    isPaused = false;
    startBgMusic();
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });
  window.addEventListener('blur', () => {
    pauseGame();
  });

  // ─── Button Listeners ───
  startBtn.addEventListener('click', () => {
    if (isPaused) {
      resumeGame();
    } else {
      startGame(startBtn.textContent === 'Next Level');
    }
  });

  if (soundBtn) {
    updateSoundBtnUI(soundBtn);
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMute(soundBtn);
      if (!isMuted() && running && !isPaused) {
        getAudioCtx();
        startBgMusic();
      }
    });
  }

  if (btnL) btnL.addEventListener('pointerdown', e => { e.preventDefault(); moveSide(-55); });
  if (btnR) btnR.addEventListener('pointerdown', e => { e.preventDefault(); moveSide(55); });
  if (btnF) btnF.addEventListener('pointerdown', e => { e.preventDefault(); forward(); });

  // Keyboard
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
      e.preventDefault(); forward();
    } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
      e.preventDefault(); moveSide(-55);
    } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
      e.preventDefault(); moveSide(55);
    }
  });

  // Touch & Swipe
  let startTouchX = 0, startTouchY = 0, isTrackingTouch = false;

  canvas.addEventListener('pointerdown', e => {
    startTouchX = e.clientX;
    startTouchY = e.clientY;
    isTrackingTouch = true;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointerup', e => {
    if (!isTrackingTouch) return;
    isTrackingTouch = false;
    const dx = e.clientX - startTouchX;
    const dy = e.clientY - startTouchY;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      moveSide(dx > 0 ? 60 : -60);
    } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      forward();
    }
  });
  canvas.addEventListener('pointercancel', () => { isTrackingTouch = false; });

  // Init
  resetGame();
  draw();
})();
