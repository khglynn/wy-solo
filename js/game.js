/**
 * Solitaire Game Logic
 * Pure game state management and rule validation
 */

const Game = {
  // Suits and their properties
  SUITS: ['hearts', 'diamonds', 'clubs', 'spades'],
  RED_SUITS: ['hearts', 'diamonds'],
  BLACK_SUITS: ['clubs', 'spades'],

  // Game state
  state: null,

  // Settings
  settings: {
    drawCount: 1,
    scoring: 'standard', // 'standard', 'vegas', 'none'
  },

  /**
   * Create a new card object
   */
  createCard(suit, rank) {
    return {
      suit,
      rank,
      faceUp: false,
      id: `${suit}-${rank}`,
    };
  },

  /**
   * Create a fresh 52-card deck
   */
  createDeck() {
    const deck = [];
    for (const suit of this.SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push(this.createCard(suit, rank));
      }
    }
    return deck;
  },

  /**
   * Fisher-Yates shuffle
   */
  shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Initialize a new game
   */
  newGame() {
    const deck = this.shuffle(this.createDeck());

    this.state = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      history: [],
      moves: 0,
      score: 0,
      startTime: Date.now(),
    };

    // Deal to tableau (1 card to first pile, 2 to second, etc.)
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[cardIndex++];
        // Only the top card of each pile is face up
        card.faceUp = (row === col);
        this.state.tableau[col].push(card);
      }
    }

    // Remaining cards go to stock
    this.state.stock = deck.slice(cardIndex);

    return this.state;
  },

  /**
   * Save current state for undo
   */
  saveState() {
    this.state.history.push(JSON.stringify({
      stock: this.state.stock,
      waste: this.state.waste,
      foundations: this.state.foundations,
      tableau: this.state.tableau,
      moves: this.state.moves,
      score: this.state.score,
    }));

    // Limit history to 50 moves
    if (this.state.history.length > 50) {
      this.state.history.shift();
    }
  },

  /**
   * Undo last move
   */
  undo() {
    if (this.state.history.length === 0) return false;

    const previous = JSON.parse(this.state.history.pop());
    this.state.stock = previous.stock;
    this.state.waste = previous.waste;
    this.state.foundations = previous.foundations;
    this.state.tableau = previous.tableau;
    this.state.moves = previous.moves;
    this.state.score = previous.score;

    return true;
  },

  /**
   * Check if card is red
   */
  isRed(card) {
    return this.RED_SUITS.includes(card.suit);
  },

  /**
   * Check if two cards are opposite colors
   */
  areOppositeColors(card1, card2) {
    return this.isRed(card1) !== this.isRed(card2);
  },

  /**
   * Get foundation index for a suit
   */
  getFoundationIndex(suit) {
    return this.SUITS.indexOf(suit);
  },

  /**
   * Check if a card can be placed on a foundation
   */
  canPlaceOnFoundation(card, foundationIndex) {
    const foundation = this.state.foundations[foundationIndex];
    const expectedSuit = this.SUITS[foundationIndex];

    // Card must match the foundation's suit
    if (card.suit !== expectedSuit) return false;

    if (foundation.length === 0) {
      // Only Aces can start a foundation
      return card.rank === 1;
    }

    // Must be one rank higher than the top card
    const topCard = foundation[foundation.length - 1];
    return card.rank === topCard.rank + 1;
  },

  /**
   * Check if a card can be placed on a tableau pile
   */
  canPlaceOnTableau(card, tableauIndex) {
    const pile = this.state.tableau[tableauIndex];

    if (pile.length === 0) {
      // Only Kings can go on empty tableau
      return card.rank === 13;
    }

    const topCard = pile[pile.length - 1];

    // Must be face up, opposite color, and one rank lower
    return topCard.faceUp &&
           this.areOppositeColors(card, topCard) &&
           card.rank === topCard.rank - 1;
  },

  /**
   * Draw cards from stock to waste
   */
  drawFromStock() {
    if (this.state.stock.length === 0) {
      // Reset: move waste back to stock
      if (this.state.waste.length === 0) return false;

      this.saveState();

      // Flip all waste cards face down and reverse
      this.state.stock = this.state.waste.reverse().map(card => {
        card.faceUp = false;
        return card;
      });
      this.state.waste = [];

      // Vegas scoring: -100 for reset (only first time matters)
      if (this.settings.scoring === 'vegas') {
        this.state.score = Math.max(0, this.state.score - 100);
      }

      return true;
    }

    this.saveState();

    // Draw 1 or 3 cards
    const count = Math.min(this.settings.drawCount, this.state.stock.length);
    for (let i = 0; i < count; i++) {
      const card = this.state.stock.pop();
      card.faceUp = true;
      this.state.waste.push(card);
    }

    this.state.moves++;
    return true;
  },

  /**
   * Find where a card currently is
   */
  findCard(cardId) {
    // Check waste
    const wasteIndex = this.state.waste.findIndex(c => c.id === cardId);
    if (wasteIndex !== -1) {
      return { location: 'waste', index: wasteIndex };
    }

    // Check foundations
    for (let i = 0; i < 4; i++) {
      const foundIndex = this.state.foundations[i].findIndex(c => c.id === cardId);
      if (foundIndex !== -1) {
        return { location: 'foundation', pileIndex: i, index: foundIndex };
      }
    }

    // Check tableau
    for (let i = 0; i < 7; i++) {
      const foundIndex = this.state.tableau[i].findIndex(c => c.id === cardId);
      if (foundIndex !== -1) {
        return { location: 'tableau', pileIndex: i, index: foundIndex };
      }
    }

    return null;
  },

  /**
   * Get the card at the top of the waste pile
   */
  getTopWasteCard() {
    if (this.state.waste.length === 0) return null;
    return this.state.waste[this.state.waste.length - 1];
  },

  /**
   * Move card(s) from one location to another
   */
  moveCards(fromLocation, toLocation) {
    this.saveState();

    let cards = [];
    let sourceFlipped = false;

    // Remove cards from source
    if (fromLocation.location === 'waste') {
      cards = [this.state.waste.pop()];
    } else if (fromLocation.location === 'foundation') {
      cards = [this.state.foundations[fromLocation.pileIndex].pop()];
    } else if (fromLocation.location === 'tableau') {
      // Take this card and all cards below it
      cards = this.state.tableau[fromLocation.pileIndex].splice(fromLocation.index);

      // Flip the new top card if needed
      const pile = this.state.tableau[fromLocation.pileIndex];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        sourceFlipped = true;
      }
    }

    // Add cards to destination
    if (toLocation.location === 'foundation') {
      this.state.foundations[toLocation.pileIndex].push(...cards);
      // Score for moving to foundation
      if (this.settings.scoring === 'standard') {
        this.state.score += 10;
      } else if (this.settings.scoring === 'vegas') {
        this.state.score += 5;
      }
    } else if (toLocation.location === 'tableau') {
      this.state.tableau[toLocation.pileIndex].push(...cards);
      // Score for flipping a card
      if (sourceFlipped && this.settings.scoring === 'standard') {
        this.state.score += 5;
      }
    }

    this.state.moves++;
    return true;
  },

  /**
   * Try to auto-move a card (for click/double-click)
   * Returns the destination if successful, null otherwise
   */
  tryAutoMove(cardId) {
    const location = this.findCard(cardId);
    if (!location) return null;

    let card;
    if (location.location === 'waste') {
      card = this.state.waste[location.index];
    } else if (location.location === 'tableau') {
      card = this.state.tableau[location.pileIndex][location.index];
      // Can only auto-move the top card or a face-up sequence
      if (!card.faceUp) return null;
    } else if (location.location === 'foundation') {
      card = this.state.foundations[location.pileIndex][location.index];
    }

    // First, try to move to foundation (only single cards)
    if (location.location !== 'foundation') {
      // Check if it's a single card move (top of pile or waste)
      const isSingleCard = (location.location === 'waste') ||
        (location.location === 'tableau' &&
         location.index === this.state.tableau[location.pileIndex].length - 1);

      if (isSingleCard) {
        const foundationIndex = this.getFoundationIndex(card.suit);
        if (this.canPlaceOnFoundation(card, foundationIndex)) {
          this.moveCards(location, { location: 'foundation', pileIndex: foundationIndex });
          return { location: 'foundation', pileIndex: foundationIndex };
        }
      }
    }

    // Then, try to move to tableau
    for (let i = 0; i < 7; i++) {
      if (location.location === 'tableau' && location.pileIndex === i) continue;
      if (this.canPlaceOnTableau(card, i)) {
        this.moveCards(location, { location: 'tableau', pileIndex: i });
        return { location: 'tableau', pileIndex: i };
      }
    }

    return null;
  },

  /**
   * Check if the game is won
   */
  isWon() {
    return this.state.foundations.every(f => f.length === 13);
  },

  /**
   * Check if there are any valid moves remaining
   */
  hasValidMoves() {
    // Can always draw if stock has cards or waste can be reset
    if (this.state.stock.length > 0 || this.state.waste.length > 0) {
      return true;
    }

    // Check waste card
    const wasteCard = this.getTopWasteCard();
    if (wasteCard) {
      // Check foundations
      const fi = this.getFoundationIndex(wasteCard.suit);
      if (this.canPlaceOnFoundation(wasteCard, fi)) return true;

      // Check tableau
      for (let i = 0; i < 7; i++) {
        if (this.canPlaceOnTableau(wasteCard, i)) return true;
      }
    }

    // Check tableau cards
    for (let i = 0; i < 7; i++) {
      const pile = this.state.tableau[i];
      for (let j = 0; j < pile.length; j++) {
        const card = pile[j];
        if (!card.faceUp) continue;

        // Check foundation (only for top card)
        if (j === pile.length - 1) {
          const fi = this.getFoundationIndex(card.suit);
          if (this.canPlaceOnFoundation(card, fi)) return true;
        }

        // Check other tableau piles
        for (let k = 0; k < 7; k++) {
          if (k === i) continue;
          if (this.canPlaceOnTableau(card, k)) return true;
        }
      }
    }

    return false;
  },

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime() {
    if (!this.state || !this.state.startTime) return 0;
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  },

  /**
   * Format time as MM:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
};
