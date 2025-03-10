/**
 * relay-world-fixes.js
 * This script addresses integration issues between the main modules
 * of Relay World. Include this before other scripts in the HTML file.
 */

(function() {
  console.log('[RelayWorldFixes] Initializing integration fixes...');
  
  // Create global namespace if it doesn't exist
  window.RelayWorld = window.RelayWorld || {
    initialized: false,
    version: '1.0.0',
    debug: true,
    modules: {},
    ready: false
  };
  
  // Fix EventBus to avoid duplication
  if (!window.EventBus) {
    console.log('[RelayWorldFixes] Creating unified EventBus');
    window.EventBus = {
      listeners: new Map(),
      init: function() {
        console.log("[EventBus] Initializing event bus");
        return this;
      },
      on: function(event, callback) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return this;
      },
      emit: function(event, data) {
        if (this.listeners.has(event)) {
          this.listeners.get(event).forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`[EventBus] Error in listener for "${event}":`, error);
            }
          });
        }
        return this;
      },
      off: function(event, callback) {
        if (this.listeners.has(event)) {
          const listeners = this.listeners.get(event);
          const index = listeners.indexOf(callback);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
        return this;
      },
      once: function(event, callback) {
        const onceWrapper = (data) => {
          this.off(event, onceWrapper);
          callback(data);
        };
        return this.on(event, onceWrapper);
      }
    };
  }
  
  // Fix ConfigManager to avoid duplication
  if (!window.ConfigManager) {
    console.log('[RelayWorldFixes] Creating unified ConfigManager');
    window.ConfigManager = {
      configs: new Map(),
      storageKey: 'relayworld_config',
      init: function() {
        console.log("[ConfigManager] Initializing configuration manager");
        this.loadSavedConfig();
        return this;
      },
      setConfig: function(key, value) {
        const oldValue = this.configs.get(key);
        this.configs.set(key, value);
        
        if (window.EventBus) {
          window.EventBus.emit('config:change', { key, value, oldValue });
        }
        return this;
      },
      getConfig: function(key, defaultValue = null) {
        return this.configs.has(key) ? this.configs.get(key) : defaultValue;
      },
      loadSavedConfig: function() {
        try {
          const savedConfig = localStorage.getItem(this.storageKey);
          if (savedConfig) {
            const config = JSON.parse(savedConfig);
            for (const [key, value] of Object.entries(config)) {
              this.configs.set(key, value);
            }
            console.log("[ConfigManager] Loaded saved configuration");
          }
        } catch (error) {
          console.warn("[ConfigManager] Failed to load saved configuration:", error);
        }
        return this;
      },
      saveConfig: function() {
        try {
          const configObj = {};
          for (const [key, value] of this.configs.entries()) {
            configObj[key] = value;
          }
          localStorage.setItem(this.storageKey, JSON.stringify(configObj));
          console.log("[ConfigManager] Configuration saved");
          return true;
        } catch (error) {
          console.error("[ConfigManager] Failed to save configuration:", error);
          return false;
        }
      }
    };
  }
  
  // Fix RelayWorldCore to use our unified components
  if (!window.RelayWorldCore) {
    console.log('[RelayWorldFixes] Creating unified RelayWorldCore');
    window.RelayWorldCore = {
      modules: new Map(),
      eventBus: window.EventBus,
      config: window.ConfigManager,
      
      init: async function() {
        console.log("[RelayWorldCore] Initializing core system...");
        
        this.eventBus.init();
        this.config.init();
        
        // Calculate initialization order based on dependencies and priority
        const initOrder = this._calculateInitOrder();
        
        // Initialize all modules in proper order
        for (const moduleName of initOrder) {
          const module = this.modules.get(moduleName);
          
          if (typeof module.init === 'function') {
            try {
              console.log(`[RelayWorldCore] Initializing module: ${moduleName}`);
              await module.init();
              console.log(`[RelayWorldCore] Module ${moduleName} initialized`);
            } catch (error) {
              console.error(`[RelayWorldCore] Failed to initialize module "${moduleName}":`, error);
              if (module.critical) {
                throw error;
              }
            }
          }
        }
        
        console.log("[RelayWorldCore] Core system initialized");
        this.eventBus.emit('core:ready', null);
        window.RelayWorld.ready = true;
        return this;
      },
      
      registerModule: function(name, module) {
        if (this.modules.has(name)) {
          console.warn(`[RelayWorldCore] Module "${name}" is being replaced`);
        }
        this.modules.set(name, module);
        console.log(`[RelayWorldCore] Registered module: ${name}`);
        return this;
      },
      
      getModule: function(name) {
        if (!this.modules.has(name)) {
          console.warn(`[RelayWorldCore] Module "${name}" not found`);
          return null;
        }
        return this.modules.get(name);
      },
      
      setConfig: function(key, value) {
        this.config.setConfig(key, value);
        return this;
      },
      
      getConfig: function(key, defaultValue = null) {
        return this.config.getConfig(key, defaultValue);
      },
      
      // Calculate initialization order based on dependencies and priority
      _calculateInitOrder: function() {
        const visited = new Set();
        const order = [];
        
        // Sort modules by priority
        const prioritizedModules = Array.from(this.modules.entries())
          .sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));
        
        const visit = (moduleName) => {
          if (visited.has(moduleName)) return;
          
          visited.add(moduleName);
          
          const module = this.modules.get(moduleName);
          if (module && module.dependencies) {
            for (const dep of module.dependencies) {
              if (this.modules.has(dep)) {
                visit(dep);
              } else {
                console.warn(`[RelayWorldCore] Module "${moduleName}" depends on "${dep}" which is not registered`);
              }
            }
          }
          
          order.push(moduleName);
        };
        
        for (const [moduleName] of prioritizedModules) {
          visit(moduleName);
        }
        
        return order;
      }
    };
  }
  
  // Apply THREE.js fixes correctly
  console.log('[RelayWorldFixes] Setting up THREE.js fixes');
  window.applyThreeJsFixes = function() {
    if (typeof THREE === 'undefined') {
      return false;
    }
    
    console.log('[RelayWorldFixes] Applying fixes to THREE.js...');
    
    // Fix 1: Add CapsuleGeometry if missing
    if (!THREE.CapsuleGeometry) {
      console.log('[RelayWorldFixes] Adding CapsuleGeometry fallback');
      
      THREE.CapsuleGeometry = function(radius, length, capSegments, radialSegments) {
        if (!THREE.BufferGeometry) {
          // Really old THREE version - use CylinderGeometry as fallback
          return new THREE.CylinderGeometry(radius, radius, length, radialSegments || 8);
        }
        
        THREE.BufferGeometry.call(this);
        
        this.type = 'CapsuleGeometry';
        
        // Parameters
        radius = radius || 1;
        length = length || 1;
        capSegments = Math.floor(capSegments) || 8;
        radialSegments = Math.floor(radialSegments) || 16;
        
        try {
          // Simple fallback - just use a cylinder
          return new THREE.CylinderGeometry(radius, radius, length, radialSegments);
        } catch (e) {
          console.warn('[RelayWorldFixes] Error creating CapsuleGeometry:', e);
          // Fallback to cylinder
          return new THREE.CylinderGeometry(radius, radius, length, radialSegments);
        }
      };
      
      // Make sure to set prototype correctly if possible
      if (THREE.BufferGeometry) {
        THREE.CapsuleGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
        THREE.CapsuleGeometry.prototype.constructor = THREE.CapsuleGeometry;
      }
    }
    
    // Fix 2: Fix flatShading issue with MeshLambertMaterial
    if (typeof THREE.MeshLambertMaterial !== 'undefined') {
      console.log('[RelayWorldFixes] Patching MeshLambertMaterial for flatShading support');
      
      const originalMeshLambertMaterial = THREE.MeshLambertMaterial;
      
      // Replace the constructor to filter out flatShading
      THREE.MeshLambertMaterial = function(params) {
        if (params && params.flatShading !== undefined) {
          // Make a copy without flatShading
          const newParams = Object.assign({}, params);
          delete newParams.flatShading;
          return new originalMeshLambertMaterial(newParams);
        }
        return new originalMeshLambertMaterial(params);
      };
    }
    
    console.log('[RelayWorldFixes] THREE.js fixes applied');
    return true;
  };
  
  // Set up pre-load check for THREE.js
  if (typeof THREE !== 'undefined') {
    window.applyThreeJsFixes();
  } else {
    window.addEventListener('load', function() {
      if (typeof THREE !== 'undefined') {
        window.applyThreeJsFixes();
      }
    });
  }
  
  // Fix toast notification system
  window.showToast = window.showToast || function(message, type = '') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      // Create container if it doesn't exist
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
      return window.showToast(message, type); // Call again
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.className += ` ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  };

  // Utility for unified login handling
  window.unifiedLoginHandler = function() {
    console.log('[RelayWorldFixes] Setting up unified login handler');
    
    const loginButton = document.getElementById('login-button');
    if (!loginButton) return;
    
    // Remove any existing listeners (by cloning and replacing)
    const newLoginButton = loginButton.cloneNode(true);
    loginButton.parentNode.replaceChild(newLoginButton, loginButton);
    
    // Add our unified handler
    newLoginButton.addEventListener('click', async function() {
      const loginLoader = document.getElementById('login-loader');
      const loginStatus = document.getElementById('login-status');
      const soundWave = document.getElementById('sound-wave');
      
      console.log('[RelayWorldFixes] Login button clicked');
      
      // Disable button and show loader
      newLoginButton.disabled = true;
      if (loginLoader) loginLoader.style.display = 'block';
      if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
      
      try {
        // Check if nostr is available in the window
        if (!window.nostr) {
          throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
        }
        
        if (loginStatus) loginStatus.textContent = 'Requesting pubkey...';
        
        // Get public key from extension
        const pubkey = await window.nostr.getPublicKey();
        if (!pubkey) {
          throw new Error('No public key available from extension');
        }
        
        if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
        
        // Animate sound wave effect
        if (soundWave) {
          soundWave.style.animation = 'sound-wave 4s ease-out infinite';
        }
        
        // Dispatch login event for other modules to handle
        if (window.EventBus) {
          window.EventBus.emit('auth:login', { pubkey });
        }
        
        // Hide login screen after a delay
        setTimeout(() => {
          const loginScreen = document.getElementById('login-screen');
          const uiElements = ['top-bar', 'player-profile', 'leaderboard-container', 'chat-container'];
          
          if (loginScreen) loginScreen.classList.add('hide');
          
          // Show UI elements
          uiElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hide');
          });
          
          // Show mobile controls on mobile
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.classList.remove('hide');
          }
          
          // Start game if module exists
          const gameModule = window.RelayWorldCore?.getModule?.('game');
          if (gameModule && typeof gameModule.start === 'function') {
            gameModule.start();
          }
          
          if (loginLoader) loginLoader.classList.add('hide');
          if (loginStatus) loginStatus.textContent = '';
          newLoginButton.disabled = false;
          
          window.showToast('Login successful!', 'success');
        }, 1500);
        
      } catch (error) {
        console.error('[RelayWorldFixes] Login failed:', error);
        
        if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
        if (loginLoader) loginLoader.classList.add('hide');
        newLoginButton.disabled = false;
        
        window.showToast('Login failed: ' + error.message, 'error');
      }
    });
    
    console.log('[RelayWorldFixes] Unified login handler attached');
  };
  
  // Apply CSS fixes to make sure all styles load correctly
  window.fixCSS = function() {
    console.log('[RelayWorldFixes] Applying CSS fixes');
    
    // Fix any CSS that might have wrong file paths
    const styles = document.getElementsByTagName('link');
    for (let i = 0; i < styles.length; i++) {
      const href = styles[i].getAttribute('href');
      if (href && href.includes('.css.css')) {
        // Fix double extension
        styles[i].setAttribute('href', href.replace('.css.css', '.css'));
      }
    }
    
    // Make sure toast container exists
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  };
  
  // Set up initialization sequence for after DOM is loaded
  window.addEventListener('DOMContentLoaded', function() {
    console.log('[RelayWorldFixes] DOM loaded, applying fixes');
    
    // Apply CSS fixes
    window.fixCSS();
    
    // Set up unified login handler
    window.unifiedLoginHandler();
    
    // Initialize core system if not already done
    setTimeout(() => {
      // Allow other scripts to run first
      if (window.RelayWorldCore && !window.RelayWorld.initialized) {
        console.log('[RelayWorldFixes] Initializing core system');
        window.RelayWorldCore.init().catch(err => {
          console.error('[RelayWorldFixes] Core initialization failed:', err);
          window.showToast('Initialization failed. Please reload the page.', 'error');
        });
        window.RelayWorld.initialized = true;
      }
    }, 300);
  });
  
  console.log('[RelayWorldFixes] Integration fixes prepared');
})();
