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
  trackFill: document.querySelector('#trackFill'),
  thresholdFill: document.querySelector('#thresholdFill'),
  volumeNumber: document.querySelector('#volumeNumber'),
  statusPill: document.querySelector('#statusPill'),
  statusText: document.querySelector('#statusText'),
  alertMessageInput: document.querySelector('#alertMessage'),
  soundToggle: document.querySelector('#soundToggle'),
  speakToggle: document.querySelector('#speakToggle'),
  waveformChart: document.querySelector('#waveformChart'),
  levelWord: document.querySelector('#levelWord'),
};

const state = {
  status: AppStatus.IDLE,
  audioContext: null,
  analyser: null,
  stream: null,
  source: null,
  frame: 0,
  buffer: null,
  byteBuffer: null,
  silentGain: null,
  sampleTimer: null,
  volume: 0,
  isLoud: false,
  speaking: false,
  lastAlertAt: 0,
  voices: [],
  speechUnlocked: false,
  threshold: 30,
  soundEnabled: true,
  speakEnabled: true,
  animationId: null,
  waveformHistory: [],
  chartCtx: null,
  chartWidth: 0,
  chartHeight: 0,
};

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function setStatus(status, text) {
  state.status = status;

  if (els.statusPill) {
    els.statusPill.className = `status-pill ${status}`;
  }
  if (els.statusText) {
    els.statusText.textContent = text || status;
  }

  const isLoud = status === AppStatus.LOUD;
  document.body.classList.toggle('is-loud', isLoud);
  document.querySelector('.monitor')?.classList.toggle('is-loud', isLoud);
}

function pulseHaptic() {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate([140, 70, 140]);
  }
}

function showNote(message) {
  els.permissionNote.hidden = !message;
  els.permissionNote.textContent = message || '';
}

function updateThreshold() {
  if (els.thresholdValue) {
    els.thresholdValue.textContent = state.threshold;
  }
  if (els.thresholdSlider) {
    els.thresholdSlider.value = state.threshold;
  }
  if (els.thresholdFill) {
    els.thresholdFill.style.width = `${state.threshold}%`;
  }
}

function resizeChart({ preserveHistory = true } = {}) {
  if (!els.waveformChart) return;

  const rect = els.waveformChart.getBoundingClientRect();
  const nextWidth = rect.width || 300;
  const nextHeight = rect.height || 80;
  const dpr = window.devicePixelRatio || 1;

  if (
    state.chartCtx
    && state.chartWidth === nextWidth
    && state.chartHeight === nextHeight
    && els.waveformChart.width === Math.floor(nextWidth * dpr)
  ) {
    return;
  }

  const previous = preserveHistory && state.waveformHistory.length
    ? state.waveformHistory.slice()
    : [];

  state.chartWidth = nextWidth;
  state.chartHeight = nextHeight;
  els.waveformChart.width = nextWidth * dpr;
  els.waveformChart.height = nextHeight * dpr;
  els.waveformChart.style.width = `${nextWidth}px`;
  els.waveformChart.style.height = `${nextHeight}px`;

  state.chartCtx = els.waveformChart.getContext('2d');
  state.chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Keep recent samples when the canvas size changes (rotate, split view)
  const maxPoints = Math.max(2, Math.floor(nextWidth / 2));
  if (previous.length === 0) {
    state.waveformHistory = new Array(maxPoints).fill(0);
  } else if (previous.length > maxPoints) {
    state.waveformHistory = previous.slice(-maxPoints);
  } else {
    state.waveformHistory = new Array(maxPoints - previous.length).fill(0).concat(previous);
  }

  if (preserveHistory) {
    drawWaveform();
  }
}

function initChart() {
  resizeChart({ preserveHistory: false });
}

let chartResizeTimer = 0;

function handleChartResize() {
  window.clearTimeout(chartResizeTimer);
  chartResizeTimer = window.setTimeout(() => {
    resizeChart({ preserveHistory: true });
  }, 100);
}

function drawWaveform() {
  if (!state.chartCtx || !els.waveformChart) return;

  const ctx = state.chartCtx;
  const width = state.chartWidth;
  const height = state.chartHeight;

  ctx.clearRect(0, 0, width, height);

  const ratio = state.threshold > 0 ? state.volume / state.threshold : Infinity;
  state.waveformHistory.push(state.volume);
  state.waveformHistory.shift();

  const barCount = state.waveformHistory.length;
  const gap = 2;
  const barWidth = Math.max(1, width / barCount - gap);
  const mid = height / 2;

  for (let i = 0; i < barCount; i++) {
    const value = state.waveformHistory[i];
    const amp = Math.max(2, (value / 100) * (height - 8));
    const x = i * (barWidth + gap);
    const y = mid - amp / 2;

    if (ratio >= 1) {
      ctx.fillStyle = 'rgba(224, 112, 112, 0.9)';
    } else if (ratio >= 0.7) {
      ctx.fillStyle = 'rgba(224, 154, 106, 0.85)';
    } else {
      ctx.fillStyle = 'rgba(255, 170, 110, 0.75)';
    }

    ctx.fillRect(x, y, barWidth, amp);
  }
}

function updateVolume(volume) {
  const level = Math.min(100, Math.max(0, volume));
  const ratio = state.threshold > 0 ? level / state.threshold : Infinity;

  if (els.volumeNumber) {
    els.volumeNumber.textContent = String(Math.round(level));
  }

  if (els.levelWord) {
    if (ratio >= 1) {
      els.levelWord.textContent = 'Too loud';
    } else if (ratio >= 0.7) {
      els.levelWord.textContent = 'Getting loud';
    } else {
      els.levelWord.textContent = 'Quiet';
    }
  }

  if (els.trackFill) {
    els.trackFill.style.width = `${level}%`;
    if (ratio >= 1) {
      els.trackFill.style.background = 'var(--red)';
    } else if (ratio >= 0.7) {
      els.trackFill.style.background = 'var(--amber)';
    } else {
      els.trackFill.style.background = 'var(--ember)';
    }
  }

  drawWaveform();
}

let voicesLoaded = false;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  state.voices = window.speechSynthesis.getVoices();
  // Mark voices as loaded once we have them
  if (state.voices && state.voices.length > 0) {
    voicesLoaded = true;
  }
}

function resumeAudio() {
  if (
    state.audioContext
    && state.audioContext.state !== 'closed'
    && state.audioContext.state !== 'running'
  ) {
    state.audioContext.resume().catch(() => {});
  }
}

function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;

  try {
    loadVoices();
    // Tiny utterance unlocks iOS speech; do not cancel immediately (breaks some WebViews)
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    utterance.rate = 2;
    utterance.onend = () => {
      state.speechUnlocked = true;
    };
    window.speechSynthesis.speak(utterance);
    state.speechUnlocked = true;
  } catch {
    state.speechUnlocked = false;
  }
}

let beepContext = null;

function playBeep() {
  // Separate context so the chime cannot interrupt the mic analyser on iOS
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!beepContext || beepContext.state === 'closed') {
      beepContext = new AudioContextClass();
    }
    if (beepContext.state === 'suspended') {
      beepContext.resume().catch(() => {});
    }

    const now = beepContext.currentTime;
    const osc = beepContext.createOscillator();
    const gain = beepContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.36, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain).connect(beepContext.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // Chime is best-effort
  }
}

function speakAlert() {
  const message = els.alertMessageInput?.value?.trim() || 'Quiet';

  if (!('speechSynthesis' in window)) {
    return;
  }

  // Ensure voices are loaded before speaking (critical for Chrome)
  if (!voicesLoaded && state.voices.length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      loadVoices();
      speakAlert();
    }, { once: true });
    return;
  }

  // Track speaking ourselves — speechSynthesis.speaking sticks true on iOS
  if (state.speaking) {
    return;
  }

  try {
    state.speaking = true;

    const done = () => {
      state.speaking = false;
      resumeAudio();
    };

    // onend is unreliable on iOS — free the channel from message length
    const estimateMs = Math.min(12000, 1200 + message.length * 70);
    window.setTimeout(() => {
      if (state.speaking) done();
    }, estimateMs);

    // iOS only reliably speaks the first utterance unless we reset first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.onend = done;
    utterance.onerror = done;

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

    // Some iOS builds need a nudge after queueing
    window.setTimeout(() => {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }, 50);
  } catch {
    state.speaking = false;
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

function fireAlert() {
  if (state.soundEnabled) {
    playBeep();
  }
  if (state.speakEnabled) {
    // Let the chime land first when both are on
    const delay = state.soundEnabled ? 360 : 0;
    window.setTimeout(speakAlert, delay);
  }
}

function maybeAlert(volume) {
  const loud = volume >= state.threshold;
  const now = Date.now();

  if (loud && !state.isLoud) {
    state.isLoud = true;
    setStatus(AppStatus.LOUD, 'Too loud');
    pulseHaptic();
    state.lastAlertAt = now;
    fireAlert();
    return;
  }

  if (loud && state.isLoud && !state.speaking && now - state.lastAlertAt > 2800) {
    // Still over threshold (or a later spike): re-alert after the line is free
    pulseHaptic();
    state.lastAlertAt = now;
    fireAlert();
    return;
  }

  if (!loud && state.isLoud) {
    state.isLoud = false;
    setStatus(AppStatus.LISTENING, 'Monitoring');
  }
}

function readLevel() {
  if (!state.analyser) return;

  const size = state.analyser.fftSize;
  let rms = 0;

  try {
    if (typeof state.analyser.getFloatTimeDomainData === 'function') {
      if (!state.buffer || state.buffer.length !== size) {
        state.buffer = new Float32Array(size);
      }
      state.analyser.getFloatTimeDomainData(state.buffer);
      let sum = 0;
      for (let i = 0; i < state.buffer.length; i += 1) {
        sum += state.buffer[i] * state.buffer[i];
      }
      rms = Math.sqrt(sum / state.buffer.length);
    } else {
      throw new Error('no-float');
    }
  } catch {
    // Older iOS: byte time domain is the reliable path
    if (!state.byteBuffer || state.byteBuffer.length !== size) {
      state.byteBuffer = new Uint8Array(size);
    }
    state.analyser.getByteTimeDomainData(state.byteBuffer);
    let sum = 0;
    for (let i = 0; i < state.byteBuffer.length; i += 1) {
      const sample = (state.byteBuffer[i] - 128) / 128;
      sum += sample * sample;
    }
    rms = Math.sqrt(sum / state.byteBuffer.length);
  }

  const nextVolume = Math.min(100, (rms / 0.16) * 100);
  state.volume = state.volume * 0.72 + nextVolume * 0.28;
  updateVolume(state.volume);
  maybeAlert(state.volume);
}

function analyze() {
  if (!state.analyser) return;

  try {
    resumeAudio();
    readLevel();
  } catch {
    // Keep the monitor loop alive even if a frame fails (iOS interruptions)
  } finally {
    if (state.analyser) {
      state.frame = requestAnimationFrame(analyze);
    }
  }
}

function startSampleTimer() {
  stopSampleTimer();
  // rAF can stall on iOS; sample on a timer too
  state.sampleTimer = window.setInterval(() => {
    if (state.analyser && document.visibilityState !== 'hidden') {
      try {
        resumeAudio();
        readLevel();
      } catch {
        // ignore
      }
    }
  }, 100);
}

function stopSampleTimer() {
  if (state.sampleTimer) {
    window.clearInterval(state.sampleTimer);
    state.sampleTimer = null;
  }
}

function stopMonitoring() {
  if (state.frame) cancelAnimationFrame(state.frame);
  stopSampleTimer();
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  if (state.source) state.source.disconnect();
  if (state.silentGain) state.silentGain.disconnect();
  if (state.analyser) state.analyser.disconnect();
  if (state.audioContext && state.audioContext.state !== 'closed') state.audioContext.close();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  state.audioContext = null;
  state.analyser = null;
  state.stream = null;
  state.source = null;
  state.silentGain = null;
  state.frame = 0;
  state.buffer = null;
  state.volume = 0;
  state.isLoud = false;
  state.speaking = false;
  updateVolume(0);

  // Clear the waveform chart
  if (state.chartCtx && els.waveformChart) {
    state.chartCtx.clearRect(0, 0, state.chartWidth, state.chartHeight);
  }

  setStatus(AppStatus.IDLE, 'Ready');
  els.startButton.classList.remove('stop');
  els.startButton.querySelector('.button-icon').innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
  els.startButton.querySelector('span:last-child').textContent = 'Start monitoring';
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
  
  // Initialize the waveform chart
  initChart();

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    state.audioContext.onstatechange = () => {
      resumeAudio();
    };
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

    // iOS will not process the graph unless it reaches the destination
    state.silentGain = state.audioContext.createGain();
    state.silentGain.gain.value = 0;
    state.source.connect(state.analyser);
    state.analyser.connect(state.silentGain);
    state.silentGain.connect(state.audioContext.destination);

    setStatus(AppStatus.LISTENING, 'Monitoring');
    els.startButton.classList.add('stop');
    els.startButton.querySelector('.button-icon').innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    els.startButton.querySelector('span:last-child').textContent = 'Stop monitoring';
    state.frame = requestAnimationFrame(analyze);
    startSampleTimer();
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
    return;
  }

  if (state.status === AppStatus.LISTENING || state.status === AppStatus.LOUD) {
    state.audioContext.resume().catch(() => {});
    // rAF is frozen while hidden — restart the monitor loop
    if (state.analyser && !state.frame) {
      state.frame = requestAnimationFrame(analyze);
    }
    if (state.analyser) {
      startSampleTimer();
    }
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage errors
  }
}

function loadSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function handleSliderInput(e) {
  state.threshold = Math.max(1, parseInt(e.target.value, 10) || 1);
  updateThreshold();
  saveSetting('threshold', String(state.threshold));
}

function handleMessageInput(e) {
  saveSetting('alertMessage', e.target.value);
}

function handleSoundToggle(e) {
  state.soundEnabled = e.target.checked;
  saveSetting('soundEnabled', state.soundEnabled ? '1' : '0');
}

function handleSpeakToggle(e) {
  state.speakEnabled = e.target.checked;
  saveSetting('speakEnabled', state.speakEnabled ? '1' : '0');
}

if (els.thresholdSlider) {
  const savedThreshold = parseInt(loadSetting('threshold') || '', 10);
  if (Number.isFinite(savedThreshold)) {
    state.threshold = Math.min(100, Math.max(1, savedThreshold));
  }
  els.thresholdSlider.addEventListener('input', handleSliderInput);
}

if (els.alertMessageInput) {
  els.alertMessageInput.addEventListener('input', handleMessageInput);
  const savedMessage = loadSetting('alertMessage');
  if (savedMessage) {
    els.alertMessageInput.value = savedMessage;
  }
}

if (els.soundToggle) {
  const savedSound = loadSetting('soundEnabled');
  if (savedSound !== null) {
    state.soundEnabled = savedSound === '1';
    els.soundToggle.checked = state.soundEnabled;
  }
  els.soundToggle.addEventListener('change', handleSoundToggle);
}

if (els.speakToggle) {
  const savedSpeak = loadSetting('speakEnabled');
  if (savedSpeak !== null) {
    state.speakEnabled = savedSpeak === '1';
    els.speakToggle.checked = state.speakEnabled;
  }
  els.speakToggle.addEventListener('change', handleSpeakToggle);
}

els.startButton.addEventListener('click', () => {
  if (state.status === AppStatus.LISTENING || state.status === AppStatus.LOUD) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
});

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('resize', handleChartResize);
window.addEventListener('orientationchange', handleChartResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleChartResize);
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

initChart();
updateThreshold();
updateVolume(0);
