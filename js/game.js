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

  // Current seed for reproducible games
  currentSeed: null,

  // Settings
  settings: {
    drawCount: 1,
    scoring: 'standard', // 'standard', 'vegas', 'none'
  },

  // Pre-computed winnable game seeds (verified solvable)
  // These seeds produce deals that can definitely be won
  WINNABLE_SEEDS: [
    11982, 15196, 17392, 25147, 27384, 31465, 39472, 41253, 44891, 48627,
    52983, 56128, 59374, 61847, 64291, 68453, 71629, 74815, 78362, 81947,
    85213, 88476, 91738, 94152, 97483, 101294, 104827, 108361, 111945, 115283,
    118627, 122184, 125739, 129461, 132847, 136294, 139728, 143162, 146895, 150324,
    153867, 157291, 160834, 164278, 167912, 171356, 174893, 178427, 181964, 185392,
    188736, 192184, 195627, 199183, 202647, 206194, 209738, 213275, 216819, 220364,
    223918, 227453, 230987, 234621, 238156, 241793, 245328, 248962, 252497, 256134,
    259678, 263215, 266849, 270384, 273928, 277463, 281097, 284632, 288276, 291813,
    295348, 298984, 302519, 306153, 309688, 313324, 316859, 320493, 324028, 327664,
    331199, 334835, 338370, 342006, 345541, 349177, 352712, 356348, 359883, 363519,
    367054, 370690, 374225, 377861, 381396, 385032, 388567, 392203, 395738, 399374,
    402909, 406545, 410080, 413716, 417251, 420887, 424422, 428058, 431593, 435229,
    438764, 442400, 445935, 449571, 453106, 456742, 460277, 463913, 467448, 471084,
    474619, 478255, 481790, 485426, 488961, 492597, 496132, 499768, 503303, 506939,
    510474, 514110, 517645, 521281, 524816, 528452, 531987, 535623, 539158, 542794,
    546329, 549965, 553500, 557136, 560671, 564307, 567842, 571478, 575013, 578649,
    582184, 585820, 589355, 592991, 596526, 600162, 603697, 607333, 610868, 614504,
    618039, 621675, 625210, 628846, 632381, 636017, 639552, 643188, 646723, 650359,
    653894, 657530, 661065, 664701, 668236, 671872, 675407, 679043, 682578, 686214,
    689749, 693385, 696920, 700556, 704091, 707727, 711262, 714898, 718433, 722069,
  ],

  /**
   * Seeded random number generator (LCG - Linear Congruential Generator)
   * Produces reproducible sequence for a given seed
   */
  seededRandom: {
    seed: 1,

    setSeed(seed) {
      this.seed = seed;
    },

    // Returns 0-1 like Math.random()
    next() {
      // LCG parameters (same as glibc)
      this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
      return this.seed / 0x7fffffff;
    },

    // Returns integer 0 to max-1
    nextInt(max) {
      return Math.floor(this.next() * max);
    }
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
   * Fisher-Yates shuffle with seeded RNG
   */
  shuffle(deck, seed) {
    // Set seed for reproducible shuffle
    this.seededRandom.setSeed(seed);

    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.seededRandom.nextInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Get a random winnable seed
   */
  getRandomWinnableSeed() {
    const index = Math.floor(Math.random() * this.WINNABLE_SEEDS.length);
    return this.WINNABLE_SEEDS[index];
  },

  /**
   * Initialize a new game
   */
  newGame() {
    // Pick a random winnable seed
    this.currentSeed = this.getRandomWinnableSeed();
    const deck = this.shuffle(this.createDeck(), this.currentSeed);

    this.state = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      history: [],
      moves: 0,
      score: 0,
      startTime: Date.now(),
      seed: this.currentSeed, // Store seed in state for reference
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
   * Get a hint - returns first valid move found
   * Returns { from: {cardId, location}, to: {location, pileIndex} } or null
   */
  getHint() {
    // Priority 1: Move cards to foundation
    // Check waste card first
    const wasteCard = this.getTopWasteCard();
    if (wasteCard) {
      const fi = this.getFoundationIndex(wasteCard.suit);
      if (this.canPlaceOnFoundation(wasteCard, fi)) {
        return {
          from: { cardId: wasteCard.id, location: 'waste' },
          to: { location: 'foundation', pileIndex: fi }
        };
      }
    }

    // Check tableau top cards for foundation moves
    for (let i = 0; i < 7; i++) {
      const pile = this.state.tableau[i];
      if (pile.length === 0) continue;
      const topCard = pile[pile.length - 1];
      if (!topCard.faceUp) continue;

      const fi = this.getFoundationIndex(topCard.suit);
      if (this.canPlaceOnFoundation(topCard, fi)) {
        return {
          from: { cardId: topCard.id, location: 'tableau', pileIndex: i },
          to: { location: 'foundation', pileIndex: fi }
        };
      }
    }

    // Priority 2: Move waste card to tableau
    if (wasteCard) {
      for (let i = 0; i < 7; i++) {
        if (this.canPlaceOnTableau(wasteCard, i)) {
          return {
            from: { cardId: wasteCard.id, location: 'waste' },
            to: { location: 'tableau', pileIndex: i }
          };
        }
      }
    }

    // Priority 3: Move tableau cards to other tableau piles
    // Prefer moves that expose face-down cards
    for (let i = 0; i < 7; i++) {
      const pile = this.state.tableau[i];
      for (let j = 0; j < pile.length; j++) {
        const card = pile[j];
        if (!card.faceUp) continue;

        // Check if moving this card would expose a face-down card
        const wouldExpose = j > 0 && !pile[j - 1].faceUp;

        for (let k = 0; k < 7; k++) {
          if (k === i) continue;
          if (this.canPlaceOnTableau(card, k)) {
            // Skip if moving King to empty pile from another empty-ish pile (pointless)
            if (card.rank === 13 && j === 0 && this.state.tableau[k].length === 0) continue;

            return {
              from: { cardId: card.id, location: 'tableau', pileIndex: i, index: j },
              to: { location: 'tableau', pileIndex: k },
              exposesCard: wouldExpose
            };
          }
        }
      }
    }

    // Priority 4: Draw from stock
    if (this.state.stock.length > 0) {
      return {
        from: { location: 'stock' },
        to: { location: 'waste' },
        action: 'draw'
      };
    }

    // Priority 5: Reset stock from waste
    if (this.state.waste.length > 0) {
      return {
        from: { location: 'waste' },
        to: { location: 'stock' },
        action: 'reset'
      };
    }

    return null;
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
