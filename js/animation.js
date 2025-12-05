/**
 * Win Animation
 * Classic Windows 3.1 cascading card effect
 */

const WinAnimation = {
  canvas: null,
  ctx: null,
  particles: [],
  isRunning: false,
  cardWidth: 71,
  cardHeight: 96,
  cardImages: {},

  /**
   * Initialize the animation system
   */
  init() {
    this.canvas = document.getElementById('win-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Preload card images
    this.preloadCards();
  },

  /**
   * Preload card images for the animation
   */
  preloadCards() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const rankNames = {
      1: 'ace', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
      8: '8', 9: '9', 10: '10', 11: 'jack', 12: 'queen', 13: 'king'
    };

    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        const key = `${suit}-${rank}`;
        const img = new Image();
        img.src = `cards/${rankNames[rank]}_of_${suit}.svg`;
        this.cardImages[key] = img;
      }
    }
  },

  /**
   * Start the win animation
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.particles = [];

    // Set canvas size
    const container = this.canvas.parentElement;
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    this.canvas.classList.add('active');

    // Calculate card size based on current CSS
    const rootStyle = getComputedStyle(document.documentElement);
    this.cardWidth = parseFloat(rootStyle.getPropertyValue('--card-width')) || 71;
    this.cardHeight = this.cardWidth * 1.4;

    // Get foundation positions
    const foundationPositions = [];
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`foundation-${i}`);
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      foundationPositions.push({
        x: rect.left - containerRect.left + this.cardWidth / 2,
        y: rect.top - containerRect.top,
      });
    }

    // Get all cards from foundations
    const allCards = [];
    for (let i = 0; i < 4; i++) {
      for (const card of Game.state.foundations[i]) {
        allCards.push({ card, foundationIndex: i });
      }
    }

    // Launch cards one at a time
    let cardIndex = 0;
    const launchInterval = setInterval(() => {
      if (cardIndex >= allCards.length || !this.isRunning) {
        clearInterval(launchInterval);
        return;
      }

      // Launch from each foundation in sequence
      const foundationIndex = cardIndex % 4;
      const cardsFromFoundation = allCards.filter(c => c.foundationIndex === foundationIndex);
      const cardInFoundation = Math.floor(cardIndex / 4);

      if (cardInFoundation < cardsFromFoundation.length) {
        const { card } = cardsFromFoundation[cardInFoundation];
        const pos = foundationPositions[foundationIndex];

        this.particles.push({
          card: card,
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 12 + (foundationIndex - 1.5) * 3,
          vy: -Math.random() * 8 - 4,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        });
      }

      cardIndex++;
    }, 80);

    // Start animation loop
    this.animate();
  },

  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;

    // DON'T clear canvas - this creates the trail effect!
    // Only clear on first frame
    if (this.particles.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    const gravity = 0.4;
    const bounce = 0.65;
    const friction = 0.99;

    let activeParticles = 0;

    for (const p of this.particles) {
      // Apply physics
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= friction;
      p.rotation += p.rotationSpeed;

      // Bounce off bottom
      if (p.y + this.cardHeight > this.canvas.height) {
        p.y = this.canvas.height - this.cardHeight;
        p.vy *= -bounce;
        p.vx *= 0.9;
        p.rotationSpeed *= 0.8;

        // Stop if velocity is very low
        if (Math.abs(p.vy) < 1) {
          p.vy = 0;
        }
      }

      // Bounce off sides
      if (p.x < 0) {
        p.x = 0;
        p.vx *= -bounce;
      }
      if (p.x + this.cardWidth > this.canvas.width) {
        p.x = this.canvas.width - this.cardWidth;
        p.vx *= -bounce;
      }

      // Draw the card
      this.drawCard(p);

      // Count active particles
      if (Math.abs(p.vy) > 0.5 || p.y < this.canvas.height - this.cardHeight - 1) {
        activeParticles++;
      }
    }

    // Continue animation
    if (activeParticles > 0 || this.particles.length < 52) {
      requestAnimationFrame(() => this.animate());
    } else {
      // Animation complete - wait a moment then allow restart
      setTimeout(() => {
        this.isRunning = false;
      }, 2000);
    }
  },

  /**
   * Draw a single card
   */
  drawCard(particle) {
    const img = this.cardImages[particle.card.id];
    if (!img || !img.complete) return;

    this.ctx.save();
    this.ctx.translate(particle.x + this.cardWidth / 2, particle.y + this.cardHeight / 2);
    this.ctx.rotate(particle.rotation);
    this.ctx.drawImage(
      img,
      -this.cardWidth / 2,
      -this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight
    );
    this.ctx.restore();
  },

  /**
   * Stop the animation
   */
  stop() {
    this.isRunning = false;
    this.particles = [];
    this.canvas.classList.remove('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
};
