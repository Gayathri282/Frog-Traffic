/**
 * Web Audio API Audio Engine for Frog Road Crossing
 * Features retro arcade synth BGM and a dramatic 4-stage Game Over sound sequence.
 */

let audioCtx = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Retro Arcade Background Tune Synth Loop
const melodyNotes = [
  523.25, 659.25, 783.99, 1046.50,  659.25, 783.99, 880.00, 783.99,
  523.25, 659.25, 783.99, 1046.50,  880.00, 783.99, 659.25, 587.33,
  440.00, 523.25, 659.25, 880.00,   523.25, 659.25, 698.46, 659.25,
  392.00, 493.88, 587.33, 783.99,   659.25, 587.33, 523.25, 493.88
];

const bassNotes = [
  130.81, 130.81, 196.00, 130.81,  174.61, 174.61, 220.00, 174.61,
  110.00, 110.00, 164.81, 110.00,  146.83, 146.83, 196.00, 146.83
];

function playStep() {
  if (muted) return;
  const actx = getAudioCtx();
  if (!actx) return;

  const now = actx.currentTime;
  
  // Lead synth note (Square wave)
  const mFreq = melodyNotes[musicStep % melodyNotes.length];
  if (mFreq) {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(mFreq, now);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Bass synth note (Triangle wave)
  if (musicStep % 2 === 0) {
    const bFreq = bassNotes[Math.floor(musicStep / 2) % bassNotes.length];
    if (bFreq) {
      const bOsc = actx.createOscillator();
      const bGain = actx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bFreq, now);
      bGain.gain.setValueAtTime(0.06, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      bOsc.connect(bGain);
      bGain.connect(actx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.23);
    }
  }

  musicStep++;
}

function startBgMusic() {
  stopBgMusic();
  musicStep = 0;
  musicTimer = setInterval(playStep, 150);
}

function stopBgMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function playHopSound() {
  if (muted) return;
  const actx = getAudioCtx();
  if (!actx) return;
  const now = actx.currentTime;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(actx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

function playCoinSound() {
  if (muted) return;
  const actx = getAudioCtx();
  if (!actx) return;
  const now = actx.currentTime;
  const tones = [987.77, 1318.51];
  tones.forEach((freq, idx) => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    gain.gain.setValueAtTime(0.15, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.13);
  });
}

/**
 * Dramatic 4-Stage Retro Defeat Game Over Sound Effect
 * Stage 1-4: F3 (174.61Hz) -> Eb3 (155.56Hz) -> D3 (146.83Hz) -> C3 (130.81Hz) pitch bend notes
 * Paired with a low frequency rumble crunch impact sweep.
 */
function playHitSound() {
  if (muted) return;
  const actx = getAudioCtx();
  if (!actx) return;
  const now = actx.currentTime;

  // --- 1. Dramatic 4-stage descending retro defeat sequence ---
  // F3 -> Eb3 -> D3 -> C3
  const defeatNotes = [
    { freq: 174.61, dropTo: 160.00, start: 0, duration: 0.15 },  // F3 note step
    { freq: 155.56, dropTo: 140.00, start: 0.14, duration: 0.15 }, // Eb3 note step
    { freq: 146.83, dropTo: 125.00, start: 0.28, duration: 0.16 }, // D3 note step
    { freq: 130.81, dropTo: 70.00,  start: 0.43, duration: 0.40 }  // Final C3 dramatic pitch fall
  ];

  defeatNotes.forEach(n => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    const noteTime = now + n.start;
    
    osc.frequency.setValueAtTime(n.freq, noteTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.dropTo), noteTime + n.duration);
    
    const vol = n.start === 0.43 ? 0.35 : 0.25;
    gain.gain.setValueAtTime(vol, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.duration + 0.02);
    
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(noteTime);
    osc.stop(noteTime + n.duration + 0.03);
  });

  // --- 2. Low-frequency rumble crunch impact sweep ---
  try {
    const bufferSize = actx.sampleRate * 0.45;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = actx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    
    const noiseGain = actx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(actx.destination);
    noise.start(now);

    // Sub-bass impact thud
    const subOsc = actx.createOscillator();
    const subGain = actx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    subOsc.connect(subGain);
    subGain.connect(actx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);
  } catch (e) {
    console.warn('Audio crash noise fallback error:', e);
  }
}

function playLevelUpSound() {
  if (muted) return;
  const actx = getAudioCtx();
  if (!actx) return;
  const now = actx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    gain.gain.setValueAtTime(0.18, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.22);
  });
}

function toggleMute(soundBtn) {
  muted = !muted;
  if (soundBtn) {
    updateSoundBtnUI(soundBtn);
  }
  if (muted) {
    stopBgMusic();
  }
  return muted;
}

function isMuted() {
  return muted;
}

function updateSoundBtnUI(soundBtn) {
  if (!soundBtn) return;
  soundBtn.textContent = muted ? '🔇 Muted' : '🔊 Sound';
  soundBtn.style.background = muted ? '#f4c6c6' : 'rgba(255,255,255,.92)';
}
