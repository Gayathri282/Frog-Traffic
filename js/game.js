/**
 * Core Game Engine for Frog Road Crossing
 * Manages game loop, physics, collisions, input handlers, level progression,
 * auto-pausing on tab exit, and pre-populated traffic for instant action.
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

  // Game State variables
  let running = false;
  let isPaused = false;
  let lastTime = 0;
  let level = 1;
  let distance = 0;
  let coins = 0;
  let spawnTimer = 0;
  let coinSpawnTimer = 0;

  let cars = [];
  let coinsList = [];
  let frog = { x: W / 2, y: H - 130, targetX: W / 2, bob: 0 };

  const lanes = [350, 425, 500, 575, 650];

  function roadY() {
    return 270;
  }

  function updateHud() {
    if (lvlEl) lvlEl.textContent = 'Level ' + level;
    if (distEl) distEl.textContent = Math.floor(distance) + ' m';
    if (coinEl) coinEl.textContent = '🪙 ' + coins;
  }

  /**
   * Pre-populates all lanes with moving traffic so cars are already driving
   * across the screen when starting a new level or game.
   */
  function initLanesWithCars() {
    cars = [];
    lanes.forEach(y => {
      // 1 to 2 cars per lane scattered across the canvas width
      const carCount = Math.random() < 0.7 ? 2 : 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      
      for (let i = 0; i < carCount; i++) {
        const truck = Math.random() < Math.min(0.22, 0.08 + level * 0.012);
        const w = truck ? 105 : 52;
        const baseSpeed = 75 + level * 10;
        const speed = baseSpeed * (truck ? 0.78 : 1) * (0.8 + Math.random() * 0.35);
        
        // Spread X position nicely across canvas
        const spacing = W / (carCount + 0.5);
        const x = 40 + i * spacing + (Math.random() - 0.5) * 60;

        cars.push({
          x: Math.max(20, Math.min(W - 20, x)),
          y: y,
          dir: dir,
          w: w,
          truck: truck,
          speed: speed
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
    cars.push({
      x: dir > 0 ? -w - 15 : W + w + 15,
      y: y,
      dir: dir,
      w: w,
      truck: truck,
      speed: baseSpeed * (truck ? 0.78 : 1) * (0.8 + Math.random() * 0.35)
    });
  }

  function spawnCoin() {
    coinsList.push({
      x: 30 + Math.random() * (W - 60),
      y: 300 + Math.random() * 370,
      spin: 0,
      live: true
    });
  }

  function resetGame() {
    level = 1;
    distance = 0;
    coins = 0;
    spawnTimer = 0;
    coinSpawnTimer = 0;
    coinsList = [];
    resetVfx();
    
    frog.x = W / 2;
    frog.targetX = W / 2;
    frog.y = H - 130;
    
    initLanesWithCars();
    updateHud();
  }

  // Collision detection helper
  function checkHit(a, b) {
    return Math.abs(a.x - b.x) < b.w / 2 + 17 && Math.abs(a.y - b.y) < 25;
  }

  // Movements
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
    msg.textContent = 'You crossed safely! Traffic and frog speed increase on the next level.';
    startBtn.textContent = 'Next Level';
    overlay.style.display = 'flex';
  }

  function gameOver() {
    running = false;
    stopBgMusic();
    playHitSound(); // Plays dramatic 4-stage retro defeat sound
    spawnHitVfx(frog.x, frog.y);
    
    title.textContent = '🐸 Oops!';
    msg.textContent = 'You survived ' + Math.floor(distance) + ' m and collected ' + coins + ' coins.';
    startBtn.textContent = 'Try Again';
    overlay.style.display = 'flex';
  }

  /**
   * Main Render Loop
   */
  function draw() {
    ctx.save();
    
    // Apply camera shake if active
    if (shakeTime > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 0.45);
      const sy = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 0.45);
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, W, H);

    // Grass Background
    ctx.fillStyle = '#76a95c';
    ctx.fillRect(0, 0, W, H);

    // Finish Zone
    ctx.fillStyle = '#b5d689';
    ctx.fillRect(0, 0, W, 85);
    ctx.fillStyle = '#263323';
    ctx.font = '900 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', W / 2, 53);

    // Main Asphalt Road & Lanes
    ctx.fillStyle = '#30353b';
    ctx.fillRect(0, roadY(), W, 430);
    ctx.fillStyle = '#3b4047';
    ctx.fillRect(0, roadY() + 5, W, 420);

    ctx.strokeStyle = '#d9dadd';
    ctx.lineWidth = 3;
    ctx.setLineDash([34, 26]);
    for (const y of lanes) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Curb lines
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 260, W, 7);
    ctx.fillRect(0, 700, W, 7);

    // Draw Traffic Cars
    for (const car of cars) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.fillStyle = car.truck ? '#b46a38' : '#d85d57';
      ctx.fillRect(-car.w / 2, -15, car.w, 30);
      
      // Windshield & wheels
      ctx.fillStyle = '#252a2e';
      ctx.fillRect(-car.w * 0.25, -11, car.w * 0.5, 10);
      ctx.fillStyle = '#151719';
      ctx.beginPath();
      ctx.arc(-car.w * 0.3, 15, 6, 0, 7);
      ctx.arc(car.w * 0.3, 15, 6, 0, 7);
      ctx.fill();
      
      if (car.truck) {
        ctx.fillStyle = '#e3ba60';
        ctx.fillRect(car.w * 0.08, -12, car.w * 0.3, 9);
      }
      ctx.restore();
    }

    // Draw Coins
    for (const q of coinsList) {
      if (!q.live) continue;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(Math.sin(q.spin) * 0.3);
      ctx.fillStyle = '#f4c842';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#fff1a7';
      ctx.font = '900 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 4);
      ctx.restore();
    }

    // Draw Player Frog
    ctx.save();
    ctx.translate(frog.x, frog.y + Math.sin(frog.bob) * 4);
    ctx.fillStyle = '#79c957';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 7);
    ctx.fill();
    
    // Eyes
    ctx.beginPath();
    ctx.arc(-13, -14, 9, 0, 7);
    ctx.arc(13, -14, 9, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-7, -17, 5, 0, 7);
    ctx.arc(7, -17, 5, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-7, -17, 2.5, 0, 7);
    ctx.arc(7, -17, 2.5, 0, 7);
    ctx.fill();
    
    // Legs
    ctx.fillStyle = '#4b8537';
    ctx.fillRect(-14, 13, 9, 4);
    ctx.fillRect(5, 13, 9, 4);
    ctx.restore();

    // Draw Particle & Floating Text VFX
    drawVfx(ctx, W, H);
    
    ctx.restore();
  }

  /**
   * Main Frame Physics & Delta Clamped Update
   */
  function frame(timestamp) {
    if (!running || isPaused) return;

    // Delta-Time Clamping [0.001, 0.033] for 60Hz/120Hz/144Hz monitors & lag prevention
    const dt = Math.min(0.033, Math.max(0.001, (timestamp - lastTime) / 1000 || 0));
    lastTime = timestamp;

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

    // Update cars
    for (const car of cars) {
      car.x += car.dir * car.speed * dt;
    }
    cars = cars.filter(c => c.x > -160 && c.x < W + 160);

    // Update coins
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

    // Smooth frog horizontal motion & hop dampening
    frog.x += (frog.targetX - frog.x) * Math.min(1, dt * 12);
    frog.bob = Math.max(0, frog.bob - dt * 3);

    // Update VFX system
    updateVfx(dt);

    // Collision detection
    for (const car of cars) {
      if (checkHit(frog, car)) {
        gameOver();
        return;
      }
    }

    draw();
    requestAnimationFrame(frame);
  }

  /**
   * Start / Resume Game
   */
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
      // Pre-populate traffic on next level as well!
      initLanesWithCars();
    }

    running = true;
    isPaused = false;
    startBgMusic();
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  /**
   * Auto Pause on Screen Exit / Tab Blur
   */
  function pauseGame() {
    if (!running || isPaused) return;
    isPaused = true;
    stopBgMusic();

    title.textContent = '⏸ Game Paused';
    msg.textContent = 'Game paused because you left the screen. Click resume to continue playing!';
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

  // Event Listeners for Visibility / Screen Exit
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseGame();
    }
  });
  window.addEventListener('blur', () => {
    pauseGame();
  });

  // Start / Resume Button listener
  startBtn.addEventListener('click', () => {
    if (isPaused) {
      resumeGame();
    } else {
      startGame(startBtn.textContent === 'Next Level');
    }
  });

  // Mute Sound Toggle Button
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

  // On-screen Arrow Buttons
  if (btnL) btnL.addEventListener('pointerdown', e => { e.preventDefault(); moveSide(-55); });
  if (btnR) btnR.addEventListener('pointerdown', e => { e.preventDefault(); moveSide(55); });
  if (btnF) btnF.addEventListener('pointerdown', e => { e.preventDefault(); forward(); });

  // Keyboard Navigation
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
      e.preventDefault();
      forward();
    } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      moveSide(-55);
    } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      moveSide(55);
    }
  });

  // Touch & Swipe Controls on Canvas
  let startTouchX = 0;
  let startTouchY = 0;
  let isTrackingTouch = false;

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

  canvas.addEventListener('pointercancel', () => {
    isTrackingTouch = false;
  });

  // Initial draw setup with moving cars on start screen
  resetGame();
  draw();
})();
