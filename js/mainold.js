/**
 * Main Application Entry Point for Relay World 2.0
 * Initializes all modules and starts the game
 */

// Initialize debug tools first
debug.initialize();
debug.log("Relay World 2.0 starting...");

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
        // Initialize the game engine
        // This will cascade and initialize all other modules
        const success = await engine.initialize();
        
        if (!success) {
            throw new Error("Game initialization failed");
        }
        
        debug.log("Game initialized successfully");
        
        // Check for auto-login (development only)
        if (config.DEBUG_MODE && window.location.search.includes('autologin=true')) {
            debug.log("Auto-login enabled, starting game...");
            setTimeout(() => {
                engine.start();
            }, 1000);
        }
    } catch (error) {
        debug.error("Failed to initialize game:", error);
        ui.showError(`Initialization error: ${error.message}`);
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
        utils
    };
    
    debug.log("Debug mode enabled");
}
