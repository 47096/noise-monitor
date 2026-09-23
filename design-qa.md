# Design QA — Ember Sleep (generated-1790134455032.png)

## Comparison target

- **Source visual:** `generated-1790134455032.png` (Ember Sleep Calm Ambient variant)
- **Implementation:** `noise-monitor/` (index.html, styles.css, app.js) at mobile ~390×844
- **State compared:** idle/ready primary screen with default Quiet message, Sound + Speak on

## Result

`final result: blocked`

**Blocker:** Live implementation screenshot capture is not available in this session (no authorized browser capture for the local preview). Side-by-side pixel comparison against the mock could not be completed. Code and structure were aligned to the inspected source image; visual QA still needs one rendered capture pass.

## Fidelity checklist (from source image vs implementation)

### Layout / hierarchy — matched
| Region | Source | Implementation |
|--------|--------|----------------|
| Title + status | Centered title, amber ● Monitoring | `app-header` + `status-pill` |
| Hero number | Huge light numerals + dB, warm glow | `.hero` + `.hero-glow` + `.volume-number` |
| Level word | “Quiet” + “Ambient noise” | `#levelWord` + caption |
| Waveform | Thin amber bar strip | Canvas bars in `drawWaveform` |
| Alert at | Label, large amber value, slider, 1–100 ends | `.threshold-block` |
| Message row | Dark row, moon, text, pencil | `.message-row` |
| Sound / Speak card | Two rows, icons, descriptions, orange toggles | `.alert-style-card` |
| Start | Large glowing capsule + mic | `.primary-button` |
| Footer | Heart + “Here to help you rest easy.” | `.tagline` |

### Colors / tokens — matched direction
- Near-black warm bg `#070505`
- Ember / hot orange accents `#e09a6a` / `#ff8a4c`
- Cream numerals `#ffe6d0` with text glow
- Dark cards `#16110f`
- Loud state shifts glow/body toward rose

### Typography — approximate
- Source uses a thin geometric display for the number. Implementation uses system `Avenir Next` / `Segoe UI` at weight 300. Close on iOS/macOS; Android will differ. **P2:** consider bundling a free display face (e.g. Outfit / Manrope Light) if exact match matters.

### Copy — adapted with one intentional product constraint
- Source unit is `dB` with range labels `20` / `80`.
- Implementation keeps the `dB` **chrome** from the mock but still measures the existing 0–100 RMS scale (not calibrated SPL). Range labels are `1` / `100` to match real slider bounds.
- **Question for product:** calibrate/display true dB, or drop the `dB` suffix and show a unitless level?

### Icons — matched with inline SVG set
- Moon, pencil, speaker, speech, mic, heart as simple stroke SVGs (zero-dependency PWA constraint). Not emoji.

## Fix list

| Sev | Finding | Fix |
|-----|---------|-----|
| P0 | None in code structure | — |
| P1 | No rendered screenshot vs mock | Capture 390×844 and re-run this QA |
| P2 | Display font not identical to mock | Optional webfont |
| P2 | `dB` label overstates measurement honesty | Decide unit language |
| P3 | Mockwave bar density/glow can be tuned after live capture | Tweak `drawWaveform` gap/alpha |

## Post-fix evidence

Not yet — blocked on capture. Re-run after first live screenshot.
