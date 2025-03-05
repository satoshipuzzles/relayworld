/**
 * module-loader.js - Main entry point for Relay World
 * Handles loading core modules and enhancements
 */

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing Relay World...");
  
  // Load core modules first
  loadCoreModules()
    .then(() => {
      console.log("Core modules loaded successfully");
      
      // Only preload enhancement modules but don't initialize them yet
      return preloadEnhancementModules();
    })
    .catch(error => {
      console.error('Module loading error:', error);
      document.getElementById('login-status').textContent = 'Error loading game: ' + error.message;
    });
});

// Function to load core modules
function loadCoreModules() {
  return Promise.all([
    import('./utils.js'),
    import('./player.js'),
    import('./items.js'),
    import('./nostr.js'),
    import('./zaps.js'),
    import('./audio.js'),
    import('./ui.js'),
    import('./game.js'),
    import('./debug.js'),
    import('./main.js')
  ]).then(([
    Utils, Player, Items, Nostr, Zaps, Audio, UI, Game, Debug, RelayWorld
  ]) => {
    // Make modules globally available
    window.Utils = Utils.default;
    window.Player = Player.default;
    window.Items = Items.default;
    window.Nostr = Nostr.default;
    window.Zaps = Zaps.default;
    window.Audio = Audio.default;
    window.UI = UI.default;
    window.Game = Game.default;
    window.Debug = Debug.default;
    window.RelayWorld = RelayWorld.default;
    
    // Initialize the core game
    window.RelayWorld.init();
    
    // Add login event listener to initialize enhancements after login
    addLoginListener();
  });
}

// Function to preload enhancement modules without initializing
function preloadEnhancementModules() {
  console.log("Preloading enhancement modules (will initialize after login)...");
  
  return Promise.all([
    import('./zap-system.js'),
    import('./mobile-ux.js'),
    import('./game-chat.js'),
    import('./improved-rendering.js'),
    import('./building-system.js'),
    import('./direct-messaging.js'),
    import('./note-publisher.js'),
    import('./cornychat-integration.js')
  ]).then(([
    ZapSystem, MobileUX, GameChat, ImprovedRendering, 
    BuildingSystem, DirectMessaging, NotePublisher, CornyChatIntegration
  ]) => {
    // Just make modules available globally but don't initialize yet
    window.ZapSystem = ZapSystem.default;
    window.MobileUX = MobileUX.default;
    window.GameChat = GameChat.default;
    window.ImprovedRendering = ImprovedRendering.default;
    window.BuildingSystem = BuildingSystem.default;
    window.DirectMessaging = DirectMessaging.default;
    window.NotePublisher = NotePublisher.default;
    window.CornyChatIntegration = CornyChatIntegration.default;
    
    // Only initialize MobileUX immediately since it doesn't depend on login state
    if (window.MobileUX && typeof window.MobileUX.init === 'function') {
      window.MobileUX.init();
    }
    
    // Also initialize ImprovedRendering for basic UI enhancements
    if (window.ImprovedRendering && typeof window.ImprovedRendering.init === 'function') {
      window.ImprovedRendering.init();
    }
    
    console.log("Enhancement modules preloaded successfully!");
  });
}

// Add listener to initialize enhancements after login
function addLoginListener() {
  // Find login button
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    // Add listener for successful login
    const originalOnClick = loginButton.onclick;
    loginButton.onclick = function(e) {
      // Call original handler if it exists
      if (originalOnClick) {
        originalOnClick.call(this, e);
      }
      
      // Set up a check for successful login
      const loginCheckInterval = setInterval(() => {
        if (window.Nostr && window.Nostr.gameRelay && window.Player && window.Player.pubkey) {
          clearInterval(loginCheckInterval);
          console.log("Login detected, initializing enhancement modules...");
          initializeEnhancements();
        }
      }, 1000); // Check every second
      
      // Clear interval after 30 seconds to prevent endless checking
      setTimeout(() => clearInterval(loginCheckInterval), 30000);
    };
  }
}

// Function to initialize enhancements after login
function initializeEnhancements() {
  console.log("Initializing post-login enhancement modules...");
  
  // Initialize modules that require login, in proper order
  const modules = [
    'ZapSystem',
    'GameChat',
    'BuildingSystem',
    'DirectMessaging',
    'NotePublisher',
    'CornyChatIntegration'
  ];
  
  modules.forEach(name => {
    if (window[name] && typeof window[name].init === 'function') {
      try {
        console.log(`Initializing ${name} after login...`);
        window[name].init();
        console.log(`Successfully initialized ${name}`);
      } catch (err) {
        console.warn(`Error initializing ${name}:`, err);
      }
    }
  });
}

// Helper function to load a single enhancement module (for reference - no longer used directly)
function loadEnhancement(path, globalName) {
  return new Promise((resolve, reject) => {
    console.log(`Loading enhancement: ${globalName}`);
    
    import(path)
      .then(module => {
        // Make the module available globally
        window[globalName] = module.default;
        
        // Initialize the module if it has an init function
        if (window[globalName] && typeof window[globalName].init === 'function') {
          try {
            window[globalName].init();
            console.log(`Initialized ${globalName}`);
          } catch (err) {
            console.warn(`Error initializing ${globalName}:`, err);
          }
        }
        
        resolve();
      })
      .catch(error => {
        console.error(`Failed to load ${globalName}:`, error);
        // Resolve anyway to continue with other modules
        resolve();
      });
  });
}
