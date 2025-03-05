/**
 * mobile-ux.js - Mobile-first UI enhancements for Relay World
 * Implements responsive design with hamburger menu and mobile-optimized UI
 */

const MobileUX = {
  // Breakpoints
  breakpoints: {
    mobile: 767,
    tablet: 1024
  },
  
  // State tracking
  isMobileMenuOpen: false,
  
  init: function() {
    console.log("[MobileUX] Initializing...");
    
    // Add mobile viewport meta tag if it doesn't exist
    this.ensureViewportMeta();
    
    // Create hamburger menu button and mobile menu
    this.createHamburgerMenu();
    
    // Create responsive styles
    this.createResponsiveStyles();
    
    // Set initial state based on screen size
    this.setupInitialState();
    
    // Setup resize event listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log("[MobileUX] Initialized");
  },
  
  ensureViewportMeta: function() {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // If not, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set proper viewport content
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  },
  
  createHamburgerMenu: function() {
    // Create hamburger menu button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.id = 'mobile-menu-toggle';
    hamburgerBtn.className = 'hamburger-menu';
    hamburgerBtn.innerHTML = `
      <div class="hamburger-lines">
        <span class="line line1"></span>
        <span class="line line2"></span>
        <span class="line line3"></span>
      </div>
    `;
    
    // Add button to top bar
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      topBar.prepend(hamburgerBtn);
    }
    
    // Create mobile menu container
    const mobileMenu = document.createElement('div');
    mobileMenu.id = 'mobile-menu';
    mobileMenu.className = 'mobile-menu hide';
    mobileMenu.innerHTML = `
      <div class="mobile-menu-header">
        <h3>Menu</h3>
        <button id="mobile-menu-close">×</button>
      </div>
      <div class="mobile-menu-content">
        <div class="mobile-section" id="mobile-player-section">
          <!-- Player profile content will be moved here -->
        </div>
        <div class="mobile-section" id="mobile-explorer-section">
          <h4>Explorer Controls</h4>
          <div id="mobile-relay-controls"></div>
        </div>
        <div class="mobile-section" id="mobile-leaderboard-section">
          <h4>Leaderboard</h4>
          <div id="mobile-leaderboard"></div>
        </div>
        <div class="mobile-section" id="mobile-publish-section">
          <h4>Create Content</h4>
          <button id="mobile-publish-note-btn" class="pixel-button">Publish Note</button>
        </div>
        <div class="mobile-section" id="mobile-cornychat-section">
          <h4>CornyChatIntegration</h4>
          <button id="open-cornychat-btn" class="pixel-button">Open CornyChatIntegration</button>
        </div>
      </div>
    `;
    
    // Add to UI container
    const uiContainer = document.getElementById('ui-container');
    if (uiContainer) {
      uiContainer.appendChild(mobileMenu);
    }
    
    // Add event listeners
    hamburgerBtn.addEventListener('click', () => {
      this.toggleMobileMenu();
    });
    
    const closeBtn = document.getElementById('mobile-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }
    
    // Add event listeners for mobile publish button
    const publishBtn = document.getElementById('mobile-publish-note-btn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        this.closeMobileMenu();
        if (window.NotePublisher && typeof window.NotePublisher.showNoteModal === 'function') {
          window.NotePublisher.showNoteModal();
        } else {
          console.error("[MobileUX] NotePublisher not available");
        }
      });
    }
    
    // Add event listener for CornyChatIntegration button
    const cornyChatBtn = document.getElementById('open-cornychat-btn');
    if (cornyChatBtn) {
      cornyChatBtn.addEventListener('click', () => {
        this.closeMobileMenu();
        if (window.CornyChatIntegration && typeof window.CornyChatIntegration.toggleIframe === 'function') {
          window.CornyChatIntegration.toggleIframe();
        } else {
          console.error("[MobileUX] CornyChatIntegration not available");
        }
      });
    }
  },
  
  createResponsiveStyles: function() {
    // Create style element for responsive styles
    const styleEl = document.createElement('style');
    styleEl.id = 'mobile-ux-styles';
    styleEl.innerHTML = `
      /* Hamburger Menu Styles */
      .hamburger-menu {
        display: none;
        flex-direction: column;
        justify-content: space-between;
        width: 30px;
        height: 24px;
        cursor: pointer;
        z-index: 200;
        background: none;
        border: none;
        padding: 0;
        margin-right: 15px;
      }
      
      .hamburger-lines {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 24px;
      }
      
      .hamburger-menu .line {
        display: block;
        height: 4px;
        width: 100%;
        background-color: #ffffff;
        border-radius: 10px;
        transition: all 0.3s ease;
      }
      
      .hamburger-menu.active .line1 {
        transform: translateY(10px) rotate(45deg);
      }
      
      .hamburger-menu.active .line2 {
        opacity: 0;
      }
      
      .hamburger-menu.active .line3 {
        transform: translateY(-10px) rotate(-45deg);
      }
      
      .mobile-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 80%;
        height: 100%;
        background-color: var(--color-dark);
        border-right: 4px solid var(--color-medium);
        z-index: var(--z-modal);
        transition: transform 0.3s ease;
        overflow-y: auto;
        transform: translateX(-100%);
      }
      
      .mobile-menu:not(.hide) {
        transform: translateX(0);
      }
      
      .mobile-menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background-color: var(--color-medium);
        border-bottom: 4px solid var(--color-dark);
      }
      
      .mobile-menu-header h3 {
        margin: 0;
        color: var(--color-very-light);
      }
      
      #mobile-menu-close {
        background: none;
        border: none;
        color: var(--color-very-light);
        font-size: 24px;
        cursor: pointer;
      }
      
      .mobile-menu-content {
        padding: 15px;
      }
      
      .mobile-section {
        margin-bottom: 20px;
        padding: 10px;
        background-color: var(--color-medium);
        border: 2px solid var(--color-dark);
        border-radius: 5px;
      }
      
      .mobile-section h4 {
        margin-top: 0;
        margin-bottom: 10px;
        color: var(--color-very-light);
        font-size: 14px;
        text-align: center;
        border-bottom: 1px solid var(--color-light);
        padding-bottom: 5px;
      }
      
      /* Mobile Responsiveness */
      @media (max-width: ${this.breakpoints.mobile}px) {
        .hamburger-menu {
          display: flex;
        }
        
        #player-profile,
        #leaderboard-container,
        #game-controls {
          display: none !important;
        }
        
        #chat-container {
          height: 120px;
        }
        
        #chat-messages {
          height: 80px;
        }
        
        #top-bar {
          justify-content: space-between;
          padding: 5px;
        }
        
        #voice-controls {
          margin-left: auto;
        }
        
        #toast-container {
          top: 60px;
          width: 90%;
        }
        
        #game-container {
          width: 100%;
          height: calc(100% - 140px); /* Adjust for bottom chat */
        }
        
        #mobile-controls {
          bottom: 140px;
          left: 10px;
          display: block !important;
        }
        
        /* Pop-ups should be full width on mobile */
        #user-popup,
        #inventory-interface,
        #zap-interface,
        #note-publish-modal .modal-content,
        #action-popup,
        #trade-popup,
        #bc-modal-content {
          width: 90% !important;
          max-height: 80vh;
          overflow-y: auto;
        }
      }
      
      /* Tablet Responsiveness */
      @media (min-width: ${this.breakpoints.mobile + 1}px) and (max-width: ${this.breakpoints.tablet}px) {
        #leaderboard-container {
          width: 200px;
          right: 5px;
        }
        
        #player-profile {
          width: 200px;
          left: 5px;
        }
        
        #game-controls {
          flex-wrap: wrap;
          gap: 5px;
        }
        
        #top-bar {
          flex-wrap: wrap;
          padding: 5px;
        }
      }
    `;
    
    // Add to document head
    document.head.appendChild(styleEl);
  },
  
  setupInitialState: function() {
    const isMobile = window.innerWidth <= this.breakpoints.mobile;
    
    if (isMobile) {
      this.moveElementsToMobileMenu();
      
      // Make mobile controls visible
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.remove('hide');
      }
    }
  },
  
  moveElementsToMobileMenu: function() {
    // Clone player profile to mobile menu
    const playerProfile = document.getElementById('player-profile');
    const mobilePlayerSection = document.getElementById('mobile-player-section');
    
    if (playerProfile && mobilePlayerSection) {
      // Clear previous content if any
      mobilePlayerSection.innerHTML = '';
      
      // Clone player profile
      const playerProfileClone = playerProfile.cloneNode(true);
      playerProfileClone.id = 'mobile-player-profile';
      playerProfileClone.classList.remove('hide');
      playerProfileClone.style.position = 'relative';
      playerProfileClone.style.top = 'auto';
      playerProfileClone.style.left = 'auto';
      playerProfileClone.style.width = '100%';
      
      mobilePlayerSection.appendChild(playerProfileClone);
      
      // Add event listeners to cloned buttons
      const buttons = playerProfileClone.querySelectorAll('button');
      buttons.forEach(button => {
        const originalButton = playerProfile.querySelector(`#${button.id}`);
        if (originalButton) {
          // Clone click event
          button.addEventListener('click', () => {
            originalButton.click();
            this.closeMobileMenu();
          });
        }
      });
    }
    
    // Clone relay controls to mobile menu
    const gameControls = document.getElementById('game-controls');
    const mobileExplorerSection = document.getElementById('mobile-relay-controls');
    
    if (gameControls && mobileExplorerSection) {
      // Clear previous content if any
      mobileExplorerSection.innerHTML = '';
      
      // Clone game controls
      const gameControlsClone = gameControls.cloneNode(true);
      gameControlsClone.id = 'mobile-game-controls';
      gameControlsClone.style.display = 'flex';
      gameControlsClone.style.flexDirection = 'column';
      gameControlsClone.style.gap = '10px';
      
      mobileExplorerSection.appendChild(gameControlsClone);
      
      // Add event listeners to cloned selects and buttons
      const selects = gameControlsClone.querySelectorAll('select');
      selects.forEach(select => {
        const originalSelect = gameControls.querySelector(`#${select.id}`);
        if (originalSelect) {
          // Sync value
          select.value = originalSelect.value;
          
          // Add change event
          select.addEventListener('change', (e) => {
            originalSelect.value = e.target.value;
            originalSelect.dispatchEvent(new Event('change'));
          });
        }
      });
      
      const buttons = gameControlsClone.querySelectorAll('button');
      buttons.forEach(button => {
        const originalButton = gameControls.querySelector(`#${button.id}`);
        if (originalButton) {
          button.addEventListener('click', () => {
            originalButton.click();
          });
        }
      });
      
      const inputs = gameControlsClone.querySelectorAll('input');
      inputs.forEach(input => {
        const originalInput = gameControls.querySelector(`#${input.id}`);
        if (originalInput) {
          input.addEventListener('input', (e) => {
            originalInput.value = e.target.value;
          });
        }
      });
    }
    
    // Clone leaderboard to mobile menu
    const leaderboard = document.getElementById('leaderboard-container');
    const mobileLeaderboardSection = document.getElementById('mobile-leaderboard');
    
    if (leaderboard && mobileLeaderboardSection) {
      // Clear previous content if any
      mobileLeaderboardSection.innerHTML = '';
      
      // Clone leaderboard
      const leaderboardClone = leaderboard.cloneNode(true);
      leaderboardClone.id = 'mobile-leaderboard-container';
      leaderboardClone.classList.remove('hide');
      leaderboardClone.style.position = 'relative';
      leaderboardClone.style.top = 'auto';
      leaderboardClone.style.right = 'auto';
      leaderboardClone.style.width = '100%';
      
      mobileLeaderboardSection.appendChild(leaderboardClone);
      
      // Add event listeners to tab buttons
      const tabButtons = leaderboardClone.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
        const originalButton = leaderboard.querySelector(`.tab-button[data-type="${button.dataset.type}"]`);
        if (originalButton) {
          button.addEventListener('click', () => {
            originalButton.click();
          });
        }
      });
    }
  },
  
  handleResize: function() {
    const isMobile = window.innerWidth <= this.breakpoints.mobile;
    
    // Update mobile menu elements if resized across breakpoint
    if (isMobile) {
      this.moveElementsToMobileMenu();
      
      // Make mobile controls visible
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.remove('hide');
      }
    } else {
      // Hide mobile menu
      this.closeMobileMenu();
      
      // Hide mobile controls
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.add('hide');
      }
    }
  },
  
  toggleMobileMenu: function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.getElementById('mobile-menu-toggle');
    
    if (!mobileMenu || !hamburgerBtn) return;
    
    if (mobileMenu.classList.contains('hide')) {
      // Open menu
      mobileMenu.classList.remove('hide');
      hamburgerBtn.classList.add('active');
      this.isMobileMenuOpen = true;
    } else {
      // Close menu
      this.closeMobileMenu();
    }
  },
  
  closeMobileMenu: function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.getElementById('mobile-menu-toggle');
    
    if (!mobileMenu || !hamburgerBtn) return;
    
    mobileMenu.classList.add('hide');
    hamburgerBtn.classList.remove('active');
    this.isMobileMenuOpen = false;
  }
};

// Export the module
export default MobileUX;
