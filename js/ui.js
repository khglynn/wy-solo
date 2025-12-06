/**
 * UI Rendering
 * Handles all DOM manipulation and visual updates
 */

const UI = {
  // DOM element references
  elements: {
    stock: null,
    waste: null,
    foundations: [],
    tableau: [],
    score: null,
    time: null,
    moves: null,
    winCanvas: null,
  },

  // Track rendered state for efficient updates
  lastRenderedState: null,

  /**
   * Initialize UI references
   */
  init() {
    this.elements.stock = document.getElementById('stock');
    this.elements.waste = document.getElementById('waste');
    this.elements.score = document.getElementById('score');
    this.elements.time = document.getElementById('time');
    this.elements.moves = document.getElementById('moves');
    this.elements.winCanvas = document.getElementById('win-canvas');

    for (let i = 0; i < 4; i++) {
      this.elements.foundations[i] = document.getElementById(`foundation-${i}`);
    }

    for (let i = 0; i < 7; i++) {
      this.elements.tableau[i] = document.getElementById(`tableau-${i}`);
    }

    // Check if we're in an iframe
    if (window.parent !== window) {
      document.getElementById('game-window').classList.add('iframe-mode');
    }

    // Re-render on resize (handles orientation changes)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (Game.state) {
          this.render();
        }
      }, 100);
    });
  },

  /**
   * Get rank display text
   */
  getRankDisplay(rank) {
    const ranks = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return ranks[rank] || rank.toString();
  },

  /**
   * Create a card DOM element
   */
  createCardElement(card, options = {}) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.cardId = card.id;
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank;

    if (!card.faceUp) {
      el.classList.add('facedown');
    }

    if (options.clickable) {
      el.classList.add('clickable');
    }

    if (options.flippable) {
      el.classList.add('flippable');
    }

    if (options.top !== undefined) {
      el.style.top = `${options.top}px`;
    }

    if (options.zIndex !== undefined) {
      el.style.zIndex = options.zIndex;
    }

    // Add card face content (CSS handles suit symbols via ::before)
    const rankDisplay = this.getRankDisplay(card.rank);
    el.innerHTML = `
      <div class="card-corner top">
        <span class="card-rank">${rankDisplay}</span>
        <span class="card-suit-small"></span>
      </div>
      <div class="card-center"></div>
      <div class="card-corner bottom">
        <span class="card-rank">${rankDisplay}</span>
        <span class="card-suit-small"></span>
      </div>
    `;

    return el;
  },

  /**
   * Render the stock pile
   */
  renderStock() {
    const stock = this.elements.stock;

    // Clear existing cards
    stock.querySelectorAll('.card').forEach(el => el.remove());

    // Show placeholder or cards
    const placeholder = stock.querySelector('.pile-placeholder');

    if (Game.state.stock.length === 0) {
      stock.classList.add('empty');
      placeholder.style.display = 'flex';
    } else {
      stock.classList.remove('empty');
      placeholder.style.display = 'none';

      // Show top card (face down)
      const topCard = Game.state.stock[Game.state.stock.length - 1];
      const cardEl = this.createCardElement(topCard, { clickable: true });
      stock.appendChild(cardEl);
    }
  },

  /**
   * Render the waste pile
   */
  renderWaste() {
    const waste = this.elements.waste;

    // Clear existing cards
    waste.querySelectorAll('.card').forEach(el => el.remove());

    const wasteCards = Game.state.waste;
    if (wasteCards.length === 0) return;

    // Show up to 3 cards (or drawCount if draw 1)
    const visibleCount = Game.settings.drawCount === 1 ? 1 : Math.min(3, wasteCards.length);
    const startIndex = Math.max(0, wasteCards.length - visibleCount);

    for (let i = startIndex; i < wasteCards.length; i++) {
      const card = wasteCards[i];
      const isTop = (i === wasteCards.length - 1);
      const cardEl = this.createCardElement(card, {
        zIndex: i - startIndex,
      });

      // Only the top card is interactive
      if (!isTop) {
        cardEl.style.pointerEvents = 'none';
      }

      waste.appendChild(cardEl);
    }
  },

  /**
   * Render the foundations
   */
  renderFoundations() {
    for (let i = 0; i < 4; i++) {
      const foundation = this.elements.foundations[i];
      const pile = Game.state.foundations[i];

      // Clear existing cards
      foundation.querySelectorAll('.card').forEach(el => el.remove());

      // Show placeholder or top card
      const placeholder = foundation.querySelector('.pile-placeholder');

      if (pile.length === 0) {
        placeholder.style.display = 'flex';
      } else {
        placeholder.style.display = 'none';

        // Only show top card
        const topCard = pile[pile.length - 1];
        const cardEl = this.createCardElement(topCard);
        foundation.appendChild(cardEl);
      }
    }
  },

  /**
   * Check if we're in mobile horizontal layout mode
   */
  isMobileLayout() {
    return window.innerWidth <= 500;
  },

  /**
   * Calculate mobile offsets that fit within available width
   */
  calculateMobileOffsets(pile, availableWidth, cardWidth) {
    if (pile.length <= 1) return { faceUp: 0, faceDown: 0 };

    // Count face-up and face-down cards (excluding last card which doesn't need offset)
    let faceUpCount = 0;
    let faceDownCount = 0;
    for (let i = 0; i < pile.length - 1; i++) {
      if (pile[i].faceUp) faceUpCount++;
      else faceDownCount++;
    }

    // Calculate max offset we can use
    // Total width = cardWidth + (faceUpCount * faceUpOffset) + (faceDownCount * faceDownOffset)
    // Solve for offsets with faceUp being ~3x faceDown
    const spaceForOffsets = availableWidth - cardWidth;
    const weightedCount = faceUpCount * 3 + faceDownCount;

    if (weightedCount === 0) return { faceUp: 20, faceDown: 8 };

    const baseOffset = spaceForOffsets / weightedCount;
    const faceDownOffset = Math.min(Math.max(baseOffset, 4), 10);
    const faceUpOffset = Math.min(Math.max(baseOffset * 3, 12), 24);

    return { faceUp: faceUpOffset, faceDown: faceDownOffset };
  },

  /**
   * Render the tableau
   */
  renderTableau() {
    const stackOffset = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--stack-offset')) || 25;
    const facedownOffset = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--stack-offset-facedown')) || 6;

    const isMobile = this.isMobileLayout();
    const cardWidth = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--card-width')) || 60;
    const availableWidth = window.innerWidth - 24; // Account for padding

    for (let i = 0; i < 7; i++) {
      const tableauEl = this.elements.tableau[i];
      const pile = Game.state.tableau[i];

      // Clear existing cards
      tableauEl.querySelectorAll('.card').forEach(el => el.remove());

      // Calculate dynamic offsets for mobile
      const mobileOffsets = isMobile
        ? this.calculateMobileOffsets(pile, availableWidth, cardWidth)
        : null;

      let offset = 0;

      for (let j = 0; j < pile.length; j++) {
        const card = pile[j];
        const isLast = (j === pile.length - 1);
        const isLastFacedown = !card.faceUp && (j === pile.length - 1 || pile[j + 1]?.faceUp);

        const cardEl = this.createCardElement(card, {
          zIndex: j,
          flippable: isLastFacedown,
        });

        // Position cards: vertical on desktop, horizontal on mobile
        if (isMobile) {
          cardEl.style.left = `${offset}px`;
          cardEl.style.top = '0';
        } else {
          cardEl.style.top = `${offset}px`;
        }

        tableauEl.appendChild(cardEl);

        // Calculate offset for next card
        if (isMobile) {
          offset += card.faceUp ? mobileOffsets.faceUp : mobileOffsets.faceDown;
        } else {
          offset += card.faceUp ? stackOffset : facedownOffset;
        }
      }
    }
  },

  /**
   * Render the entire game state
   */
  render() {
    if (!Game.state) return;

    this.renderStock();
    this.renderWaste();
    this.renderFoundations();
    this.renderTableau();
    this.updateStats();
  },

  /**
   * Update score, time, moves display
   */
  updateStats() {
    this.elements.score.textContent = Game.state.score;
    this.elements.moves.textContent = Game.state.moves;
  },

  /**
   * Update just the time display (called by timer)
   */
  updateTime() {
    const elapsed = Game.getElapsedTime();
    this.elements.time.textContent = Game.formatTime(elapsed);
  },

  /**
   * Highlight valid drop zones
   */
  highlightValidDrops(card) {
    // Clear existing highlights
    this.clearHighlights();

    if (!card) return;

    // Check foundations
    for (let i = 0; i < 4; i++) {
      if (Game.canPlaceOnFoundation(card, i)) {
        this.elements.foundations[i].classList.add('valid-drop');
      }
    }

    // Check tableau
    for (let i = 0; i < 7; i++) {
      if (Game.canPlaceOnTableau(card, i)) {
        this.elements.tableau[i].classList.add('valid-drop');
      }
    }
  },

  /**
   * Clear drop zone highlights
   */
  clearHighlights() {
    document.querySelectorAll('.valid-drop').forEach(el => {
      el.classList.remove('valid-drop');
    });
  },

  /**
   * Flash a card (for invalid move feedback)
   */
  flashCard(cardEl) {
    cardEl.style.animation = 'shake 0.3s ease';
    setTimeout(() => {
      cardEl.style.animation = '';
    }, 300);
  },

  /**
   * Show modal
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  /**
   * Hide modal
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Hide all modals
   */
  hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
  },

  /**
   * Get the pile element a card belongs to
   */
  getPileFromCard(cardEl) {
    return cardEl.closest('.pile');
  },

  /**
   * Get all cards in a pile that should move with a dragged card
   */
  getCardsToMove(cardEl) {
    const pile = this.getPileFromCard(cardEl);
    if (!pile || !pile.classList.contains('tableau-pile')) {
      return [cardEl];
    }

    const cards = Array.from(pile.querySelectorAll('.card'));
    const cardIndex = cards.indexOf(cardEl);
    return cards.slice(cardIndex);
  },

  /**
   * Get drop target from coordinates
   */
  getDropTarget(x, y, excludeCards = []) {
    // Hide dragged cards temporarily
    excludeCards.forEach(el => el.style.pointerEvents = 'none');

    const element = document.elementFromPoint(x, y);

    // Restore pointer events
    excludeCards.forEach(el => el.style.pointerEvents = '');

    if (!element) return null;

    // Check if we hit a pile
    const pile = element.closest('.pile');
    if (!pile) return null;

    // Determine pile type and index
    if (pile.classList.contains('foundation')) {
      const index = parseInt(pile.id.split('-')[1]);
      return { type: 'foundation', index, element: pile };
    }

    if (pile.classList.contains('tableau-pile')) {
      const index = parseInt(pile.id.split('-')[1]);
      return { type: 'tableau', index, element: pile };
    }

    return null;
  },
};

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);
