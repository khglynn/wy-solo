# Classic Solitaire

A lightweight, responsive Klondike Solitaire game with authentic Windows 95 aesthetics.

**[Play Now →](https://classic-responsive-solitare.vercel.app)**

![Solitaire Screenshot](screenshot.png)

## Features

- **Authentic Win95 Look** - Pixel-perfect Windows 95 styling
- **Fully Responsive** - Scales beautifully from phone to desktop
- **Touch Friendly** - Works great on mobile and tablet
- **Classic Win Animation** - The iconic cascading cards celebration
- **Undo Support** - Made a mistake? Ctrl+Z or use the menu
- **Draw 1 or Draw 3** - Your choice in settings
- **No Dependencies** - Pure vanilla JavaScript, HTML, CSS
- **Iframe Ready** - Embed it anywhere

## Controls

- **Click** a card to auto-move it to a valid location
- **Drag** cards to move them manually
- **Click the stock** (top-left pile) to draw cards
- **Spacebar** to draw from stock
- **Ctrl+Z** to undo
- **Ctrl+N** for new game

## Embedding

This game is designed to be embedded in iframes. The headers are configured to allow framing from any origin.

```html
<iframe
  src="https://classic-responsive-solitare.vercel.app"
  width="700"
  height="500"
  style="border: none;"
></iframe>
```

## Development

No build step required - just serve the files:

```bash
# Using Python
python -m http.server 8000

# Using Node
npx serve

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000

## Project Structure

```
├── index.html          # Main page
├── css/
│   ├── win95.css       # Windows 95 UI components
│   ├── cards.css       # Card styling + responsiveness
│   └── game.css        # Game layout
├── js/
│   ├── game.js         # Game state + rules
│   ├── ui.js           # DOM rendering
│   ├── drag.js         # Pointer events handling
│   ├── animation.js    # Win animation
│   └── main.js         # App initialization
├── cards/              # SVG card assets
└── vercel.json         # Deployment config
```

## Credits

- **Card Artwork**: [vectorized.io](https://vectorized.io) (Public Domain)
- **Inspiration**: Microsoft Solitaire (1990) by Wes Cherry

## Author

**Kevin HG**
- Website: [kevinhg.com](https://kevinhg.com)
- Email: [hello@kevinhg.com](mailto:hello@kevinhg.com)
- GitHub: [@khglynn](https://github.com/khglynn)

## License

MIT License - Feel free to use, modify, and distribute.

---

Built for [recordOS](https://github.com/khglynn/recordOS)
