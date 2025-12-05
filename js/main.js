/**
 * Main Application Entry Point
 * Wires everything together
 */

const App = {
  timerInterval: null,
  menuOpen: null,

  /**
   * Initialize the application
   */
  init() {
    // Initialize modules
    UI.init();
    Drag.init();
    WinAnimation.init();

    // Start a new game
    this.newGame();

    // Set up event listeners
    this.setupMenus();
    this.setupModals();
    this.setupStockClick();
    this.setupKeyboard();

    // Start timer
    this.startTimer();

    console.log('Solitaire initialized!');
  },

  /**
   * Start a new game
   */
  newGame() {
    // Stop any running animation
    WinAnimation.stop();

    // Initialize game state
    Game.newGame();

    // Load settings from localStorage
    this.loadSettings();

    // Render
    UI.render();

    // Reset timer
    this.startTimer();
  },

  /**
   * Start the game timer
   */
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      UI.updateTime();
    }, 1000);
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

      case 'options':
        this.showOptionsModal();
        break;

      case 'how-to-play':
        UI.showModal('help-modal');
        break;

      case 'about':
        UI.showModal('about-modal');
        break;
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
    document.querySelector(`input[name="draw"][value="${Game.settings.drawCount}"]`).checked = true;
    document.querySelector(`input[name="scoring"][value="${Game.settings.scoring}"]`).checked = true;

    UI.showModal('options-modal');
  },

  /**
   * Save options from modal
   */
  saveOptions() {
    const drawCount = parseInt(document.querySelector('input[name="draw"]:checked').value);
    const scoring = document.querySelector('input[name="scoring"]:checked').value;

    Game.settings.drawCount = drawCount;
    Game.settings.scoring = scoring;

    // Save to localStorage
    localStorage.setItem('solitaire-settings', JSON.stringify(Game.settings));

    // Ask if user wants to start new game with new settings
    if (Game.state.moves > 0) {
      // Could show a confirmation, but for simplicity just continue
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

        case ' ':
          e.preventDefault();
          if (Game.drawFromStock()) {
            UI.render();
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
