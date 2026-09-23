# Noise Monitor

A mobile-friendly, offline-capable web app that watches ambient noise with your device’s microphone. When the room gets too loud, it plays a chime and/or speaks your message. Built with vanilla JavaScript — no frameworks, no build step.

Live: **https://47096.github.io/noise-monitor/**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-green.svg)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-ready-lightgrey.svg)

## Features

- **Live level** — large readout, bar waveform, and colour meter (ember UI)
- **Alert threshold** — slider for when to trigger (persisted on the device)
- **Sound & Speak** — chime, spoken message, or both (persisted)
- **Personalised message** — what the voice should say when it’s too loud
- **Loud state** — status pill, screen tint, and haptic pulse (where supported)
- **Sticky Start bar** — primary action always in thumb reach
- **PWA** — installable, offline shell after first load
- **Privacy** — mic audio never leaves the device; no analytics
- **Zero dependencies** — plain HTML, CSS, and JS

> **Note on the `dB` label:** the hero number is a 0–100 sensitivity level derived from mic RMS, not a calibrated SPL meter. Treat it as a relative level.

## Quick start

### Prerequisites

- A modern browser with microphone support (Chrome, Firefox, Safari, Edge)
- HTTPS (or localhost) — required for mic access

### Run locally

```bash
python3 -m http.server 8080
# or
npx --yes http-server -p 8080
# or
php -S localhost:8080
```

Open **http://localhost:8080**.

### Install as a PWA

1. Open the app over HTTPS
2. **Chrome/Edge** — install icon in the address bar  
   **Safari (iOS)** — Share → “Add to Home Screen”
3. Launch from the home screen

After a deploy, load the site once so the service worker can refresh, then hard-reload if the UI looks stale.

## Usage

1. Tap **Start monitoring** and allow the microphone
2. Set **Alert at** — the level that should trigger
3. Edit the **message** the voice should say
4. Choose **Sound**, **Speak**, or both
5. When noise crosses the line: chime, spoken message, status goes “Too loud”

On iOS, interact with the page (tap Start) before mic and speech will run.

## Project structure

```
noise-monitor/
├── index.html       # App shell
├── styles.css       # Ember Sleep theme
├── app.js           # Mic analysis, alerts, persistence
├── sw.js            # Service worker (offline + cache revalidate)
├── manifest.json    # PWA manifest
├── icon.svg         # App icon (ember orb)
├── icon-512.png     # PWA raster icon
├── apple-touch-icon.png
└── README.md
```

## Deployment

### GitHub Pages

1. Push this repository to GitHub  
2. **Settings → Pages → Deploy from a branch**  
3. Branch: `main`, folder: `/ (root)`  
4. App lives at `https://<username>.github.io/<repo>/`

Mic access needs HTTPS. `*.github.io` includes HTTPS.

### Other static hosts

Netlify, Vercel, Cloudflare Pages, or any static file server over HTTPS.

## Technical notes

### Browser APIs

- Web Audio API (level + waveform)
- `getUserMedia` (microphone)
- SpeechSynthesis (spoken alerts)
- Service Worker (offline PWA)
- Canvas (waveform)

### iOS reliability

- Analysis graph is tied through a silent gain so Safari keeps sampling
- Speech is reset between alerts (iOS often only speaks the first line)
- Chime uses a separate AudioContext so it cannot freeze the mic
- Level is sampled on a timer as well as `requestAnimationFrame`

### Permissions

- **Microphone** — required for monitoring  
- Nothing is requested before you tap Start

## Contributing

1. Fork and branch (`git checkout -b feature/amazing-feature`)
2. Keep it vanilla JS (no frameworks, no build step)
3. Keep the mobile-first Ember Sleep UI
4. Open a Pull Request

## License

[MIT](LICENSE)
