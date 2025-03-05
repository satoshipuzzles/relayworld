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
      // Then load enhancement modules
      return loadEnhancementModules();
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
    
    console.log("Core modules loaded successfully");
  });
}

// Function to load enhancement modules
function loadEnhancementModules() {
  console.log("Loading enhancement modules...");
  
  // Use a sequence of promises to load modules one by one
  return loadEnhancement('./zap-system.js', 'ZapSystem')
    .then(() => loadEnhancement('./mobile-ux.js', 'MobileUX'))
    .then(() => loadEnhancement('./game-chat.js', 'GameChat'))
    .then(() => loadEnhancement('./improved-rendering.js', 'ImprovedRendering'))
    .then(() => loadEnhancement('./building-system.js', 'BuildingSystem'))
    .then(() => loadEnhancement('./direct-messaging.js', 'DirectMessaging'))
    .then(() => loadEnhancement('./note-publisher.js', 'NotePublisher'))
    .then(() => loadEnhancement('./cornychat-integration.js', 'CornyChatIntegration'))
    .then(() => {
      console.log("All enhancement modules loaded successfully!");
    });
}

// Helper function to load a single enhancement module
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
