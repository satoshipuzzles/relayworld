/**
 * Main Application Entry Point for Relay World 2.0
 * Initializes all modules and starts the game
 */

// Global game state
let gameState = {
    loading: true,
    authenticated: false,
    initialized: false,
    started: false
};

// Create UI placeholder if not defined yet
if (typeof ui === 'undefined') {
    // Simple UI placeholder for early initialization
    window.ui = {
        showLoadingScreen: function(msg) { console.log("[UI]", msg); },
        updateLoadingProgress: function(percent, msg) { console.log("[UI]", percent + "%:", msg); },
        showError: function(msg) { console.error("[UI Error]", msg); },
        hideLoadingScreen: function() { console.log("[UI] Hide loading screen"); },
        showLoginScreen: function() { console.log("[UI] Show login screen"); },
        showToast: function(msg, type) { console.log("[Toast]", type, msg); }
    };
}

// Create debug placeholder if not defined yet
if (typeof debug === 'undefined') {
    window.debug = {
        initialize: function() { console.log("Debug initialized"); },
        log: function(msg) { console.log("[Debug]", msg); },
        warn: function(msg) { console.warn("[Debug]", msg); },
        error: function(msg, err) { console.error("[Debug]", msg, err); }
    };
}

// Make sure config exists
if (typeof config === 'undefined') {
    console.warn("Config not available, creating default config");
    window.config = {
        GAME_ID: 'relay-world-2.0',
        GAME_VERSION: '0.1.0',
        WORLD_WIDTH: 3000,
        WORLD_HEIGHT: 3000,
        MAX_PLAYERS: 1000,
        NPC_LIMIT: 500,
        GAME_RELAY_URL: 'wss://relay.nostrfreaks.io',
        DEFAULT_RELAYS: ['wss://relay.damus.io', 'wss://relay.snort.social'],
        RESOURCE_DENSITY: 0.05,
        RESOURCE_RESPAWN_TIME: 300,
        WOOD_GATHER_TIME: 5,
        STONE_GATHER_TIME: 10,
        METAL_GATHER_TIME: 20,
        MAX_STRUCTURE_HEIGHT: 10,
        STRUCTURE_DECAY_RATE: 0.01,
        MAX_STRUCTURES_PER_REGION: 50,
        LAND_CLAIM_SIZE: 100,
        LAND_CLAIM_COST: 1000,
        LAND_CLAIM_EXPIRY: 30,
        VOICE_CHAT_RANGE: 300,
        VOICE_QUALITY: 'medium',
        DEBUG_MODE: true,
        EVENT_KINDS: {
            PLAYER_POSITION: 420001,
            PLAYER_STATS: 420002,
            PLAYER_INVENTORY: 420003,
            PLAYER_AVATAR: 420005,
            STRUCTURE: 420101,
            RESOURCE_NODE: 420102,
            WEATHER: 420103,
            LAND_CLAIM: 420104,
            RESOURCE_COLLECTION: 420201,
            BUILDING_ACTION: 420202,
            GUILD_MANAGEMENT: 420301,
            CHAT_MESSAGE: 420304,
            ZAP_EFFECT: 420401,
            ZAP_REQUEST: 9734,
            ZAP_RECEIPT: 9735
        }
    };
}

// Ensure DOM is fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDocumentReady);
} else {
    // Document already loaded
    onDocumentReady();
}

/**
 * Handler for when document is ready
 */
function onDocumentReady() {
    debug.log("DOM loaded, initializing game...");
    
    // Initialize any placeholder elements
    initializePlaceholders();
    
    // Start game initialization
    initializeGame();
}

/**
 * Create any missing placeholder functions for modules that might not be loaded yet
 */
function initializePlaceholders() {
    // Create helpers placeholder if not defined
    if (typeof helpers === 'undefined') {
        window.helpers = {
            wait: function(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        };
    }
}

/**
 * Initialize the game with proper sequencing and error handling
 */
async function initializeGame() {
    try {
        // Show loading screen
        ui.showLoadingScreen("Initializing Relay World 2.0...");
        ui.updateLoadingProgress(5, "Starting up...");
        
        // Initialize modules in sequence with dependency checks
        
        // Core utilities first
        ui.updateLoadingProgress(10, "Setting up utilities...");
        initializeUtilities();
        await helpers.wait(100); // Small delay to allow UI updates
        
        // Nostr connection
        ui.updateLoadingProgress(20, "Checking Nostr connection...");
        let nostrAvailable = false;
        
        try {
            nostrAvailable = await initializeNostr();
        } catch (error) {
            debug.error("Nostr initialization error:", error);
        }
        
        if (!nostrAvailable) {
            ui.showError("No NIP-07 compatible Nostr extension found. Please install one to play.");
            ui.updateLoadingProgress(100, "Error: No Nostr extension");
            ui.hideLoadingScreen();
            ui.showLoginScreen();
            return;
        }
        
        // Initialize relays
        ui.updateLoadingProgress(30, "Connecting to relays...");
        let relaysConnected = false;
        
        try {
            relaysConnected = await initializeRelays();
        } catch (error) {
            debug.error("Relay connection error:", error);
        }
        
        if (!relaysConnected) {
            ui.showError("Failed to connect to game relays. Please try again later.");
            ui.updateLoadingProgress(100, "Error: Relay connection failed");
            ui.hideLoadingScreen();
            ui.showLoginScreen();
            return;
        }
        
        // Initialize game systems
        ui.updateLoadingProgress(40, "Setting up game engine...");
        await initializeGameSystems();
        
        ui.updateLoadingProgress(80, "Preparing user interface...");
        await initializeUIModules();
        
        // Set up event handlers
        ui.updateLoadingProgress(95, "Setting up event handlers...");
        setupEventHandlers();
        
        // Complete loading
        gameState.initialized = true;
        gameState.loading = false;
        
        ui.updateLoadingProgress(100, "Ready to play!");
        await helpers.wait(500); // Small delay to show 100% 
        
        ui.hideLoadingScreen();
        ui.showLoginScreen();
        
        debug.log("Game initialized successfully");
        
        // Check for auto-login (development only)
        if (config.DEBUG_MODE && window.location.search.includes('autologin=true')) {
            debug.log("Auto-login enabled, starting game...");
            setTimeout(() => {
                startGame();
            }, 1000);
        }
    } catch (error) {
        debug.error("Failed to initialize game:", error);
        ui.showError(`Initialization error: ${error.message}`);
    }
}

/**
 * Initialize utility modules with safe checks
 */
function initializeUtilities() {
    // Initialize debug if not already done
    if (typeof debug !== 'undefined' && typeof debug.initialize === 'function') {
        debug.initialize();
    }
}

/**
 * Initialize Nostr with safe checks
 * @returns {Promise<boolean>} - Success status
 */
async function initializeNostr() {
    if (typeof nostrClient === 'undefined') {
        debug.warn("NostrClient module not available");
        return false;
    }
    
    if (typeof nostrClient.initialize !== 'function') {
        debug.warn("NostrClient initialize function not available");
        return false;
    }
    
    try {
        return await nostrClient.initialize();
    } catch (error) {
        debug.error("Nostr initialization error:", error);
        return false;
    }
}

/**
 * Initialize relays with safe checks
 * @returns {Promise<boolean>} - Success status
 */
async function initializeRelays() {
    if (typeof relays === 'undefined') {
        debug.warn("Relays module not available");
        return false;
    }
    
    if (typeof relays.initialize !== 'function') {
        debug.warn("Relays initialize function not available");
        return false;
    }
    
    try {
        return await relays.initialize();
    } catch (error) {
        debug.error("Relays initialization error:", error);
        return false;
    }
}

/**
 * Initialize game systems with safe checks
 */
async function initializeGameSystems() {
    // Initialize systems in dependency order
    const systems = [
        { name: 'engine', message: "Setting up game engine" },
        { name: 'world', message: "Generating world" },
        { name: 'resources', message: "Spawning resources" },
        { name: 'building', message: "Preparing building system" },
        { name: 'guild', message: "Setting up guild system" },
        { name: 'lightning', message: "Connecting Lightning integration" }
    ];
    
    let progressStep = 40;
    const progressIncrement = 30 / systems.length;
    
    for (const system of systems) {
        progressStep += progressIncrement;
        ui.updateLoadingProgress(progressStep, system.message + "...");
        
        if (typeof window[system.name] !== 'undefined' && 
            typeof window[system.name].initialize === 'function') {
            try {
                await window[system.name].initialize();
                debug.log(`${system.name} initialized`);
            } catch (error) {
                debug.error(`Error initializing ${system.name}:`, error);
            }
        } else {
            debug.warn(`${system.name} module or initialize function not available`);
        }
        
        // Small pause between systems
        await helpers.wait(50);
    }
}

/**
 * Initialize UI modules with safe checks
 */
async function initializeUIModules() {
    // Initialize UI modules in dependency order
    const uiModules = [
        { name: 'ui', message: "Setting up UI" },
        { name: 'inventory', message: "Setting up inventory" },
        { name: 'map', message: "Setting up map" },
        { name: 'buildingUI', message: "Setting up building interface" },
        { name: 'chat', message: "Setting up chat" }
    ];
    
    let progressStep = 80;
    const progressIncrement = 15 / uiModules.length;
    
    for (const module of uiModules) {
        progressStep += progressIncrement;
        ui.updateLoadingProgress(progressStep, module.message + "...");
        
        if (typeof window[module.name] !== 'undefined' && 
            typeof window[module.name].initialize === 'function') {
            try {
                await window[module.name].initialize();
                debug.log(`${module.name} initialized`);
            } catch (error) {
                debug.error(`Error initializing ${module.name}:`, error);
            }
        } else {
            debug.warn(`${module.name} module or initialize function not available`);
        }
        
        // Small pause between modules
        await helpers.wait(50);
    }
    
    // Add welcome message to chat if available
    if (typeof chat !== 'undefined' && typeof chat.addSystemMessage === 'function') {
        chat.addSystemMessage("Welcome to Relay World 2.0! Type /help for available commands.");
    }
}

/**
 * Setup event handlers with safe checks
 */
function setupEventHandlers() {
    // Login button
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', startGame);
    }
    
    // Handle resize events
    window.addEventListener('resize', () => {
        // Update canvas sizes if renderer available
        if (typeof renderer !== 'undefined' && typeof renderer.resizeCanvas === 'function') {
            renderer.resizeCanvas();
        }
    });
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!gameState.started) return;
        
        if (document.visibilityState === 'hidden') {
            // Game is hidden (user switched tabs)
            if (typeof engine !== 'undefined' && typeof engine.stop === 'function') {
                engine.stop();
            }
        } else {
            // Game is visible again
            if (typeof engine !== 'undefined' && typeof engine.start === 'function') {
                engine.start();
            }
        }
    });
}

/**
 * Start the game
 */
async function startGame() {
    if (gameState.started) {
        debug.warn("Game already started");
        return;
    }
    
    try {
        // Show loading message
        ui.showToast("Connecting to Nostr...", "info");
        
        // Check if nostrClient is available
        if (typeof nostrClient === 'undefined' || typeof nostrClient.login !== 'function') {
            ui.showError("Nostr client not available. Please refresh the page.");
            return;
        }
        
        // Authenticate with Nostr
        const authenticated = await nostrClient.login();
        
        if (!authenticated) {
            ui.showError("Failed to authenticate with Nostr. Please check your extension permissions.");
            return;
        }
        
        gameState.authenticated = true;
        
        // Check if engine is available
        if (typeof engine === 'undefined' || typeof engine.start !== 'function') {
            ui.showError("Game engine not available. Please refresh the page.");
            return;
        }
        
        // Start game engine
        if (await engine.start()) {
            gameState.started = true;
            
            // Hide login screen and show game UI
            ui.hideLoginScreen();
            ui.showGameUI();
            
            // Show welcome toast
            ui.showToast("Welcome to Relay World 2.0!", "success");
            
            debug.log("Game started successfully");
        } else {
            ui.showError("Failed to start game engine. Please refresh and try again.");
        }
    } catch (error) {
        debug.error("Failed to start game:", error);
        ui.showError(`Game start failed: ${error.message}`);
    }
}

/**
 * Stop the game
 */
function stopGame() {
    if (!gameState.started) {
        debug.warn("Game not running");
        return;
    }
    
    try {
        // Stop game engine
        if (typeof engine !== 'undefined' && typeof engine.stop === 'function') {
            engine.stop();
        }
        
        gameState.started = false;
        
        // Hide game UI and show login screen
        if (typeof ui !== 'undefined') {
            if (typeof ui.hideGameUI === 'function') ui.hideGameUI();
            if (typeof ui.showLoginScreen === 'function') ui.showLoginScreen();
        }
        
        debug.log("Game stopped");
    } catch (error) {
        debug.error("Error stopping game:", error);
    }
}

/**
 * Simple utility functions
 */
const utils = {
    /**
     * Generate a random ID
     * @param {number} length - Length of ID
     * @returns {string} - Random ID
     */
    generateId: (length = 8) => {
        return Math.random().toString(36).substring(2, 2 + length);
    },
    
    /**
     * Format a timestamp
     * @param {number} timestamp - Unix timestamp
     * @returns {string} - Formatted date string
     */
    formatTimestamp: (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    },
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} - Distance
     */
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    /**
     * Check if a point is within a rectangle
     * @param {number} x - Point X
     * @param {number} y - Point Y
     * @param {number} rx - Rectangle X
     * @param {number} ry - Rectangle Y
     * @param {number} rw - Rectangle width
     * @param {number} rh - Rectangle height
     * @returns {boolean} - True if point is within rectangle
     */
    pointInRect: (x, y, rx, ry, rw, rh) => {
        return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    }
};

// Set up some global error handlers
window.addEventListener('error', (event) => {
    if (typeof debug !== 'undefined' && typeof debug.error === 'function') {
        debug.error('Global error:', event.error);
    } else {
        console.error('Global error:', event.error);
    }
    
    // Show user-friendly error if not in development
    if (!config.DEBUG_MODE) {
        if (typeof ui !== 'undefined' && typeof ui.showToast === 'function') {
            ui.showToast("An error occurred. Please refresh the page.", "error");
        }
    }
});

/**
 * Set up debugging helpers for development
 */
if (config.DEBUG_MODE) {
    // Expose modules to console
    window.game = {
        config,
        gameState,
        utils,
        start: startGame,
        stop: stopGame
    };
    
    // Add any initialized modules
    const modules = [
        'engine', 'renderer', 'player', 'building', 'resources', 
        'world', 'events', 'relays', 'nostrClient', 'ui'
    ];
    
    modules.forEach(name => {
        if (typeof window[name] !== 'undefined') {
            window.game[name] = window[name];
        }
    });
    
    console.log("Debug mode enabled - Game object exposed to console");
}
