/**
 * Main Application Entry Point for Relay World 2.0
 * Initializes all modules and starts the game
 */

// Initialize debug tools first
debug.initialize();
debug.log("Relay World 2.0 starting...");

// Global game state
let gameState = {
    loading: true,
    authenticated: false,
    initialized: false,
    started: false
};

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    debug.log("DOM loaded, initializing game...");
    initializeGame();
});

/**
 * Initialize the game
 */
async function initializeGame() {
    try {
        // Show loading screen
        ui.showLoadingScreen("Initializing Relay World 2.0...");
        ui.updateLoadingProgress(5, "Starting up...");
        
        // Initialize each module in sequence
        
        // Core utilities
        ui.updateLoadingProgress(10, "Setting up utilities...");
        await helpers.wait(100); // Simulate initialization time
        
        // Nostr connection
        ui.updateLoadingProgress(20, "Checking Nostr connection...");
        const nostrAvailable = await nostrClient.initialize();
        
        if (!nostrAvailable) {
            ui.showError("No NIP-07 compatible Nostr extension found. Please install one to play.");
            ui.updateLoadingProgress(100, "Error: No Nostr extension");
            ui.hideLoadingScreen();
            ui.showLoginScreen();
            return;
        }
        
        // Initialize relays
        ui.updateLoadingProgress(30, "Connecting to relays...");
        const relaysConnected = await relays.initialize();
        
        if (!relaysConnected) {
            ui.showError("Failed to connect to game relays. Please try again later.");
            ui.updateLoadingProgress(100, "Error: Relay connection failed");
            ui.hideLoadingScreen();
            ui.showLoginScreen();
            return;
        }
        
        // Initialize game systems
        ui.updateLoadingProgress(40, "Setting up game engine...");
        await engine.initialize();
        
        ui.updateLoadingProgress(50, "Generating world...");
        await world.initialize();
        
        ui.updateLoadingProgress(60, "Spawning resources...");
        await resources.initialize();
        
        ui.updateLoadingProgress(70, "Preparing building system...");
        await building.initialize();
        
        ui.updateLoadingProgress(80, "Setting up guild system...");
        await guild.initialize();
        
        ui.updateLoadingProgress(85, "Connecting Lightning integration...");
        await lightning.initialize();
        
        ui.updateLoadingProgress(90, "Preparing user interface...");
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
 * Initialize UI modules
 */
async function initializeUIModules() {
    // Initialize UI modules
    ui.initialize();
    
    // Initialize UI submodules
    inventory.initialize();
    map.initialize();
    buildingUI.initialize();
    chat.initialize();
    
    // Add welcome message to chat
    if (chat.addSystemMessage) {
        chat.addSystemMessage("Welcome to Relay World 2.0! Type /help for available commands.");
    }
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
    // Login button
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', startGame);
    }
    
    // Handle resize events
    window.addEventListener('resize', () => {
        // Update canvas sizes
        renderer.resizeCanvas();
    });
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Game is hidden (user switched tabs)
            if (gameState.started) {
                engine.stop();
            }
        } else {
            // Game is visible again
            if (gameState.started) {
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
        
        // Authenticate with Nostr
        const authenticated = await nostrClient.login();
        
        if (!authenticated) {
            ui.showError("Failed to authenticate with Nostr. Please check your extension permissions.");
            return;
        }
        
        gameState.authenticated = true;
        
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
        engine.stop();
        gameState.started = false;
        
        // Hide game UI and show login screen
        ui.hideGameUI();
        ui.showLoginScreen();
        
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
    debug.error('Global error:', event.error);
    
    // Show user-friendly error if not in development
    if (!config.DEBUG_MODE) {
        ui.showToast("An error occurred. Please refresh the page.", "error");
    }
});

/**
 * Set up debugging helpers for development
 */
if (config.DEBUG_MODE) {
    // Expose modules to console
    window.game = {
        config,
        engine,
        renderer,
        player,
        building,
        resources,
        world,
        events,
        relays,
        nostrClient,
        ui,
        utils,
        start: startGame,
        stop: stopGame
    };
    
    debug.log("Debug mode enabled");
}
