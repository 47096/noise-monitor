const AppStatus = {
  IDLE: 'idle',
  LISTENING: 'listening',
  LOUD: 'loud',
  ERROR: 'error',
};

const els = {
  startButton: document.querySelector('#startButton'),
  permissionNote: document.querySelector('#permissionNote'),
  thresholdSlider: document.querySelector('#thresholdSlider'),
  thresholdValue: document.querySelector('#thresholdValue'),
  currentLevel: document.querySelector('#currentLevel'),
  trackFill: document.querySelector('#trackFill'),
  alertMessageInput: document.querySelector('#alertMessage'),
};

const state = {
  status: AppStatus.IDLE,
  audioContext: null,
  analyser: null,
  stream: null,
  source: null,
  frame: 0,
  buffer: null,
  volume: 0,
  isLoud: false,
  lastAlertAt: 0,
  voices: [],
  speechUnlocked: false,
  threshold: 30,
  animationId: null,
};

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function setStatus(status, text) {
  state.status = status;
}

function showNote(message) {
  els.permissionNote.hidden = !message;
  els.permissionNote.textContent = message || '';
}

function updateThreshold() {
  // Update the threshold value display
  if (els.thresholdValue) {
    els.thresholdValue.textContent = state.threshold;
  }
  // Update the slider value
  if (els.thresholdSlider) {
    els.thresholdSlider.value = state.threshold;
  }
}

function updateVolume(volume) {
  // Update the current noise level display (kept for backwards compatibility, but hidden)
  if (els.currentLevel) {
    els.currentLevel.textContent = Math.round(volume);
  }
  
  // Update the progress bar in the slider track
  if (els.trackFill) {
    els.trackFill.style.width = `${Math.min(100, volume)}%`;
    
    // Update background color based on noise level relative to threshold
    const percentage = volume / state.threshold;
    
    if (percentage >= 1) {
      // At or above threshold - danger zone (red)
      els.trackFill.style.background = 'var(--red)';
    } else if (percentage >= 0.7) {
      // Approaching threshold - warning zone (amber)
      els.trackFill.style.background = 'var(--amber)';
    } else {
      // Safe zone (green)
      els.trackFill.style.background = 'var(--green)';
    }
  }
}

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  state.voices = window.speechSynthesis.getVoices();
}

function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;

  try {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0.01;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.cancel();
    state.speechUnlocked = true;
  } catch {
    state.speechUnlocked = false;
  }
}

function playBeep() {
  if (!state.audioContext || state.audioContext.state === 'closed') return;

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume().catch(() => {});
  }

  const now = state.audioContext.currentTime;
  const osc = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.28);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.36, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

  osc.connect(gain).connect(state.audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.38);
}

function speakAlert() {
  const message = els.alertMessageInput?.value?.trim() || 'Quiet';

  if (!('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    
    // Smart voice selection for best cross-platform compatibility
    const preferredVoice = getBestVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Silently fail if speech synthesis fails
  }
}

function getBestVoice() {
  if (!state.voices || state.voices.length === 0) {
    return null;
  }

  // Priority 1: Google US English (excellent on Android and Chrome)
  const googleVoice = state.voices.find(
    (voice) => voice.name.includes('Google US English') || 
               (voice.name.includes('Google') && voice.lang.toLowerCase() === 'en-us')
  );
  if (googleVoice) return googleVoice;

  // Priority 2: Samantha (excellent on iPhone/Mac)
  const samanthaVoice = state.voices.find(
    (voice) => voice.name.toLowerCase().includes('samantha')
  );
  if (samanthaVoice) return samanthaVoice;

  // Priority 3: Serena (good alternative on Mac)
  const serenaVoice = state.voices.find(
    (voice) => voice.name.toLowerCase().includes('serena')
  );
  if (serenaVoice) return serenaVoice;

  // Priority 4: Any high-quality English voice (Microsoft, Apple, etc.)
  const premiumVoice = state.voices.find(
    (voice) => voice.lang.toLowerCase().startsWith('en') &&
               (voice.name.includes('Premium') || voice.name.includes('Natural'))
  );
  if (premiumVoice) return premiumVoice;

  // Priority 5: Any English voice
  const anyEnglishVoice = state.voices.find(
    (voice) => voice.lang.toLowerCase().startsWith('en')
  );
  if (anyEnglishVoice) return anyEnglishVoice;

  // Fallback: Use default system voice
  return null;
}

function maybeAlert(volume) {
  const loud = volume >= state.threshold;

  if (loud && !state.isLoud) {
    state.isLoud = true;
    setStatus(AppStatus.LOUD, 'Too loud');
  } else if (!loud && state.isLoud) {
    state.isLoud = false;
    setStatus(AppStatus.LISTENING, 'Monitoring');
  }

  const now = Date.now();
  if (loud && now - state.lastAlertAt > 2600) {
    state.lastAlertAt = now;
    speakAlert();
  }
}

function analyze() {
  if (!state.analyser) return;

  if (!state.buffer || state.buffer.length !== state.analyser.fftSize) {
    state.buffer = new Float32Array(state.analyser.fftSize);
  }

  state.analyser.getFloatTimeDomainData(state.buffer);

  let sum = 0;
  for (let i = 0; i < state.buffer.length; i += 1) {
    sum += state.buffer[i] * state.buffer[i];
  }

  const rms = Math.sqrt(sum / state.buffer.length);
  const nextVolume = Math.min(100, (rms / 0.16) * 100);
  state.volume = state.volume * 0.72 + nextVolume * 0.28;

  updateVolume(state.volume);
  maybeAlert(state.volume);
  state.frame = requestAnimationFrame(analyze);
}

function stopMonitoring() {
  if (state.frame) cancelAnimationFrame(state.frame);
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  if (state.source) state.source.disconnect();
  if (state.analyser) state.analyser.disconnect();
  if (state.audioContext && state.audioContext.state !== 'closed') state.audioContext.close();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  state.audioContext = null;
  state.analyser = null;
  state.stream = null;
  state.source = null;
  state.frame = 0;
  state.buffer = null;
  state.volume = 0;
  state.isLoud = false;

  setStatus(AppStatus.IDLE, 'Ready');
  els.startButton.classList.remove('stop');
  els.startButton.querySelector('.button-icon').textContent = '▶';
  els.startButton.querySelector('span:last-child').textContent = 'Start';
}

async function startMonitoring() {
  showNote('');

  if (!window.isSecureContext) {
    showNote('Microphone access needs HTTPS. GitHub Pages is HTTPS, so the hosted version will work.');
    setStatus(AppStatus.ERROR, 'HTTPS needed');
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showNote('This browser does not expose microphone access. Use Safari on iOS/iPadOS or Chrome/Edge on Android.');
    setStatus(AppStatus.ERROR, 'No microphone');
    return;
  }

  unlockSpeech();
  stopMonitoring();

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    await state.audioContext.resume();

    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    }).catch(() => navigator.mediaDevices.getUserMedia({ audio: true, video: false }));

    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = isIOS ? 1024 : 2048;
    state.analyser.smoothingTimeConstant = 0.2;
    state.source = state.audioContext.createMediaStreamSource(state.stream);
    state.source.connect(state.analyser);

    setStatus(AppStatus.LISTENING, 'Monitoring');
    els.startButton.classList.add('stop');
    els.startButton.querySelector('.button-icon').textContent = '■';
    els.startButton.querySelector('span:last-child').textContent = 'Stop';
    state.frame = requestAnimationFrame(analyze);
  } catch (error) {
    stopMonitoring();
    setStatus(AppStatus.ERROR, 'Mic blocked');
    const denied = error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
    showNote(denied
      ? 'Microphone permission was denied. In Safari, check Website Settings and allow Microphone for this site.'
      : 'Could not start the microphone. Close other apps using the mic, then try again.');
  }
}

function handleVisibilityChange() {
  if (!state.audioContext || state.audioContext.state === 'closed') return;

  if (document.hidden) {
    state.audioContext.suspend().catch(() => {});
  } else if (state.status === AppStatus.LISTENING || state.status === AppStatus.LOUD) {
    state.audioContext.resume().catch(() => {});
  }
}

// Threshold slider event listener
function handleSliderInput(e) {
  state.threshold = parseInt(e.target.value, 10);
  updateThreshold();
}

// Alert message input event listener
function handleMessageInput(e) {
  // Save to localStorage for persistence
  try {
    localStorage.setItem('alertMessage', e.target.value);
  } catch {
    // Ignore localStorage errors
  }
}

// Initialize slider event listener
if (els.thresholdSlider) {
  els.thresholdSlider.addEventListener('input', handleSliderInput);
}

// Initialize message input event listener
if (els.alertMessageInput) {
  els.alertMessageInput.addEventListener('input', handleMessageInput);
  // Load saved message from localStorage
  try {
    const savedMessage = localStorage.getItem('alertMessage');
    if (savedMessage) {
      els.alertMessageInput.value = savedMessage;
    }
  } catch {
    // Ignore localStorage errors
  }
}

els.startButton.addEventListener('click', () => {
  if (state.status === AppStatus.LISTENING || state.status === AppStatus.LOUD) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
});

document.addEventListener('visibilitychange', handleVisibilityChange);

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

updateThreshold();
