/**
 * main.js - Entry point for Relay World
 * Initializes the core system and loads modules
 */

// Import core modules
import { RelayWorldCore } from './core/relay-world-core.js';
import { EventBus } from './core/event-bus.js';
import { ConfigManager } from './core/config.js';

// Import utilities
import { Utils } from './utils/utils.js';
import { CryptoUtils } from './utils/crypto-utils.js';
import { NostrUtils } from './utils/nostr-utils.js';
import { DebugUtils } from './utils/debug.js';

// Define basic module implementations
const AuthModule = {
    // Module metadata
    name: "auth",
    description: "Authentication module",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ['utils'],
    priority: 5,
    critical: true,
    
    // Module state
    initialized: false,
    currentUser: null,
    
    // Initialize module
    init: function() {
        console.log("[Auth] Initializing authentication module...");
        this.initialized = true;
        console.log("[Auth] Authentication module initialized");
        return true;
    },
    
    // Login with NIP-07 extension
    loginWithNostr: async function(providedPubkey) {
        try {
            let pubkey = providedPubkey;
            
            if (!pubkey && window.nostr) {
                pubkey = await window.nostr.getPublicKey();
            }
            
            if (!pubkey) {
                throw new Error("No public key available");
            }
            
            this.currentUser = { pubkey };
            
            // Create player in the game
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule) {
                playerModule.pubkey = pubkey;
                
                // Generate initial position from pubkey hash
                const hash = CryptoJS.SHA256(pubkey).toString();
                playerModule.x = parseInt(hash.substr(0,8),16) % 3000;
                playerModule.y = parseInt(hash.substr(8,8),16) % 3000;
            }
            
            // Connect to relays and subscribe to events
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule) {
                nostrModule.currentUser = { pubkey };
                await nostrModule.connectToRelays();
                await nostrModule.fetchProfile(pubkey);
                await nostrModule.requestAllUsersAndContent();
            }
            
            // Show game UI
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule) {
                uiModule.hideLoginScreen();
                uiModule.showGameUI();
                uiModule.updatePlayerProfile();
            }
            
            console.log(`[Auth] Logged in with pubkey: ${pubkey}`);
            RelayWorldCore.eventBus.emit('auth:login', { pubkey });
            return true;
            
        } catch (error) {
            console.error("[Auth] Login failed:", error);
            throw error;
        }
    },
    
    // Logout
    logout: function() {
        this.currentUser = null;
        
        // Disconnect from relays
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (nostrModule) {
            nostrModule.closeAllRelays();
        }
        
        // Show login screen
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule) {
            uiModule.showLoginScreen();
            uiModule.hideGameUI();
        }
        
        RelayWorldCore.eventBus.emit('auth:logout', null);
        return true;
    }
};

const NostrModule = {
    // Module metadata
    name: "nostr",
    description: "Nostr protocol integration",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ['utils', 'auth'],
    priority: 10,
    critical: true,
    
    // Module state
    initialized: false,
    currentUser: null,
    relayConnections: {
        game: null,
        login: null,
        explorers: new Map(),
        dmInbox: new Map()
    },
    activeExplorerRelay: null,
    users: new Map(),
    subscriptions: new Map(),
    
    // Initialize module
    init: function() {
        console.log("[Nostr] Initializing Nostr module...");
        this.initialized = true;
        console.log("[Nostr] Nostr module initialized");
        return true;
    },
    
    // Connect to all configured relays
    connectToRelays: async function() {
        try {
            // Get relay configuration
            const gameRelay = RelayWorldCore.getConfig('GAME_RELAY', "wss://relay.damus.io");
            const loginRelay = RelayWorldCore.getConfig('LOGIN_RELAY', "wss://relay.damus.io");
            const explorerRelays = RelayWorldCore.getConfig('EXPLORER_RELAYS', ["wss://relay.damus.io"]);
            
            // Connect to game relay
            await this.connectToGameRelay(gameRelay);
            
            // Connect to login relay
            await this.connectToLoginRelay(loginRelay);
            
            // Connect to explorer relays
            for (const relay of explorerRelays) {
                try {
                    await this.connectToExplorerRelay(relay);
                } catch (err) {
                    console.warn(`[Nostr] Failed to connect to explorer relay ${relay}:`, err);
                }
            }
            
            return true;
        } catch (error) {
            console.error("[Nostr] Failed to connect to relays:", error);
            throw error;
        }
    },
    
    // Connect to game relay
    connectToGameRelay: async function(url) {
        try {
            const ws = new WebSocket(url);
            
            ws.onopen = () => {
                console.log(`[Nostr] Connected to game relay: ${url}`);
                this.relayConnections.game = { url, socket: ws };
            };
            
            ws.onerror = (error) => {
                console.error(`[Nostr] Game relay error: ${url}`, error);
            };
            
            ws.onclose = () => {
                console.log(`[Nostr] Game relay connection closed: ${url}`);
                if (this.relayConnections.game && this.relayConnections.game.url === url) {
                    this.relayConnections.game = null;
                }
            };
            
            ws.onmessage = (event) => {
                this.handleRelayMessage(event.data, url);
            };
            
            // Wait for connection to open
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Connection to ${url} timed out`)), 5000);
                ws.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to connect to game relay ${url}:`, error);
            throw error;
        }
    },
    
    // Connect to login relay
    connectToLoginRelay: async function(url) {
        try {
            const ws = new WebSocket(url);
            
            ws.onopen = () => {
                console.log(`[Nostr] Connected to login relay: ${url}`);
                this.relayConnections.login = { url, socket: ws };
            };
            
            ws.onerror = (error) => {
                console.error(`[Nostr] Login relay error: ${url}`, error);
            };
            
            ws.onclose = () => {
                console.log(`[Nostr] Login relay connection closed: ${url}`);
                if (this.relayConnections.login && this.relayConnections.login.url === url) {
                    this.relayConnections.login = null;
                }
            };
            
            ws.onmessage = (event) => {
                this.handleRelayMessage(event.data, url);
            };
            
            // Wait for connection to open
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Connection to ${url} timed out`)), 5000);
                ws.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to connect to login relay ${url}:`, error);
            throw error;
        }
    },
    
    // Connect to explorer relay
    connectToExplorerRelay: async function(url) {
        if (this.relayConnections.explorers.has(url)) {
            const existing = this.relayConnections.explorers.get(url);
            if (existing.socket && existing.socket.readyState === WebSocket.OPEN) {
                return true;
            }
        }
        
        try {
            const ws = new WebSocket(url);
            
            ws.onopen = () => {
                console.log(`[Nostr] Connected to explorer relay: ${url}`);
                this.relayConnections.explorers.set(url, { url, socket: ws });
                if (!this.activeExplorerRelay) {
                    this.activeExplorerRelay = url;
                }
            };
            
            ws.onerror = (error) => {
                console.error(`[Nostr] Explorer relay error: ${url}`, error);
            };
            
            ws.onclose = () => {
                console.log(`[Nostr] Explorer relay connection closed: ${url}`);
                this.relayConnections.explorers.delete(url);
                if (this.activeExplorerRelay === url) {
                    this.activeExplorerRelay = this.relayConnections.explorers.size > 0 ? 
                        Array.from(this.relayConnections.explorers.keys())[0] : null;
                }
            };
            
            ws.onmessage = (event) => {
                this.handleRelayMessage(event.data, url);
            };
            
            // Wait for connection to open
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Connection to ${url} timed out`)), 5000);
                ws.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to connect to explorer relay ${url}:`, error);
            throw error;
        }
    },
    
    // Handle relay messages
    handleRelayMessage: function(data, url) {
        let message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            console.error(`[Nostr] Failed to parse message from ${url}:`, e);
            return;
        }
        
        if (!Array.isArray(message)) {
            console.error(`[Nostr] Unexpected message format from ${url}:`, message);
            return;
        }
        
        const [type, ...params] = message;
        
        switch (type) {
            case 'EVENT':
                const [subscriptionId, event] = params;
                this.handleEvent(event, subscriptionId, url);
                break;
            case 'EOSE':
                const [eoseSubId] = params;
                console.log(`[Nostr] End of stored events for ${eoseSubId}`);
                break;
            case 'NOTICE':
                const [notice] = params;
                console.log(`[Nostr] Notice from ${url}: ${notice}`);
                break;
            case 'OK':
                const [eventId, success, message] = params;
                console.log(`[Nostr] Publication status for ${eventId}: ${success ? 'Success' : 'Failed'} ${message || ''}`);
                break;
            default:
                console.warn(`[Nostr] Unknown message type from ${url}:`, type, params);
        }
    },
    
    // Handle Nostr event
    handleEvent: function(event, subscriptionId, relayUrl) {
        if (!event || !event.kind || !event.pubkey) {
            console.warn(`[Nostr] Invalid event received from ${relayUrl}:`, event);
            return;
        }
        
        console.log(`[Nostr] Received event kind ${event.kind} from ${event.pubkey.substring(0, 8)}`);
        
        // Process event based on kind
        switch (event.kind) {
            case 0: // Profile metadata
                this.handleProfileEvent(event);
                break;
            case 1: // Text note
                this.handleTextNoteEvent(event);
                break;
            case 3: // Contact list
                this.handleContactsEvent(event);
                break;
            case 7: // Reaction
                this.handleReactionEvent(event);
                break;
            case 4: // Direct message
                this.handleDirectMessageEvent(event);
                break;
            case 40: // Channel creation
                this.handleChannelEvent(event);
                break;
            case 41: // Channel metadata
                this.handleChannelMetadataEvent(event);
                break;
            case 42: // Channel message
                this.handleChannelMessageEvent(event);
                break;
            default:
                if (event.kind >= 10000 && event.kind < 20000) {
                    // Mute list or other ephemeral event
                    console.log(`[Nostr] Ignoring ephemeral event kind ${event.kind}`);
                } else if (event.kind >= 30000 && event.kind < 40000) {
                    // NIP-51 lists
                    console.log(`[Nostr] Received list event kind ${event.kind}`);
                } else {
                    console.log(`[Nostr] Unhandled event kind: ${event.kind}`);
                }
        }
    },
    
    // Handle profile metadata event
    handleProfileEvent: function(event) {
        try {
            const profile = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Create or update user entry
            if (!this.users.has(pubkey)) {
                this.users.set(pubkey, {
                    pubkey,
                    profile,
                    notes: [],
                    createdAt: event.created_at
                });
            } else {
                const user = this.users.get(pubkey);
                user.profile = profile;
                
                // Only update if event is newer
                if (event.created_at > (user.createdAt || 0)) {
                    user.createdAt = event.created_at;
                }
            }
            
            // If this is the current user, update UI
            if (this.currentUser && pubkey === this.currentUser.pubkey) {
                this.currentUser.profile = profile;
                
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.updatePlayerProfile) {
                    uiModule.updatePlayerProfile();
                }
                
                console.log("[Nostr] Updated current user profile:", profile.name);
            }
            
        } catch (error) {
            console.error("[Nostr] Failed to parse profile:", error);
        }
    },
    
    // Handle text note event
    handleTextNoteEvent: function(event) {
        const pubkey = event.pubkey;
        
        // Create or update user entry
        if (!this.users.has(pubkey)) {
            this.users.set(pubkey, {
                pubkey,
                notes: [{
                    id: event.id,
                    content: event.content,
                    createdAt: event.created_at,
                    tags: event.tags
                }]
            });
        } else {
            const user = this.users.get(pubkey);
            
            // Check if we already have this note
            const existingNoteIndex = user.notes.findIndex(n => n.id === event.id);
            
            if (existingNoteIndex === -1) {
                // Add new note
                user.notes.push({
                    id: event.id,
                    content: event.content,
                    createdAt: event.created_at,
                    tags: event.tags
                });
                
                // Sort notes by created_at
                user.notes.sort((a, b) => b.createdAt - a.createdAt);
            }
        }
    },
    
    // Handle contacts event
    handleContactsEvent: function(event) {
        const pubkey = event.pubkey;
        
        // Extract followed pubkeys
        const follows = event.tags
            .filter(tag => tag[0] === 'p')
            .map(tag => tag[1]);
        
        // Create or update user entry
        if (!this.users.has(pubkey)) {
            this.users.set(pubkey, {
                pubkey,
                follows,
                createdAt: event.created_at
            });
        } else {
            const user = this.users.get(pubkey);
            
            // Only update if event is newer
            if (event.created_at > (user.createdAt || 0)) {
                user.follows = follows;
                user.createdAt = event.created_at;
            }
        }
        
        // Update UI if this is the current user
        if (this.currentUser && pubkey === this.currentUser.pubkey) {
            this.currentUser.follows = follows;
            console.log(`[Nostr] Updated current user follows: ${follows.length} users`);
        }
    },
    
    // Handle reaction event
    handleReactionEvent: function(event) {
        // Extract event ID being reacted to
        const eventTag = event.tags.find(tag => tag[0] === 'e');
        if (!eventTag) return;
        
        const targetEventId = eventTag[1];
        const reaction = event.content;
        
        console.log(`[Nostr] Reaction: ${reaction} to event ${targetEventId.substring(0, 8)} by ${event.pubkey.substring(0, 8)}`);
    },
    
    // Handle direct message event
    handleDirectMessageEvent: function(event) {
        // Check if message is for current user
        if (!this.currentUser) return;
        
        const recipientTag = event.tags.find(tag => tag[0] === 'p');
        if (!recipientTag) return;
        
        const recipient = recipientTag[1];
        
        if (recipient === this.currentUser.pubkey) {
            // Message is for us
            console.log(`[Nostr] DM received from ${event.pubkey.substring(0, 8)}`);
            
            // Notify UI
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.addDirectMessage) {
                uiModule.addDirectMessage(event);
            }
        }
    },
    
    // Handle channel event
    handleChannelEvent: function(event) {
        console.log(`[Nostr] Channel created: ${event.content}`);
    },
    
    // Handle channel metadata event
    handleChannelMetadataEvent: function(event) {
        console.log(`[Nostr] Channel metadata: ${event.content}`);
    },
    
    // Handle channel message event
    handleChannelMessageEvent: function(event) {
        // Extract channel ID
        const channelTag = event.tags.find(tag => tag[0] === 'e');
        if (!channelTag) return;
        
        const channelId = channelTag[1];
        
        console.log(`[Nostr] Channel message in ${channelId.substring(0, 8)}: ${event.content.substring(0, 30)}...`);
        
        // Notify UI
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.addChannelMessage) {
            uiModule.addChannelMessage(channelId, event);
        }
    },
    
    // Fetch user profile
    fetchProfile: async function(pubkey) {
        return new Promise((resolve, reject) => {
            const subscriptionId = `profile-${pubkey.substring(0, 8)}`;
            let timeout;
            
            // Set up subscription handler
            const handleEvent = (event) => {
                if (event.kind === 0 && event.pubkey === pubkey) {
                    const profile = JSON.parse(event.content);
                    
                    if (this.currentUser && pubkey === this.currentUser.pubkey) {
                        this.currentUser.profile = profile;
                        
                        const uiModule = RelayWorldCore.getModule('ui');
                        if (uiModule && uiModule.updatePlayerProfile) {
                            uiModule.updatePlayerProfile();
                        }
                    }
                    
                    // Create or update user entry
                    if (!this.users.has(pubkey)) {
                        this.users.set(pubkey, {
                            pubkey,
                            profile,
                            createdAt: event.created_at
                        });
                    } else {
                        const user = this.users.get(pubkey);
                        user.profile = profile;
                        
                        // Only update if event is newer
                        if (event.created_at > (user.createdAt || 0)) {
                            user.createdAt = event.created_at;
                        }
                    }
                    
                    // Clean up
                    clearTimeout(timeout);
                    this.closeSubscription(subscriptionId);
                    
                    resolve(profile);
                }
            };
            
            // Register handler
            RelayWorldCore.eventBus.on(`nostr:event:${subscriptionId}`, handleEvent);
            
            // Set up timeout
            timeout = setTimeout(() => {
                this.closeSubscription(subscriptionId);
                RelayWorldCore.eventBus.off(`nostr:event:${subscriptionId}`, handleEvent);
                resolve(null); // Resolve with null on timeout
            }, 5000);
            
            // Request profile from relays
            this.subscribe(subscriptionId, [
                {
                    kinds: [0],
                    authors: [pubkey],
                    limit: 1
                }
            ]);
        });
    },
    
    // Subscribe to events
    subscribe: function(id, filters) {
        const activeRelays = [];
        
        // Send subscription request to all connected relays
        if (this.relayConnections.game && this.relayConnections.game.socket.readyState === WebSocket.OPEN) {
            this.relayConnections.game.socket.send(JSON.stringify(["REQ", id, ...filters]));
            activeRelays.push(this.relayConnections.game.url);
        }
        
        if (this.relayConnections.login && this.relayConnections.login.socket.readyState === WebSocket.OPEN) {
            this.relayConnections.login.socket.send(JSON.stringify(["REQ", id, ...filters]));
            activeRelays.push(this.relayConnections.login.url);
        }
        
        if (this.activeExplorerRelay) {
            const relay = this.relayConnections.explorers.get(this.activeExplorerRelay);
            if (relay && relay.socket.readyState === WebSocket.OPEN) {
                relay.socket.send(JSON.stringify(["REQ", id, ...filters]));
                activeRelays.push(relay.url);
            }
        }
        
        // Store subscription for management
        this.subscriptions.set(id, {
            id,
            filters,
            relays: activeRelays,
            unsub: () => this.closeSubscription(id)
        });
        
        return this.subscriptions.get(id);
    },
    
    // Close subscription
    closeSubscription: function(id) {
        const sub = this.subscriptions.get(id);
        if (!sub) return;
        
        // Send CLOSE message to all relays
        if (this.relayConnections.game && this.relayConnections.game.socket.readyState === WebSocket.OPEN) {
            this.relayConnections.game.socket.send(JSON.stringify(["CLOSE", id]));
        }
        
        if (this.relayConnections.login && this.relayConnections.login.socket.readyState === WebSocket.OPEN) {
            this.relayConnections.login.socket.send(JSON.stringify(["CLOSE", id]));
        }
        
        sub.relays.forEach(relayUrl => {
            const relay = this.relayConnections.explorers.get(relayUrl);
            if (relay && relay.socket.readyState === WebSocket.OPEN) {
                relay.socket.send(JSON.stringify(["CLOSE", id]));
            }
        });
        
        // Remove subscription
        this.subscriptions.delete(id);
    },
    
    // Close all relays
    closeAllRelays: function() {
        // Close all subscriptions
        for (const [id, sub] of this.subscriptions) {
            this.closeSubscription(id);
        }
        
        // Close game relay
        if (this.relayConnections.game && this.relayConnections.game.socket) {
            this.relayConnections.game.socket.close();
            this.relayConnections.game = null;
        }
        
        // Close login relay
        if (this.relayConnections.login && this.relayConnections.login.socket) {
            this.relayConnections.login.socket.close();
            this.relayConnections.login = null;
        }
        
        // Close explorer relays
        for (const [url, relay] of this.relayConnections.explorers) {
            if (relay.socket) {
                relay.socket.close();
            }
        }
        this.relayConnections.explorers.clear();
        this.activeExplorerRelay = null;
        
        // Close DM inbox relays
        for (const [url, relay] of this.relayConnections.dmInbox) {
            if (relay.socket) {
                relay.socket.close();
            }
        }
        this.relayConnections.dmInbox.clear();
    },
    
    // Request all users and content
    requestAllUsersAndContent: async function() {
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.showLoading) {
            uiModule.showLoading('Loading data from relays...');
        }
        
        // Calculate time filter
        const now = Math.floor(Date.now() / 1000);
        const timeFilter = RelayWorldCore.getConfig('TIME_FILTER', 'all');
        let since = 0;
        
        switch (timeFilter) {
            case 'hour': since = now - 3600; break;
            case 'day': since = now - 86400; break;
            case 'week': since = now - 604800; break;
            case 'month': since = now - 2592000; break;
        }
        
        // Request profiles
        this.subscribe('profiles', [
            {
                kinds: [0],
                limit: 50
            }
        ]);
        
        // Request notes
        this.subscribe('notes', [
            {
                kinds: [1],
                since,
                limit: 100
            }
        ]);
        
        // Request contacts (follows)
        if (this.currentUser) {
            this.subscribe('follows', [
                {
                    kinds: [3],
                    authors: [this.currentUser.pubkey],
                    limit: 1
                }
            ]);
        }
        
        setTimeout(() => {
            if (uiModule && uiModule.hideLoading) {
                uiModule.hideLoading();
            }
        }, 3000);
    },
    
    // Publish an event
    publishEvent: async function(event, relays = []) {
        if (!this.currentUser || !this.currentUser.pubkey) {
            throw new Error("Not logged in");
        }
        
        if (!event.pubkey) {
            event.pubkey = this.currentUser.pubkey;
        }
        
        if (!event.created_at) {
            event.created_at = Math.floor(Date.now() / 1000);
        }
        
        if (!event.tags) {
            event.tags = [];
        }
        
        try {
            // Sign event using NIP-07 extension
            let signedEvent;
            
            if (window.nostr && typeof window.nostr.signEvent === 'function') {
                signedEvent = await window.nostr.signEvent(event);
            } else {
                throw new Error("No Nostr extension available for signing");
            }
            
            // Publish to relays
            let targetRelays = [];
            
            if (relays.length > 0) {
                // Use specified relays
                for (const url of relays) {
                    const relay = this.relayConnections.explorers.get(url) || 
                                 (this.relayConnections.game?.url === url ? this.relayConnections.game : null) ||
                                 (this.relayConnections.login?.url === url ? this.relayConnections.login : null);
                    
                    if (relay && relay.socket.readyState === WebSocket.OPEN) {
                        targetRelays.push(relay);
                    }
                }
            } else {
                // Use all connected relays
                if (this.relayConnections.game && this.relayConnections.game.socket.readyState === WebSocket.OPEN) {
                    targetRelays.push(this.relayConnections.game);
                }
                
                if (this.relayConnections.login && this.relayConnections.login.socket.readyState === WebSocket.OPEN) {
                    targetRelays.push(this.relayConnections.login);
                }
                
                if (this.activeExplorerRelay) {
                    const relay = this.relayConnections.explorers.get(this.activeExplorerRelay);
                    if (relay && relay.socket.readyState === WebSocket.OPEN) {
                        targetRelays.push(relay);
                    }
                }
            }
            
            // Send to all target relays
            for (const relay of targetRelays) {
                relay.socket.send(JSON.stringify(["EVENT", signedEvent]));
                console.log(`[Nostr] Published event ${signedEvent.id.substring(0, 8)} to ${relay.url}`);
            }
            
            return signedEvent;
        } catch (error) {
            console.error("[Nostr] Failed to publish event:", error);
            throw error;
        }
    }
};

const PlayerModule = {
    // Module metadata
    name: "player",
    description: "Player state and actions",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ['utils'],
    priority: 20,
    
    // Player state
    pubkey: null,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    speed: 200,
    score: 0,
    level: 1,
    inventory: [],
    stats: {
        itemsCollected: 0,
        distanceTraveled: 0,
        interactions: 0
    },
    input: {
        up: false,
        down: false,
        left: false,
        right: false
    },
    
    // Initialize module
    init: function() {
        console.log("[Player] Initializing player module...");
        
        // Set up input handlers
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.input.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') this.input.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = true;
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.input.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') this.input.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = false;
        });
        
        console.log("[Player] Player module initialized");
        return true;
    },
    
    // Update player state
    update: function(dt) {
        if (!this.pubkey) return;
        
        let dx = 0, dy = 0;
        
        if (this.input.up) dy -= 1;
        if (this.input.down) dy += 1;
        if (this.input.left) dx -= 1;
        if (this.input.right) dx += 1;
        
        if (dx !== 0 || dy !== 0) {
            // Normalize for diagonal movement
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len;
            dy /= len;
            
            // Apply movement
            const distance = this.speed * dt;
            this.x += dx * distance;
            this.y += dy * distance;
            
            // Update stats
            this.stats.distanceTraveled += distance;
        }
    },
    
    // Draw player
    draw: function(ctx) {
        if (!this.pubkey) return;
        
        // Draw player character
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player name
        const authModule = RelayWorldCore.getModule('auth');
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        let playerName = "You";
        if (nostrModule && nostrModule.currentUser && nostrModule.currentUser.profile) {
            playerName = nostrModule.currentUser.profile.name || playerName;
        }
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px 'Press Start 2P', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(playerName, this.x, this.y - 30);
        
        // Draw score
        ctx.fillStyle = "#FFFF00";
        ctx.font = "12px 'Press Start 2P', sans-serif";
        ctx.fillText(`Score: ${this.score}`, this.x, this.y + 40);
    }
};

const GameModule = {
    // Module metadata
    name: "game",
    description: "Game loop and mechanics",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ['utils', 'player'],
    priority: 30,
    critical: true,
    
    // Game state
    canvas: null,
    ctx: null,
    running: false,
    lastFrameTime: 0,
    
    // Game world properties
    world: {
        width: 3000,
        height: 3000,
        collectibles: []
    },
    
    // Initialize module
    init: function() {
        console.log("[Game] Initializing game module...");
        
        // Set up canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[Game] Game canvas not found!");
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error("[Game] Failed to get canvas context!");
            return false;
        }
        
        // Set canvas dimensions
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
        
        // Generate initial collectibles
        this.generateCollectibles(30);
        
        console.log("[Game] Game module initialized");
        return true;
    },
    
    // Start game loop
    start: function() {
        if (this.running) return;
        
        console.log("[Game] Starting game loop");
        this.running = true;
        this.lastFrameTime = performance.now();
        this.loop();
        
        return true;
    },
    
    // Stop game loop
    stop: function() {
        this.running = false;
        console.log("[Game] Game loop stopped");
        return true;
    },
    
    // Game loop
    loop: function() {
        if (!this.running) return;
        
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(() => this.loop());
    },
    
    // Update game state
    update: function(dt) {
        // Update player
        const playerModule = RelayWorldCore.getModule('player');
        if (playerModule) {
            playerModule.update(dt);
            
            // Check collectible collisions
            this.checkCollectibles(playerModule);
        }
        
        // Randomly spawn new collectibles
        if (Math.random() < 0.01 && this.world.collectibles.length < 50) {
            this.generateCollectibles(1);
        }
    },
    
    // Draw game world
    draw: function() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid background
        this.drawGrid();
        
        // Draw collectibles
        this.drawCollectibles();
        
        // Draw player
        const playerModule = RelayWorldCore.getModule('player');
        if (playerModule) {
            playerModule.draw(this.ctx);
        }
        
        // Draw UI elements
        this.drawUI();
    },
    
    // Draw grid background
    drawGrid: function() {
        const gridSize = 100;
        const playerModule = RelayWorldCore.getModule('player');
        
        if (!playerModule) return;
        
        // Calculate grid offset based on player position
        const offsetX = playerModule.x % gridSize;
        const offsetY = playerModule.y % gridSize;
        
        this.ctx.strokeStyle = "#306230";
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = -offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = -offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },
    
    // Draw collectibles
    drawCollectibles: function() {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        // Draw only collectibles that are visible on screen
        for (const item of this.world.collectibles) {
            // Calculate screen position relative to player
            const screenX = this.canvas.width / 2 + (item.x - playerModule.x);
            const screenY = this.canvas.height / 2 + (item.y - playerModule.y);
            
            // Check if item is on screen
            if (screenX < -50 || screenX > this.canvas.width + 50 || 
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }
            
            // Draw collectible
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(item.emoji, screenX, screenY);
        }
    },
    
    // Draw UI elements
    drawUI: function() {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        // Draw coordinates
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(`X: ${Math.round(playerModule.x)}, Y: ${Math.round(playerModule.y)}`, 10, 20);
    },
    
    // Generate collectibles
    generateCollectibles: function(count) {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        for (let i = 0; i < count; i++) {
            // Generate random position away from player
            let x, y;
            do {
                x = Math.random() * this.world.width;
                y = Math.random() * this.world.height;
            } while (Math.hypot(x - playerModule.x, y - playerModule.y) < 300);
            
            // Add collectible
            this.world.collectibles.push({
                id: Date.now() + i,
                x, y,
                emoji: ["💎", "🍄", "🔮", "⚡", "🔑"][Math.floor(Math.random() * 5)],
                value: Math.floor(Math.random() * 50) + 10
            });
        }
    },
    
    // Check collectible collisions
    checkCollectibles: function(player) {
        for (let i = 0; i < this.world.collectibles.length; i++) {
            const item = this.world.collectibles[i];
            const distance = Math.hypot(player.x - item.x, player.y - item.y);
            
            if (distance < 30) {
                // Collect item
                player.score += item.value;
                player.stats.itemsCollected++;
                
                // Remove collectible
                this.world.collectibles.splice(i, 1);
                i--;
                
                // Update UI
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.showToast) {
                    uiModule.showToast(`Collected ${item.emoji} +${item.value} points!`);
                }
                
                // Update player profile
                if (uiModule && uiModule.updatePlayerProfile) {
                    uiModule.updatePlayerProfile();
                }
            }
        }
    }
};

const UIModule = {
    // Module metadata
    name: "ui",
    description: "User interface management",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ['utils'],
    priority: 15,
    
    // Initialize module
    init: function() {
        console.log("[UI] Initializing UI module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        console.log("[UI] UI module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendChatButton = document.getElementById('send-chat-button');
        
        if (chatInput && sendChatButton) {
            sendChatButton.addEventListener('click', () => this.sendChat());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChat();
            });
        }
        
        // User popup
        const userPopupClose = document.getElementById('user-popup-close');
        if (userPopupClose) {
            userPopupClose.addEventListener('click', () => this.closeUserPopup());
        }
    },
    
    // Show login screen
    showLoginScreen: function() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.classList.remove('hide');
        }
    },
    
    // Hide login screen
    hideLoginScreen: function() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.classList.add('hide');
        }
    },
    
    // Show game UI
    showGameUI: function() {
        const elements = [
            'top-bar',
            'player-profile',
            'leaderboard-container',
            'chat-container'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hide');
        });
        
        // Start game
        const gameModule = RelayWorldCore.getModule('game');
        if (gameModule && !gameModule.running) {
            gameModule.start();
        }
    },
    
    // Hide game UI
    hideGameUI: function() {
        const elements = [
            'top-bar',
            'player-profile',
            'leaderboard-container',
            'chat-container'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hide');
        });
        
        // Stop game
        const gameModule = RelayWorldCore.getModule('game');
        if (gameModule && gameModule.running) {
            gameModule.stop();
        }
    },
    
    // Update player profile display
    updatePlayerProfile: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        if (!playerModule || !nostrModule || !nostrModule.currentUser) return;
        
        const profileImg = document.getElementById('player-profile-image');
        const nameEl = document.getElementById('player-profile-name');
        const npubEl = document.getElementById('player-profile-npub');
        const scoreEl = document.getElementById('profile-score');
        const itemsEl = document.getElementById('profile-items');
        const interactionsEl = document.getElementById('profile-interactions');
        
        if (profileImg && nostrModule.currentUser.profile && nostrModule.currentUser.profile.picture) {
            profileImg.src = nostrModule.currentUser.profile.picture;
        } else if (profileImg) {
            profileImg.src = '/api/placeholder/48/48';
        }
        
        if (nameEl && nostrModule.currentUser.profile && nostrModule.currentUser.profile.name) {
            nameEl.textContent = nostrModule.currentUser.profile.name;
        } else if (nameEl) {
            nameEl.textContent = nostrModule.currentUser.pubkey.substring(0, 8);
        }
        
        if (npubEl) {
            npubEl.textContent = nostrModule.currentUser.pubkey.substring(0, 8);
        }
        
        if (scoreEl) {
            scoreEl.textContent = playerModule.score;
        }
        
        if (itemsEl) {
            itemsEl.textContent = playerModule.stats.itemsCollected;
        }
        
        if (interactionsEl) {
            interactionsEl.textContent = playerModule.stats.interactions;
        }
        
        // Update score display
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Score: ${playerModule.score}`;
        }
    },
    
    // Show loading indicator
    showLoading: function(message) {
        const loadingIndicator = document.getElementById('loading-indicator');
        const loadingStatus = document.getElementById('loading-status');
        
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hide');
        }
        
        if (loadingStatus && message) {
            loadingStatus.textContent = message;
        }
    },
    
    // Hide loading indicator
    hideLoading: function() {
        const loadingIndicator = document.getElementById('loading-indicator');
        
        if (loadingIndicator) {
            loadingIndicator.classList.add('hide');
        }
    },
    
    // Send chat message
    sendChat: function() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Clear input
        chatInput.value = '';
        
        // Add message to chat
        this.addChatMessage('You', message);
        
        // Publish message
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (nostrModule) {
            nostrModule.publishEvent({
                kind: 1,
                content: message,
                tags: [['t', 'relayworld']]
            });
        }
    },
    
    // Add chat message
    addChatMessage: function(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        if (sender === 'You') msgDiv.className += ' from-me';
        
        const time = new Date().toLocaleTimeString();
        msgDiv.innerHTML = `
            <span class="username">${sender}</span>
            <span class="timestamp">[${time}]</span>:
            <span class="content">${this._escapeHTML(message)}</span>
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    // Show toast notification
    showToast: function(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    },
    
    // Show user popup
    showUserPopup: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const user = nostrModule.users.get(pubkey);
        if (!user) return;
        
        const popup = document.getElementById('user-popup');
        const img = document.getElementById('user-popup-image');
        const nameEl = document.getElementById('user-popup-name');
        const npubEl = document.getElementById('user-popup-npub');
        const notesContainer = document.getElementById('user-notes');
        
        if (!popup || !img || !nameEl || !npubEl || !notesContainer) return;
        
        popup.dataset.pubkey = pubkey;
        popup.classList.remove('hide');
        
        img.src = user.profile?.picture || '/api/placeholder/50/50';
        nameEl.textContent = user.profile?.name || pubkey.substring(0, 8);
        npubEl.textContent = pubkey.substring(0, 8);
        
        // Show notes
        notesContainer.innerHTML = '';
        
        if (user.notes && user.notes.length > 0) {
            user.notes.slice(0, 5).forEach(note => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'user-note';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'user-note-content';
                contentDiv.textContent = note.content;
                
                const timestampDiv = document.createElement('div');
                timestampDiv.className = 'user-note-timestamp';
                timestampDiv.textContent = new Date(note.createdAt * 1000).toLocaleString();
                
                noteDiv.appendChild(contentDiv);
                noteDiv.appendChild(timestampDiv);
                notesContainer.appendChild(noteDiv);
            });
        } else {
            notesContainer.innerHTML = '<div class="user-note">No notes found.</div>';
        }
        
        // Position popup
        popup.style.left = `${Math.min(Math.max(window.innerWidth / 2 - 200, 10), window.innerWidth - 410)}px`;
        popup.style.top = `${Math.min(Math.max(window.innerHeight / 2 - 250, 60), window.innerHeight - 510)}px`;
    },
    
    // Close user popup
    closeUserPopup: function() {
        const popup = document.getElementById('user-popup');
        if (popup) {
            popup.classList.add('hide');
            popup.dataset.pubkey = '';
        }
    },
    
    // Helper method to escape HTML
    _escapeHTML: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Main application setup
const RelayWorld = {
    version: '1.0.0',
    debug: true,
    initialized: false,
    
    // Initialize the application
    init: async function() {
        console.log("[Relay World] Initializing application...");
        
        try {
            // Show temporary loading UI
            this._showLoadingScreen();
            
            // Initialize core module system
            await this._initCore();
            
            // Register all modules
            this._registerModules();
            
            // Load configuration
            await this._loadConfig();
            
            // Initialize all modules
            await RelayWorldCore.init();
            
            // Set up global event handlers
            this._setupGlobalEvents();
            
            // Setup is complete
            this.initialized = true;
            this._hideLoadingScreen();
            
            console.log("[Relay World] Initialization complete");
            
            // Initialize debug tools
            if (this.debug) {
                DebugUtils.addGlobalDebugMethods();
            }
            
        } catch (error) {
            console.error("[Relay World] Initialization failed:", error);
            this._showErrorScreen(error);
            throw error;
        }
    },
    
    // Initialize core system
    _initCore: async function() {
        console.log("[Relay World] Initializing core system...");
        
        // Log system information
        this._logSystemInfo();
        
        // Initialize event bus
        RelayWorldCore.eventBus.init();
        
        // Initialize config manager
        await ConfigManager.init();
        
        return true;
    },
    
    // Register all modules
    _registerModules: function() {
        console.log("[Relay World] Registering modules...");
        
        // Register utility modules first
        RelayWorldCore.registerModule('utils', Utils);
        RelayWorldCore.registerModule('debug', DebugUtils);
        
        // Register core gameplay modules
        RelayWorldCore.registerModule('auth', AuthModule);
        RelayWorldCore.registerModule('nostr', NostrModule);
        RelayWorldCore.registerModule('player', PlayerModule);
        RelayWorldCore.registerModule('game', GameModule);
        RelayWorldCore.registerModule('ui', UIModule);
        
        console.log("[Relay World] All modules registered");
    },
    
    // Load configuration
    _loadConfig: async function() {
        console.log("[Relay World] Loading configuration...");
        
        // Load default configuration
        const defaultConfig = {
            // Game configuration
            WORLD_SIZE: 3000,
            
            // Relay configuration
            GAME_RELAY: "wss://relay.damus.io", // Dedicated game relay
            LOGIN_RELAY: "wss://relay.damus.io",       // Default login relay
            EXPLORER_RELAYS: [
                "wss://relay.damus.io",
                "wss://relay.nostr.band",
                "wss://nos.lol",
                "wss://nostr.wine"
            ],
            
            // Game mechanics
            INTERACTION_RANGE: 100,
            
            // Debug settings
            DEBUG_MODE: this.debug
        };
        
        // Apply default configuration
        for (const [key, value] of Object.entries(defaultConfig)) {
            RelayWorldCore.setConfig(key, value);
        }
        
        // Load saved configuration from localStorage
        try {
            const savedConfig = localStorage.getItem('relayworld_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                for (const [key, value] of Object.entries(config)) {
                    RelayWorldCore.setConfig(key, value);
                }
                console.log("[Relay World] Loaded saved configuration");
            }
        } catch (error) {
            console.warn("[Relay World] Failed to load saved configuration:", error);
        }
        
        console.log("[Relay World] Configuration loaded");
    },
    
    // Set up global event handlers
    _setupGlobalEvents: function() {
        // Handle authentication events
        RelayWorldCore.eventBus.on('auth:login', this._handleLogin.bind(this));
        RelayWorldCore.eventBus.on('auth:logout', this._handleLogout.bind(this));
        
        // Handle error events
        RelayWorldCore.eventBus.on('error', this._handleError.bind(this));
        
        // Handle beforeunload event
        window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
    },
    
    // Handle login event
    _handleLogin: function(data) {
        console.log("[Relay World] User logged in:", data.pubkey.substring(0, 8));
    },
    
    // Handle logout event
    _handleLogout: function() {
        console.log("[Relay World] User logged out");
    },
    
    // Handle error event
    _handleError: function(error) {
        console.error("[Relay World] Error:", error);
    },
    
    // Handle beforeunload event
    _handleBeforeUnload: function(event) {
        // Save configuration
        ConfigManager.saveConfig();
    },
    
    // Log system information
    _logSystemInfo: function() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const isSecure = window.isSecureContext;
        const hasCrypto = !!window.crypto;
        const hasWebSocket = !!window.WebSocket;
        const hasNostrExtension = !!window.nostr;
        
        console.log(`[Relay World] User Agent: ${userAgent}`);
        console.log(`[Relay World] Platform: ${platform}`);
        console.log(`[Relay World] Secure Context: ${isSecure}`);
        console.log(`[Relay World] Has Crypto API: ${hasCrypto}`);
        console.log(`[Relay World] Has WebSocket: ${hasWebSocket}`);
        console.log(`[Relay World] Has Nostr Extension: ${hasNostrExtension}`);
    },
    
    // Show temporary loading screen
    _showLoadingScreen: function() {
        const loadingScreen = document.getElementById('loading-indicator');
        if (loadingScreen) {
            loadingScreen.classList.remove('hide');
        }
    },
    
    // Hide loading screen
    _hideLoadingScreen: function() {
        const loadingScreen = document.getElementById('loading-indicator');
        if (loadingScreen) {
            loadingScreen.classList.add('hide');
        }
    },
    
    // Show error screen
    _showErrorScreen: function(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-screen';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h1>Initialization Error</h1>
                <p>${error.message || 'Unknown error occurred during initialization'}</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    RelayWorld.init().catch(error => {
        console.error("Failed to initialize Relay World:", error);
    });
});

// Export RelayWorld object for global access
window.RelayWorld = RelayWorld;
