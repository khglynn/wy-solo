/**
 * Drag and Drop System
 * Uses Pointer Events API for unified mouse/touch handling
 */

const Drag = {
  // State
  isDragging: false,
  draggedCards: [],
  draggedCardElements: [],
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  sourceLocation: null,
  originalPositions: [],

  // Threshold for distinguishing click from drag
  DRAG_THRESHOLD: 5,
  moved: false,

  /**
   * Initialize drag system
   */
  init() {
    document.addEventListener('pointerdown', this.onPointerDown.bind(this));
    document.addEventListener('pointermove', this.onPointerMove.bind(this));
    document.addEventListener('pointerup', this.onPointerUp.bind(this));
    document.addEventListener('pointercancel', this.onPointerUp.bind(this));

    // Prevent default touch behaviors
    document.addEventListener('touchstart', e => {
      if (e.target.closest('.card')) {
        e.preventDefault();
      }
    }, { passive: false });
  },

  /**
   * Handle pointer down
   */
  onPointerDown(e) {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;

    // Get card data
    const cardId = cardEl.dataset.cardId;
    const location = Game.findCard(cardId);

    if (!location) return;

    // Check if card is interactive
    const card = this.getCardFromLocation(location);

    // Handle stock pile click directly (touchstart.preventDefault blocks click events)
    if (location.location === 'stock') {
      if (Game.drawFromStock()) {
        UI.render();
      }
      return;
    }

    // Can't drag face-down cards (except to flip them)
    if (!card.faceUp) {
      // Check if it's the top face-down card that can be flipped
      if (location.location === 'tableau') {
        const pile = Game.state.tableau[location.pileIndex];
        if (location.index === pile.length - 1) {
          // This shouldn't happen - top cards should be face up
          // But handle it just in case
          return;
        }
      }
      return;
    }

    // Can only drag from waste, foundation (top), or tableau (face-up)
    if (location.location === 'waste') {
      if (location.index !== Game.state.waste.length - 1) return;
    } else if (location.location === 'foundation') {
      if (location.index !== Game.state.foundations[location.pileIndex].length - 1) return;
    }

    // Start tracking
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.moved = false;
    this.sourceLocation = location;

    // Get all cards that will move with this one
    this.draggedCardElements = UI.getCardsToMove(cardEl);

    // Calculate offset from pointer to card origin
    const rect = cardEl.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    // Save original positions
    this.originalPositions = this.draggedCardElements.map(el => ({
      element: el,
      parent: el.parentElement,
      top: el.style.top,
      left: el.style.left,
      position: el.style.position,
      zIndex: el.style.zIndex,
    }));

    // Set pointer capture for smooth tracking
    cardEl.setPointerCapture(e.pointerId);
  },

  /**
   * Handle pointer move
   */
  onPointerMove(e) {
    if (this.originalPositions.length === 0) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Check if we've moved enough to start dragging
    if (!this.isDragging) {
      if (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD) {
        this.startDrag();
      } else {
        return;
      }
    }

    this.moved = true;

    // Update card positions
    const baseX = e.clientX - this.offsetX;
    const baseY = e.clientY - this.offsetY;

    this.draggedCardElements.forEach((el, i) => {
      el.style.left = `${baseX}px`;
      el.style.top = `${baseY + i * 25}px`; // Stack offset for dragged cards
    });

    // Highlight valid drop targets
    const firstCard = this.getCardFromLocation(this.sourceLocation);
    UI.highlightValidDrops(firstCard);
  },

  /**
   * Start dragging (after threshold)
   */
  startDrag() {
    this.isDragging = true;

    // Move cards to fixed positioning
    this.draggedCardElements.forEach((el, i) => {
      el.classList.add('dragging');
      if (i > 0) el.classList.add('dragging-child');
      el.style.position = 'fixed';
      el.style.zIndex = 1000 + i;
    });
  },

  /**
   * Handle pointer up
   */
  onPointerUp(e) {
    if (this.originalPositions.length === 0) return;

    const wasDragging = this.isDragging;
    const wasMoved = this.moved;

    // Try to complete the drop if we were dragging
    if (wasDragging) {
      const dropTarget = UI.getDropTarget(e.clientX, e.clientY, this.draggedCardElements);

      if (dropTarget) {
        const firstCard = this.getCardFromLocation(this.sourceLocation);
        let canDrop = false;

        if (dropTarget.type === 'foundation') {
          // Only single cards can go to foundation
          if (this.draggedCardElements.length === 1) {
            canDrop = Game.canPlaceOnFoundation(firstCard, dropTarget.index);
          }
        } else if (dropTarget.type === 'tableau') {
          canDrop = Game.canPlaceOnTableau(firstCard, dropTarget.index);
        }

        if (canDrop) {
          // Perform the move
          Game.moveCards(this.sourceLocation, {
            location: dropTarget.type,
            pileIndex: dropTarget.index,
          });

          // Check for win
          if (Game.isWon()) {
            setTimeout(() => WinAnimation.start(), 100);
          }
        }
      }
    }

    // Clean up drag state
    this.cleanup();

    // Re-render
    UI.render();
    UI.clearHighlights();

    // If it was a click (not a drag), handle as auto-move
    if (!wasMoved && this.sourceLocation) {
      const cardEl = e.target.closest('.card');
      if (cardEl) {
        this.handleClick(cardEl);
      }
    }

    this.sourceLocation = null;
  },

  /**
   * Clean up after drag
   */
  cleanup() {
    // Restore original styles
    this.draggedCardElements.forEach(el => {
      el.classList.remove('dragging', 'dragging-child');
    });

    this.originalPositions.forEach(pos => {
      pos.element.style.position = pos.position;
      pos.element.style.top = pos.top;
      pos.element.style.left = pos.left;
      pos.element.style.zIndex = pos.zIndex;
    });

    this.isDragging = false;
    this.draggedCardElements = [];
    this.originalPositions = [];
    this.moved = false;
  },

  /**
   * Handle click on card (auto-move or flip)
   */
  handleClick(cardEl) {
    const cardId = cardEl.dataset.cardId;
    const location = Game.findCard(cardId);

    if (!location) return;

    const card = this.getCardFromLocation(location);

    // Handle face-down card (flip it)
    if (!card.faceUp && location.location === 'tableau') {
      const pile = Game.state.tableau[location.pileIndex];
      if (location.index === pile.length - 1) {
        Game.saveState();
        card.faceUp = true;
        Game.state.moves++;
        if (Game.settings.scoring === 'standard') {
          Game.state.score += 5;
        }
        UI.render();
        return;
      }
    }

    // Try auto-move
    if (card.faceUp) {
      const result = Game.tryAutoMove(cardId);
      if (result) {
        UI.render();

        // Check for win
        if (Game.isWon()) {
          setTimeout(() => WinAnimation.start(), 100);
        }
      } else {
        // Flash card to indicate invalid
        UI.flashCard(cardEl);
      }
    }
  },

  /**
   * Get card object from location
   */
  getCardFromLocation(location) {
    if (location.location === 'waste') {
      return Game.state.waste[location.index];
    } else if (location.location === 'foundation') {
      return Game.state.foundations[location.pileIndex][location.index];
    } else if (location.location === 'tableau') {
      return Game.state.tableau[location.pileIndex][location.index];
    }
    return null;
  },
};
