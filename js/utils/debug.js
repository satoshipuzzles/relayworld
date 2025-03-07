/**
 * Debug Utility Module for Relay World 2.0
 * Provides logging and debugging tools
 */

const debug = (function() {
    // Private members
    const logHistory = [];
    const MAX_LOG_HISTORY = 1000;
    let isInitialized = false;
    let debugPanel = null;
    let debugLogs = null;
    let debugFPS = null;
    let debugStats = null;
    
    // Performance tracking
    let lastFrameTime = 0;
    let frameCount = 0;
    let totalFrameTime = 0;
    let fps = 0;
    let frameTimeAvg = 0;
    let debugEnabled = false;
    
    /**
     * Initialize debug system
     */
    function initialize() {
        // Check if debug mode is enabled in config
        debugEnabled = config && config.DEBUG_MODE;
        
        // Create debug panel if enabled
        if (debugEnabled) {
            createDebugPanel();
        }
        
        isInitialized = true;
        log("Debug system initialized");
    }
    
    /**
     * Create debug panel
     */
    function createDebugPanel() {
        // Create debug panel container
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.className = 'debug-panel';
        
        // Create FPS counter
        debugFPS = document.createElement('div');
        debugFPS.id = 'debug-fps';
        debugFPS.className = 'debug-fps';
        debugFPS.textContent = 'FPS: 0';
        
        // Create stats display
        debugStats = document.createElement('div');
        debugStats.id = 'debug-stats';
        debugStats.className = 'debug-stats';
        
        // Create logs container
        debugLogs = document.createElement('div');
        debugLogs.id = 'debug-logs';
        debugLogs.className = 'debug-logs';
        
        // Add components to panel
        debugPanel.appendChild(debugFPS);
        debugPanel.appendChild(debugStats);
        debugPanel.appendChild(debugLogs);
        
        // Add panel to document
        document.body.appendChild(debugPanel);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .debug-panel {
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 300px;
                background-color: rgba(0, 0, 0, 0.7);
                color: #fff;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                border-radius: 4px;
                padding: 5px;
                display: flex;
                flex-direction: column;
                max-height: 300px;
                transition: opacity 0.3s;
            }
            
            .debug-panel.minimized {
                opacity: 0.3;
                max-height: 20px;
                overflow: hidden;
            }
            
            .debug-fps {
                padding: 2px 5px;
                background-color: rgba(76, 175, 80, 0.3);
                margin-bottom: 5px;
                font-weight: bold;
            }
            
            .debug-stats {
                padding: 2px 5px;
                background-color: rgba(33, 150, 243, 0.3);
                margin-bottom: 5px;
                white-space: pre;
            }
            
            .debug-logs {
                padding: 2px 5px;
                background-color: rgba(0, 0, 0, 0.3);
                overflow-y: auto;
                flex: 1;
                max-height: 200px;
            }
            
            .debug-log {
                margin: 2px 0;
                padding: 1px 3px;
                border-left: 3px solid #ccc;
                word-break: break-word;
            }
            
            .debug-log.info {
                border-left-color: #2196F3;
            }
            
            .debug-log.warn {
                border-left-color: #FF9800;
                background-color: rgba(255, 152, 0, 0.1);
            }
            
            .debug-log.error {
                border-left-color: #F44336;
                background-color: rgba(244, 67, 54, 0.1);
            }
        `;
        document.head.appendChild(style);
        
        // Add toggle on click
        debugPanel.addEventListener('click', (event) => {
            if (event.target === debugFPS) {
                debugPanel.classList.toggle('minimized');
            }
        });
        
        // Add keyboard shortcut for toggling debug panel
        document.addEventListener('keydown', (event) => {
            if (event.key === '`' || event.key === '~') {
                debugPanel.classList.toggle('minimized');
            }
        });
    }
    
    /**
     * Add a log message
     * @param {string} message - Log message
     * @param {Array} args - Additional arguments
     */
    function log(message, ...args) {
        const timestamp = new Date().toISOString();
        const entry = {
            type: 'info',
            timestamp,
            message,
            args
        };
        
        // Add to history
        addToHistory(entry);
        
        // Print to console
        console.log(`[${timestamp}] ${message}`, ...args);
        
        // Update debug panel if enabled
        updateDebugPanel(entry);
    }
    
    /**
     * Add a warning message
     * @param {string} message - Warning message
     * @param {Array} args - Additional arguments
     */
    function warn(message, ...args) {
        const timestamp = new Date().toISOString();
        const entry = {
            type: 'warn',
            timestamp,
            message,
            args
        };
        
        // Add to history
        addToHistory(entry);
        
        // Print to console
        console.warn(`[${timestamp}] WARN: ${message}`, ...args);
        
        // Update debug panel if enabled
        updateDebugPanel(entry);
    }
    
    /**
     * Add an error message
     * @param {string} message - Error message
     * @param {Array} args - Additional arguments
     */
    function error(message, ...args) {
        const timestamp = new Date().toISOString();
        const entry = {
            type: 'error',
            timestamp,
            message,
            args
        };
        
        // Add to history
        addToHistory(entry);
        
        // Print to console
        console.error(`[${timestamp}] ERROR: ${message}`, ...args);
        
        // Update debug panel if enabled
        updateDebugPanel(entry);
    }
    
    /**
     * Add entry to log history
     * @param {Object} entry - Log entry
     */
    function addToHistory(entry) {
        logHistory.push(entry);
        
        // Trim history if too long
        if (logHistory.length > MAX_LOG_HISTORY) {
            logHistory.shift();
        }
    }
    
    /**
     * Update debug panel with new log entry
     * @param {Object} entry - Log entry
     */
    function updateDebugPanel(entry) {
        if (!debugEnabled || !debugLogs) return;
        
        // Create log element
        const logElement = document.createElement('div');
        logElement.className = `debug-log ${entry.type}`;
        
        // Format message
        let displayMessage = entry.message;
        
        // Try to stringify objects in args
        const formattedArgs = entry.args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        });
        
        // Add formatted args if any
        if (formattedArgs.length > 0) {
            displayMessage += ` ${formattedArgs.join(' ')}`;
        }
        
        logElement.textContent = displayMessage;
        
        // Add to debug logs
        debugLogs.appendChild(logElement);
        
        // Scroll to bottom
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }
    
    /**
     * Update performance stats
     * @param {number} timestamp - Current timestamp
     */
    function updatePerformance(timestamp) {
        if (!debugEnabled) return;
        
        // Calculate frame time
        const frameTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        
        // Update running averages
        frameCount++;
        totalFrameTime += frameTime;
        
        // Update stats every second
        if (totalFrameTime >= 1000) {
            fps = Math.round((frameCount * 1000) / totalFrameTime);
            frameTimeAvg = totalFrameTime / frameCount;
            
            // Reset counters
            frameCount = 0;
            totalFrameTime = 0;
            
            // Update debug panel
            updateDebugStats();
        }
    }
    
    /**
     * Update debug stats display
     */
    function updateDebugStats() {
        if (!debugEnabled || !debugFPS || !debugStats) return;
        
        // Update FPS counter
        debugFPS.textContent = `FPS: ${fps} (${frameTimeAvg.toFixed(2)}ms)`;
        
        // Set color based on performance
        if (fps >= 55) {
            debugFPS.style.backgroundColor = 'rgba(76, 175, 80, 0.3)'; // Green
        } else if (fps >= 30) {
            debugFPS.style.backgroundColor = 'rgba(255, 152, 0, 0.3)'; // Orange
        } else {
            debugFPS.style.backgroundColor = 'rgba(244, 67, 54, 0.3)'; // Red
        }
        
        // Update stats display
        try {
            const stats = getDebugStats();
            debugStats.textContent = stats.join('\n');
        } catch (e) {
            debugStats.textContent = 'Error getting stats';
        }
    }
    
    /**
     * Get debug statistics
     * @returns {Array} - Array of stat strings
     */
    function getDebugStats() {
        const stats = [];
        
        // Get player position
        try {
            const playerPos = player.getPosition();
            stats.push(`Position: X=${playerPos.x.toFixed(2)}, Y=${playerPos.y.toFixed(2)}`);
        } catch (e) {
            stats.push(`Position: N/A`);
        }
        
        // Get region
        try {
            const playerPos = player.getPosition();
            const region = nostrClient.getRegionForPosition(playerPos.x, playerPos.y);
            stats.push(`Region: ${region}`);
        } catch (e) {
            stats.push(`Region: N/A`);
        }
        
        // Get active relay
        try {
            const activeRelay = relays.getActiveExplorerRelay();
            stats.push(`Active Relay: ${activeRelay}`);
        } catch (e) {
            stats.push(`Active Relay: N/A`);
        }
        
        // Get resources
        try {
            const wood = player.getInventoryItemCount(resources.RESOURCE_TYPES.WOOD);
            const stone = player.getInventoryItemCount(resources.RESOURCE_TYPES.STONE);
            const metal = player.getInventoryItemCount(resources.RESOURCE_TYPES.METAL);
            stats.push(`Resources: W=${wood}, S=${stone}, M=${metal}`);
        } catch (e) {
            stats.push(`Resources: N/A`);
        }
        
        return stats;
    }
    
    /**
     * Measure execution time of a function
     * @param {Function} fn - Function to measure
     * @param {string} label - Log label
     * @returns {*} - Function result
     */
    function measureTime(fn, label = 'Execution time') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        log(`${label}: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }
    
    /**
     * Async version of measureTime
     * @param {Function} fn - Async function to measure
     * @param {string} label - Log label
     * @returns {Promise} - Function result promise
     */
    async function measureTimeAsync(fn, label = 'Execution time') {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        log(`${label}: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }
    
    // Public API
    return {
        initialize,
        log,
        warn,
        error,
        updatePerformance,
        measureTime,
        measureTimeAsync,
        isEnabled: () => debugEnabled,
        getLogHistory: () => [...logHistory]
    };
})();
