/**
 * Nostr Relay Management Module for Relay World 2.0
 * Handles connection to relays, subscription management,
 * and relay-specific functionality.
 */

const relays = (function() {
    // Private members
    const connectedRelays = new Map(); // Map of relay URLs to relay objects
    let gameRelay = null; // Main game relay
    let activeExplorerRelay = null; // Current active explorer relay
    
    // Subscriptions for different event types
    const subscriptions = new Map();
    
    /**
     * Initialize relays by connecting to the game relay and default explorer relays
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing relay connections...");
        
        try {
            // Connect to game relay
            gameRelay = await connectToRelay(config.GAME_RELAY_URL);
            debug.log(`Connected to game relay: ${config.GAME_RELAY_URL}`);
            
            // Connect to default explorer relays
            for (const relayUrl of config.DEFAULT_RELAYS) {
                try {
                    const relay = await connectToRelay(relayUrl);
                    connectedRelays.set(relayUrl, relay);
                    debug.log(`Connected to explorer relay: ${relayUrl}`);
                    
                    // Set first explorer relay as active
                    if (!activeExplorerRelay) {
                        activeExplorerRelay = relayUrl;
                    }
                } catch (relayError) {
                    debug.error(`Failed to connect to relay ${relayUrl}:`, relayError);
                }
            }
            
            return true;
        } catch (error) {
            debug.error("Failed to initialize relays:", error);
            return false;
        }
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
                
                // Create new relay connection
                const relay = window.NostrTools ? 
                    window.NostrTools.relayInit(relayUrl) : 
                    new window.nostr.SimplePool();
                
                // For SimplePool, we handle connect differently
                if (window.nostr.SimplePool && relay instanceof window.nostr.SimplePool) {
                    // SimplePool doesn't need explicit connect, it manages connections internally
                    connectedRelays.set(relayUrl, relay);
                    return resolve(relay);
                }
                
                // For NostrTools relayInit
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
                
                // Set a timeout in case connection takes too long
                setTimeout(() => {
                    if (!connectedRelays.has(relayUrl)) {
                        reject(new Error(`Connection to ${relayUrl} timed out`));
                    }
                }, 5000);
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
                debug.log(`Already connected to relay: ${relayUrl}`);
                return true;
            }
            
            // Try to connect to relay
            const relay = await connectToRelay(relayUrl);
            
            // Update UI
            ui.updateRelayList(Array.from(connectedRelays.keys()));
            
            return true;
        } catch (error) {
            debug.error(`Failed to connect to relay ${relayUrl}:`, error);
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
            // For NostrTools
            if (gameRelay.publish) {
                const pub = gameRelay.publish(event);
                return await pub;
            }
            
            // For SimplePool
            if (gameRelay.sendEvent) {
                return await gameRelay.sendEvent(config.GAME_RELAY_URL, event);
            }
            
            throw new Error("Unknown relay object type");
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
            // For NostrTools
            if (relay.publish) {
                const pub = relay.publish(event);
                return await pub;
            }
            
            // For SimplePool
            if (relay.sendEvent) {
                return await relay.sendEvent(activeExplorerRelay, event);
            }
            
            throw new Error("Unknown relay object type");
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
            
            // For NostrTools
            if (gameRelay.sub) {
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
            }
            
            // For SimplePool
            if (gameRelay.subscribeMany) {
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
            }
            
            throw new Error("Unknown relay object type");
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
                    
                    if (sub.unsub) sub.unsub();
                };
                
                // For SimplePool
                if (window.nostr.SimplePool && connectedRelays.get(relayUrls[0]) instanceof window.nostr.SimplePool) {
                    const pool = connectedRelays.get(relayUrls[0]);
                    const sub = {
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
                    
                    timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error("Metadata fetch timed out"));
                    }, 5000);
                    
                    return;
                }
                
                // For NostrTools or other libraries
                // Try to get metadata from each relay until successful
                const getMetadataFromRelay = async (index) => {
                    if (index >= relayUrls.length) {
                        cleanup();
                        return reject(new Error("No metadata found on any relay"));
                    }
                    
                    const relay = connectedRelays.get(relayUrls[index]);
                    
                    const sub = relay.sub([{ kinds: [0], authors: [pubkey], limit: 1 }]);
                    
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
                    
                    timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error("Metadata fetch timed out"));
                    }, 5000);
                };
                
                getMetadataFromRelay(0);
            } catch (error) {
                reject(error);
            }
        });
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
        
        // Getters
        getGameRelay: () => gameRelay,
        getActiveExplorerRelay: () => activeExplorerRelay,
        getAllRelays: () => Array.from(connectedRelays.keys()),
        getRelayObject: (url) => connectedRelays.get(url)
    };
})();
