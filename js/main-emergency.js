/**
 * main-emergency.js - Emergency replacement for main.js
 * This version doesn't use ES modules at all
 */

(function() {
  console.log('[Emergency-Main] Loading emergency version of main.js...');
  
  // Check if CryptoUtils is available
  if (!window.CryptoUtils) {
    console.error('[Emergency-Main] CryptoUtils not found! Creating fallback implementation.');
    window.CryptoUtils = {
      generateKey: function(length) {
        const arr = new Uint8Array(length || 32);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
      },
      hash: async function(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      },
      encrypt: function(text) {
        return btoa(text);
      },
      decrypt: function(text) {
        return atob(text);
      }
    };
  }
  
  // Make sure RelayWorld global object exists
  window.RelayWorld = window.RelayWorld || {
    initialized: false,
    ready: false,
    version: '1.0.0-emergency',
    crypto: window.CryptoUtils
  };
  
  // Initialize application when DOM content is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[Emergency-Main] DOM loaded, setting up application...');
      setupApplication();
    });
  } else {
    // DOM already loaded, run setup immediately
    console.log('[Emergency-Main] DOM already loaded, setting up application...');
    setupApplication();
  }
  
  // Setup the main application
  function setupApplication() {
    console.log('[Emergency-Main] Setting up application...');
    
    // Make sure core system exists
    ensureCoreSystemExists();
    
    // Register core modules
    registerCoreModules();
    
    // Initialize the core
    initializeCoreSystem();
    
    // Listen for login events
    setupLoginEventListeners();
    
    // Try to load THREE.js directly
    loadTHREEjs();
    
    console.log('[Emergency-Main] Application setup complete');
  }
  
  // Ensure the core system exists
  function ensureCoreSystemExists() {
    if (!window.RelayWorldCore) {
      console.log('[Emergency-Main] Creating RelayWorldCore...');
      window.RelayWorldCore = {
        modules: new Map(),
        registerModule: function(name, module) {
          console.log(`[Emergency-Main] Registering module: ${name}`);
          this.modules.set(name, module);
          return this;
        },
        getModule: function(name) {
          const module = this.modules.get(name);
          if (!module) {
            console.warn(`[Emergency-Main] Module not found: ${name}, trying to create it`);
            this.registerCoreModules();
            return this.modules.get(name) || null;
          }
          return module;
        },
        init: function() {
          console.log('[Emergency-Main] Initializing core system...');
          
          // Ensure EventBus exists
          if (!window.EventBus) {
            window.EventBus = {
              listeners: {},
              on: function(event, callback) {
                if (!this.listeners[event]) this.listeners[event] = [];
                this.listeners[event].push(callback);
              },
              emit: function(event, data) {
                if (this.listeners[event]) {
                  this.listeners[event].forEach(function(callback) {
                    try {
                      callback(data);
                    } catch (e) {
                      console.error('[Emergency-Main] EventBus error:', e);
                    }
                  });
                }
              }
            };
          }
          
          // Make sure core modules are registered
          this.registerCoreModules();
          
          console.log('[Emergency-Main] Core system initialized');
          
          // Emit initialized event
          if (window.EventBus) {
            window.EventBus.emit('core:initialized', { version: window.RelayWorld.version });
          }
        },
        
        // Register core modules required by the system
        registerCoreModules: function() {
          console.log('[Emergency-Main] Registering core modules...');
          
          // Player module
          if (!this.modules.has('player')) {
            this.registerModule('player', {
              currentPlayer: null,
              pubkey: null,
              name: null,
              setPlayer: function(data) {
                console.log("[Player] Setting player data:", data);
                this.currentPlayer = data;
                this.pubkey = data.pubkey;
                this.name = data.name || `Player-${data.pubkey.substring(0, 8)}`;
                
                // Emit player updated event
                if (window.EventBus) {
                  window.EventBus.emit('player:updated', data);
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
                console.log("[Game] State changing to:", newState);
                this.state = newState;
                
                // Emit game state change event
                if (window.EventBus) {
                  window.EventBus.emit('game:stateChange', newState);
                }
              },
              getState: function() {
                return this.state;
              },
              start: function() {
                console.log("[Game] Starting game");
                this.setState('playing');
              }
            });
          }
          
          // UI module
          if (!this.modules.has('ui')) {
            this.registerModule('ui', {
              elements: new Map(),
              updateUI: function(elementId, data) {
                console.log("[UI] Updating element:", elementId);
                const element = document.getElementById(elementId);
                if (element) {
                  if (elementId === 'player-profile' || elementId === 'top-bar') {
                    element.classList.remove('hide');
                  }
                  this.elements.set(elementId, data || {});
                  
                  // Emit UI updated event
                  if (window.EventBus) {
                    window.EventBus.emit('ui:updated', { elementId: elementId, data: data });
                  }
                } else {
                  console.warn("[UI] Element not found:", elementId);
                }
              }
            });
          }
        }
      };
    }
  }
  
  // Register core modules
  function registerCoreModules() {
    // Make sure RelayWorldCore exists
    if (!window.RelayWorldCore) {
      console.error('[Emergency-Main] No RelayWorldCore found!');
      return;
    }
    
    // Use the RelayWorldCore's own registration method
    if (typeof window.RelayWorldCore.registerCoreModules === 'function') {
      window.RelayWorldCore.registerCoreModules();
    }
  }
  
  // Initialize the core system
  function initializeCoreSystem() {
    if (window.RelayWorldCore && typeof window.RelayWorldCore.init === 'function') {
      console.log('[Emergency-Main] Initializing RelayWorldCore...');
      window.RelayWorldCore.init();
      window.RelayWorld.initialized = true;
    } else {
      console.error('[Emergency-Main] RelayWorldCore or init method not found!');
    }
  }
  
  // Setup login event listeners
  function setupLoginEventListeners() {
    // Listen for login events from both DOM events and EventBus
    window.addEventListener('loginComplete', function(event) {
      console.log('[Emergency-Main] Login complete (DOM event), starting game...');
      startGameAfterLogin();
    });
    
    // Listen on EventBus too
    if (window.EventBus) {
      window.EventBus.on('auth:loginComplete', function(data) {
        console.log('[Emergency-Main] Login complete (EventBus), starting game...', data);
        startGameAfterLogin();
      });
    }
  }
  
  // Start the game after login
  function startGameAfterLogin() {
    const gameModule = window.RelayWorldCore?.getModule('game');
    if (gameModule && typeof gameModule.start === 'function') {
      gameModule.start();
    } else {
      console.error('[Emergency-Main] Game module not found or start method not available!');
    }
  }
  
  // Load THREE.js directly
  function loadTHREEjs() {
    if (window.THREE && window.THREE.REVISION) {
      console.log('[Emergency-Main] THREE.js already loaded, revision:', window.THREE.REVISION);
      window.dispatchEvent(new Event('THREEReady'));
      return;
    }
    
    console.log('[Emergency-Main] THREE.js not found, loading from CDN...');
    
    // Try to load from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.min.js';
    script.onload = function() {
      console.log('[Emergency-Main] THREE.js loaded successfully from CDN');
      window.dispatchEvent(new Event('THREEReady'));
      
      // Also apply any THREE.js fixes
      if (window.applyThreeJsFixes && typeof window.applyThreeJsFixes === 'function') {
        window.applyThreeJsFixes();
      }
    };
    script.onerror = function() {
      console.error('[Emergency-Main] Failed to load THREE.js from CDN, trying fallback...');
      
      // Try alternate CDN as fallback
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.min.js';
      fallbackScript.onload = function() {
        console.log('[Emergency-Main] THREE.js loaded from fallback CDN');
        window.dispatchEvent(new Event('THREEReady'));
        
        // Apply THREE.js fixes
        if (window.applyThreeJsFixes && typeof window.applyThreeJsFixes === 'function') {
          window.applyThreeJsFixes();
        }
      };
      fallbackScript.onerror = function() {
        console.error('[Emergency-Main] Failed to load THREE.js from both CDNs');
        window.dispatchEvent(new Event('THREEFallback'));
      };
      document.head.appendChild(fallbackScript);
    };
    
    document.head.appendChild(script);
  }
  
  console.log('[Emergency-Main] Emergency version of main.js loaded successfully');
})(); 