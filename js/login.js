/**
 * login.js - Improved login handling for Relay World
 */

(function() {
  console.log('[Login] Initializing login handlers...');
  
  // Variables to track login state and prevent duplicate attempts
  let loginInProgress = false;
  let loginCompleted = false; // NEW: Track if login was ever completed
  
  // Execute on DOM content loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Fix login styling
    fixLoginStyling();
    
    // Register core modules if they don't exist
    ensureCoreModulesExist();
    
    // Setup login button handlers
    initLoginHandlers();
    
    // Create toast container if it doesn't exist
    ensureToastContainer();

    // NEW: Check if we already logged in previously (from localStorage)
    checkForPreviousLogin();
    
    // NEW: Add MutationObserver to ensure login screen stays hidden once logged in
    preventLoginScreenReappearing();
    
    console.log('[Login] Login module initialized');
  });
  
  // NEW: Check for previous login
  function checkForPreviousLogin() {
    try {
      const storedLogin = localStorage.getItem('relayworld_login');
      if (storedLogin) {
        const loginData = JSON.parse(storedLogin);
        console.log('[Login] Found previous login data:', loginData);
        
        // Complete login with stored data
        setTimeout(() => {
          completeLogin(loginData.pubkey);
        }, 500);
      }
    } catch (e) {
      console.error('[Login] Error checking previous login:', e);
    }
  }
  
  // NEW: Prevent login screen from reappearing
  function preventLoginScreenReappearing() {
    // Add a mutation observer to ensure login screen stays hidden
    const observer = new MutationObserver(function(mutations) {
      if (loginCompleted) {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen && !loginScreen.classList.contains('hide')) {
          console.warn('[Login] Login screen trying to reappear! Forcing it to stay hidden.');
          loginScreen.classList.add('hide');
          // Also force display none for good measure
          loginScreen.style.display = 'none !important';
        }
      }
    });
    
    // Start observing the document body for DOM changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Also set an interval for extra safety
    setInterval(function() {
      if (loginCompleted) {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen && (!loginScreen.classList.contains('hide') || 
            loginScreen.style.display !== 'none')) {
          console.warn('[Login] Login screen detected via interval check! Re-hiding it.');
          loginScreen.classList.add('hide');
          loginScreen.style.display = 'none';
        }
      }
    }, 500);
  }
  
  // Fix login styling
  function fixLoginStyling() {
    // Login screen fixes
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.style.position = 'fixed';
      loginScreen.style.top = '0';
      loginScreen.style.left = '0';
      loginScreen.style.width = '100%';
      loginScreen.style.height = '100%';
      loginScreen.style.display = 'flex';
      loginScreen.style.flexDirection = 'column';
      loginScreen.style.justifyContent = 'center';
      loginScreen.style.alignItems = 'center';
      loginScreen.style.zIndex = '9999';
    }
    
    // Login panel fixes
    const loginPanel = document.getElementById('login-panel');
    if (loginPanel) {
      loginPanel.style.animation = 'float 3s ease-in-out infinite';
      loginPanel.style.display = 'flex';
      loginPanel.style.flexDirection = 'column';
      loginPanel.style.alignItems = 'center'; 
      loginPanel.style.maxWidth = '90%';
      loginPanel.style.width = '500px';
    }
    
    // Ensure animations are available
    if (!document.getElementById('login-animations')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'login-animations';
      styleEl.textContent = `
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        
        @keyframes triforce-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        
        @keyframes triforce-pulse {
          0% { opacity: 0.8; }
          100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.9)); }
        }
        
        @keyframes sound-wave {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        
        /* NEW: Force hide login screen with CSS */
        #login-screen.hide {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Animate triforce container and elements
    const triforceContainer = document.querySelector('.triforce-container');
    if (triforceContainer) {
      triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
    }
    
    const triforces = document.querySelectorAll('.triforce');
    triforces.forEach(t => {
      t.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
    });
  }
  
  // Register core modules if they don't exist yet (CRUCIAL FIX)
  function ensureCoreModulesExist() {
    // Create RelayWorldCore if it doesn't exist
    if (!window.RelayWorldCore) {
      console.log('[Login] Creating RelayWorldCore');
      window.RelayWorldCore = {
        modules: new Map(),
        registerModule: function(name, module) {
          console.log(`[Login] Registering module: ${name}`);
          this.modules.set(name, module);
          if (window.EventBus) {
            window.EventBus.emit('module:registered', { name });
          }
          return this;
        },
        getModule: function(name) {
          if (!this.modules.has(name)) {
            console.warn(`[Login] Module not found: ${name}`);
            return null;
          }
          return this.modules.get(name);
        },
        init: function() {
          console.log('[Login] Initializing core system');
          return this;
        }
      };
    }
    
    // Register player module
    if (!window.RelayWorldCore.getModule('player')) {
      console.log('[Login] Registering player module');
      window.RelayWorldCore.registerModule('player', {
        currentPlayer: null,
        pubkey: null,
        name: null,
        isGuest: false,
        setPlayer: function(data) {
          console.log('[Player] Setting player data:', data);
          this.currentPlayer = data;
          this.pubkey = data.pubkey;
          this.name = data.name || `Player-${data.pubkey.substring(0, 8)}`;
          this.isGuest = data.isGuest || false;
          
          if (window.EventBus) {
            window.EventBus.emit('player:updated', data);
          }
        },
        getPlayer: function() {
          return this.currentPlayer;
        }
      });
    }
    
    // Register UI module
    if (!window.RelayWorldCore.getModule('ui')) {
      console.log('[Login] Registering UI module');
      window.RelayWorldCore.registerModule('ui', {
        elements: new Map(),
        updateUI: function(elementId, data) {
          console.log('[UI] Updating element:', elementId);
          const element = document.getElementById(elementId);
          if (element) {
            if (elementId === 'player-profile' || elementId === 'top-bar') {
              element.classList.remove('hide');
            }
            this.elements.set(elementId, data || {});
            
            if (window.EventBus) {
              window.EventBus.emit('ui:updated', { elementId, data });
            }
          } else {
            console.warn('[UI] Element not found:', elementId);
          }
        }
      });
    }
    
    // Register game module
    if (!window.RelayWorldCore.getModule('game')) {
      console.log('[Login] Registering game module');
      window.RelayWorldCore.registerModule('game', {
        state: 'initializing',
        setState: function(newState) {
          console.log('[Game] State changing to:', newState);
          this.state = newState;
          
          if (window.EventBus) {
            window.EventBus.emit('game:stateChange', newState);
          }
        },
        getState: function() {
          return this.state;
        },
        start: function() {
          console.log('[Game] Starting game');
          this.setState('playing');
        }
      });
    }
  }
  
  // Setup login button handlers
  function initLoginHandlers() {
    // If already logged in, don't set up login handlers
    if (loginCompleted) {
      console.log('[Login] Already logged in, not setting up login handlers');
      return;
    }
    
    // Remove any existing event listeners (to prevent duplicates)
    const loginButton = document.getElementById('login-button');
    const guestLoginButton = document.getElementById('guest-login-button');
    
    if (loginButton) {
      const newLoginButton = loginButton.cloneNode(true);
      loginButton.parentNode.replaceChild(newLoginButton, loginButton);
      newLoginButton.addEventListener('click', handleNostrLogin);
      console.log('[Login] Attached Nostr login handler');
    }
    
    if (guestLoginButton) {
      const newGuestLoginButton = guestLoginButton.cloneNode(true);
      guestLoginButton.parentNode.replaceChild(newGuestLoginButton, guestLoginButton);
      newGuestLoginButton.addEventListener('click', handleGuestLogin);
      console.log('[Login] Attached guest login handler');
    }
  }
  
  // Handle Nostr login button click
  function handleNostrLogin() {
    console.log("[Login] Nostr login button clicked");
    
    // Prevent multiple simultaneous login attempts
    if (loginInProgress) {
      console.log("[Login] Login already in progress, ignoring duplicate click");
      return;
    }
    
    loginInProgress = true;
    const loginButton = document.getElementById('login-button');
    
    if (loginButton) {
      loginButton.disabled = true;
    }
    
    const loginLoader = document.getElementById('login-loader');
    const loginStatus = document.getElementById('login-status');
    
    if (loginLoader) loginLoader.classList.remove('hide');
    if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
    
    // Check for nostr extension
    if (!window.nostr) {
      showToast('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.', 'error');
      if (loginStatus) loginStatus.textContent = 'Nostr extension not found';
      if (loginLoader) loginLoader.classList.add('hide');
      if (loginButton) loginButton.disabled = false;
      loginInProgress = false;
      return;
    }
    
    // Try to get public key
    if (loginStatus) loginStatus.textContent = 'Requesting pubkey...';
    
    window.nostr.getPublicKey().then(pubkey => {
      if (!pubkey) {
        showToast('No pubkey returned from extension', 'error');
        if (loginStatus) loginStatus.textContent = 'No pubkey returned';
        if (loginLoader) loginLoader.classList.add('hide');
        if (loginButton) loginButton.disabled = false;
        loginInProgress = false;
        return;
      }
      
      if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
      console.log(`[Login] Got pubkey: ${pubkey.substring(0, 8)}...`);
      
      // Set player pubkey - ENSURE MODULES EXIST FIRST
      ensureCoreModulesExist();
      
      const playerModule = window.RelayWorldCore?.getModule('player');
      if (playerModule) {
        playerModule.pubkey = pubkey;
        playerModule.name = `Nostr: ${pubkey.substring(0, 8)}`;
      }
      
      // Animate sound wave
      const soundWave = document.getElementById('sound-wave');
      if (soundWave) {
        soundWave.style.animation = 'sound-wave 4s ease-out infinite';
      }
      
      // Delay to show animation
      setTimeout(() => {
        completeLogin(pubkey);
        
        showToast('Login successful!', 'success');
        if (loginButton) loginButton.disabled = false;
        if (loginLoader) loginLoader.classList.add('hide');
        loginInProgress = false;
      }, 1500);
    }).catch(error => {
      console.error('[Login] Nostr login error:', error);
      showToast(`Login error: ${error.message}`, 'error');
      if (loginStatus) loginStatus.textContent = 'Login error: ' + error.message;
      if (loginLoader) loginLoader.classList.add('hide');
      if (loginButton) loginButton.disabled = false;
      loginInProgress = false;
    });
  }
  
  // Handle guest login button click
  function handleGuestLogin() {
    console.log("[Login] Guest login button clicked");
    
    // Prevent multiple simultaneous login attempts
    if (loginInProgress) {
      console.log("[Login] Login already in progress, ignoring duplicate click");
      return;
    }
    
    loginInProgress = true;
    
    // ENSURE MODULES EXIST FIRST - CRITICAL FIX
    ensureCoreModulesExist();
    
    showUsernameDialog(username => {
      if (!username) {
        loginInProgress = false;
        return; // User canceled
      }
      
      const loginLoader = document.getElementById('login-loader');
      const loginStatus = document.getElementById('login-status');
      
      if (loginLoader) loginLoader.classList.remove('hide');
      if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
      
      // Generate a guest ID
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      
      // Set player info - ENSURE MODULES EXIST AGAIN
      ensureCoreModulesExist();
      
      const playerModule = window.RelayWorldCore?.getModule('player');
      if (playerModule) {
        playerModule.pubkey = guestId;
        playerModule.name = username;
      }
      
      // Animate sound wave
      const soundWave = document.getElementById('sound-wave');
      if (soundWave) {
        soundWave.style.animation = 'sound-wave 4s ease-out infinite';
      }
      
      // Process after a delay
      setTimeout(() => {
        completeLogin(guestId);
        
        // Update profile image
        const profileImg = document.getElementById('player-profile-image');
        if (profileImg) profileImg.src = 'assets/icons/default-avatar.png';
        
        showToast(`Welcome, ${username}!`, 'success');
        if (loginLoader) loginLoader.classList.add('hide');
        loginInProgress = false;
      }, 1500);
    });
  }
  
  // Complete login process - simplified and more robust
  function completeLogin(pubkey) {
    console.log('[Login] Completing login for pubkey:', pubkey);
    
    try {
      // Set login completed flag
      loginCompleted = true;
      
      // Store login data in localStorage for persistence
      try {
        localStorage.setItem('relayworld_login', JSON.stringify({
          pubkey: pubkey,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[Login] Could not save login to localStorage:', e);
      }
      
      // Make sure core modules exist
      ensureCoreModulesExist();
      
      // Get modules from global scope
      const playerModule = window.RelayWorldCore.getModule('player');
      const uiModule = window.RelayWorldCore.getModule('ui');
      const gameModule = window.RelayWorldCore.getModule('game');
      
      if (!playerModule) {
        console.error('[Login] Player module still not available!');
      }
      
      if (!uiModule) {
        console.error('[Login] UI module still not available!');
      }
      
      if (!gameModule) {
        console.error('[Login] Game module still not available!');
      }
      
      // Set player data if module exists
      if (playerModule) {
        console.log('[Login] Setting player data');
        playerModule.setPlayer({
          pubkey: pubkey,
          name: pubkey.startsWith('guest_') ? 'Guest Player' : `Player-${pubkey.substring(0, 8)}`,
          isGuest: pubkey.startsWith('guest_')
        });
      }
      
      // Update UI elements if module exists
      if (uiModule) {
        console.log('[Login] Updating UI elements');
        uiModule.updateUI('player-profile');
        uiModule.updateUI('top-bar');
      } else {
        // Fallback UI updates if module doesn't exist
        const playerProfile = document.getElementById('player-profile');
        const topBar = document.getElementById('top-bar');
        if (playerProfile) playerProfile.classList.remove('hide');
        if (topBar) topBar.classList.remove('hide');
      }
      
      // Handle login screen (CRITICAL FIX - HIDE AGGRESSIVELY)
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        console.log('[Login] Aggressively hiding login screen');
        loginScreen.classList.add('hide');
        loginScreen.style.display = 'none';
        loginScreen.style.visibility = 'hidden';
        loginScreen.style.opacity = '0';
        loginScreen.style.pointerEvents = 'none';
        
        // Add attribute for additional selector power
        loginScreen.setAttribute('data-login-completed', 'true');
      }
      
      // Set game state if module exists
      if (gameModule) {
        console.log('[Login] Setting game state to ready');
        gameModule.setState('ready');
      }
      
      // Create DOM event for maximum compatibility
      try {
        const loginEvent = new Event('loginComplete');
        document.dispatchEvent(loginEvent);
        window.dispatchEvent(loginEvent);
        console.log('[Login] Dispatched loginComplete event');
      } catch (e) {
        console.warn('[Login] Failed to create Event object:', e);
        // Fallback to simple event creation
        try {
          const oldStyleEvent = document.createEvent('Event');
          oldStyleEvent.initEvent('loginComplete', true, true);
          document.dispatchEvent(oldStyleEvent);
          window.dispatchEvent(oldStyleEvent);
          console.log('[Login] Dispatched loginComplete event (legacy way)');
        } catch (e2) {
          console.error('[Login] Failed to dispatch event:', e2);
        }
      }
      
      // Also use EventBus
      if (window.EventBus && typeof window.EventBus.emit === 'function') {
        window.EventBus.emit('auth:loginComplete', { pubkey });
        console.log('[Login] Emitted auth:loginComplete event');
      }
      
      // CRITICAL FIX: Keep checking to force login screen to stay hidden
      setInterval(function() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen && !loginScreen.classList.contains('hide')) {
          console.log('[Login] Force re-hiding login screen');
          loginScreen.classList.add('hide');
          loginScreen.style.display = 'none';
        }
      }, 100);
      
      console.log('[Login] Login complete for pubkey:', pubkey);
      showToast('Login successful!', 'success');
      
    } catch (error) {
      console.error('[Login] Error completing login:', error);
      showToast('Login failed: ' + error.message, 'error');
    }
  }
  
  // Show username dialog for guest login
  function showUsernameDialog(callback) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'var(--color-light, #8bac0f)';
    dialog.style.border = '8px solid var(--color-medium, #306230)';
    dialog.style.padding = '24px';
    dialog.style.maxWidth = '90%';
    dialog.style.width = '400px';
    dialog.style.boxShadow = '0 0 0 4px var(--color-dark, #0f380f), 8px 8px 0 rgba(0,0,0,0.5)';
    
    // Create dialog content
    dialog.innerHTML = `
      <h2 style="color: var(--color-dark, #0f380f); margin-bottom: 20px; text-align: center;">Enter Your Guest Username</h2>
      <div style="margin-bottom: 20px;">
        <input type="text" id="guest-username-input" placeholder="Username (3-20 characters)" value="Guest${Math.floor(Math.random() * 1000)}" 
               style="width: 100%; padding: 12px; box-sizing: border-box; border: 2px solid var(--color-dark, #0f380f); font-size: 16px;">
        <div id="username-error" style="color: var(--color-danger, #cf6679); font-size: 14px; margin-top: 5px; visibility: hidden;">
          Username must be 3-20 characters
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="username-submit" style="flex: 1; padding: 10px; background-color: var(--color-primary, #8bac0f); 
                color: var(--color-dark, #0f380f); border: 3px solid var(--color-dark, #0f380f); 
                cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Continue</button>
        
        <button id="username-cancel" style="flex: 1; padding: 10px; background-color: var(--color-medium, #306230);
                color: white; border: 3px solid var(--color-dark, #0f380f); 
                cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus the input
    const input = document.getElementById('guest-username-input');
    setTimeout(() => input?.focus(), 100);
    
    // Set up handlers
    const submitButton = document.getElementById('username-submit');
    const cancelButton = document.getElementById('username-cancel');
    const errorMsg = document.getElementById('username-error');
    
    const validateInput = () => {
      if (!input) return false;
      
      const value = input.value.trim();
      const isValid = value.length >= 3 && value.length <= 20;
      
      if (errorMsg) {
        errorMsg.style.visibility = isValid ? 'hidden' : 'visible';
      }
      
      return isValid;
    };
    
    const handleSubmit = () => {
      if (validateInput()) {
        const username = input.value.trim();
        // Only try to remove if it exists and is a child of document.body
        if (overlay && overlay.parentNode === document.body) {
          document.body.removeChild(overlay);
        }
        callback(username);
      }
    };
    
    if (submitButton) {
      submitButton.addEventListener('click', handleSubmit);
    }
    
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        // Only try to remove if it exists and is a child of document.body
        if (overlay && overlay.parentNode === document.body) {
          document.body.removeChild(overlay);
        }
        callback(null);
      });
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleSubmit();
        }
      });
      
      input.addEventListener('input', validateInput);
    }
    
    // Close when clicking outside
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        // Only try to remove if it exists and is a child of document.body
        if (overlay && overlay.parentNode === document.body) {
          document.body.removeChild(overlay);
        }
        callback(null);
      }
    });
  }
  
  // Create toast container if needed
  function ensureToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }
  
  // Show toast notification
  function showToast(message, type = '') {
    ensureToastContainer();
    
    // Use existing showToast function if available
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }
  
  // Export functions
  window.LoginModule = {
    initLoginHandlers,
    showToast,
    showUsernameDialog,
    handleNostrLogin,
    handleGuestLogin,
    ensureCoreModulesExist, // Export this crucial function
    
    // NEW: Add function to force logout (for testing/debugging)
    forceLogout: function() {
      loginCompleted = false;
      localStorage.removeItem('relayworld_login');
      window.location.reload();
    }
  };
})();
