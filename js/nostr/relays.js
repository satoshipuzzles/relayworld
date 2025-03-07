/**
 * Nostr Relay Management Module for Relay World 2.0
 * Production-ready version with improved error handling and no mock implementations
 */

const relays = (function() {
    // Private members
    const connectedRelays = new Map(); // Map of relay URLs to relay objects
    let gameRelay = null; // Main game relay
    let activeExplorerRelay = null; // Current active explorer relay
    
    // Subscriptions for different event types
    const subscriptions = new Map();
    
    // Connection status
    const connectionStatus = {
        nostrAvailable: false,
        extensionDetected: false,
        libraryLoaded: false,
        gameRelayConnected: false,
        explorerRelaysConnected: 0
    };
    
    /**
     * Initialize relays by connecting to the game relay and default explorer relays
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing relay connections...");
        
        try {
            // First, check if Nostr extension or library is available
            const nostrStatus = await checkNostrAvailability();
            
            if (!nostrStatus.available) {
                // Show user-friendly error and installation guide
                showNostrExtensionError(nostrStatus);
                return false;
            }
            
            connectionStatus.nostrAvailable = true;
            
            // Connect to game relay
            ui.updateLoadingProgress(35, "Connecting to game relay...");
            
            try {
                gameRelay = await connectToRelay(config.GAME_RELAY_URL);
                debug.log(`Connected to game relay: ${config.GAME_RELAY_URL}`);
                connectionStatus.gameRelayConnected = true;
            } catch (error) {
                debug.error(`Failed to connect to game relay: ${config.GAME_RELAY_URL}`, error);
                showGameRelayError(error);
                return false;
            }
            
            // Connect to default explorer relays
            ui.updateLoadingProgress(40, "Connecting to explorer relays...");
            const connectionPromises = [];
            
            for (const relayUrl of config.DEFAULT_RELAYS) {
                const promise = connectToRelay(relayUrl)
                    .then(relay => {
                        connectedRelays.set(relayUrl, relay);
                        connectionStatus.explorerRelaysConnected++;
                        debug.log(`Connected to explorer relay: ${relayUrl}`);
                        
                        // Set first explorer relay as active
                        if (!activeExplorerRelay) {
                            activeExplorerRelay = relayUrl;
                        }
                        
                        return true;
                    })
                    .catch(error => {
                        debug.warn(`Failed to connect to relay ${relayUrl}:`, error);
                        return false;
                    });
                
                connectionPromises.push(promise);
            }
            
            // Wait for all connection attempts to complete
            const results = await Promise.all(connectionPromises);
            const connectedCount = results.filter(result => result).length;
            
            // Continue even if some relays failed, as long as we have the game relay
            if (connectedCount === 0 && config.DEFAULT_RELAYS.length > 0) {
                ui.showToast("Warning: Failed to connect to any explorer relays. Some features may be limited.", "warning");
            }
            
            return connectionStatus.gameRelayConnected;
        } catch (error) {
            debug.error("Failed to initialize relays:", error);
            ui.showError("Failed to initialize relay connections. Please refresh and try again.");
            return false;
        }
    }
    
    /**
     * Check if Nostr is available through extension or library
     * @returns {Object} - Status object with availability details
     */
    async function checkNostrAvailability() {
        const status = {
            available: false,
            extensionAvailable: false,
            libraryAvailable: false,
            implementationType: null,
            error: null
        };
        
        // Check for window.nostr (NIP-07 extension)
        if (window.nostr) {
            try {
                // Verify it's functional by calling a method
                await window.nostr.getPublicKey();
                status.extensionAvailable = true;
                status.available = true;
                status.implementationType = "extension";
                connectionStatus.extensionDetected = true;
            } catch (error) {
                status.error = {
                    type: "extension_error",
                    message: "Nostr extension detected but not functioning properly",
                    details: error.message
                };
            }
        }
        
        // Check for NostrTools library
        if (window.NostrTools) {
            status.libraryAvailable = true;
            connectionStatus.libraryLoaded = true;
            
            // If extension isn't working but library is available, we can still work
            if (!status.extensionAvailable) {
                status.available = true;
                status.implementationType = "library";
            }
        }
        
        // If neither extension nor library is available, load our bundled version
        if (!status.extensionAvailable && !status.libraryAvailable) {
            try {
                await loadBundledNostrLibrary();
                status.libraryAvailable = true;
                connectionStatus.libraryLoaded = true;
                status.implementationType = "bundled";
                
                // We still need an extension for signing
                if (!window.nostr) {
                    status.error = {
                        type: "no_extension",
                        message: "No Nostr extension detected"
                    };
                } else {
                    status.available = true;
                }
            } catch (error) {
                status.error = {
                    type: "library_load_error",
                    message: "Failed to load Nostr library",
                    details: error.message
                };
            }
        }
        
        return status;
    }
    
    /**
     * Load a specific bundled version of the Nostr library
     * @returns {Promise<void>}
     */
    async function loadBundledNostrLibrary() {
        return new Promise((resolve, reject) => {
            // We're using a specific version for stability
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/nostr-tools@1.12.0/lib/nostr.bundle.min.js';
            script.integrity = 'sha384-fyY9xYuXicIz+mMNNt+5GBagFxwrLKAaTD8KmxfIkdO82UNDkaM+GVC/fpk3L1SI';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                debug.log("Bundled Nostr library loaded successfully");
                resolve();
            };
            
            script.onerror = (error) => {
                debug.error("Failed to load bundled Nostr library", error);
                reject(new Error("Failed to load Nostr library"));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Show error message for missing or broken Nostr extension
     * @param {Object} status - Nostr availability status
     */
    function showNostrExtensionError(status) {
        let message, details;
        
        switch (status.error?.type) {
            case "no_extension":
                message = "No Nostr extension detected";
                details = `
                    <p>Relay World 2.0 requires a Nostr extension to play.</p>
                    <p>Please install one of these extensions and refresh the page:</p>
                    <ul>
                        <li><a href="https://github.com/fiatjaf/nos2x" target="_blank">nos2x</a> (Chrome/Firefox)</li>
                        <li><a href="https://getalby.com/" target="_blank">Alby</a> (Chrome/Firefox/Safari)</li>
                        <li><a href="https://sindresorhus.com/nos" target="_blank">nos</a> (Safari)</li>
                    </ul>
                `;
                break;
                
            case "extension_error":
                message = "Nostr extension error";
                details = `
                    <p>Your Nostr extension is not functioning properly.</p>
                    <p>Please make sure it's unlocked and has the correct permissions for this site.</p>
                    <p>Error details: ${status.error.details}</p>
                `;
                break;
                
            case "library_load_error":
                message = "Failed to load Nostr library";
                details = `
                    <p>There was a problem loading the Nostr library.</p>
                    <p>Please check your internet connection and try again.</p>
                    <p>Error details: ${status.error.details}</p>
                `;
                break;
                
            default:
                message = "Nostr connectivity issue";
                details = `
                    <p>Could not establish Nostr connectivity.</p>
                    <p>Please refresh the page and try again.</p>
                `;
        }
        
        ui.showError(message);
        
        // Show detailed dialog
        ui.showConfirmDialog(
            message,
            details,
            "Refresh Page",
            null
        ).then(() => {
            window.location.reload();
        });
    }
    
    /**
     * Show error for game relay connection issues
     * @param {Error} error - Connection error
     */
    function showGameRelayError(error) {
        const message = "Failed to connect to game relay";
        
        ui.showError(message);
        
        // Show details and alternatives
        ui.showConfirmDialog(
            message,
            `
                <p>Could not connect to the main game relay: ${config.GAME_RELAY_URL}</p>
                <p>This is required to play Relay World 2.0.</p>
                <p>Error details: ${error.message}</p>
                <p>Please check your internet connection and try again.</p>
            `,
            "Refresh Page",
            "Try Alternative Relay"
        ).then((useMain) => {
            if (useMain) {
                window.location.reload();
            } else {
                tryAlternativeGameRelay();
            }
        });
    }
    
    /**
     * Try connecting to an alternative game relay
     */
    async function tryAlternativeGameRelay() {
        const alternativeRelays = [
            "wss://relay.damus.io",
            "wss://relay.nostr.band",
            "wss://nos.lol"
        ].filter(url => url !== config.GAME_RELAY_URL);
        
        if (alternativeRelays.length === 0) {
            ui.showError("No alternative relays available");
            return;
        }
        
        ui.showLoadingScreen("Trying alternative relay...");
        
        for (const relayUrl of alternativeRelays) {
            ui.updateLoadingProgress(50, `Trying ${relayUrl}...`);
            
            try {
                gameRelay = await connectToRelay(relayUrl);
                config.GAME_RELAY_URL = relayUrl;
                connectionStatus.gameRelayConnected = true;
                
                ui.updateLoadingProgress(100, "Connected to alternative relay");
                ui.hideLoadingScreen();
                ui.showToast(`Connected to alternative relay: ${relayUrl}`, "success");
                
                return true;
            } catch (error) {
                debug.warn(`Failed to connect to alternative relay ${relayUrl}:`, error);
            }
        }
        
        ui.updateLoadingProgress(100, "Failed to connect to any relay");
        ui.hideLoadingScreen();
        ui.showError("Failed to connect to any relay. Please try again later.");
        
        return false;
    }
    
    /**
     * Connect to a Nostr relay
     * @param {string} relayUrl - WebSocket URL of the relay
     * @returns {Promise<Object>} - Connected relay object
     */
    async function connectToRelay(relayUrl) {
        return new Promise((resolve, reject) => {
            try {
                // Check if already connected
                if (connectedRelays.has(relayUrl)) {
                    return resolve(connectedRelays.get(relayUrl));
                }
                
                let relay;
                
                // Try to create relay connection based on what's available
                if (window.NostrTools && typeof window.NostrTools.relayInit === 'function') {
                    // Using NostrTools
                    relay = window.NostrTools.relayInit(relayUrl);
                    
                    relay.on('connect', () => {
                        debug.log(`Connected to relay: ${relayUrl}`);
                        connectedRelays.set(relayUrl, relay);
                        resolve(relay);
                    });
                    
                    relay.on('error', (error) => {
                        debug.error(`Error with relay ${relayUrl}:`, error);
                        if (!connectedRelays.has(relayUrl)) {
                            reject(error);
                        }
                    });
                    
                    // Attempt connection
                    relay.connect();
                }
                else if (window.nostr && window.nostr.SimplePool) {
                    // Using SimplePool
                    relay = new window.nostr.SimplePool();
                    connectedRelays.set(relayUrl, relay);
                    resolve(relay);
                }
                else {
                    // No supported library found
                    return reject(new Error("No supported Nostr library available"));
                }
                
                // Set a timeout in case connection takes too long
                setTimeout(() => {
                    if (!connectedRelays.has(relayUrl)) {
                        reject(new Error(`Connection to ${relayUrl} timed out`));
                    }
                }, 10000); // 10 second timeout
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Add a custom relay for exploration
     * @param {string} relayUrl - WebSocket URL of the relay
     * @returns {Promise<boolean>} - Success status
     */
    async function addCustomRelay(relayUrl) {
        try {
            // Validate relay URL format
            if (!relayUrl.startsWith('wss://')) {
                relayUrl = `wss://${relayUrl}`;
            }
            
            // Check if already connected
            if (connectedRelays.has(relayUrl)) {
                ui.showToast("Already connected to this relay", "info");
                return true;
            }
            
            // Show connecting status
            ui.showToast(`Connecting to ${relayUrl}...`, "info");
            
            // Try to connect to relay
            const relay = await connectToRelay(relayUrl);
            
            // Update UI
            ui.updateRelayList(Array.from(connectedRelays.keys()));
            
            // Set as active explorer relay if it's the first one
            if (!activeExplorerRelay) {
                setActiveExplorerRelay(relayUrl);
            }
            
            // Show success message
            ui.showToast(`Connected to ${relayUrl}`, "success");
            
            return true;
        } catch (error) {
            debug.error(`Failed to connect to relay ${relayUrl}:`, error);
            ui.showToast(`Connection failed: ${error.message}`, "error");
            return false;
        }
    }
    
    /**
     * Set the active explorer relay for content
     * @param {string} relayUrl - WebSocket URL of the relay
     * @returns {boolean} - Success status
     */
    function setActiveExplorerRelay(relayUrl) {
        if (!connectedRelays.has(relayUrl)) {
            debug.error(`Cannot set active: not connected to ${relayUrl}`);
            return false;
        }
        
        // Set as active explorer
        activeExplorerRelay = relayUrl;
        
        // Update UI to show active relay
        ui.updateActiveRelay(relayUrl);
        
        debug.log(`Active explorer relay set to ${relayUrl}`);
        return true;
    }
    
    /**
     * Publish an event to the game relay
     * @param {Object} event - Signed Nostr event
     * @returns {Promise<string>} - Event ID if successful
     */
    async function publishToGameRelay(event) {
        if (!gameRelay) {
            throw new Error("Game relay not connected");
        }
        
        try {
            if (typeof gameRelay.publish === 'function') {
                // For NostrTools
                const pub = gameRelay.publish(event);
                return await pub;
            } else if (typeof gameRelay.sendEvent === 'function') {
                // For SimplePool
                return await gameRelay.sendEvent(config.GAME_RELAY_URL, event);
            } else {
                throw new Error("Relay object doesn't support publishing");
            }
        } catch (error) {
            debug.error("Failed to publish event to game relay:", error);
            throw error;
        }
    }
    
    /**
     * Publish an event to the active explorer relay
     * @param {Object} event - Signed Nostr event
     * @returns {Promise<string>} - Event ID if successful
     */
    async function publishToExplorerRelay(event) {
        if (!activeExplorerRelay || !connectedRelays.has(activeExplorerRelay)) {
            throw new Error("No active explorer relay");
        }
        
        const relay = connectedRelays.get(activeExplorerRelay);
        
        try {
            if (typeof relay.publish === 'function') {
                // For NostrTools
                const pub = relay.publish(event);
                return await pub;
            } else if (typeof relay.sendEvent === 'function') {
                // For SimplePool
                return await relay.sendEvent(activeExplorerRelay, event);
            } else {
                throw new Error("Relay object doesn't support publishing");
            }
        } catch (error) {
            debug.error("Failed to publish event to explorer relay:", error);
            throw error;
        }
    }
    
    /**
     * Subscribe to events on the game relay
     * @param {Array} filters - Nostr filter objects
     * @param {Function} onEvent - Callback for each event
     * @param {Function} onEose - Callback for end of stored events
     * @returns {Object} - Subscription object
     */
    function subscribeToGameRelay(filters, onEvent, onEose) {
        if (!gameRelay) {
            throw new Error("Game relay not connected");
        }
        
        try {
            let sub;
            
            if (typeof gameRelay.sub === 'function') {
                // For NostrTools
                sub = gameRelay.sub(filters);
                
                sub.on('event', (event) => {
                    onEvent(event);
                });
                
                if (onEose) {
                    sub.on('eose', () => {
                        onEose();
                    });
                }
                
                return sub;
            } else if (typeof gameRelay.subscribeMany === 'function') {
                // For SimplePool
                sub = {
                    originalSub: gameRelay.subscribeMany(
                        [config.GAME_RELAY_URL],
                        filters,
                        {
                            onevent: onEvent,
                            oneose: onEose
                        }
                    ),
                    unsub: function() {
                        this.originalSub.unsubscribe();
                    }
                };
                
                return sub;
            } else {
                throw new Error("Relay object doesn't support subscriptions");
            }
        } catch (error) {
            debug.error("Failed to subscribe to game relay:", error);
            throw error;
        }
    }
    
    /**
     * Fetch user metadata from relays
     * @param {string} pubkey - User's public key
     * @returns {Promise<Object>} - User metadata
     */
    async function fetchUserMetadata(pubkey) {
        return new Promise((resolve, reject) => {
            try {
                const relayUrls = Array.from(connectedRelays.keys());
                if (relayUrls.length === 0) {
                    return reject(new Error("No connected relays"));
                }
                
                let metadataEvent = null;
                let timeout = null;
                
                // Function to clean up subscriptions
                const cleanup = () => {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    
                    if (sub && typeof sub.unsub === 'function') {
                        sub.unsub();
                    }
                };
                
                let sub;
                
                // For SimplePool
                if (window.nostr && window.nostr.SimplePool && 
                    connectedRelays.get(relayUrls[0]) instanceof window.nostr.SimplePool) {
                    
                    const pool = connectedRelays.get(relayUrls[0]);
                    sub = {
                        originalSub: pool.subscribeMany(
                            relayUrls,
                            [{ kinds: [0], authors: [pubkey], limit: 1 }],
                            {
                                onevent: (event) => {
                                    if (event.kind === 0) {
                                        metadataEvent = event;
                                    }
                                },
                                oneose: () => {
                                    if (metadataEvent) {
                                        try {
                                            const metadata = JSON.parse(metadataEvent.content);
                                            cleanup();
                                            resolve(metadata);
                                        } catch (error) {
                                            cleanup();
                                            reject(new Error("Invalid metadata JSON"));
                                        }
                                    } else {
                                        cleanup();
                                        reject(new Error("No metadata found"));
                                    }
                                }
                            }
                        ),
                        unsub: function() {
                            this.originalSub.unsubscribe();
                        }
                    };
                } else {
                    // For NostrTools or other libraries
                    // Try to get metadata from each relay until successful
                    const getMetadataFromRelay = async (index) => {
                        if (index >= relayUrls.length) {
                            cleanup();
                            return reject(new Error("No metadata found on any relay"));
                        }
                        
                        const relay = connectedRelays.get(relayUrls[index]);
                        
                        if (typeof relay.sub !== 'function') {
                            // Skip this relay and try next
                            getMetadataFromRelay(index + 1);
                            return;
                        }
                        
                        sub = relay.sub([{ kinds: [0], authors: [pubkey], limit: 1 }]);
                        
                        sub.on('event', (event) => {
                            if (event.kind === 0) {
                                metadataEvent = event;
                            }
                        });
                        
                        sub.on('eose', () => {
                            if (metadataEvent) {
                                try {
                                    const metadata = JSON.parse(metadataEvent.content);
                                    cleanup();
                                    resolve(metadata);
                                } catch (error) {
                                    // Try next relay
                                    getMetadataFromRelay(index + 1);
                                }
                            } else {
                                // Try next relay
                                getMetadataFromRelay(index + 1);
                            }
                        });
                    };
                    
                    getMetadataFromRelay(0);
                }
                
                // Set timeout to prevent hanging indefinitely
                timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error("Metadata fetch timed out"));
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Get connection status
     * @returns {Object} - Current connection status
     */
    function getConnectionStatus() {
        return { ...connectionStatus };
    }
    
    // Public API
    return {
        initialize,
        connectToRelay,
        addCustomRelay,
        setActiveExplorerRelay,
        publishToGameRelay,
        publishToExplorerRelay,
        subscribeToGameRelay,
        fetchUserMetadata,
        getConnectionStatus,
        
        // Getters
        getGameRelay: () => gameRelay,
        getActiveExplorerRelay: () => activeExplorerRelay,
        getAllRelays: () => Array.from(connectedRelays.keys()),
        getRelayObject: (url) => connectedRelays.get(url)
    };
})();
