/**
 * main.js - Main entry point for Relay World
 * Non-module version that uses globally defined objects
 */

// DO NOT USE IMPORT STATEMENTS HERE - they cause errors in production
// import { CryptoUtils } from './utils/crypto-utils.js'; <-- REMOVED THIS LINE

(function() {
  console.log('[Main] Initializing Relay World...');
  
  // Check if CryptoUtils is available
  if (!window.CryptoUtils) {
    console.error('[Main] CryptoUtils not found! Creating fallback implementation.');
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
    version: '1.0.0',
    crypto: window.CryptoUtils
  };
  
  // Initialize application when DOM content is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[Main] DOM loaded, setting up application...');
      setupApplication();
    });
  } else {
    // DOM already loaded, run setup immediately
    console.log('[Main] DOM already loaded, setting up application...');
    setupApplication();
  }
  
  // Setup the main application
  function setupApplication() {
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
  }
  
  // Ensure the core system exists
  function ensureCoreSystemExists() {
    if (!window.RelayWorldCore) {
      console.log('[Main] Creating RelayWorldCore...');
      window.RelayWorldCore = {
        modules: new Map(),
        registerModule: function(name, module) {
          console.log(`[Main] Registering module: ${name}`);
          this.modules.set(name, module);
          return this;
        },
        getModule: function(name) {
          return this.modules.get(name) || null;
        },
        init: function() {
          console.log('[RelayWorldCore] Initializing core system...');
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
                  this.listeners[event].forEach(callback => callback(data));
                }
              }
            };
          }
          console.log('[RelayWorldCore] Core system initialized');
          
          // Emit initialized event
          if (window.EventBus) {
            window.EventBus.emit('core:initialized', { version: window.RelayWorld.version });
          }
        }
      };
    }
  }
  
  // Register core modules
  function registerCoreModules() {
    // Make sure RelayWorldCore exists
    if (!window.RelayWorldCore) {
      console.error('[Main] No RelayWorldCore found!');
      return;
    }
    
    // Player module
    if (!window.RelayWorldCore.getModule('player')) {
      console.log('[Main] Registering player module');
      window.RelayWorldCore.registerModule('player', {
        currentPlayer: null,
        pubkey: null,
        name: null,
        setPlayer: function(data) {
          console.log("[Player] Setting player data:", data);
          this.currentPlayer = data;
          this.pubkey = data.pubkey;
          this.name = data.name || `Player-${data.pubkey.substring(0, 8)}`;
          
          // Emit event
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
    if (!window.RelayWorldCore.getModule('game')) {
      console.log('[Main] Registering game module');
      window.RelayWorldCore.registerModule('game', {
        state: 'initializing',
        setState: function(newState) {
          console.log("[Game] State changing to:", newState);
          this.state = newState;
          
          // Emit event
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
    if (!window.RelayWorldCore.getModule('ui')) {
      console.log('[Main] Registering UI module');
      window.RelayWorldCore.registerModule('ui', {
        elements: new Map(),
        updateUI: function(elementId, data) {
          console.log("[UI] Updating element:", elementId);
          const element = document.getElementById(elementId);
          if (element) {
            if (elementId === 'player-profile' || elementId === 'top-bar') {
              element.classList.remove('hide');
            }
            this.elements.set(elementId, data);
            
            // Emit event
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
  
  // Initialize the core system
  function initializeCoreSystem() {
    if (window.RelayWorldCore && typeof window.RelayWorldCore.init === 'function') {
      console.log('[Main] Initializing RelayWorldCore...');
      window.RelayWorldCore.init();
      window.RelayWorld.initialized = true;
    } else {
      console.error('[Main] RelayWorldCore or init method not found!');
    }
  }
  
  // Setup login event listeners
  function setupLoginEventListeners() {
    // Listen for login events from both DOM events and EventBus
    window.addEventListener('loginComplete', function(event) {
      console.log('[Main] Login complete (DOM event), starting game...');
      startGameAfterLogin();
    });
    
    // Listen on EventBus too
    if (window.EventBus) {
      window.EventBus.on('auth:loginComplete', function(data) {
        console.log('[Main] Login complete (EventBus), starting game...', data);
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
      console.error('[Main] Game module not found or start method not available!');
    }
  }
  
  // Load THREE.js directly
  function loadTHREEjs() {
    if (window.THREE && window.THREE.REVISION) {
      console.log('[Main] THREE.js already loaded, revision:', window.THREE.REVISION);
      window.dispatchEvent(new Event('THREEReady'));
      return;
    }
    
    console.log('[Main] THREE.js not found, loading from CDN...');
    
    // Try to load from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.min.js';
    script.onload = function() {
      console.log('[Main] THREE.js loaded successfully from CDN');
      window.dispatchEvent(new Event('THREEReady'));
      
      // Also apply any THREE.js fixes
      if (window.applyThreeJsFixes && typeof window.applyThreeJsFixes === 'function') {
        window.applyThreeJsFixes();
      }
    };
    script.onerror = function() {
      console.error('[Main] Failed to load THREE.js from CDN, trying fallback...');
      
      // Try alternate CDN as fallback
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.min.js';
      fallbackScript.onload = function() {
        console.log('[Main] THREE.js loaded from fallback CDN');
        window.dispatchEvent(new Event('THREEReady'));
        
        // Apply THREE.js fixes
        if (window.applyThreeJsFixes && typeof window.applyThreeJsFixes === 'function') {
          window.applyThreeJsFixes();
        }
      };
      fallbackScript.onerror = function() {
        console.error('[Main] Failed to load THREE.js from both CDNs');
        window.dispatchEvent(new Event('THREEFallback'));
      };
      document.head.appendChild(fallbackScript);
    };
    
    document.head.appendChild(script);
  }
})();
