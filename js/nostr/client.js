/**
 * Nostr Client Module for Relay World 2.0
 * Handles all Nostr protocol functionality including connection,
 * authentication, event creation, and signing.
 */

const nostrClient = (function() {
    // Private members
    let pubkey = null;
    let activeExtension = null;
    let isAuthenticated = false;
    let nip07Available = false;
    
    /**
     * Initialize Nostr client
     * Check for NIP-07 compatible extensions
     */
    async function initialize() {
        return new Promise((resolve, reject) => {
            debug.log("Initializing Nostr client...");
            
            // Check if window.nostr is available (NIP-07)
            if (window.nostr) {
                nip07Available = true;
                debug.log("NIP-07 extension detected");
                resolve(true);
            } else {
                // Wait a bit longer for extension to load
                setTimeout(() => {
                    if (window.nostr) {
                        nip07Available = true;
                        debug.log("NIP-07 extension detected (delayed)");
                        resolve(true);
                    } else {
                        debug.warn("No NIP-07 extension found");
                        nip07Available = false;
                        resolve(false);
                    }
                }, 1000);
            }
        });
    }
    
    /**
     * Login with NIP-07 extension
     * @returns {Promise<boolean>} - Success status
     */
    async function login() {
        if (!nip07Available) {
            debug.error("Cannot login: NIP-07 extension not available");
            return false;
        }
        
        try {
            // Request public key from extension
            activeExtension = window.nostr;
            const publicKey = await activeExtension.getPublicKey();
            
            if (!publicKey) {
                throw new Error("No public key returned from extension");
            }
            
            // Store public key
            pubkey = publicKey;
            isAuthenticated = true;
            
            debug.log(`Logged in with pubkey: ${pubkey}`);
            
            // Check if we can get additional user metadata
            try {
                const userMetadata = await relays.fetchUserMetadata(pubkey);
                if (userMetadata) {
                    debug.log("Retrieved user metadata:", userMetadata);
                }
            } catch (metadataError) {
                debug.warn("Could not fetch user metadata:", metadataError);
            }
            
            return true;
        } catch (error) {
            debug.error("Login failed:", error);
            isAuthenticated = false;
            pubkey = null;
            return false;
        }
    }
    
    /**
     * Sign a Nostr event using the NIP-07 extension
     * @param {Object} event - Unsigned Nostr event
     * @returns {Promise<Object>} - Signed event
     */
    async function signEvent(event) {
        if (!isAuthenticated || !activeExtension) {
            throw new Error("Not authenticated");
        }
        
        try {
            // Ensure the event has the correct pubkey
            event.pubkey = pubkey;
            
            // Sign the event using the extension
            const signedEvent = await activeExtension.signEvent(event);
            
            return signedEvent;
        } catch (error) {
            debug.error("Failed to sign event:", error);
            throw error;
        }
    }
    
    /**
     * Create a new event with common fields already set
     * @param {number} kind - Nostr event kind
     * @param {string} content - Event content
     * @param {Array} tags - Event tags
     * @returns {Object} - Unsigned event object
     */
    function createEvent(kind, content, tags = []) {
        if (!isAuthenticated) {
            throw new Error("Not authenticated");
        }
        
        return {
            kind: kind,
            pubkey: pubkey,
            content: content,
            tags: tags,
            created_at: Math.floor(Date.now() / 1000)
        };
    }
    
    /**
     * Get region identifier for a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} - Region identifier
     */
    function getRegionForPosition(x, y) {
        const regionX = Math.floor(x / config.REGION_SIZE);
        const regionY = Math.floor(y / config.REGION_SIZE);
        return `${regionX}:${regionY}`;
    }
    
    /**
     * Get a deterministic position based on pubkey hash
     * @param {string} pubkey - Player's public key
     * @returns {Object} - {x, y} coordinates
     */
    function generatePositionFromPubkey(pubkey) {
        // Simple hash function for demo
        let hash = 0;
        for (let i = 0; i < pubkey.length; i++) {
            const char = pubkey.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Normalize to world dimensions
        const normalizedHash = Math.abs(hash);
        const x = (normalizedHash % 1000) / 1000 * config.WORLD_WIDTH;
        const y = (Math.floor(normalizedHash / 1000) % 1000) / 1000 * config.WORLD_HEIGHT;
        
        return {x, y};
    }
    
    // Public API
    return {
        initialize,
        login,
        signEvent,
        createEvent,
        getRegionForPosition,
        generatePositionFromPubkey,
        
        // Getters
        getPubkey: () => pubkey,
        isAuthenticated: () => isAuthenticated,
        isNip07Available: () => nip07Available
    };
})();
