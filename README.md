# Noise Monitor Mobile

A mobile-friendly, offline-capable web application that monitors ambient noise levels using your device's microphone. When noise exceeds your configured threshold, it delivers a personalized spoken alert. Built with vanilla JavaScript—no frameworks, no build tools, no external dependencies.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-green.svg)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-ready-lightgrey.svg)

## ✨ Features

- 🎤 **Real-time Audio Monitoring** – Live microphone input with visual waveform display
- 🎚️ **Adjustable Sensitivity** – Customizable noise threshold slider (0–100)
- 🔊 **Personalized Alerts** – Text-to-speech announcements with configurable message
- 📱 **Mobile-First Design** – Optimized for iPhone, iPad, and Android devices
- 📲 **Progressive Web App (PWA)** – Installable on home screen, works offline
- 🔒 **Privacy-Focused** – All processing happens locally; no data leaves your device
- ⚡ **Zero Dependencies** – Pure vanilla JavaScript, CSS, and HTML
- 🌐 **GitHub Pages Ready** – Deploys instantly with relative paths

## 🚀 Quick Start

### Prerequisites

- A modern web browser with microphone support (Chrome, Firefox, Safari, Edge)
- HTTPS environment (required for microphone access)

### Run Locally

Microphone access requires a secure context (HTTPS or localhost). Use a local development server:

#### Option 1: Python
```bash
python3 -m http.server 8080
```

#### Option 2: Node.js (http-server)
```bash
npx http-server -p 8080
```

#### Option 3: PHP
```bash
php -S localhost:8080
```

Then open **`http://localhost:8080`** in your browser.

### Install as PWA

1. Open the app in a supported browser (Chrome, Safari, Edge)
2. Look for the install prompt or use the browser menu:
   - **Chrome/Edge**: Click the install icon in the address bar
   - **Safari (iOS)**: Tap Share → "Add to Home Screen"
3. Launch from your home screen for a native app experience

## 🛠️ Usage

1. **Start Monitoring**: Tap the **Start** button to grant microphone permission
2. **Set Threshold**: Adjust the slider to set your desired noise sensitivity level
3. **Customize Message**: Enter a personalized alert message (e.g., "Quiet please!")
4. **Get Alerts**: When noise exceeds the threshold, hear your spoken alert

> **Note**: On iOS devices, you must interact with the page (tap Start) before microphone and audio playback can be enabled due to platform restrictions.

## 📁 Project Structure

```
noise-monitor-mobile/
├── index.html          # Main application HTML
├── styles.css          # Responsive styles and animations
├── app.js              # Core audio monitoring logic
├── sw.js               # Service Worker for offline support
├── manifest.json       # PWA manifest for installation
├── icon.svg            # App icon (SVG, maskable)
├── package.json        # Development dependencies (optional)
└── README.md           # This file
```

## 🌍 Deployment

### GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings** → **Pages**
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: Select your branch (e.g., `main`)
   - Folder: `/ (root)`
4. Click **Save**
5. Your app will be live at `https://<username>.github.io/<repo>/`

> ⚠️ **Important**: Microphone access requires HTTPS. GitHub Pages provides HTTPS automatically for custom domains and `*.github.io` URLs.

### Other Static Hosts

This app works with any static hosting service:
- **Netlify**: Drag & drop or connect Git repo
- **Vercel**: Connect Git repo for instant deployment
- **Cloudflare Pages**: Connect Git repo
- **Apache/Nginx**: Serve the files directly

Ensure your host serves files over HTTPS.

## 🔧 Technical Details

### Browser APIs Used

- **Web Audio API** – Real-time audio analysis and waveform visualization
- **MediaDevices.getUserMedia()** – Microphone access
- **SpeechSynthesis API** – Text-to-speech alerts
- **Service Worker API** – Offline caching and PWA functionality
- **Canvas API** – Waveform chart rendering

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Audio Monitoring | ✅ 63+ | ✅ 53+ | ✅ 14+ | ✅ 79+ |
| Speech Synthesis | ✅ 14+ | ✅ 49+ | ✅ 7+ | ✅ 14+ |
| Service Worker | ✅ 40+ | ✅ 44+ | ✅ 11.1+ | ✅ 17+ |
| PWA Install | ✅ 67+ | ✅ 68+ | ✅ 16.4+ | ✅ 18+ |

### Permissions

This app requests:
- **Microphone**: Required for audio monitoring
- **Notifications**: Not used (alerts are auditory only)

No permissions are requested without user interaction.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Uses vanilla JavaScript (no frameworks)
- Maintains mobile-first responsive design
- Includes appropriate comments for complex logic
- Works without a build step

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by [`wsamuelw/noise-monitor`](https://github.com/wsamuelw/noise-monitor)
- Built with ❤️ using vanilla web technologies

## 📞 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/yourusername/noise-monitor-mobile/issues) on GitHub.

---

**Made with vanilla JavaScript • No tracking • No analytics • Privacy first**
