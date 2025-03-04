/**
 * nostr.js - Nostr relay interactions for Relay World
 * Handles connecting to relays, subscribing to events, and publishing events
 */

const Nostr = {
    // Categorized relay connections
    gameRelay: null,          // Single dedicated game relay
    loginRelay: null,         // Login and default explorer relay
    explorerRelays: new Map(), // Map of URL -> explorer relay connection
    activeExplorerRelay: null, // Currently active explorer relay
    
    // User data
    users: new Map(), // Map of pubkey -> user data
    
    // Subscription IDs
    subscriptions: new Map(),
    
    // Check if a Nostr extension is available
    isExtensionAvailable: function(timeout = 3000) {
        // Existing implementation...
    },
    
    // Get public key from extension
    getPublicKey: async function() {
        // Existing implementation...
    },
    
    // Connect to game relay
    connectToGameRelay: async function() {
        try {
            const url = RelayWorld.config.GAME_RELAY;
            console.log(`[Nostr] Connecting to game relay: ${url}`);
            
            this.gameRelay = await this.connectRelay(url);
            console.log("[Nostr] Connected to game relay successfully");
            
            return this.gameRelay;
        } catch (error) {
            console.error("[Nostr] Failed to connect to game relay:", error);
            throw error;
        }
    },
    
    // Connect to login relay
    connectToLoginRelay: async function() {
        try {
            const url = RelayWorld.config.LOGIN_RELAY;
            console.log(`[Nostr] Connecting to login relay: ${url}`);
            
            this.loginRelay = await this.connectRelay(url);
            
            // Also add it to explorer relays
            this.explorerRelays.set(url, this.loginRelay);
            this.activeExplorerRelay = url;
            
            console.log("[Nostr] Connected to login relay successfully");
            
            return this.loginRelay;
        } catch (error) {
            console.error("[Nostr] Failed to connect to login relay:", error);
            throw error;
        }
    },
    
    // Connect to explorer relay
    connectToExplorerRelay: async function(url) {
        // Skip if it's already connected or it's the login relay
        if (this.explorerRelays.has(url)) {
            return this.explorerRelays.get(url);
        }
        
        try {
            console.log(`[Nostr] Connecting to explorer relay: ${url}`);
            
            const relay = await this.connectRelay(url);
            this.explorerRelays.set(url, relay);
            
            console.log(`[Nostr] Connected to explorer relay: ${url}`);
            return relay;
        } catch (error) {
            console.error(`[Nostr] Failed to connect to explorer relay ${url}:`, error);
            throw error;
        }
    },
    
    // Connect to a relay (generic implementation)
    connectRelay: async function(url) {
        // Existing implementation...
    },
    
    // Set active explorer relay
    setActiveExplorerRelay: function(url) {
        if (this.explorerRelays.has(url)) {
            this.activeExplorerRelay = url;
            console.log(`[Nostr] Set active explorer relay to ${url}`);
            
            // Update UI
            if (typeof UI !== 'undefined' && typeof UI.updateRelaySelector === 'function') {
                UI.updateRelaySelector();
            }
            
            // Fetch users and notes from active explorer relay
            this.fetchUsersFromExplorerRelay();
            
            return true;
        }
        
        return false;
    },
    
    // Subscribe to game events on game relay
    subscribeToGameEvents: function() {
        if (!this.gameRelay) {
            console.error("[Nostr] Game relay not connected");
            return false;
        }
        
        console.log("[Nostr] Subscribing to game events...");
        
        // Create a list of all game event kinds
        const gameKinds = Object.values(RelayWorld.config.EVENT_KINDS);
        
        // Subscribe to all game events
        const filters = [{ kinds: gameKinds }];
        
        try {
            this.subscribe(this.gameRelay, filters, 
                (event) => this.processGameEvent(event),
                () => console.log("[Nostr] Game events subscription complete")
            );
            return true;
        } catch (error) {
            console.error("[Nostr] Failed to subscribe to game events:", error);
            return false;
        }
    },
    
    // Subscribe to explorer content on active explorer relay
    subscribeToExplorerContent: function() {
        if (!this.activeExplorerRelay || !this.explorerRelays.has(this.activeExplorerRelay)) {
            console.error("[Nostr] No active explorer relay");
            return false;
        }
        
        const relay = this.explorerRelays.get(this.activeExplorerRelay);
        
        console.log(`[Nostr] Subscribing to explorer content on ${this.activeExplorerRelay}...`);
        
        // Subscribe to standard Nostr content
        const filters = [{ kinds: RelayWorld.config.EXPLORER_KINDS }];
        
        try {
            this.subscribe(relay, filters, 
                (event) => this.processExplorerEvent(event, this.activeExplorerRelay),
                () => console.log(`[Nostr] Explorer content subscription complete for ${this.activeExplorerRelay}`)
            );
            
            // Additionally, fetch user profiles and notes
            this.fetchUsersFromExplorerRelay();
            
            return true;
        } catch (error) {
            console.error("[Nostr] Failed to subscribe to explorer content:", error);
            return false;
        }
    },
    
    // Process game event
    processGameEvent: function(event) {
        // Handle based on kind
        const kinds = RelayWorld.config.EVENT_KINDS;
        
        switch (event.kind) {
            case kinds.POSITION:
                this.handlePositionEvent(event);
                break;
            case kinds.STATS:
                this.handleStatsEvent(event);
                break;
            case kinds.ITEM:
                this.handleItemEvent(event);
                break;
            case kinds.QUEST:
                this.handleQuestEvent(event);
                break;
            case kinds.INTERACTION:
                this.handleInteractionEvent(event);
                break;
            case kinds.WEATHER:
                this.handleWeatherEvent(event);
                break;
            case kinds.PORTAL:
                this.handlePortalEvent(event);
                break;
            case kinds.TREASURE:
                this.handleTreasureEvent(event);
                break;
            case kinds.TRADE:
                this.handleTradeEvent(event);
                break;
            case kinds.VOICE:
                this.handleVoiceEvent(event);
                break;
            default:
                console.log(`[Nostr] Unhandled game event kind: ${event.kind}`);
        }
    },
    
    // Process explorer event
    processExplorerEvent: function(event, relayUrl) {
        // Create user entry if not exists (potential NPC)
        if (!this.users.has(event.pubkey)) {
            this.createNPC(event.pubkey);
        }
        
        const user = this.users.get(event.pubkey);
        
        // Process based on kind
        switch (event.kind) {
            case 0: // Profile metadata
                this.handleProfileEvent(event, user);
                break;
            case 1: // Regular note
                this.handleNoteEvent(event, user);
                break;
            case 3: // Contacts/following list
                this.handleContactsEvent(event, user);
                break;
            case 9: // Chat messages
                this.handleChatEvent(event, user);
                break;
            case 4: // Direct messages
                this.handleDirectMessageEvent(event, user);
                break;
            case 30023: // Long-form content
                this.handleLongFormEvent(event, user);
                break;
        }
    },
    
    // Create an NPC based on explorer relay author
    createNPC: function(pubkey) {
        if (this.users.has(pubkey)) return;
        
        // Generate a semi-deterministic position for NPCs
        let x = 1500, y = 1500; // Default to middle if CryptoJS not available
        
        if (typeof CryptoJS !== 'undefined') {
            const hash = CryptoJS.SHA256(pubkey).toString();
            x = parseInt(hash.substring(0, 8), 16) % (Game?.world?.width || 3000);
            y = parseInt(hash.substring(8, 16), 16) % (Game?.world?.height || 3000);
        }
        
        this.users.set(pubkey, {
            pubkey: pubkey,
            profile: null,
            x, y,
            notes: [],
            score: 0,
            itemsCollected: 0,
            questsCompleted: 0,
            following: new Set(),
            followers: new Set(),
            lastSeen: Date.now(),
            bobOffset: 0,
            isNPC: true // Flag to identify NPCs vs live players
        });
        
        // Fetch profile for this NPC
        this.fetchUserProfile(pubkey);
    },
    
    // Fetch users from active explorer relay
    fetchUsersFromExplorerRelay: function() {
        if (!this.activeExplorerRelay || !this.explorerRelays.has(this.activeExplorerRelay)) {
            console.error("[Nostr] No active explorer relay");
            return false;
        }
        
        const relay = this.explorerRelays.get(this.activeExplorerRelay);
        console.log(`[Nostr] Fetching users from ${this.activeExplorerRelay}...`);
        
        // Fetch unique authors of notes (kind 1)
        const filters = [{ 
            kinds: [1], 
            limit: RelayWorld.config.NPC_LIMIT 
        }];
        
        try {
            this.subscribe(relay, filters, 
                (event) => {
                    // Create NPC for each unique author
                    if (!this.users.has(event.pubkey)) {
                        this.createNPC(event.pubkey);
                    }
                },
                () => console.log(`[Nostr] Completed fetching users from ${this.activeExplorerRelay}`)
            );
            return true;
        } catch (error) {
            console.error("[Nostr] Failed to fetch users from explorer relay:", error);
            return false;
        }
    },
    
    // Fetch profile for a user/NPC
    fetchUserProfile: function(pubkey) {
        if (!this.activeExplorerRelay || !this.explorerRelays.has(this.activeExplorerRelay)) {
            return false;
        }
        
        const relay = this.explorerRelays.get(this.activeExplorerRelay);
        
        // Fetch profile metadata (kind 0)
        const filters = [{ 
            kinds: [0], 
            authors: [pubkey],
            limit: 1
        }];
        
        try {
            this.subscribe(relay, filters, 
                (event) => this.processExplorerEvent(event, this.activeExplorerRelay),
                () => {} // No EOSE handler needed
            );
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to fetch profile for ${pubkey}:`, error);
            return false;
        }
    },
    
    // Fetch notes for a user/NPC
    fetchUserNotes: function(pubkey) {
        if (!this.activeExplorerRelay || !this.explorerRelays.has(this.activeExplorerRelay)) {
            return false;
        }
        
        const relay = this.explorerRelays.get(this.activeExplorerRelay);
        
        // Fetch notes (kind 1)
        const filters = [{ 
            kinds: [1], 
            authors: [pubkey],
            limit: 20
        }];
        
        try {
            this.subscribe(relay, filters, 
                (event) => this.processExplorerEvent(event, this.activeExplorerRelay),
                () => {} // No EOSE handler needed
            );
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to fetch notes for ${pubkey}:`, error);
            return false;
        }
    },
    
    // Handle position event (420001)
    handlePositionEvent: function(event) {
        // Create user if not exists
        if (!this.users.has(event.pubkey)) {
            this.users.set(event.pubkey, {
                pubkey: event.pubkey,
                profile: null,
                x: 0, y: 0,
                notes: [],
                score: 0,
                itemsCollected: 0,
                questsCompleted: 0,
                following: new Set(),
                followers: new Set(),
                lastSeen: Date.now(),
                bobOffset: 0,
                isNPC: false // Live player, not an NPC
            });
            
            // Try to fetch their profile
            this.fetchUserProfile(event.pubkey);
        }
        
        const user = this.users.get(event.pubkey);
        
        try {
            const position = JSON.parse(event.content);
            
            if (position.x !== undefined && position.y !== undefined) {
                user.x = position.x;
                user.y = position.y;
                user.lastSeen = Date.now();
                user.isNPC = false; // Mark as live player
            }
        } catch (error) {
            console.error(`[Nostr] Failed to parse position update:`, error);
        }
    },
    
    // Handle stats event (420002)
    handleStatsEvent: function(event) {
        if (!this.users.has(event.pubkey)) {
            // Create user if not exists but mark as not NPC
            this.users.set(event.pubkey, {
                pubkey: event.pubkey,
                profile: null,
                x: 0, y: 0,
                notes: [],
                score: 0,
                itemsCollected: 0,
                questsCompleted: 0,
                following: new Set(),
                followers: new Set(),
                lastSeen: Date.now(),
                bobOffset: 0,
                isNPC: false // Live player, not an NPC
            });
        }
        
        const user = this.users.get(event.pubkey);
        
        try {
            const stats = JSON.parse(event.content);
            
            if (stats.score !== undefined) user.score = stats.score;
            if (stats.itemsCollected !== undefined) user.itemsCollected = stats.itemsCollected;
            if (stats.questsCompleted !== undefined) user.questsCompleted = stats.questsCompleted;
            
            // Update player stats if this is the current player
            if (typeof Player !== 'undefined' && user.pubkey === Player.pubkey) {
                if (stats.score !== undefined) Player.score = stats.score;
                if (typeof UI !== 'undefined' && typeof UI.updatePlayerProfile === 'function') {
                    UI.updatePlayerProfile();
                }
            }
            
            // Update leaderboard
            if (typeof UI !== 'undefined' && typeof UI.updateLeaderboard === 'function') {
                UI.updateLeaderboard();
            }
        } catch (error) {
            console.error(`[Nostr] Failed to parse stats update:`, error);
        }
    },
    
    // Handle item event (420003)
    handleItemEvent: function(event) {
        // Implementation for item collection events
    },
    
    // Handle quest event (420004)
    handleQuestEvent: function(event) {
        // Implementation for quest events
    },
    
    // Handle interaction event (420005)
    handleInteractionEvent: function(event) {
        // Implementation for player interaction events
    },
    
    // Handle weather event (420006)
    handleWeatherEvent: function(event) {
        // Implementation for weather events
    },
    
    // Handle portal event (420007)
    handlePortalEvent: function(event) {
        // Implementation for portal/teleport events
    },
    
    // Handle treasure event (420008)
    handleTreasureEvent: function(event) {
        // Implementation for treasure events
    },
    
    // Handle trade event (420009)
    handleTradeEvent: function(event) {
        // Implementation for trade events
    },
    
    // Handle voice event (420010)
    handleVoiceEvent: function(event) {
        // Implementation for voice chat events
    },
    
    // Publish player position update (420001)
    publishPlayerPosition: function(x, y) {
        if (typeof Player === 'undefined' || !Player.pubkey || !this.gameRelay) return;
        
        const event = {
            kind: RelayWorld.config.EVENT_KINDS.POSITION,
            content: JSON.stringify({ x, y }),
            tags: [
                ["t", "position"],
                ["t", "game"]
            ],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish only to game relay
        this.publishEvent(this.gameRelay, event).catch(error => {
            console.error(`[Nostr] Failed to publish position:`, error);
        });
    },
    
    // Publish player stats update (420002)
    publishPlayerStats: function() {
        if (typeof Player === 'undefined' || !Player.pubkey || !this.gameRelay) return;
        
        const event = {
            kind: RelayWorld.config.EVENT_KINDS.STATS,
            content: JSON.stringify({
                score: Player.score,
                itemsCollected: Player.itemsCollected,
                questsCompleted: Player.completedQuests.length
            }),
            tags: [
                ["t", "stats"],
                ["t", "game"]
            ],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to game relay
        this.publishEvent(this.gameRelay, event).catch(error => {
            console.error(`[Nostr] Failed to publish stats:`, error);
        });
    },
    
    // Publish item collection event (420003)
    publishItemCollection: function(itemId) {
        if (typeof Player === 'undefined' || !Player.pubkey || !this.gameRelay) return;
        
        const event = {
            kind: RelayWorld.config.EVENT_KINDS.ITEM,
            content: JSON.stringify({ itemId }),
            tags: [
                ["t", "item"],
                ["t", "game"],
                ["i", itemId]
            ],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to game relay
        this.publishEvent(this.gameRelay, event).catch(error => {
            console.error(`[Nostr] Failed to publish item collection:`, error);
        });
    },
    
    // Publish quest event (420004)
    publishQuestEvent: function(action, questId, reward) {
        if (typeof Player === 'undefined' || !Player.pubkey || !this.gameRelay) return;
        
        const event = {
            kind: RelayWorld.config.EVENT_KINDS.QUEST,
            content: JSON.stringify({ 
                action, 
                questId,
                reward: reward || 0
            }),
            tags: [
                ["t", "quest"],
                ["t", "game"],
                ["q", questId],
                ["a", action]
            ],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to game relay
        this.publishEvent(this.gameRelay, event).catch(error => {
            console.error(`[Nostr] Failed to publish quest event:`, error);
        });
    },
    
    // Publish chat message to explorer relay
    publishChatMessage: function(message) {
        if (typeof Player === 'undefined' || !Player.pubkey || !message) return false;
        
        // For chat, we publish to the active explorer relay
        if (!this.activeExplorerRelay || !this.explorerRelays.has(this.activeExplorerRelay)) {
            console.error("[Nostr] No active explorer relay for chat");
            return false;
        }
        
        const relay = this.explorerRelays.get(this.activeExplorerRelay);
        
        const event = {
            kind: 9, // Using NIP-C7 for chat
            content: message,
            tags: [
                ["client", "relay-world"]
            ],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to active explorer relay
        this.publishEvent(relay, event).catch(error => {
            console.error(`[Nostr] Failed to publish chat:`, error);
            if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') {
                UI.showToast("Failed to send message", "error");
            }
        });
        
        return true;
    },
    
    // Other existing methods, adapted for the new architecture...
}

// Export Nostr as the default export
export default Nostr;
