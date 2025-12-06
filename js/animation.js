/**
 * Win Animation
 * Classic bouncing cards with trail effect
 * Optimized for performance with canvas-drawn cards
 */

const WinAnimation = {
  canvas: null,
  ctx: null,
  particles: [],
  trails: [],
  isRunning: false,
  cardWidth: 60,
  cardHeight: 84,
  maxTrails: 200,

  // Card colors matching recordOS theme
  colors: {
    red: '#ff4444',
    black: '#1a1a1a',
    cardBg: '#f8f8f8',
    cardBorder: '#2a2a2a'
  },

  // Suit symbols
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

    // Escape or any key to dismiss
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

    // Calculate card size based on viewport
    this.cardWidth = Math.min(60, this.canvas.width / 12);
    this.cardHeight = this.cardWidth * 1.4;

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

    // Get all cards from foundations (in order: K, Q, J, 10... A for each)
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
        vy: -(Math.random() * 6 + 2),
        active: true
      });

      cardIndex++;
    }, 150); // Slower launch rate

    this.animate();
  },

  animate() {
    if (!this.isRunning) return;

    // Clear canvas each frame
    this.ctx.fillStyle = 'rgba(10, 10, 10, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw crosshatch background (simplified)
    this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width + this.canvas.height; i += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i - this.canvas.height, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(i - this.canvas.height, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }

    // Draw trails (older first)
    for (const trail of this.trails) {
      this.drawCard(trail.card, trail.x, trail.y, trail.alpha);
    }

    // Fade out old trails
    this.trails = this.trails.filter(t => {
      t.alpha -= 0.02;
      return t.alpha > 0;
    });

    // Limit trail count for performance
    if (this.trails.length > this.maxTrails) {
      this.trails = this.trails.slice(-this.maxTrails);
    }

    const gravity = 0.3;
    const bounce = 0.7;
    let activeCount = 0;

    for (const p of this.particles) {
      if (!p.active) continue;

      // Add trail before moving
      this.trails.push({
        card: p.card,
        x: p.x,
        y: p.y,
        alpha: 0.8
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

      // Remove if off screen horizontally
      if (p.x < -this.cardWidth || p.x > this.canvas.width + this.cardWidth) {
        p.active = false;
        continue;
      }

      // Draw current card position
      this.drawCard(p.card, p.x, p.y, 1);
      activeCount++;
    }

    // Continue if cards are still moving or launching
    if (activeCount > 0 || this.particles.length < 52) {
      requestAnimationFrame(() => this.animate());
    } else {
      // Keep trails visible for a moment
      this.fadeOut();
    }
  },

  fadeOut() {
    if (this.trails.length === 0) {
      setTimeout(() => {
        this.isRunning = false;
      }, 1000);
      return;
    }

    this.ctx.fillStyle = 'rgba(10, 10, 10, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw crosshatch
    this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width + this.canvas.height; i += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i - this.canvas.height, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(i - this.canvas.height, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }

    for (const trail of this.trails) {
      this.drawCard(trail.card, trail.x, trail.y, trail.alpha);
    }

    this.trails = this.trails.filter(t => {
      t.alpha -= 0.03;
      return t.alpha > 0;
    });

    if (this.trails.length > 0) {
      requestAnimationFrame(() => this.fadeOut());
    } else {
      setTimeout(() => {
        this.isRunning = false;
      }, 1000);
    }
  },

  drawCard(card, x, y, alpha = 1) {
    const ctx = this.ctx;
    const w = this.cardWidth;
    const h = this.cardHeight;
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const color = isRed ? this.colors.red : this.colors.black;

    ctx.globalAlpha = alpha;

    // Card background
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(x, y, w, h);

    // Card border
    ctx.strokeStyle = this.colors.cardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Rank and suit
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(w * 0.35)}px VT323, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const rank = this.rankDisplay[card.rank];
    const suit = this.suits[card.suit];

    // Top left
    ctx.fillText(rank, x + 3, y + 2);
    ctx.font = `${Math.floor(w * 0.3)}px serif`;
    ctx.fillText(suit, x + 3, y + w * 0.3);

    // Center suit (larger)
    ctx.font = `${Math.floor(w * 0.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suit, x + w / 2, y + h / 2);

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
