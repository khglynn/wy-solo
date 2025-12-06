/**
 * Main Application Entry Point
 * Wires everything together
 */

const App = {
  timerInterval: null,
  menuOpen: null,
  hintTimeout: null,

  // Toggle states
  showTimer: true,
  showStatusBar: true,

  /**
   * Initialize the application
   */
  init() {
    // Initialize modules
    UI.init();
    Drag.init();
    WinAnimation.init();

    // Load settings from localStorage
    this.loadSettings();

    // Start a new game
    this.newGame();

    // Set up event listeners
    this.setupMenus();
    this.setupModals();
    this.setupStockClick();
    this.setupKeyboard();

    // Update menu checkmarks
    this.updateMenuCheckmarks();

    console.log('Solitaire initialized! Press W to test win animation.');
  },

  /**
   * Start a new game
   */
  newGame() {
    // Stop any running animation
    WinAnimation.stop();

    // Initialize game state
    Game.newGame();

    // Render
    UI.render();

    // Reset timer
    this.startTimer();
  },

  /**
   * Simulate a win (for testing)
   */
  simulateWin() {
    // Fill all foundations with cards
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    Game.state.foundations = suits.map(suit => {
      const cards = [];
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ suit, rank, faceUp: true, id: `${suit}-${rank}` });
      }
      return cards;
    });

    // Clear everything else
    Game.state.stock = [];
    Game.state.waste = [];
    Game.state.tableau = [[], [], [], [], [], [], []];

    UI.render();

    // Trigger win animation with callback
    this.triggerWin();
  },

  /**
   * Trigger win animation and show modal after
   */
  triggerWin() {
    // Set callback for when animation ends
    WinAnimation.onComplete = () => {
      this.showWinModal();
    };

    setTimeout(() => WinAnimation.start(), 200);
  },

  /**
   * Show win modal with stats
   */
  showWinModal() {
    const elapsed = Game.getElapsedTime();
    const timeStr = Game.formatTime(elapsed);
    const statsEl = document.getElementById('win-stats');

    if (statsEl) {
      statsEl.innerHTML = `
        Score: ${Game.state.score}<br>
        Time: ${timeStr}<br>
        Moves: ${Game.state.moves}
      `;
    }

    UI.showModal('win-modal');
  },

  /**
   * Show a hint
   */
  showHint() {
    // Clear any existing hint
    this.clearHint();

    const hint = Game.getHint();
    if (!hint) {
      console.log('No hints available');
      return;
    }

    // Highlight based on hint type
    if (hint.action === 'draw' || hint.action === 'reset') {
      // Highlight stock pile
      const stock = document.getElementById('stock');
      stock.classList.add('hint-action');
    } else {
      // Highlight the card to move
      if (hint.from.cardId) {
        const cardEl = document.querySelector(`[data-card-id="${hint.from.cardId}"]`);
        if (cardEl) {
          cardEl.classList.add('hint-from');
        }
      }

      // Highlight the destination
      if (hint.to.location === 'foundation') {
        const foundation = document.getElementById(`foundation-${hint.to.pileIndex}`);
        const target = foundation.querySelector('.card:last-child') || foundation.querySelector('.pile-placeholder');
        if (target) {
          target.classList.add('hint-to');
        }
      } else if (hint.to.location === 'tableau') {
        const tableau = document.getElementById(`tableau-${hint.to.pileIndex}`);
        const target = tableau.querySelector('.card:last-child') || tableau.querySelector('.pile-placeholder');
        if (target) {
          target.classList.add('hint-to');
        }
      }
    }

    // Auto-clear hint after 2 seconds
    this.hintTimeout = setTimeout(() => {
      this.clearHint();
    }, 2000);
  },

  /**
   * Clear hint highlighting
   */
  clearHint() {
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    document.querySelectorAll('.hint-from, .hint-to, .hint-action').forEach(el => {
      el.classList.remove('hint-from', 'hint-to', 'hint-action');
    });
  },

  /**
   * Start the game timer
   */
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.showTimer) {
      this.timerInterval = setInterval(() => {
        UI.updateTime();
      }, 1000);
    }
  },

  /**
   * Set up menu interactions
   */
  setupMenus() {
    // Menu item clicks
    document.querySelectorAll('.menu-item').forEach(item => {
      const label = item.querySelector('.menu-label');

      label.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other menus
        document.querySelectorAll('.menu-item.active').forEach(other => {
          if (other !== item) other.classList.remove('active');
        });

        // Toggle this menu
        item.classList.toggle('active');
        this.menuOpen = item.classList.contains('active') ? item : null;
      });

      // Hover to switch menus when one is open
      label.addEventListener('mouseenter', () => {
        if (this.menuOpen && this.menuOpen !== item) {
          this.menuOpen.classList.remove('active');
          item.classList.add('active');
          this.menuOpen = item;
        }
      });
    });

    // Menu option clicks
    document.querySelectorAll('.menu-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = option.dataset.action;
        this.handleMenuAction(action);
        this.closeMenus();
      });
    });

    // Click outside to close menus
    document.addEventListener('click', () => {
      this.closeMenus();
    });
  },

  /**
   * Close all menus
   */
  closeMenus() {
    document.querySelectorAll('.menu-item.active').forEach(item => {
      item.classList.remove('active');
    });
    this.menuOpen = null;
  },

  /**
   * Handle menu actions
   */
  handleMenuAction(action) {
    switch (action) {
      case 'new-game':
        this.newGame();
        break;

      case 'undo':
        if (Game.undo()) {
          UI.render();
        }
        break;

      case 'toggle-draw':
        Game.settings.drawCount = Game.settings.drawCount === 1 ? 3 : 1;
        this.saveSettings();
        this.updateMenuCheckmarks();
        break;

      case 'toggle-timer':
        this.showTimer = !this.showTimer;
        this.saveSettings();
        this.updateMenuCheckmarks();
        if (!this.showTimer) {
          document.getElementById('time').textContent = '--:--';
          if (this.timerInterval) clearInterval(this.timerInterval);
        } else {
          this.startTimer();
        }
        break;

      case 'toggle-status':
        this.showStatusBar = !this.showStatusBar;
        document.getElementById('status-bar').style.display =
          this.showStatusBar ? 'flex' : 'none';
        this.saveSettings();
        this.updateMenuCheckmarks();
        break;

      case 'options':
        this.showOptionsModal();
        break;

      case 'how-to-play':
        UI.showModal('help-modal');
        break;

      case 'about':
        UI.showModal('about-modal');
        break;

      case 'hint':
        this.showHint();
        break;
    }
  },

  /**
   * Update menu checkmarks based on current settings
   */
  updateMenuCheckmarks() {
    const drawOption = document.getElementById('draw-option');
    const timerOption = document.getElementById('timer-option');
    const statusOption = document.getElementById('status-option');

    if (drawOption) {
      drawOption.classList.toggle('checked', Game.settings.drawCount === 3);
    }
    if (timerOption) {
      timerOption.classList.toggle('checked', this.showTimer);
    }
    if (statusOption) {
      statusOption.classList.toggle('checked', this.showStatusBar);
    }
  },

  /**
   * Set up modal interactions
   */
  setupModals() {
    // Close buttons
    document.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.hideAllModals();
      });
    });

    // Save options
    document.querySelector('[data-action="save-options"]')?.addEventListener('click', () => {
      this.saveOptions();
      UI.hideAllModals();
    });

    // Play again button
    document.querySelector('[data-action="play-again"]')?.addEventListener('click', () => {
      UI.hideAllModals();
      this.newGame();
    });

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          UI.hideAllModals();
        }
      });
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.hideAllModals();
        this.closeMenus();
      }
    });
  },

  /**
   * Show options modal with current settings
   */
  showOptionsModal() {
    // Set current values
    const scoringRadio = document.querySelector(`input[name="scoring"][value="${Game.settings.scoring}"]`);
    if (scoringRadio) scoringRadio.checked = true;

    UI.showModal('options-modal');
  },

  /**
   * Save options from modal
   */
  saveOptions() {
    const scoring = document.querySelector('input[name="scoring"]:checked')?.value || 'standard';
    Game.settings.scoring = scoring;
    this.saveSettings();
  },

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('solitaire-settings', JSON.stringify({
        drawCount: Game.settings.drawCount,
        scoring: Game.settings.scoring,
        showTimer: this.showTimer,
        showStatusBar: this.showStatusBar,
      }));
    } catch (e) {
      console.warn('Could not save settings:', e);
    }
  },

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('solitaire-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        Game.settings.drawCount = settings.drawCount || 1;
        Game.settings.scoring = settings.scoring || 'standard';
        this.showTimer = settings.showTimer !== false;
        this.showStatusBar = settings.showStatusBar !== false;

        // Apply status bar visibility
        if (!this.showStatusBar) {
          document.getElementById('status-bar').style.display = 'none';
        }
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  },

  /**
   * Set up stock pile click handler
   */
  setupStockClick() {
    const stock = document.getElementById('stock');

    stock.addEventListener('click', (e) => {
      // Don't trigger if we're dragging
      if (Drag.isDragging) return;

      // Draw from stock
      if (Game.drawFromStock()) {
        UI.render();
      }
    });
  },

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't handle if modal is open
      if (document.querySelector('.modal-overlay.active')) return;

      switch (e.key) {
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (Game.undo()) {
              UI.render();
            }
          }
          break;

        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.newGame();
          }
          break;

        case 'F2':
          e.preventDefault();
          this.newGame();
          break;

        case 'F1':
          e.preventDefault();
          UI.showModal('help-modal');
          break;

        case ' ':
          e.preventDefault();
          if (Game.drawFromStock()) {
            UI.render();
          }
          break;

        // Debug: Press W to test win animation
        case 'w':
        case 'W':
          if (!e.ctrlKey && !e.metaKey) {
            this.simulateWin();
          }
          break;

        // Hint
        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.showHint();
          }
          break;
      }
    });
  },
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
