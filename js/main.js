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
        
        // Setup login button listeners
        this._setupLoginHandlers();
        
        this.initialized = true;
        console.log("[Auth] Authentication module initialized");
        return true;
    },
    
    // Set up login button listeners
    _setupLoginHandlers: function() {
        // NIP-07 Login
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.loginWithNostr());
        }
        
        // Guest Login
        const guestLoginButton = document.getElementById('guest-login-button');
        if (guestLoginButton) {
            guestLoginButton.addEventListener('click', () => this.loginAsGuest());
        }
    },
    
    // Login with NIP-07 extension
    loginWithNostr: async function(providedPubkey) {
        try {
            const loginLoader = document.getElementById('login-loader');
            const loginStatus = document.getElementById('login-status');
            
            if (loginLoader) loginLoader.classList.remove('hide');
            if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
            
            let pubkey = providedPubkey;
            
            // Check if Nostr extension is available
            if (!window.nostr) {
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.showToast) {
                    uiModule.showToast('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.', 'error');
                }
                if (loginStatus) loginStatus.textContent = 'Nostr extension not found';
                if (loginLoader) loginLoader.classList.add('hide');
                return false;
            }
            
            if (!pubkey) {
                if (loginStatus) loginStatus.textContent = 'Requesting pubkey...';
                pubkey = await window.nostr.getPublicKey();
            }
            
            if (!pubkey) {
                throw new Error("No public key available");
            }
            
            if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
            
            // Animate sound wave
            const soundWave = document.getElementById('sound-wave');
            if (soundWave) {
                soundWave.style.animation = 'sound-wave 4s ease-out infinite';
            }
            
            this.currentUser = { pubkey };
            
            // Create player in the game
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule) {
                playerModule.pubkey = pubkey;
                
                // Generate initial position from pubkey hash
                if (window.CryptoJS) {
                    const hash = CryptoJS.SHA256(pubkey).toString();
                    playerModule.x = parseInt(hash.substr(0,8),16) % 3000;
                    playerModule.y = parseInt(hash.substr(8,8),16) % 3000;
                }
            }
            
            // Connect to relays and subscribe to events
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule) {
                nostrModule.currentUser = { pubkey };
                await nostrModule.connectToRelays();
                await nostrModule.fetchProfile(pubkey);
                await nostrModule.requestAllUsersAndContent();
            }
            
            // Hide login screen after a delay to allow for animations
            setTimeout(() => {
                // Show game UI
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule) {
                    uiModule.hideLoginScreen();
                    uiModule.showGameUI();
                    uiModule.updatePlayerProfile();
                    uiModule.showToast('Login successful!', 'success');
                }
                
                // Start game if it's not already running
                const gameModule = RelayWorldCore.getModule('game');
                if (gameModule && !gameModule.running) {
                    gameModule.start();
                }
                
                // Re-enable login button
                if (loginLoader) loginLoader.classList.add('hide');
            }, 1500);
            
            console.log(`[Auth] Logged in with pubkey: ${pubkey}`);
            RelayWorldCore.eventBus.emit('auth:login', { pubkey });
            return true;
            
        } catch (error) {
            console.error("[Auth] Login failed:", error);
            
            // Show error message
            const loginStatus = document.getElementById('login-status');
            const loginLoader = document.getElementById('login-loader');
            
            if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
            if (loginLoader) loginLoader.classList.add('hide');
            
            // Show toast if UI module is available
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast('Login failed: ' + error.message, 'error');
            }
            
            return false;
        }
    },
    
    // Login as guest
    loginAsGuest: function() {
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.showUsernameDialog) {
            uiModule.showUsernameDialog(username => {
                if (!username) return; // User canceled
                
                const loginLoader = document.getElementById('login-loader');
                const loginStatus = document.getElementById('login-status');
                
                if (loginLoader) loginLoader.classList.remove('hide');
                if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
                
                // Generate a guest ID
                const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
                this.currentUser = { 
                    pubkey: guestId,
                    profile: {
                        name: username,
                        picture: 'assets/icons/default-avatar.png'
                    },
                    isGuest: true
                };
                
                // Create player in the game
                const playerModule = RelayWorldCore.getModule('player');
                if (playerModule) {
                    playerModule.pubkey = guestId;
                    playerModule.profile = this.currentUser.profile;
                    
                    // Random position for guests
                    playerModule.x = Math.random() * 3000;
                    playerModule.y = Math.random() * 3000;
                }
                
                // Animate sound wave
                const soundWave = document.getElementById('sound-wave');
                if (soundWave) {
                    soundWave.style.animation = 'sound-wave 4s ease-out infinite';
                }
                
                // Hide login screen after delay
                setTimeout(() => {
                    if (uiModule) {
                        uiModule.hideLoginScreen();
                        uiModule.showGameUI();
                        uiModule.updatePlayerProfile();
                        uiModule.showToast(`Welcome, ${username}!`, 'success');
                    }
                    
                    // Start game
                    const gameModule = RelayWorldCore.getModule('game');
                    if (gameModule && !gameModule.running) {
                        gameModule.start();
                    }
                    
                    if (loginLoader) loginLoader.classList.add('hide');
                }, 1500);
                
                console.log(`[Auth] Logged in as guest: ${username}`);
                RelayWorldCore.eventBus.emit('auth:login', { pubkey: guestId, isGuest: true });
            });
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
        
        // Stop game
        const gameModule = RelayWorldCore.getModule('game');
        if (gameModule && gameModule.running) {
            gameModule.stop();
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
    
    // Event kinds
    EVENT_KINDS: {
        METADATA: 0,
        TEXT_NOTE: 1,
        CONTACTS: 3,
        DM: 4,
        REACTION: 7,
        CHANNEL_CREATE: 40,
        CHANNEL_METADATA: 41,
        CHANNEL_MESSAGE: 42,
        CHAT: 69000,
        GAME_STATE: 69001,
        SCORE: 69420
    },
    
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
    
    // Connect to DM inbox relay
    connectToDMInboxRelay: async function(url) {
        if (this.relayConnections.dmInbox.has(url)) {
            const existing = this.relayConnections.dmInbox.get(url);
            if (existing.socket && existing.socket.readyState === WebSocket.OPEN) {
                return true;
            }
        }
        
        try {
            const ws = new WebSocket(url);
            
            ws.onopen = () => {
                console.log(`[Nostr] Connected to DM inbox relay: ${url}`);
                this.relayConnections.dmInbox.set(url, { url, socket: ws });
            };
            
            ws.onerror = (error) => {
                console.error(`[Nostr] DM inbox relay error: ${url}`, error);
            };
            
            ws.onclose = () => {
                console.log(`[Nostr] DM inbox relay connection closed: ${url}`);
                this.relayConnections.dmInbox.delete(url);
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
            console.error(`[Nostr] Failed to connect to DM inbox relay ${url}:`, error);
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
            case this.EVENT_KINDS.METADATA: // Profile metadata
                this.handleProfileEvent(event);
                break;
            case this.EVENT_KINDS.TEXT_NOTE: // Text note
                this.handleTextNoteEvent(event);
                break;
            case this.EVENT_KINDS.CONTACTS: // Contact list
                this.handleContactsEvent(event);
                break;
            case this.EVENT_KINDS.REACTION: // Reaction
                this.handleReactionEvent(event);
                break;
            case this.EVENT_KINDS.DM: // Direct message
                this.handleDirectMessageEvent(event);
                break;
            case this.EVENT_KINDS.CHANNEL_CREATE: // Channel creation
                this.handleChannelEvent(event);
                break;
            case this.EVENT_KINDS.CHANNEL_METADATA: // Channel metadata
                this.handleChannelMetadataEvent(event);
                break;
            case this.EVENT_KINDS.CHANNEL_MESSAGE: // Channel message
                this.handleChannelMessageEvent(event);
                break;
            case this.EVENT_KINDS.CHAT: // Game chat
                this.handleGameChatEvent(event);
                break;
            case this.EVENT_KINDS.GAME_STATE: // Game state
                this.handleGameStateEvent(event);
                break;
            case this.EVENT_KINDS.SCORE: // Score update
                this.handleScoreEvent(event);
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
        
        // Emit event for other modules to handle
        RelayWorldCore.eventBus.emit(`nostr:event:${subscriptionId}`, event);
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
    
    // Handle game chat event
    handleGameChatEvent: function(event) {
        const content = event.content;
        const pubkey = event.pubkey;
        
        // Ignore our own messages that were already displayed
        if (pubkey === this.currentUser?.pubkey) return;
        
        // Add to chat UI
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.addChatMessage) {
            // Get user's profile name
            const user = this.users.get(pubkey);
            const username = user?.profile?.name || pubkey.substring(0, 8);
            
            uiModule.addChatMessage(username, content);
        }
    },
    
    // Handle game state event
    handleGameStateEvent: function(event) {
        try {
            const gameState = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Ignore our own state updates
            if (pubkey === this.currentUser?.pubkey) return;
            
            // Create or update user entry
            if (!this.users.has(pubkey)) {
                // Calculate initial position
                let x = 1500, y = 1500;
                
                this.users.set(pubkey, {
                    pubkey,
                    x, y,
                    ...gameState
                });
            } else {
                const user = this.users.get(pubkey);
                
                // Update position
                if (gameState.x !== undefined) user.x = gameState.x;
                if (gameState.y !== undefined) user.y = gameState.y;
                
                // Update other state properties
                Object.assign(user, gameState);
            }
        } catch (error) {
            console.error("[Nostr] Failed to parse game state:", error);
        }
    },
    
    // Handle score event
    handleScoreEvent: function(event) {
        try {
            const scoreData = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Create or update user entry
            if (!this.users.has(pubkey)) {
                this.users.set(pubkey, {
                    pubkey,
                    score: scoreData.score,
                    level: scoreData.level
                });
            } else {
                const user = this.users.get(pubkey);
                user.score = scoreData.score;
                if (scoreData.level) user.level = scoreData.level;
            }
            
            // Update leaderboard
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.updateLeaderboard) {
                uiModule.updateLeaderboard();
            }
        } catch (error) {
            console.error("[Nostr] Failed to parse score data:", error);
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
    publishEvent: async function(kind, content, tags = []) {
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
    profile: null,
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
            
            // Publish position update
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule) {
                const gameStateEvent = {
                    kind: nostrModule.EVENT_KINDS.GAME_STATE,
                    content: JSON.stringify({
                        x: this.x,
                        y: this.y
                    }),
                    pubkey: this.pubkey,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: []
                };
                
                // Don't flood the network with updates, send at most 5 per second
                if (!this._lastUpdateSent || Date.now() - this._lastUpdateSent > 200) {
                    nostrModule.publishEvent(gameStateEvent.kind, gameStateEvent.content)
                        .catch(err => console.error("[Player] Failed to publish position update:", err));
                    this._lastUpdateSent = Date.now();
                }
            }
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
        if (this.profile && this.profile.name) {
            playerName = this.profile.name;
        } else if (nostrModule && nostrModule.currentUser && nostrModule.currentUser.profile) {
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
        
        // Draw other players
        this.drawOtherPlayers();
        
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
    
    // Draw other players
    drawOtherPlayers: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        if (!playerModule || !nostrModule) return;
        
        const currentPlayerPubkey = playerModule.pubkey;
        
        // Draw other players
        nostrModule.users.forEach((user, pubkey) => {
            // Skip current player
            if (pubkey === currentPlayerPubkey) return;
            
            // Skip users without position data
            if (user.x === undefined || user.y === undefined) return;
            
            // Calculate screen position relative to player
            const screenX = this.canvas.width / 2 + (user.x - playerModule.x);
            const screenY = this.canvas.height / 2 + (user.y - playerModule.y);
            
            // Check if user is on screen
            if (screenX < -50 || screenX > this.canvas.width + 50 || 
                screenY < -50 || screenY > this.canvas.height + 50) {
                return;
            }
            
            // Draw player
            this.ctx.fillStyle = "#0000FF";
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw player name
            const playerName = user.profile?.name || pubkey.substring(0, 8);
            
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.font = "14px 'Press Start 2P', sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText(playerName, screenX, screenY - 30);
            
            // Draw score if available
            if (user.score) {
                this.ctx.fillStyle = "#FFFF00";
                this.ctx.font = "12px 'Press Start 2P', sans-serif";
                this.ctx.fillText(`Score: ${user.score}`, screenX, screenY + 40);
            }
        });
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
                    
                    // Play sound
                    if (uiModule.playSound) {
                        uiModule.playSound('item');
                    }
                }
                
                // Update player profile
                if (uiModule && uiModule.updatePlayerProfile) {
                    uiModule.updatePlayerProfile();
                }
                
                // Publish score update
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule) {
                    nostrModule.publishEvent(nostrModule.EVENT_KINDS.SCORE, {
                        score: player.score,
                        level: player.level
                    }).catch(err => console.error("[Game] Failed to publish score update:", err));
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
        
        // Relay control
        const relaySelector = document.getElementById('relay-selector');
        const addRelayButton = document.getElementById('add-relay-button');
        
        if (relaySelector) {
            relaySelector.addEventListener('change', (e) => {
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule) {
                    nostrModule.activeExplorerRelay = e.target.value;
                    nostrModule.requestAllUsersAndContent();
                }
            });
        }
        
        if (addRelayButton) {
            addRelayButton.addEventListener('click', () => {
                const customRelayInput = document.getElementById('custom-relay-input');
                if (!customRelayInput) return;
                
                const relayUrl = customRelayInput.value.trim();
                if (!relayUrl) return;
                
                // Validate URL
                if (!relayUrl.startsWith('wss://')) {
                    this.showToast('Invalid relay URL (must start with wss://)', 'error');
                    return;
                }
                
                // Add relay
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule) {
                    nostrModule.connectToExplorerRelay(relayUrl)
                        .then(() => {
                            this.showToast(`Connected to ${relayUrl}`, 'success');
                            this.updateRelaySelector();
                            customRelayInput.value = '';
                        })
                        .catch(err => {
                            this.showToast(`Failed to connect to ${relayUrl}: ${err.message}`, 'error');
                        });
                }
            });
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
        
        // Show mobile controls on mobile devices
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.classList.remove('hide');
            }
        }
        
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
            'chat-container',
            'mobile-controls'
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
        
        if (profileImg) {
            if (playerModule.profile && playerModule.profile.picture) {
                profileImg.src = playerModule.profile.picture;
            } else if (nostrModule.currentUser.profile && nostrModule.currentUser.profile.picture) {
                profileImg.src = nostrModule.currentUser.profile.picture;
            } else {
                profileImg.src = 'assets/icons/default-avatar.png';
            }
        }
        
        if (nameEl) {
            if (playerModule.profile && playerModule.profile.name) {
                nameEl.textContent = playerModule.profile.name;
            } else if (nostrModule.currentUser.profile && nostrModule.currentUser.profile.name) {
                nameEl.textContent = nostrModule.currentUser.profile.name;
            } else {
                nameEl.textContent = `User ${playerModule.pubkey.substring(0, 8)}`;
            }
        }
        
        if (npubEl) {
            npubEl.textContent = playerModule.pubkey.substring(0, 8);
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
    
    // Update relay selector dropdown
    updateRelaySelector: function() {
        const relaySelector = document.getElementById('relay-selector');
        if (!relaySelector) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        // Clear existing options
        relaySelector.innerHTML = '';
        
        // Add connected relays
        if (nostrModule.relayConnections.game) {
            const option = document.createElement('option');
            option.value = nostrModule.relayConnections.game.url;
            option.textContent = `Game: ${nostrModule.relayConnections.game.url}`;
            relaySelector.appendChild(option);
        }
        
        if (nostrModule.relayConnections.login) {
            const option = document.createElement('option');
            option.value = nostrModule.relayConnections.login.url;
            option.textContent = `Login: ${nostrModule.relayConnections.login.url}`;
            relaySelector.appendChild(option);
        }
        
        // Add explorer relays
        nostrModule.relayConnections.explorers.forEach((relay, url) => {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = `Explorer: ${url}`;
            relaySelector.appendChild(option);
        });
        
        // Set active relay
        if (nostrModule.activeExplorerRelay) {
            relaySelector.value = nostrModule.activeExplorerRelay;
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
            nostrModule.publishEvent(nostrModule.EVENT_KINDS.CHAT, message)
                .catch(err => console.error("[UI] Failed to publish chat message:", err));
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
    showToast: function(message, type = '') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            // Create container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        if (type) toast.className += ` ${type}`;
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
        
        img.src = user.profile?.picture || 'assets/icons/default-avatar.png';
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
    
    // Show username dialog for guest login
    showUsernameDialog: function(callback) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '10000';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = 'var(--color-light, #8bac0f)';
        dialog.style.border = '8px solid var(--color-medium, #306230)';
        dialog.style.padding = '24px';
        dialog.style.maxWidth = '90%';
        dialog.style.width = '400px';
        dialog.style.boxShadow = '0 0 0 4px var(--color-dark, #0f380f), 8px 8px 0 rgba(0,0,0,0.5)';
        
        // Create dialog content
        dialog.innerHTML = `
            <h2 style="color: var(--color-dark, #0f380f); margin-bottom: 20px; text-align: center;">Enter Your Guest Username</h2>
            <div style="margin-bottom: 20px;">
                <input type="text" id="guest-username-input" placeholder="Username (3-20 characters)" value="Guest${Math.floor(Math.random() * 1000)}" 
                       style="width: 100%; padding: 12px; box-sizing: border-box; border: 2px solid var(--color-dark, #0f380f); font-size: 16px;">
                <div id="username-error" style="color: var(--color-danger, #cf6679); font-size: 14px; margin-top: 5px; visibility: hidden;">
                    Username must be 3-20 characters
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="username-submit" style="flex: 1; padding: 10px; background-color: var(--color-primary, #8bac0f); 
                        color: var(--color-dark, #0f380f); border: 3px solid var(--color-dark, #0f380f); 
                        cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Continue</button>
                
                <button id="username-cancel" style="flex: 1; padding: 10px; background-color: var(--color-medium, #306230);
                        color: white; border: 3px solid var(--color-dark, #0f380f); 
                        cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus the input
        const input = document.getElementById('guest-username-input');
        setTimeout(() => input?.focus(), 100);
        
        // Set up handlers
        const submitButton = document.getElementById('username-submit');
        const cancelButton = document.getElementById('username-cancel');
        const errorMsg = document.getElementById('username-error');
        
        const validateInput = () => {
            if (!input) return false;
            
            const value = input.value.trim();
            const isValid = value.length >= 3 && value.length <= 20;
            
            if (errorMsg) {
                errorMsg.style.visibility = isValid ? 'hidden' : 'visible';
            }
            
            return isValid;
        };
        
        const handleSubmit = () => {
            if (validateInput()) {
                const username = input.value.trim();
                document.body.removeChild(overlay);
                callback(username);
            }
        };
        
        if (submitButton) {
            submitButton.addEventListener('click', handleSubmit);
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
                callback(null);
            });
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });
            
            input.addEventListener('input', validateInput);
        }
        
        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                callback(null);
            }
        });
    },
    
    // Update leaderboard
    updateLeaderboard: function() {
        const leaderboardEntries = document.getElementById('leaderboard-entries');
        if (!leaderboardEntries) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        // Get users with scores
        const usersWithScores = Array.from(nostrModule.users.entries())
            .filter(([_, user]) => user.score !== undefined)
            .map(([pubkey, user]) => ({
                pubkey,
                name: user.profile?.name || pubkey.substring(0, 8),
                score: user.score || 0
            }))
            .sort((a, b) => b.score - a.score);
        
        // Generate leaderboard HTML
        const html = usersWithScores.slice(0, 10).map((user, index) => `
            <div class="leaderboard-entry">
                <span class="rank">${index + 1}</span>
                <span class="name">${this._escapeHTML(user.name)}</span>
                <span class="score">${user.score}</span>
            </div>
        `).join('');
        
        leaderboardEntries.innerHTML = html || '<div class="leaderboard-entry">No scores yet</div>';
    },
    
    // Play sound effect
    playSound: function(soundName) {
        // Sound effect mapping
        const sounds = {
            item: "item.mp3",
            success: "success.mp3",
            error: "error.mp3"
        };
        
        // Get sound file
        const soundFile = sounds[soundName];
        if (!soundFile) return;
        
        // Create audio element
        const audio = new Audio(`assets/sounds/${soundFile}`);
        
        // Play sound (catch errors silently)
        audio.play().catch(() => {});
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
