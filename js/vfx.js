/**
 * Visual Effects Engine (VFX) for Frog Road Crossing
 * Handles particle system, floating text, screen shake, and flash overlays.
 */

let particles = [];
let floatingTexts = [];
let shakeTime = 0;
let shakeIntensity = 0;
let flashTime = 0;
let flashColor = 'rgba(255,255,255,0)';

function resetVfx() {
  particles = [];
  floatingTexts = [];
  shakeTime = 0;
  shakeIntensity = 0;
  flashTime = 0;
}

function triggerShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeTime = duration;
}

function triggerFlash(color, duration) {
  flashColor = color;
  flashTime = duration;
}

function spawnHopDust(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + 15,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 15 - 5,
      radius: Math.random() * 4 + 2,
      color: '#e2f0d9',
      opacity: 0.8,
      life: 0,
      maxLife: 0.25,
      gravity: 20
    });
  }
}

function spawnCoinVfx(x, y) {
  floatingTexts.push({
    x: x,
    y: y,
    text: '+1 🪙',
    color: '#ffe600',
    opacity: 1,
    life: 0,
    maxLife: 0.8,
    size: 20
  });

  const colors = ['#f4c842', '#fff1a7', '#ffffff', '#ffd700'];
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 90;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3,
      gravity: 50,
      star: Math.random() < 0.5
    });
  }
}

function spawnHitVfx(x, y) {
  triggerShake(16, 0.45);
  triggerFlash('rgba(255, 50, 50, 0.5)', 0.4);

  floatingTexts.push({
    x: x,
    y: y - 20,
    text: '💥 CRASH!',
    color: '#ff4d4d',
    opacity: 1,
    life: 0,
    maxLife: 0.9,
    size: 26
  });

  const colors = ['#d85d57', '#ff8800', '#ff2200', '#444444', '#ffffff'];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      gravity: 120
    });
  }
}

function spawnLevelUpVfx(W, H) {
  triggerShake(5, 0.3);
  triggerFlash('rgba(120, 255, 140, 0.4)', 0.5);

  floatingTexts.push({
    x: W / 2,
    y: H / 2 - 60,
    text: '🎉 LEVEL COMPLETE! 🎉',
    color: '#40ff80',
    opacity: 1,
    life: 0,
    maxLife: 1.2,
    size: 28
  });

  const colors = ['#ff3366', '#33ccff', '#ffcc00', '#33ff99', '#cc66ff', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 120,
      vy: 80 + Math.random() * 140,
      radius: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      life: 0,
      maxLife: 1.8 + Math.random() * 0.8,
      gravity: 40,
      isConfetti: true,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8
    });
  }
}

function updateVfx(dt) {
  if (shakeTime > 0) shakeTime -= dt;
  if (flashTime > 0) flashTime -= dt;

  for (const p of particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.isConfetti) p.rotation += p.rotSpeed * dt;
    p.opacity = Math.max(0, 1 - p.life / p.maxLife);
  }
  particles = particles.filter(p => p.life < p.maxLife);

  for (const ft of floatingTexts) {
    ft.life += dt;
    ft.y -= 35 * dt;
    ft.opacity = Math.max(0, 1 - ft.life / ft.maxLife);
  }
  floatingTexts = floatingTexts.filter(ft => ft.life < ft.maxLife);
}

function drawVfx(ctx, W, H) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    if (p.isConfetti) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
    } else if (p.star) {
      ctx.translate(p.x, p.y);
      ctx.font = Math.floor(p.radius * 2.5) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 0);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = ft.opacity;
    ctx.font = '900 ' + ft.size + 'px system-ui';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  if (flashTime > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashTime / 0.3);
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
