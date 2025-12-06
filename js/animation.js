/**
 * Win Animation
 * Classic bouncing cards with trail effect
 * Matches recordOS dark card theme
 */

const WinAnimation = {
  canvas: null,
  ctx: null,
  particles: [],
  trails: [],
  isRunning: false,
  cardWidth: 60,
  cardHeight: 84,
  maxTrails: 150,

  // Card colors matching recordOS theme
  colors: {
    cardBg: '#1a1a1a',
    cardBorder: '#3a3a3a',
    red: '#ff4444',      // hearts, diamonds
    green: '#00ff41'     // spades, clubs
  },

  suits: {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  },

  rankDisplay: {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
  },

  init() {
    this.canvas = document.getElementById('win-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Click anywhere to dismiss
    this.canvas.addEventListener('click', () => {
      if (this.isRunning) {
        this.stop();
      }
    });

    // Escape or space to dismiss
    document.addEventListener('keydown', (e) => {
      if (this.isRunning && (e.key === 'Escape' || e.key === ' ')) {
        e.preventDefault();
        this.stop();
      }
    });
  },

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.particles = [];
    this.trails = [];

    // Set canvas size
    const container = this.canvas.parentElement;
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    this.canvas.classList.add('active');

    // Get actual card size from CSS
    const rootStyle = getComputedStyle(document.documentElement);
    const cssCardWidth = rootStyle.getPropertyValue('--card-width');

    // Parse the CSS value (could be "min(12vw, 90px)" etc)
    // Use a test element to get computed size
    const testCard = document.querySelector('.card');
    if (testCard) {
      const rect = testCard.getBoundingClientRect();
      this.cardWidth = rect.width;
      this.cardHeight = rect.height;
    } else {
      // Fallback
      this.cardWidth = Math.min(this.canvas.width * 0.12, 90);
      this.cardHeight = this.cardWidth * 1.4;
    }

    // Get foundation positions
    const foundationPositions = [];
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`foundation-${i}`);
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      foundationPositions.push({
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
      });
    }

    // Get all cards from foundations (K first, then Q, J, etc.)
    const allCards = [];
    for (let rank = 13; rank >= 1; rank--) {
      for (let i = 0; i < 4; i++) {
        const card = Game.state.foundations[i].find(c => c.rank === rank);
        if (card) {
          allCards.push({ card, foundationIndex: i });
        }
      }
    }

    // Launch cards with delay
    let cardIndex = 0;
    const launchInterval = setInterval(() => {
      if (cardIndex >= allCards.length || !this.isRunning) {
        clearInterval(launchInterval);
        return;
      }

      const { card, foundationIndex } = allCards[cardIndex];
      const pos = foundationPositions[foundationIndex];

      // Launch direction based on foundation position
      const direction = foundationIndex < 2 ? -1 : 1;

      this.particles.push({
        card: card,
        x: pos.x,
        y: pos.y,
        vx: direction * (Math.random() * 4 + 3),
        vy: -(Math.random() * 5 + 2),
        active: true
      });

      cardIndex++;
    }, 120);

    this.animate();
  },

  animate() {
    if (!this.isRunning) return;

    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw crosshatch background
    this.drawBackground();

    // Draw trails (faded)
    for (const trail of this.trails) {
      this.drawCard(trail.card, trail.x, trail.y, trail.alpha);
    }

    // Fade trails
    this.trails = this.trails.filter(t => {
      t.alpha -= 0.015;
      return t.alpha > 0;
    });

    // Limit trails
    if (this.trails.length > this.maxTrails) {
      this.trails = this.trails.slice(-this.maxTrails);
    }

    const gravity = 0.35;
    const bounce = 0.7;
    let activeCount = 0;

    for (const p of this.particles) {
      if (!p.active) continue;

      // Add trail
      this.trails.push({
        card: p.card,
        x: p.x,
        y: p.y,
        alpha: 0.7
      });

      // Physics
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off bottom
      if (p.y + this.cardHeight > this.canvas.height) {
        p.y = this.canvas.height - this.cardHeight;
        p.vy *= -bounce;

        if (Math.abs(p.vy) < 1.5) {
          p.active = false;
          continue;
        }
      }

      // Remove if off screen
      if (p.x < -this.cardWidth || p.x > this.canvas.width + this.cardWidth) {
        p.active = false;
        continue;
      }

      // Draw current card
      this.drawCard(p.card, p.x, p.y, 1);
      activeCount++;
    }

    if (activeCount > 0 || this.particles.length < 52) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.fadeOut();
    }
  },

  drawBackground() {
    this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    this.ctx.lineWidth = 1;
    const step = 20;
    for (let i = -this.canvas.height; i < this.canvas.width + this.canvas.height; i += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i + this.canvas.height, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(i + this.canvas.height, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
  },

  fadeOut() {
    if (this.trails.length === 0) {
      setTimeout(() => { this.isRunning = false; }, 500);
      return;
    }

    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();

    for (const trail of this.trails) {
      this.drawCard(trail.card, trail.x, trail.y, trail.alpha);
    }

    this.trails = this.trails.filter(t => {
      t.alpha -= 0.025;
      return t.alpha > 0;
    });

    if (this.trails.length > 0) {
      requestAnimationFrame(() => this.fadeOut());
    } else {
      setTimeout(() => { this.isRunning = false; }, 500);
    }
  },

  drawCard(card, x, y, alpha = 1) {
    const ctx = this.ctx;
    const w = this.cardWidth;
    const h = this.cardHeight;
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitColor = isRed ? this.colors.red : this.colors.green;

    ctx.globalAlpha = alpha;

    // Card background (dark like our CSS cards)
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(x, y, w, h);

    // Card border
    ctx.strokeStyle = this.colors.cardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Inner shadow effect (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // Rank and suit in suit color
    ctx.fillStyle = suitColor;

    const rank = this.rankDisplay[card.rank];
    const suit = this.suits[card.suit];
    const fontSize = Math.floor(w * 0.28);
    const suitSize = Math.floor(w * 0.18);
    const centerSize = Math.floor(w * 0.45);

    // Top-left corner
    ctx.font = `${fontSize}px VT323, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(rank, x + w * 0.2, y + 3);

    ctx.font = `${suitSize}px serif`;
    ctx.fillText(suit, x + w * 0.2, y + fontSize + 2);

    // Center suit (or letter for face cards)
    ctx.font = `${centerSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (card.rank >= 11) {
      // Face card - show letter
      ctx.font = `${centerSize}px VT323, monospace`;
      ctx.fillText(rank, x + w / 2, y + h / 2);
    } else {
      ctx.fillText(suit, x + w / 2, y + h / 2);
    }

    // Bottom-right corner (rotated)
    ctx.save();
    ctx.translate(x + w - w * 0.2, y + h - 3);
    ctx.rotate(Math.PI);
    ctx.font = `${fontSize}px VT323, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(rank, 0, 0);
    ctx.font = `${suitSize}px serif`;
    ctx.fillText(suit, 0, fontSize - 1);
    ctx.restore();

    ctx.globalAlpha = 1;
  },

  stop() {
    this.isRunning = false;
    this.particles = [];
    this.trails = [];
    this.canvas.classList.remove('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
};
