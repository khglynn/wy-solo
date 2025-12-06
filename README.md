# SOLO.EXE

```
████████████████████████████████████████████████████████████████
█                                                              █
█   WEYLAND-YUTANI RECREATIONAL TERMINAL v3.1                  █
█   KLONDIKE MODULE // BUILD 1990.12.05                        █
█   ─────────────────────────────────────────────────────────  █
█                                                              █
█   > All games winnable. Productivity loss guaranteed.        █
█   > Press H for hint. We know you'll need it.                █
█   > Press W for victory simulation.                          █
█                                                              █
████████████████████████████████████████████████████████████████
```

**[LAUNCH TERMINAL →](https://retro-solitare-4recordos.vercel.app)**

<!-- ![Solitaire Screenshot](screenshot.png) -->

## SYSTEM REQUIREMENTS

- Browser with JavaScript enabled
- Approximately 47 seconds of your time (minimum)
- Functioning mouse or touch interface
- Optional: Coffee

No frameworks. No dependencies. No build step. Just cards.

## FEATURES

```
[■] GUARANTEED WINNABLE DEALS
    200 pre-verified seeds. No unwinnable scenarios.
    Statistical inevitability of success.

[■] INTELLIGENT HINT SYSTEM
    Press H. Yellow indicators will guide you.
    The computer knows the optimal path.

[■] RESPONSIVE INTERFACE
    Functions on desktop terminals and mobile devices.
    Container-query aware for embedded deployment.

[■] RETRO-AUTHENTIC AESTHETIC
    Windows 95 chrome. Matrix green accents.
    Crosshatch background. Appropriate corporate nostalgia.
```

## CONTROLS

| Input | Action |
|-------|--------|
| `Click` | Auto-move card to valid location |
| `Drag` | Manual card placement |
| `Space` | Draw from stock |
| `H` | Request hint |
| `Ctrl+Z` | Undo previous action |
| `F2` | New deal |
| `Esc` | Close menus/modals |

## DEPLOYMENT

### Local Execution
```bash
python3 -m http.server 8080
# Navigate to http://localhost:8080
```

### Production (Vercel)
Push to main. Auto-deployment configured.

### Iframe Integration
```html
<iframe
  src="https://retro-solitare-4recordos.vercel.app"
  width="700"
  height="500"
  style="border: none;"
></iframe>
```

## TECHNICAL SPECIFICATIONS

```
ARCHITECTURE
├── game.js ......... State engine, rules, seeded RNG, hint algorithm
├── ui.js ........... DOM rendering, card creation
├── drag.js ......... Pointer Events API (mouse + touch unified)
├── animation.js .... Win cascade animation
└── main.js ......... Application bootstrap, menu handlers

STYLING
├── win95.css ....... Window chrome, buttons, modals
├── cards.css ....... Card rendering, responsive scaling
└── game.css ........ Layout, media queries

CARD RENDERING
└── CSS-generated ... No images required. Full color control.
                      Suits rendered via ::before pseudo-elements.
```

### Responsive Scaling
```css
--card-width: min(12vw, 90px);
--card-height: calc(var(--card-width) * 1.4);
--stack-offset: clamp(18px, 3.5vmin, 28px);
```

### Winnable Seed System
Linear Congruential Generator ensures reproducible shuffles.
Seed list curated for guaranteed solvability.

## CREDITS

```
DEVELOPED BY .............. Kevin HG
ORIGINAL INSPIRATION ...... Microsoft Solitaire (1990)
AESTHETIC FRAMEWORK ....... recordOS Matrix Theme
ICONS ..................... Pixelarticons (pixelarticons.com)
TYPOGRAPHY ................ VT323 by Peter Hull (Google Fonts)

"Building a better world."
    — Weyland-Yutani Corporation
```

## AUTHOR

**Kevin HG**
- Terminal: [kevinhg.com](https://kevinhg.com)
- Transmission: [hello@kevinhg.com](mailto:hello@kevinhg.com)
- Repository: [@khglynn](https://github.com/khglynn)

## LICENSE

MIT. Do whatever you want. We're not liable for time lost.

---

```
[TERMINAL OUTPUT]
> SOLO.EXE loaded successfully.
> 52 cards initialized.
> 200 winnable seeds verified.
> Awaiting user input...
> _
```

Built for [recordOS](https://github.com/khglynn/recordOS)
