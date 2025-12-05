# Classic Responsive Solitaire - Implementation Plan

## Project Overview

A lightweight, responsive Klondike Solitaire game with authentic Windows 95 aesthetics. Built for:
1. **Standalone play** - Deployed on Vercel at its own URL
2. **Iframe embedding** - Integrates into recordOS as a game window

## Why Build From Scratch?

After evaluating existing options:
- **solitaire95** (React/Redux) - Beautiful Win95 look but sluggish performance, click detection issues
- **js-solitaire** (rjanjic) - Good game logic but no responsiveness, uses CSS sprites
- **Various others** - Either GPL licensed, not responsive, or missing the retro aesthetic

**Our approach**: Steal the visual language, build lightweight.

## Technical Architecture

### Stack
- **HTML5** - Semantic structure
- **Vanilla CSS** - No preprocessors needed for this scope
- **Vanilla JavaScript** - No React, no Redux, no jQuery
- **SVG cards** - Scalable at any size (reuse from recordOS assets)

### Why Vanilla?
- Solitaire doesn't need a virtual DOM
- No state management library needed for 52 cards
- Pointer Events API works great without abstraction
- Target bundle: <50KB total (vs 200KB+ for React solution)

## Responsive Strategy

### The Core Insight
Card games fail at responsiveness because they hardcode pixel values. Our solution:

```css
:root {
  /* Card size based on smaller viewport dimension */
  --card-width: min(12vmin, 90px);
  --card-height: calc(var(--card-width) * 1.4);

  /* Tableau overlap scales with available space */
  --stack-offset: clamp(18px, 3.5vmin, 28px);
  --stack-offset-facedown: clamp(4px, 0.8vmin, 8px);
}
```

### Container Queries for Iframe
When embedded in recordOS, the game responds to its container, not the viewport:

```css
.game-container {
  container-type: inline-size;
}

@container (max-width: 500px) {
  :root {
    --card-width: 11cqmin;
  }
}
```

### Breakpoint Strategy
| Context | Card Width | Stack Offset |
|---------|------------|--------------|
| Desktop (>900px) | 90px | 28px |
| Tablet (600-900px) | ~70px | ~22px |
| Phone (<600px) | ~55px | ~18px |
| Small iframe (<400px) | ~45px | ~15px |

## Game State Model

Simple JavaScript object, no Redux:

```javascript
const state = {
  stock: [],           // Face-down draw pile
  waste: [],           // Face-up drawn cards
  foundations: [[], [], [], []], // 4 suit piles (goal)
  tableau: [[], [], [], [], [], [], []], // 7 columns

  // For undo
  history: [],

  // Game stats
  moves: 0,
  startTime: null,

  // Settings
  drawCount: 1,        // 1 or 3
};
```

### Card Representation
```javascript
// Card as simple object
{ suit: 'hearts', rank: 7, faceUp: true }

// Suits: 'hearts', 'diamonds', 'clubs', 'spades'
// Ranks: 1 (Ace) through 13 (King)
```

## UX Details (What Made OG Solitaire Feel Good)

### Immediate Feedback
1. **Mousedown/touchstart**: Card lifts slightly (transform + shadow)
2. **Cursor**: `grab` on hover, `grabbing` while dragging
3. **Valid drop zones**: Subtle highlight when dragging over

### Click vs Drag Detection
- Track pointer movement during hold
- If moved <5px before release → treat as click (auto-move)
- If moved ≥5px → treat as drag

### Auto-move Logic (Double-click or single-click)
1. Check if card can go to foundation → move there
2. Check if card can go to valid tableau → move there
3. Otherwise → do nothing

### Stock Pile Behavior
- Click to draw (1 or 3 cards based on settings)
- When empty, click to reset (flip waste back to stock)
- Visual indicator when stock is empty (outline only)

## Win Animation

The classic Windows 3.1 cascading cards:

```javascript
// Don't clear canvas between frames = trail effect
function animateWin() {
  const cards = [...allFoundationCards];
  let cardIndex = 0;

  function launchCard() {
    if (cardIndex >= cards.length * 4) return;

    const card = cards[cardIndex % cards.length];
    const particle = {
      x: foundationPositions[cardIndex % 4].x,
      y: foundationPositions[cardIndex % 4].y,
      vx: (Math.random() - 0.5) * 15,
      vy: -Math.random() * 10 - 5,
      card: card
    };

    particles.push(particle);
    cardIndex++;
    setTimeout(launchCard, 100);
  }

  function animate() {
    // DON'T clear canvas - creates the trail
    particles.forEach(p => {
      p.vy += 0.5; // gravity
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off bottom
      if (p.y > canvas.height) {
        p.y = canvas.height;
        p.vy *= -0.7; // dampen
      }

      drawCard(p.card, p.x, p.y);
    });

    if (particles.some(p => p.vy !== 0 || p.y < canvas.height)) {
      requestAnimationFrame(animate);
    }
  }

  launchCard();
  animate();
}
```

## File Structure

```
classic-responsive-solitaire/
├── index.html          # Single page, all structure
├── css/
│   ├── reset.css       # Minimal reset
│   ├── win95.css       # Windows 95 UI components
│   ├── cards.css       # Card styling + responsive
│   └── game.css        # Game layout
├── js/
│   ├── game.js         # State + rules + validation
│   ├── ui.js           # DOM rendering + updates
│   ├── drag.js         # Pointer events handling
│   ├── animation.js    # Win animation
│   └── main.js         # Init + event wiring
├── cards/              # SVG card assets
│   ├── ace_of_spades.svg
│   ├── ... (52 cards)
│   └── back.svg
├── img/
│   └── felt.png        # Optional table texture
├── vercel.json         # Deployment config
├── README.md           # User-facing docs
├── PLAN.md             # This file
└── LICENSE             # MIT
```

## Windows 95 UI Components Needed

### Title Bar
- Blue gradient background (#000080 to #1084d0)
- White text, bold
- Min/Max/Close buttons (we only need close or maybe just decoration)

### Menu Bar
- Game | Help menus
- Dropdown styling

### Card Table
- Classic green felt (#008000 or similar)
- Slightly textured optional

### Status Bar
- Bottom bar with score, time
- Sunken 3D border effect

### Dialog Boxes (for Settings/Info)
- Gray background (#c0c0c0)
- 3D raised borders
- Standard Win95 buttons

## Settings Modal

```
┌─ Options ──────────────────────────────────────┐
│                                                │
│  Draw:  ○ Draw 1    ● Draw 3                  │
│                                                │
│  Scoring:  ● Standard    ○ Vegas              │
│                                                │
│  [ ] Timed game                               │
│                                                │
│         [  OK  ]    [ Cancel ]                │
└────────────────────────────────────────────────┘
```

## Info/About Modal

```
┌─ About Solitaire ──────────────────────────────┐
│                                                │
│           ♠ ♥ Classic Solitaire ♦ ♣           │
│                                                │
│              Created by Kevin HG               │
│                                                │
│            🌐 kevinhg.com                      │
│            📧 hello@kevinhg.com                │
│            💻 GitHub                           │
│                                                │
│  ─────────────────────────────────────────    │
│                                                │
│  Card assets: vectorized.io                   │
│  Inspired by Microsoft Solitaire (1990)       │
│                                                │
│                   [  OK  ]                     │
└────────────────────────────────────────────────┘
```

## Deployment

### Vercel Config
```json
{
  "version": 2,
  "builds": [
    { "src": "**/*", "use": "@vercel/static" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" }
      ]
    }
  ]
}
```

### Iframe Embedding in recordOS
```javascript
// In recordOS GameWindow config
solitaire: {
  title: 'Solitaire',
  url: 'https://solitaire.kevinhg.com', // or Vercel URL
  width: 700,
  height: 500,
}
```

## Development Phases

### Phase 1: Core Game (Today)
- [ ] HTML structure
- [ ] Win95 CSS styling
- [ ] Responsive card layout
- [ ] Game state + rules
- [ ] Basic rendering

### Phase 2: Interaction
- [ ] Pointer events drag/drop
- [ ] Click feedback
- [ ] Auto-move on click
- [ ] Undo functionality

### Phase 3: Polish
- [ ] Win detection + animation
- [ ] Settings modal
- [ ] Info modal
- [ ] Sound effects (optional)

### Phase 4: Deploy
- [ ] Vercel setup
- [ ] Test standalone
- [ ] Test in recordOS iframe
- [ ] Final tweaks

## Resources & Credits

- **Card SVGs**: From recordOS assets (originally vectorized.io, public domain)
- **Game rules reference**: rjanjic/js-solitaire notes.txt
- **Win95 styling reference**: piotrbartnik/solitaire95
- **Responsive patterns**: JLogical-Apps/cards concept
- **Win animation**: Classic Windows 3.1 "don't clear canvas" technique

## License

MIT - Free to use, modify, distribute.
