/**
 * nostr.js - Nostr relay interactions for Relay World
 * Handles connecting to relays, subscribing to events, and publishing events
 */

const Nostr = {
    // Relay connections
    relays: new Set(),
    relayConnections: new Map(),
    activeRelay: null,
    
    // User data
    users: new Map(), // Map of pubkey -> user data
    
    // Subscription IDs
    subscriptions: new Map(),
    
    // Check if a Nostr extension is available
    isExtensionAvailable: async function(timeout = 3000) {
        return new Promise((resolve) => {
            if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
                resolve(true);
                return;
            }
            
            const timer = setTimeout(() => resolve(false), timeout);
            const interval = setInterval(() => {
                if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(true);
                }
            }, 100);
        });
    },
    
    // Get public key from extension
    getPublicKey: async function() {
        try {
            return await window.nostr.getPublicKey();
        } catch (error) {
            console.error("[Nostr] Failed to get public key:", error);
            throw error;
        }
    },
    
    // Connect to a relay
    connectRelay: async function(url) {
        try {
            // Check if already connected
            if (this.relayConnections.has(url) && 
                this.relayConnections.get(url).readyState === WebSocket.OPEN) {
                return this.relayConnections.get(url);
            }
            
            console.log(`[Nostr] Connecting to relay: ${url}`);
            
            // Create new WebSocket connection
            const relay = window.NostrTools ? 
                window.NostrTools.relayInit(url) : 
                { url, connect: () => this.createWebSocket(url) };
            
            // Connect to relay
            await relay.connect();
            
            // Add to relay list
            this.relays.add(url);
            this.relayConnections.set(url, relay);
            
            console.log(`[Nostr] Connected to relay: ${url}`);
            return relay;
            
        } catch (error) {
            console.error(`[Nostr] Failed to connect to relay ${url}:`, error);
            throw error;
        }
    },
    
    // Create a WebSocket connection (fallback if NostrTools not available)
    createWebSocket: function(url) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            
            ws.onopen = () => {
                // Add custom properties to mimic NostrTools relay object
                ws.url = url;
                ws.sub = this.createSubscription.bind(this, ws);
                ws.publish = this.publishToWebSocket.bind(this, ws);
                ws.close = () => {
                    ws.close();
                    this.relayConnections.delete(url);
                };
                
                this.relayConnections.set(url, ws);
                resolve(ws);
            };
            
            ws.onerror = (error) => {
                console.error(`[Nostr] WebSocket error for ${url}:`, error);
                reject(error);
            };
            
            ws.onclose = () => {
                console.log(`[Nostr] WebSocket closed for ${url}`);
                this.relayConnections.delete(url);
                
                // Attempt to reconnect if game is still running
                if (Game && Game.running) {
                    setTimeout(() => {
                        this.connectRelay(url).catch(err => 
                            console.error(`[Nostr] Failed to reconnect to ${url}:`, err)
                        );
                    }, 5000);
                }
            };
            
            ws.onmessage = (event) => {
                this.handleRelayMessage(url, event.data);
            };
        });
    },
    
    // Create a subscription object (fallback if NostrTools not available)
    createSubscription: function(ws, filters, options = {}) {
        const subId = options.id || Math.random().toString(36).substring(2, 15);
        
        const sub = {
            id: subId,
            filters,
            relay: ws,
            
            // Event handlers
            handlers: {
                event: [],
                eose: []
            },
            
            // Add event handler
            on: function(event, handler) {
                if (this.handlers[event]) {
                    this.handlers[event].push(handler);
                }
                return this;
            },
            
            // Unsubscribe
            unsub: function() {
                try {
                    const msg = JSON.stringify(["CLOSE", subId]);
                    ws.send(msg);
                    
                    // Clean up subscription
                    Nostr.subscriptions.delete(subId);
                } catch (error) {
                    console.error(`[Nostr] Failed to unsubscribe from ${subId}:`, error);
                }
            }
        };
        
        // Store subscription
        this.subscriptions.set(subId, sub);
        
        // Send subscription request
        try {
            const msg = JSON.stringify(["REQ", subId, ...filters]);
            ws.send(msg);
        } catch (error) {
            console.error(`[Nostr] Failed to send subscription request:`, error);
            this.subscriptions.delete(subId);
            throw error;
        }
        
        return sub;
    },
    
    // Publish to WebSocket (fallback if NostrTools not available)
    publishToWebSocket: function(ws, event) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not open"));
                return;
            }
            
            try {
                const msg = JSON.stringify(["EVENT", event]);
                ws.send(msg);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // Handle relay message
    handleRelayMessage: function(relayUrl, data) {
        let parsed;
        try {
            if (typeof data === 'string') {
                parsed = JSON.parse(data);
            } else {
                parsed = data;
            }
        } catch (error) {
            console.error(`[Nostr] Failed to parse relay message:`, error);
            return;
        }
        
        if (!Array.isArray(parsed)) return;
        
        const [type, ...rest] = parsed;
        
        switch (type) {
            case 'EVENT':
                const [subId, event] = rest;
                this.handleEvent(event, subId, relayUrl);
                break;
                
            case 'EOSE':
                const [eoseSubId] = rest;
                this.handleEOSE(eoseSubId, relayUrl);
                break;
                
            case 'NOTICE':
                const [notice] = rest;
                console.log(`[Nostr] Notice from ${relayUrl}:`, notice);
                break;
                
            case 'OK':
                const [eventId, success, message] = rest;
                this.handleOK(eventId, success, message, relayUrl);
                break;
                
            default:
                console.log(`[Nostr] Unknown message type from ${relayUrl}:`, type, rest);
        }
    },
    
    // Handle EVENT message
    handleEvent: function(event, subId, relayUrl) {
        if (!event || !event.pubkey) return;
        
        // Find subscription
        const sub = this.subscriptions.get(subId);
        if (sub && sub.handlers.event.length > 0) {
            // Call event handlers
            for (const handler of sub.handlers.event) {
                handler(event);
            }
        }
        
        // Process event based on kind
        this.processEvent(event, relayUrl);
    },
    
    // Handle EOSE (End of Stored Events) message
    handleEOSE: function(subId, relayUrl) {
        const sub = this.subscriptions.get(subId);
        if (sub && sub.handlers.eose.length > 0) {
            // Call EOSE handlers
            for (const handler of sub.handlers.eose) {
                handler();
            }
        }
    },
    
    // Handle OK message
    handleOK: function(eventId, success, message, relayUrl) {
        if (success) {
            console.log(`[Nostr] Event ${eventId} published successfully to ${relayUrl}`);
        } else {
            console.error(`[Nostr] Failed to publish event ${eventId} to ${relayUrl}: ${message}`);
        }
    },
    
    // Process event based on kind
    processEvent: function(event, relayUrl) {
        // Create user entry if not exists
        if (!this.users.has(event.pubkey)) {
            // Generate a semi-deterministic position for new users
            const hash = CryptoJS.SHA256(event.pubkey).toString();
            const x = parseInt(hash.substring(0, 8), 16) % Game.world.width;
            const y = parseInt(hash.substring(8, 16), 16) % Game.world.height;
            
            this.users.set(event.pubkey, {
                pubkey: event.pubkey,
                profile: null,
                x, y,
                notes: [],
                score: 0,
                itemsCollected: 0,
                questsCompleted: 0,
                following: new Set(),
                followers: new Set(),
                lastSeen: Date.now(),
                bobOffset: 0
            });
        }
        
        const user = this.users.get(event.pubkey);
        
        // Process based on kind
        switch (event.kind) {
            // Profile metadata (kind 0)
            case 0:
                this.handleProfileEvent(event, user);
                break;
                
            // Regular note (kind 1)
            case 1:
                this.handleNoteEvent(event, user);
                break;
                
            // Contacts/following list (kind 3)
            case 3:
                this.handleContactsEvent(event, user);
                break;
                
            // General-purpose chat messages (NIP-C7)
            case 9:
                this.handleChatEvent(event, user);
                break;
                
            // Encrypted direct messages (kind 4)
            case 4:
                this.handleDirectMessageEvent(event, user);
                break;
                
            // Long-form content (kind 30023)
            case 30023:
                this.handleLongFormEvent(event, user);
                break;
                
            // Custom game events
            case 30001: // Position updates
                this.handlePositionEvent(event, user);
                break;
                
            // Custom score events
            case 30002:
                this.handleScoreEvent(event, user);
                break;
        }
    },
    
    // Handle profile metadata event (kind 0)
    handleProfileEvent: function(event, user) {
        try {
            const profile = JSON.parse(event.content);
            
            user.profile = {
                name: profile.name || profile.display_name || user.pubkey.slice(0, 8),
                picture: profile.picture || null,
                about: profile.about || "",
                website: profile.website || "",
                nip05: profile.nip05 || null,
                lud16: profile.lud16 || profile.lightning_address || null,
                banner: profile.banner || null
            };
            
            console.log(`[Nostr] Updated profile for ${user.pubkey.slice(0, 8)}`);
            
            // Update UI if this is the current player
            if (user.pubkey === Player.pubkey) {
                Player.profile = user.profile;
                UI.updatePlayerProfile();
            }
            
            // Update UI if showing this user
            const userPopup = document.getElementById('user-popup');
            if (userPopup && userPopup.dataset.pubkey === user.pubkey) {
                UI.updateUserPopup(user.pubkey);
            }
            
            // Update leaderboard
            UI.updateLeaderboard();
            
        } catch (error) {
            console.error(`[Nostr] Failed to parse profile:`, error);
        }
    },
    
    // Handle note event (kind 1)
    handleNoteEvent: function(event, user) {
        // Add to user's notes
        user.notes.unshift({
            id: event.id,
            content: event.content,
            created_at: event.created_at,
            tags: event.tags
        });
        
        // Limit to 20 most recent notes
        if (user.notes.length > 20) {
            user.notes.pop();
        }
        
        // Update UI if showing this user
        const userPopup = document.getElementById('user-popup');
        if (userPopup && userPopup.dataset.pubkey === user.pubkey) {
            UI.updateUserNotes(user.pubkey);
        }
    },
    
    // Handle contacts/following list event (kind 3)
    handleContactsEvent: function(event, user) {
        // Parse followed pubkeys from tags
        user.following = new Set();
        
        for (const tag of event.tags) {
            if (tag[0] === 'p' && tag[1]) {
                user.following.add(tag[1]);
                
                // Add as follower to the followed user
                if (this.users.has(tag[1])) {
                    this.users.get(tag[1]).followers.add(user.pubkey);
                }
            }
        }
        
        console.log(`[Nostr] Updated contacts for ${user.pubkey.slice(0, 8)}: ${user.following.size} following`);
        
        // Update follow button if showing this user
        if (document.getElementById('user-popup').dataset.pubkey === user.pubkey) {
            UI.updateFollowButton(user.pubkey);
        }
    },
    
    // Handle chat message (kind 9)
    handleChatEvent: function(event, user) {
        // Add to global chat
        if (user.pubkey !== Player.pubkey) {
            const username = user.profile?.name || user.pubkey.slice(0, 8);
            UI.addChatMessage(username, event.content);
            
            // Play notification sound if message is recent
            if (Date.now() / 1000 - event.created_at < 5) {
                UI.playSound("chat");
            }
        }
    },
    
    // Handle direct message event (kind 4)
    handleDirectMessageEvent: function(event, user) {
        // Only process if addressed to current player
        const recipientTag = event.tags.find(tag => tag[0] === 'p' && tag[1] === Player.pubkey);
        if (!recipientTag) return;
        
        // Try to decrypt message
        this.decryptMessage(event.content, user.pubkey)
            .then(decrypted => {
                if (!decrypted) return;
                
                const username = user.profile?.name || user.pubkey.slice(0, 8);
                
                // Add to direct message UI if open
                if (document.getElementById('user-popup').dataset.pubkey === user.pubkey) {
                    UI.addDirectMessage(username, decrypted, false);
                } else {
                    // Show notification
                    UI.showToast(`New message from ${username}`, "info");
                    
                    // Play notification sound
                    UI.playSound("chat");
                }
            })
            .catch(error => {
                console.error(`[Nostr] Failed to decrypt message:`, error);
            });
    },
    
    // Handle long-form content event (kind 30023)
    handleLongFormEvent: function(event, user) {
        // Process long-form content (blog posts, articles)
        // For now, just add to notes
        this.handleNoteEvent(event, user);
    },
    
    // Handle position update event (kind 30001)
    handlePositionEvent: function(event, user) {
        try {
            const position = JSON.parse(event.content);
            
            if (position.x !== undefined && position.y !== undefined) {
                user.x = position.x;
                user.y = position.y;
                user.lastSeen = Date.now();
            }
        } catch (error) {
            console.error(`[Nostr] Failed to parse position update:`, error);
        }
    },
    
    // Handle score update event (kind 30002)
    handleScoreEvent: function(event, user) {
        try {
            const data = JSON.parse(event.content);
            
            if (data.score !== undefined) {
                user.score = data.score;
            }
            
            if (data.itemsCollected !== undefined) {
                user.itemsCollected = data.itemsCollected;
            }
            
            if (data.questsCompleted !== undefined) {
                user.questsCompleted = data.questsCompleted;
            }
            
            // Update UI if this is the current player
            if (user.pubkey === Player.pubkey && data.score !== undefined) {
                Player.score = data.score;
                UI.updatePlayerProfile();
            }
            
            // Update leaderboard
            UI.updateLeaderboard();
            
        } catch (error) {
            console.error(`[Nostr] Failed to parse score update:`, error);
        }
    },
    
    // Sign an event
    signEvent: async function(event) {
        try {
            // Add missing fields
            if (!event.created_at) {
                event.created_at = Math.floor(Date.now() / 1000);
            }
            if (!event.pubkey) {
                event.pubkey = Player.pubkey;
            }
            
            // Sign using extension
            return await window.nostr.signEvent(event);
        } catch (error) {
            console.error(`[Nostr] Failed to sign event:`, error);
            throw error;
        }
    },
    
    // Publish an event to a relay
    publishEvent: async function(relay, event) {
        try {
            const signedEvent = await this.signEvent(event);
            await relay.publish(signedEvent);
            return signedEvent;
        } catch (error) {
            console.error(`[Nostr] Failed to publish event:`, error);
            throw error;
        }
    },
    
    // Publish an event to all connected relays
    publishToAll: async function(event) {
        try {
            const signedEvent = await this.signEvent(event);
            
            const publishPromises = [];
            for (const [url, relay] of this.relayConnections) {
                if (relay.readyState === WebSocket.OPEN) {
                    publishPromises.push(relay.publish(signedEvent));
                }
            }
            
            await Promise.allSettled(publishPromises);
            return signedEvent;
        } catch (error) {
            console.error(`[Nostr] Failed to publish event to all relays:`, error);
            throw error;
        }
    },
    
    // Subscribe to events from a relay
    subscribe: function(relay, filters, onEvent, onEOSE) {
        try {
            const sub = relay.sub(filters);
            
            sub.on('event', onEvent);
            if (onEOSE) {
                sub.on('eose', onEOSE);
            }
            
            return sub;
        } catch (error) {
            console.error(`[Nostr] Failed to subscribe:`, error);
            throw error;
        }
    },
    
    // Close a relay connection
    closeRelay: function(url) {
        const relay = this.relayConnections.get(url);
        if (relay) {
            relay.close();
            this.relayConnections.delete(url);
            this.relays.delete(url);
            console.log(`[Nostr] Closed relay connection: ${url}`);
        }
    },
    
    // Close all relay connections
    closeAllRelays: function() {
        for (const [url, relay] of this.relayConnections) {
            relay.close();
        }
        
        this.relayConnections.clear();
        console.log(`[Nostr] Closed all relay connections`);
    },
    
    // Set active relay
    setActiveRelay: function(url) {
        if (this.relays.has(url)) {
            this.activeRelay = url;
            console.log(`[Nostr] Set active relay to ${url}`);
            
            // Update UI
            UI.updateRelaySelector();
            
            // Fetch events from active relay
            this.fetchFromActiveRelay();
            
            return true;
        }
        
        return false;
    },
    
    // Fetch events from active relay
    fetchFromActiveRelay: function() {
        const relay = this.relayConnections.get(this.activeRelay);
        if (!relay) return;
        
        // Subscribe to recent events
        const since = Math.floor(Date.now() / 1000) - 3600; // Last hour
        const filters = [{
            kinds: Array.from(Game.subscribedKinds),
            since
        }];
        
        this.subscribe(relay, filters, 
            (event) => this.processEvent(event, this.activeRelay),
            () => console.log(`[Nostr] EOSE from ${this.activeRelay}`)
        );
    },
    
    // Load player profile
    loadPlayerProfile: async function() {
        try {
            // Request profile from relays
            const filters = [{ kinds: [0], authors: [Player.pubkey], limit: 1 }];
            
            for (const [url, relay] of this.relayConnections) {
                this.subscribe(relay, filters, 
                    (event) => this.processEvent(event, url),
                    () => {} // EOSE handler
                );
            }
            
            // Also request contacts
            const contactsFilters = [{ kinds: [3], authors: [Player.pubkey], limit: 1 }];
            
            for (const [url, relay] of this.relayConnections) {
                this.subscribe(relay, contactsFilters, 
                    (event) => this.processEvent(event, url),
                    () => {} // EOSE handler
                );
            }
            
            // Wait a bit for events to come in
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to load player profile:`, error);
            throw error;
        }
    },
    
    // Subscribe to profiles
    subscribeToProfiles: function() {
        for (const [url, relay] of this.relayConnections) {
            // Subscribe to all profile updates
            const filters = [{ kinds: [0], limit: 100 }];
            
            this.subscribe(relay, filters, 
                (event) => this.processEvent(event, url),
                () => {} // EOSE handler
            );
        }
    },
    
    // Subscribe to notes and other events
    subscribeToEvents: function() {
        for (const [url, relay] of this.relayConnections) {
            // Subscribe to all relevant events
            const filters = [{
                kinds: Array.from(Game.subscribedKinds),
                limit: 100
            }];
            
            this.subscribe(relay, filters, 
                (event) => this.processEvent(event, url),
                () => {} // EOSE handler
            );
        }
    },
    
    // Encrypt a message using NIP-04
    encryptMessage: async function(recipientPubkey, message) {
        try {
            return await window.nostr.nip04.encrypt(recipientPubkey, message);
        } catch (error) {
            console.error(`[Nostr] Failed to encrypt message:`, error);
            throw error;
        }
    },
    
    // Decrypt a message using NIP-04
    decryptMessage: async function(encryptedMessage, senderPubkey) {
        try {
            return await window.nostr.nip04.decrypt(senderPubkey, encryptedMessage);
        } catch (error) {
            console.error(`[Nostr] Failed to decrypt message:`, error);
            throw error;
        }
    },
    
    // Publish a player position update
    publishPlayerPosition: function(x, y) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30001,
            content: JSON.stringify({ x, y }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to active relay only to reduce spam
        const relay = this.relayConnections.get(this.activeRelay);
        if (relay) {
            this.publishEvent(relay, event).catch(error => {
                console.error(`[Nostr] Failed to publish position:`, error);
            });
        }
    },
    
    // Publish a chat message
    publishChatMessage: function(message) {
        if (!Player.pubkey || !message) return;
        
        const event = {
            kind: 9, // Using NIP-C7 for chat
            content: message,
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to all relays for chat
        this.publishToAll(event).catch(error => {
            console.error(`[Nostr] Failed to publish chat:`, error);
            UI.showToast("Failed to send message", "error");
        });
        
        return true;
    },
    
    // Publish a direct message
    publishDirectMessage: async function(recipientPubkey, message) {
        if (!Player.pubkey || !recipientPubkey || !message) return;
        
        try {
            // Encrypt the message
            const encrypted = await this.encryptMessage(recipientPubkey, message);
            
            const event = {
                kind: 4,
                content: encrypted,
                tags: [['p', recipientPubkey]],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: Player.pubkey
            };
            
            // Publish to all relays
            await this.publishToAll(event);
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to publish direct message:`, error);
            UI.showToast("Failed to send direct message", "error");
            return false;
        }
    },
    
    // Publish a score update
    publishScoreEvent: function() {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30002,
            content: JSON.stringify({
                score: Player.score,
                itemsCollected: Player.itemsCollected,
                questsCompleted: Player.completedQuests.length
            }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to all relays
        this.publishToAll(event).catch(error => {
            console.error(`[Nostr] Failed to publish score:`, error);
        });
    },
    
    // Publish an item collection event
    publishItemCollectionEvent: function(itemId) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30003,
            content: JSON.stringify({ itemId }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to active relay only
        const relay = this.relayConnections.get(this.activeRelay);
        if (relay) {
            this.publishEvent(relay, event).catch(error => {
                console.error(`[Nostr] Failed to publish item collection:`, error);
            });
        }
    },
    
    // Publish a quest event
    publishQuestEvent: function(action, questId, reward) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30004,
            content: JSON.stringify({ 
                action, 
                questId,
                reward: reward || 0
            }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to all relays
        this.publishToAll(event).catch(error => {
            console.error(`[Nostr] Failed to publish quest event:`, error);
        });
    },
    
    // Publish a weather event
    publishWeatherEvent: function(weatherType) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30005,
            content: JSON.stringify({ type: weatherType }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to all relays
        this.publishToAll(event).catch(error => {
            console.error(`[Nostr] Failed to publish weather event:`, error);
        });
    },
    
    // Publish a portal event
    publishPortalEvent: function(portalId) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30006,
            content: JSON.stringify({ portalId }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to active relay only
        const relay = this.relayConnections.get(this.activeRelay);
        if (relay) {
            this.publishEvent(relay, event).catch(error => {
                console.error(`[Nostr] Failed to publish portal event:`, error);
            });
        }
    },
    
    // Publish a treasure event
    publishTreasureEvent: function(action, treasureId) {
        if (!Player.pubkey) return;
        
        const event = {
            kind: 30007,
            content: JSON.stringify({ action, treasureId }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: Player.pubkey
        };
        
        // Publish to all relays
        this.publishToAll(event).catch(error => {
            console.error(`[Nostr] Failed to publish treasure event:`, error);
        });
    },
    
    // Follow a user
    followUser: async function(pubkey) {
        if (!Player.pubkey || !pubkey) return false;
        
        try {
            // Get current contacts
            const user = this.users.get(Player.pubkey);
            if (!user) return false;
            
            // Create a new Set with all current follows
            const follows = new Set(user.following);
            
            // Add the new pubkey
            follows.add(pubkey);
            
            // Create tag array for each followed pubkey
            const tags = Array.from(follows).map(pk => ['p', pk]);
            
            // Create event
            const event = {
                kind: 3,
                content: "",
                tags,
                created_at: Math.floor(Date.now() / 1000),
                pubkey: Player.pubkey
            };
            
            // Publish to all relays
            await this.publishToAll(event);
            
            // Update local state
            user.following = follows;
            
            // Add current player as follower to followed user
            if (this.users.has(pubkey)) {
                this.users.get(pubkey).followers.add(Player.pubkey);
            }
            
            // Update player stats
            Player.follows++;
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to follow user:`, error);
            return false;
        }
    },
    
    // Unfollow a user
    unfollowUser: async function(pubkey) {
        if (!Player.pubkey || !pubkey) return false;
        
        try {
            // Get current contacts
            const user = this.users.get(Player.pubkey);
            if (!user) return false;
            
            // Create a new Set with all current follows
            const follows = new Set(user.following);
            
            // Remove the pubkey
            follows.delete(pubkey);
            
            // Create tag array for each followed pubkey
            const tags = Array.from(follows).map(pk => ['p', pk]);
            
            // Create event
            const event = {
                kind: 3,
                content: "",
                tags,
                created_at: Math.floor(Date.now() / 1000),
                pubkey: Player.pubkey
            };
            
            // Publish to all relays
            await this.publishToAll(event);
            
            // Update local state
            user.following = follows;
            
            // Remove current player as follower from unfollowed user
            if (this.users.has(pubkey)) {
                this.users.get(pubkey).followers.delete(Player.pubkey);
            }
            
            return true;
        } catch (error) {
            console.error(`[Nostr] Failed to unfollow user:`, error);
            return false;
        }
    },
    
    // Check if current player is following a user
    isFollowing: function(pubkey) {
        if (!Player.pubkey || !pubkey) return false;
        
        const user = this.users.get(Player.pubkey);
        if (!user) return false;
        
        return user.following.has(pubkey);
    },
    
    // Get a user by pubkey
    getUser: function(pubkey) {
        return this.users.get(pubkey);
    },
    
    // Get nearby users to player
    getNearbyUsers: function(range = RelayWorld.config.INTERACTION_RANGE) {
        const nearby = [];
        
        for (const [pubkey, user] of this.users) {
            if (pubkey === Player.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(Player.x - user.x, 2) + 
                Math.pow(Player.y - user.y, 2)
            );
            
            if (distance <= range) {
                nearby.push({
                    pubkey,
                    user,
                    distance
                });
            }
        }
        
        // Sort by distance
        nearby.sort((a, b) => a.distance - b.distance);
        
        return nearby;
    }
};
