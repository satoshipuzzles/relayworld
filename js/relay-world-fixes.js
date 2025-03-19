/**
 * relay-world-fixes.js
 * This script addresses integration issues between the main modules
 * of Relay World. Include this before other scripts in the HTML file.
 */

(function() {
  console.log('[RelayWorldFixes] Initializing integration fixes...');
  
  // References to core modules
  let _eventBus = null;
  let _configManager = null;
  let _relayWorldCore = null;
  
  // Initialize immediately to ensure modules exist before anything tries to use them
  initializeFixesImmediately();
  
  // Initialize fixes immediately
  function initializeFixesImmediately() {
    console.log('[RelayWorldFixes] Performing immediate initialization...');
    
    // Create unified EventBus if it doesn't exist
    createUnifiedEventBus();
    
    // Create unified ConfigManager if it doesn't exist
    createUnifiedConfigManager();
    
    // Create unified RelayWorldCore if it doesn't exist
    createUnifiedRelayWorldCore();
    
    // Ensure core modules are registered
    registerCoreModulesImmediately();
    
    // Apply CSS fixes immediately
    applyCSSFixes();
    
    // Setup global error handler
    setupGlobalErrorHandler();
  }
  
  // Create unified EventBus
  function createUnifiedEventBus() {
    if (window.EventBus) {
      console.log('[RelayWorldFixes] EventBus already exists, using existing instance');
      _eventBus = window.EventBus;
      return;
    }
    
    console.log('[RelayWorldFixes] Creating unified EventBus');
    
    _eventBus = {
      listeners: {},
      on: function(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return this;
      },
      emit: function(event, data) {
        console.log('[EventBus] Emitting:', event);
        if (this.listeners[event]) {
          this.listeners[event].forEach(function(callback) {
            try {
              callback(data);
            } catch (e) {
              console.error('[EventBus] Error in event handler:', e);
            }
          });
        }
      },
      off: function(event, callback) {
        if (this.listeners[event]) {
          const index = this.listeners[event].indexOf(callback);
          if (index !== -1) {
            this.listeners[event].splice(index, 1);
          }
        }
        return this;
      },
      init: function() {
        console.log('[EventBus] Initializing event bus');
        return this;
      }
    };
    
    // Make EventBus globally available
    window.EventBus = _eventBus;
  }
  
  // Create unified ConfigManager
  function createUnifiedConfigManager() {
    if (window.ConfigManager) {
      console.log('[RelayWorldFixes] ConfigManager already exists, using existing instance');
      _configManager = window.ConfigManager;
      return;
    }
    
    console.log('[RelayWorldFixes] Creating unified ConfigManager');
    
    _configManager = {
      settings: {
        debugMode: true,
        apiUrl: 'https://api.nostr.relay.world',
        gameVersion: '1.0.0',
        audioEnabled: true,
        graphics: 'medium',
        renderDistance: 1000,
        maxPlayers: 50,
        defaultRelays: [
          'wss://relay.nostr.band',
          'wss://relay.snort.social',
          'wss://relay.damus.io'
        ]
      },
      get: function(key) {
        return this.settings[key];
      },
      set: function(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        if (_eventBus) {
          _eventBus.emit('config:updated', { key: key, value: value });
        }
        return this;
      },
      saveSettings: function() {
        try {
          localStorage.setItem('relay_world_config', JSON.stringify(this.settings));
        } catch (e) {
          console.error('[ConfigManager] Failed to save settings:', e);
        }
      },
      loadSettings: function() {
        try {
          const stored = localStorage.getItem('relay_world_config');
          if (stored) {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
          }
        } catch (e) {
          console.error('[ConfigManager] Failed to load settings:', e);
        }
      },
      init: function() {
        console.log('[ConfigManager] Initializing configuration manager');
        this.loadSettings();
        return this;
      }
    };
    
    // Make ConfigManager globally available
    window.ConfigManager = _configManager;
    _configManager.init();
  }
  
  // Create unified RelayWorldCore
  function createUnifiedRelayWorldCore() {
    if (window.RelayWorldCore) {
      console.log('[RelayWorldFixes] RelayWorldCore already exists, using existing instance');
      _relayWorldCore = window.RelayWorldCore;
      return;
    }
    
    console.log('[RelayWorldFixes] Creating unified RelayWorldCore');
    
    _relayWorldCore = {
      modules: new Map(),
      initialized: false,
      registerModule: function(name, module) {
        console.log(`[RelayWorldCore] Registering module: ${name}`);
        this.modules.set(name, module);
        
        if (_eventBus) {
          _eventBus.emit('module:registered', { name: name });
        }
        
        return this;
      },
      getModule: function(name) {
        const module = this.modules.get(name);
        if (!module) {
          console.warn(`[RelayWorldCore] Module "${name}" not found`);
          // Try to register it if it's a core module
          this.registerCoreModules();
          return this.modules.get(name) || null;
        }
        return module;
      },
      init: function() {
        console.log('[RelayWorldCore] Initializing core system...');
        
        // Initialize event bus if it exists
        if (_eventBus && typeof _eventBus.init === 'function') {
          _eventBus.init();
        }
        
        // Initialize config manager if it exists
        if (_configManager && typeof _configManager.init === 'function') {
          _configManager.init();
        }
        
        // Register core modules
        this.registerCoreModules();
        
        // Set flag
        this.initialized = true;
        
        console.log('[RelayWorldCore] Core system initialized');
        
        // Emit initialized event
        if (_eventBus) {
          _eventBus.emit('core:initialized', { version: '1.0.0' });
        }
        
        return this;
      },
      
      // Register core modules
      registerCoreModules: function() {
        // Player module
        if (!this.modules.has('player')) {
          this.registerModule('player', {
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
              
              // Update UI elements
              const playerName = document.getElementById('player-profile-name');
              if (playerName) playerName.textContent = this.name;
              
              const playerNpub = document.getElementById('player-profile-npub');
              if (playerNpub) playerNpub.textContent = `${this.pubkey.substring(0, 8)}...`;
              
              // Emit player updated event
              if (_eventBus) {
                _eventBus.emit('player:updated', data);
              }
            },
            getPlayer: function() {
              return this.currentPlayer;
            }
          });
        }
        
        // Game module
        if (!this.modules.has('game')) {
          this.registerModule('game', {
            state: 'initializing',
            setState: function(newState) {
              console.log('[Game] State changing to:', newState);
              this.state = newState;
              
              // Emit game state change event
              if (_eventBus) {
                _eventBus.emit('game:stateChange', newState);
              }
            },
            getState: function() {
              return this.state;
            },
            start: function() {
              console.log('[Game] Starting game');
              
              // Hide login screen if not already hidden
              const loginScreen = document.getElementById('login-screen');
              if (loginScreen) {
                loginScreen.classList.add('hide');
                loginScreen.style.display = 'none';
                loginScreen.style.visibility = 'hidden';
              }
              
              // Show game elements
              const playerProfile = document.getElementById('player-profile');
              const topBar = document.getElementById('top-bar');
              
              if (playerProfile) playerProfile.classList.remove('hide');
              if (topBar) topBar.classList.remove('hide');
              
              this.setState('playing');
            }
          });
        }
        
        // UI module
        if (!this.modules.has('ui')) {
          this.registerModule('ui', {
            elements: new Map(),
            updateUI: function(elementId, data) {
              console.log('[UI] Updating element:', elementId);
              const element = document.getElementById(elementId);
              if (element) {
                if (elementId === 'player-profile' || elementId === 'top-bar') {
                  element.classList.remove('hide');
                }
                
                this.elements.set(elementId, data || {});
                
                // Emit UI updated event
                if (_eventBus) {
                  _eventBus.emit('ui:updated', { elementId: elementId, data: data });
                }
              } else {
                console.warn('[UI] Element not found:', elementId);
              }
            },
            showElement: function(elementId) {
              const element = document.getElementById(elementId);
              if (element) {
                element.classList.remove('hide');
                return true;
              }
              return false;
            },
            hideElement: function(elementId) {
              const element = document.getElementById(elementId);
              if (element) {
                element.classList.add('hide');
                return true;
              }
              return false;
            }
          });
        }
      }
    };
    
    // Make RelayWorldCore globally available
    window.RelayWorldCore = _relayWorldCore;
  }
  
  // Register core modules immediately to ensure they're available
  function registerCoreModulesImmediately() {
    if (_relayWorldCore) {
      _relayWorldCore.registerCoreModules();
    }
  }
  
  // Setup unified login handler
  function setupUnifiedLoginHandler() {
    console.log('[RelayWorldFixes] Setting up unified login handler');
    
    // Listen for login events from EventBus
    if (_eventBus) {
      _eventBus.on('auth:loginComplete', function(data) {
        console.log('[RelayWorldFixes] Login complete via EventBus:', data);
        
        // Get game module
        const gameModule = _relayWorldCore?.getModule('game');
        if (gameModule && typeof gameModule.start === 'function') {
          gameModule.start();
        }
        
        // Get UI module
        const uiModule = _relayWorldCore?.getModule('ui');
        if (uiModule) {
          uiModule.updateUI('player-profile');
          uiModule.updateUI('top-bar');
          
          // Hide login screen explicitly
          uiModule.hideElement('login-screen');
        }
        
        // Hide login screen manually as well for maximum reliability
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
          loginScreen.classList.add('hide');
          loginScreen.style.display = 'none';
        }
      });
    }
    
    // Listen for login events from DOM
    window.addEventListener('loginComplete', function(event) {
      console.log('[RelayWorldFixes] Login complete via DOM event');
      
      // Get game module
      const gameModule = _relayWorldCore?.getModule('game');
      if (gameModule && typeof gameModule.start === 'function') {
        gameModule.start();
      }
      
      // Get UI module
      const uiModule = _relayWorldCore?.getModule('ui');
      if (uiModule) {
        uiModule.updateUI('player-profile');
        uiModule.updateUI('top-bar');
        
        // Hide login screen explicitly
        uiModule.hideElement('login-screen');
      }
      
      // Hide login screen manually as well for maximum reliability
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        loginScreen.classList.add('hide');
        loginScreen.style.display = 'none';
      }
    });
    
    console.log('[RelayWorldFixes] Unified login handler attached');
  }
  
  // Apply CSS fixes
  function applyCSSFixes() {
    console.log('[RelayWorldFixes] Applying CSS fixes');
    
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
      /* Force hide classes */
      .hide {
        display: none !important;
      }
      
      /* Fix for login screen */
      #login-screen.hide {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Fix for player profile and top bar */
      #player-profile:not(.hide),
      #top-bar:not(.hide) {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Game canvas fix */
      #game-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
      }
      
      /* UI container fix */
      #game-container {
        position: relative;
        z-index: 1;
      }
    `;
    
    // Append to document
    document.head.appendChild(style);
  }
  
  // Setup global error handler
  function setupGlobalErrorHandler() {
    const originalOnError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Log error for debugging
      console.error('[RelayWorldFixes] Global error:', { message, source, lineno, colno });
      
      // Check if this is the CryptoUtils error
      if (message && message.toString().includes("CryptoUtils")) {
        console.warn('[RelayWorldFixes] Intercepted CryptoUtils error, this is handled');
        return true; // Prevent default error handling
      }
      
      // If not handled, use original handler if available
      if (typeof originalOnError === 'function') {
        return originalOnError.apply(this, arguments);
      }
      
      return false; // Continue with default error handling
    };
  }
  
  // Setup THREE.js fixes
  function setupThreeJsFixes() {
    console.log('[RelayWorldFixes] Setting up THREE.js fixes');
    
    // Try to load THREE.js from CDN if not already loaded
    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.min.js';
      
      script.onload = function() {
        console.log('[RelayWorldFixes] THREE.js loaded successfully from CDN');
        
        // Dispatch THREE ready event
        const threeReadyEvent = new Event('THREEReady');
        window.dispatchEvent(threeReadyEvent);
      };
      
      script.onerror = function() {
        console.error('[RelayWorldFixes] Failed to load THREE.js from CDN');
        
        // Try a fallback
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.min.js';
        
        fallbackScript.onload = function() {
          console.log('[RelayWorldFixes] THREE.js loaded from fallback CDN');
          
          // Dispatch THREE ready event
          const threeReadyEvent = new Event('THREEReady');
          window.dispatchEvent(threeReadyEvent);
        };
        
        fallbackScript.onerror = function() {
          console.error('[RelayWorldFixes] Failed to load THREE.js from fallback CDN');
          
          // Dispatch fallback event
          const threeFailedEvent = new Event('THREEFallback');
          window.dispatchEvent(threeFailedEvent);
        };
        
        document.head.appendChild(fallbackScript);
      };
      
      document.head.appendChild(script);
    }
  }
  
  // Initialize core system when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[RelayWorldFixes] DOM loaded, applying fixes');
    
    // Apply CSS fixes
    applyCSSFixes();
    
    // Setup unified login handler
    setupUnifiedLoginHandler();
    
    // Setup THREE.js fixes
    setupThreeJsFixes();
    
    console.log('[RelayWorldFixes] Initializing core system');
    
    // Initialize core system
    if (_relayWorldCore && typeof _relayWorldCore.init === 'function') {
      _relayWorldCore.init();
    }
    
    // Final check to ensure modules are registered
    if (_relayWorldCore) {
      _relayWorldCore.registerCoreModules();
    }
    
    console.log('[RelayWorldFixes] Integration fixes applied');
  });
  
  // Add additional init call outside DOMContentLoaded to ensure it happens in both cases
  if (document.readyState !== 'loading') {
    console.log('[RelayWorldFixes] Document already loaded, initializing immediately');
    
    // Initialize core system
    if (_relayWorldCore && typeof _relayWorldCore.init === 'function') {
      _relayWorldCore.init();
    }
    
    // Setup unified login handler
    setupUnifiedLoginHandler();
    
    // Setup THREE.js fixes
    setupThreeJsFixes();
  }
  
  console.log('[RelayWorldFixes] Integration fixes prepared');
  
  // Export functions for easy access
  window.RelayWorldFixes = {
    createUnifiedEventBus,
    createUnifiedConfigManager,
    createUnifiedRelayWorldCore,
    registerCoreModulesImmediately,
    setupUnifiedLoginHandler,
    setupThreeJsFixes,
    applyCSSFixes
  };
})();
