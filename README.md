# Noise Monitor Mobile

A static, GitHub Pages-ready noise monitor inspired by `wsamuelw/noise-monitor`.

## Features

- Real-time microphone volume meter
- Adjustable loudness threshold
- Spoken alert message with beep fallback
- iPhone and iPad friendly start flow for microphone and audio unlock
- No build step, no npm dependencies, no external CDN assets
- Relative paths for GitHub Pages project hosting

## Run Locally

Use a local web server, because browser microphone access does not work from `file://`.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy To GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open **Settings > Pages**.
3. Choose **Deploy from a branch**.
4. Select your branch and `/root`.
5. Open the published HTTPS URL on iPhone or iPad Safari.

Microphone access requires HTTPS. GitHub Pages provides HTTPS automatically.
