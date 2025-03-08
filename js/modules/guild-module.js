/**
 * guild-module.js
 * Guild system for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';
import { NostrUtils } from '../utils/nostr-utils.js';
import { CryptoUtils } from '../utils/crypto-utils.js';

export const GuildModule = {
    // Module metadata
    name: "guild",
    description: "Guild system for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "player", "utils"],
    priority: 40, // Load after core modules
    critical: false, // Not a critical module
    
    // Module state
    initialized: false,
    guilds: new Map(), // Map of guild ID -> guild data
    memberGuilds: new Map(), // Map of pubkey -> array of guild IDs
    invitations: new Map(), // Map of pubkey -> array of guild invitations
    
    // Guild event kinds
    EVENT_KINDS: {
        GUILD_CREATE: 420013,
        GUILD_UPDATE: 420014,
        GUILD_JOIN: 420015,
        GUILD_LEAVE: 420016,
        GUILD_INVITE: 420017,
        GUILD_MESSAGE: 420018
    },
    
    // Guild ranks
    RANKS: {
        LEADER: 0,
        OFFICER: 1,
        MEMBER: 2
    },
    
    // Initialize guild module
    init: async function() {
        console.log("[Guild] Initializing guild module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Check if guilds feature is enabled
        const enabled = RelayWorldCore.getConfig('ENABLE_GUILDS', false);
        if (!enabled) {
            console.log("[Guild] Guild system disabled by configuration");
            return true; // Still return true as this is not a critical module
        }
        
        // Subscribe to guild events
        await this._subscribeToGuildEvents();
        
        this.initialized = true;
        console.log("[Guild] Guild module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for login events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        
        // Listen for nostr events
        RelayWorldCore.eventBus.on('nostr:gameEvent', this.handleNostrEvent.bind(this));
        
        // Listen for UI events
        RelayWorldCore.eventBus.on('ui:createGuild', this.createGuild.bind(this));
        RelayWorldCore.eventBus.on('ui:joinGuild', this.joinGuild.bind(this));
        RelayWorldCore.eventBus.on('ui:leaveGuild', this.leaveGuild.bind(this));
        RelayWorldCore.eventBus.on('ui:inviteToGuild', this.inviteToGuild.bind(this));
    },
    
    // Subscribe to guild events
    _subscribeToGuildEvents: async function() {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.relayConnections.game) {
            console.error("[Guild] Nostr module or game relay not available");
            return false;
        }
        
        console.log("[Guild] Subscribing to guild events...");
        
        try {
            // Subscribe to all guild events
            const filters = [{
                kinds: [
                    this.EVENT_KINDS.GUILD_CREATE,
                    this.EVENT_KINDS.GUILD_UPDATE,
                    this.EVENT_KINDS.GUILD_JOIN,
                    this.EVENT_KINDS.GUILD_LEAVE,
                    this.EVENT_KINDS.GUILD_INVITE,
                    this.EVENT_KINDS.GUILD_MESSAGE
                ],
                limit: 100
            }];
            
            // Create subscription
            const sub = nostrModule.relayConnections.game.sub(filters);
            
            // Handle events
            sub.on('event', (event) => {
                this.processGuildEvent(event);
            });
            
            console.log("[Guild] Subscribed to guild events");
            return true;
        } catch (error) {
            console.error("[Guild] Failed to subscribe to guild events:", error);
            return false;
        }
    },
    
    // Handle login event
    handleLogin: async function(data) {
        console.log("[Guild] Handling login...");
        
        try {
            const pubkey = data.pubkey;
            
            // Load player's guilds
            await this.loadPlayerGuilds(pubkey);
            
            // Load guild invitations
            await this.loadGuildInvitations(pubkey);
            
            console.log("[Guild] Login handling complete");
            return true;
        } catch (error) {
            console.error("[Guild] Failed to handle login:", error);
            return false;
        }
    },
    
    // Handle Nostr event
    handleNostrEvent: function(data) {
        const { event } = data;
        
        // Process guild events
        if (Object.values(this.EVENT_KINDS).includes(event.kind)) {
            this.processGuildEvent(event);
        }
    },
    
    // Process a guild event
    processGuildEvent: function(event) {
        try {
            // Handler based on event kind
            switch (event.kind) {
                case this.EVENT_KINDS.GUILD_CREATE:
                    this.handleGuildCreate(event);
                    break;
                case this.EVENT_KINDS.GUILD_UPDATE:
                    this.handleGuildUpdate(event);
                    break;
                case this.EVENT_KINDS.GUILD_JOIN:
                    this.handleGuildJoin(event);
                    break;
                case this.EVENT_KINDS.GUILD_LEAVE:
                    this.handleGuildLeave(event);
                    break;
                case this.EVENT_KINDS.GUILD_INVITE:
                    this.handleGuildInvite(event);
                    break;
                case this.EVENT_KINDS.GUILD_MESSAGE:
                    this.handleGuildMessage(event);
                    break;
                default:
                    console.warn(`[Guild] Unknown guild event kind: ${event.kind}`);
            }
        } catch (error) {
            console.error("[Guild] Failed to process guild event:", error);
        }
    },
    
    // Handle guild create event
    handleGuildCreate: function(event) {
        try {
            // Parse guild data
            const guildData = JSON.parse(event.content);
            
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild create event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild already exists
            if (this.guilds.has(guildId)) {
                console.warn(`[Guild] Guild ${guildId} already exists, ignoring create event`);
                return;
            }
            
            // Create guild object
            const guild = {
                id: guildId,
                name: guildData.name,
                description: guildData.description,
                icon: guildData.icon,
                leader: event.pubkey,
                officers: [],
                members: [event.pubkey], // Leader is automatically a member
                created_at: event.created_at,
                updated_at: event.created_at,
                visibility: guildData.visibility || 'public'
            };
            
            // Add to guilds map
            this.guilds.set(guildId, guild);
            
            // Add to member guilds
            this.addMemberToGuild(event.pubkey, guildId, this.RANKS.LEADER);
            
            console.log(`[Guild] Created guild: ${guild.name} (${guildId})`);
            
            // Emit guild created event
            RelayWorldCore.eventBus.emit('guild:created', { guild });
        } catch (error) {
            console.error("[Guild] Failed to handle guild create event:", error);
        }
    },
    
    // Handle guild update event
    handleGuildUpdate: function(event) {
        try {
            // Parse guild data
            const updateData = JSON.parse(event.content);
            
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild update event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                console.warn(`[Guild] Cannot update non-existent guild: ${guildId}`);
                return;
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if sender has permission (leader or officer)
            const memberRank = this.getMemberRank(event.pubkey, guildId);
            if (memberRank !== this.RANKS.LEADER && memberRank !== this.RANKS.OFFICER) {
                console.warn(`[Guild] User ${event.pubkey} does not have permission to update guild ${guildId}`);
                return;
            }
            
            // Update guild properties
            if (updateData.name) guild.name = updateData.name;
            if (updateData.description) guild.description = updateData.description;
            if (updateData.icon) guild.icon = updateData.icon;
            if (updateData.visibility) guild.visibility = updateData.visibility;
            
            // Update timestamp
            guild.updated_at = event.created_at;
            
            console.log(`[Guild] Updated guild: ${guild.name} (${guildId})`);
            
            // Emit guild updated event
            RelayWorldCore.eventBus.emit('guild:updated', { guild });
        } catch (error) {
            console.error("[Guild] Failed to handle guild update event:", error);
        }
    },
    
    // Handle guild join event
    handleGuildJoin: function(event) {
        try {
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild join event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                console.warn(`[Guild] Cannot join non-existent guild: ${guildId}`);
                return;
            }
            
            const guild = this.guilds.get(guildId);
            
            // Add member to guild
            this.addMemberToGuild(event.pubkey, guildId, this.RANKS.MEMBER);
            
            console.log(`[Guild] User ${event.pubkey.substring(0, 8)} joined guild: ${guild.name} (${guildId})`);
            
            // Emit guild joined event
            RelayWorldCore.eventBus.emit('guild:joined', { 
                guild,
                pubkey: event.pubkey
            });
        } catch (error) {
            console.error("[Guild] Failed to handle guild join event:", error);
        }
    },
    
    // Handle guild leave event
    handleGuildLeave: function(event) {
        try {
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild leave event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                console.warn(`[Guild] Cannot leave non-existent guild: ${guildId}`);
                return;
            }
            
            const guild = this.guilds.get(guildId);
            
            // Remove member from guild
            this.removeMemberFromGuild(event.pubkey, guildId);
            
            console.log(`[Guild] User ${event.pubkey.substring(0, 8)} left guild: ${guild.name} (${guildId})`);
            
            // Emit guild left event
            RelayWorldCore.eventBus.emit('guild:left', { 
                guild,
                pubkey: event.pubkey
            });
            
            // If leader leaves, transfer leadership or disband guild
            if (guild.leader === event.pubkey) {
                this.handleLeaderLeave(guild);
            }
        } catch (error) {
            console.error("[Guild] Failed to handle guild leave event:", error);
        }
    },
    
    // Handle guild invite event
    handleGuildInvite: function(event) {
        try {
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild invite event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                console.warn(`[Guild] Cannot invite to non-existent guild: ${guildId}`);
                return;
            }
            
            const guild = this.guilds.get(guildId);
            
            // Get inviter rank
            const inviterRank = this.getMemberRank(event.pubkey, guildId);
            if (inviterRank !== this.RANKS.LEADER && inviterRank !== this.RANKS.OFFICER) {
                console.warn(`[Guild] User ${event.pubkey} does not have permission to invite to guild ${guildId}`);
                return;
            }
            
            // Get invited pubkey from p tag
            const invitedTag = event.tags.find(tag => tag[0] === 'p');
            if (!invitedTag) {
                console.warn("[Guild] Guild invite event missing p tag");
                return;
            }
            
            const invitedPubkey = invitedTag[1];
            
            // Check if already a member
            if (guild.members.includes(invitedPubkey)) {
                console.warn(`[Guild] User ${invitedPubkey} is already a member of guild ${guildId}`);
                return;
            }
            
            // Add to invitations
            if (!this.invitations.has(invitedPubkey)) {
                this.invitations.set(invitedPubkey, []);
            }
            
            // Create invitation object
            const invitation = {
                guildId,
                guildName: guild.name,
                inviter: event.pubkey,
                timestamp: event.created_at
            };
            
            this.invitations.get(invitedPubkey).push(invitation);
            
            console.log(`[Guild] User ${invitedPubkey.substring(0, 8)} invited to guild: ${guild.name} (${guildId})`);
            
            // Emit guild invite event
            RelayWorldCore.eventBus.emit('guild:invited', { 
                guild,
                inviter: event.pubkey,
                invited: invitedPubkey
            });
            
            // Show notification if this is for the current user
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule && playerModule.pubkey === invitedPubkey) {
                // Notify the player of the invitation
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.showToast) {
                    uiModule.showToast(`You've been invited to join the guild "${guild.name}"!`, "info");
                }
            }
        } catch (error) {
            console.error("[Guild] Failed to handle guild invite event:", error);
        }
    },
    
    // Handle guild message event
    handleGuildMessage: function(event) {
        try {
            // Get guild ID from d tag
            const guildIdTag = event.tags.find(tag => tag[0] === 'd');
            if (!guildIdTag) {
                console.warn("[Guild] Guild message event missing d tag");
                return;
            }
            
            const guildId = guildIdTag[1];
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                console.warn(`[Guild] Cannot send message to non-existent guild: ${guildId}`);
                return;
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if sender is a member
            if (!guild.members.includes(event.pubkey)) {
                console.warn(`[Guild] Non-member ${event.pubkey} cannot send message to guild ${guildId}`);
                return;
            }
            
            // Create message object
            const message = {
                id: event.id,
                sender: event.pubkey,
                content: event.content,
                timestamp: event.created_at
            };
            
            console.log(`[Guild] Message sent to guild: ${guild.name} (${guildId})`);
            
            // Emit guild message event
            RelayWorldCore.eventBus.emit('guild:message', { 
                guild,
                message
            });
        } catch (error) {
            console.error("[Guild] Failed to handle guild message event:", error);
        }
    },
    
    // Create a new guild
    createGuild: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { name, description, icon, visibility } = data;
            
            // Generate guild ID
            const guildId = CryptoUtils.randomId('guild_');
            
            console.log(`[Guild] Creating guild: ${name} (${guildId})`);
            
            // Create guild data
            const guildData = {
                name,
                description,
                icon,
                visibility: visibility || 'public'
            };
            
            // Create guild creation event
            const event = {
                kind: this.EVENT_KINDS.GUILD_CREATE,
                content: JSON.stringify(guildData),
                tags: [["d", guildId], ["t", "guild"]],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Locally add the guild immediately
            const guild = {
                id: guildId,
                name,
                description,
                icon,
                leader: nostrModule.currentUser.pubkey,
                officers: [],
                members: [nostrModule.currentUser.pubkey],
                created_at: event.created_at,
                updated_at: event.created_at,
                visibility: visibility || 'public'
            };
            
            this.guilds.set(guildId, guild);
            this.addMemberToGuild(nostrModule.currentUser.pubkey, guildId, this.RANKS.LEADER);
            
            // Emit guild created event
            RelayWorldCore.eventBus.emit('guild:created', { guild });
            
            return guild;
        } catch (error) {
            console.error("[Guild] Failed to create guild:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to create guild: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Join a guild
    joinGuild: async function(guildId) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if already a member
            if (guild.members.includes(nostrModule.currentUser.pubkey)) {
                throw new Error(`Already a member of guild ${guild.name}`);
            }
            
            // If the guild is private, check if player has an invitation
            if (guild.visibility === 'private') {
                const hasInvitation = this.hasInvitation(nostrModule.currentUser.pubkey, guildId);
                if (!hasInvitation) {
                    throw new Error(`Cannot join private guild ${guild.name} without an invitation`);
                }
            }
            
            console.log(`[Guild] Joining guild: ${guild.name} (${guildId})`);
            
            // Create guild join event
            const event = {
                kind: this.EVENT_KINDS.GUILD_JOIN,
                content: "",
                tags: [["d", guildId], ["t", "guild"]],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Locally add the player to the guild immediately
            this.addMemberToGuild(nostrModule.currentUser.pubkey, guildId, this.RANKS.MEMBER);
            
            // Remove invitation if exists
            this.removeInvitation(nostrModule.currentUser.pubkey, guildId);
            
            // Emit guild joined event
            RelayWorldCore.eventBus.emit('guild:joined', { 
                guild,
                pubkey: nostrModule.currentUser.pubkey
            });
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to join guild:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to join guild: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Leave a guild
    leaveGuild: async function(guildId) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if a member
            if (!guild.members.includes(nostrModule.currentUser.pubkey)) {
                throw new Error(`Not a member of guild ${guild.name}`);
            }
            
            console.log(`[Guild] Leaving guild: ${guild.name} (${guildId})`);
            
            // Create guild leave event
            const event = {
                kind: this.EVENT_KINDS.GUILD_LEAVE,
                content: "",
                tags: [["d", guildId], ["t", "guild"]],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Locally remove the player from the guild immediately
            this.removeMemberFromGuild(nostrModule.currentUser.pubkey, guildId);
            
            // Emit guild left event
            RelayWorldCore.eventBus.emit('guild:left', { 
                guild,
                pubkey: nostrModule.currentUser.pubkey
            });
            
            // If player is the leader, handle leadership transfer or guild disbanding
            if (guild.leader === nostrModule.currentUser.pubkey) {
                this.handleLeaderLeave(guild);
            }
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to leave guild:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to leave guild: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Invite a player to a guild
    inviteToGuild: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { guildId, pubkey } = data;
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if inviter has permission (leader or officer)
            const inviterRank = this.getMemberRank(nostrModule.currentUser.pubkey, guildId);
            if (inviterRank !== this.RANKS.LEADER && inviterRank !== this.RANKS.OFFICER) {
                throw new Error(`You don't have permission to invite to guild ${guild.name}`);
            }
            
            // Check if already a member
            if (guild.members.includes(pubkey)) {
                throw new Error(`User is already a member of guild ${guild.name}`);
            }
            
            console.log(`[Guild] Inviting ${pubkey.substring(0, 8)} to guild: ${guild.name} (${guildId})`);
            
            // Create guild invite event
            const event = {
                kind: this.EVENT_KINDS.GUILD_INVITE,
                content: "",
                tags: [
                    ["d", guildId], 
                    ["p", pubkey],
                    ["t", "guild"]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Locally add invitation immediately
            if (!this.invitations.has(pubkey)) {
                this.invitations.set(pubkey, []);
            }
            
            const invitation = {
                guildId,
                guildName: guild.name,
                inviter: nostrModule.currentUser.pubkey,
                timestamp: event.created_at
            };
            
            this.invitations.get(pubkey).push(invitation);
            
            // Emit guild invite event
            RelayWorldCore.eventBus.emit('guild:invited', { 
                guild,
                inviter: nostrModule.currentUser.pubkey,
                invited: pubkey
            });
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to invite to guild:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to invite to guild: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Send a message to a guild
    sendGuildMessage: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { guildId, content } = data;
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if a member
            if (!guild.members.includes(nostrModule.currentUser.pubkey)) {
                throw new Error(`Not a member of guild ${guild.name}`);
            }
            
            console.log(`[Guild] Sending message to guild: ${guild.name} (${guildId})`);
            
            // Create guild message event
            const event = {
                kind: this.EVENT_KINDS.GUILD_MESSAGE,
                content: content,
                tags: [["d", guildId], ["t", "guild"]],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Create message object
            const message = {
                id: signedEvent.id,
                sender: nostrModule.currentUser.pubkey,
                content: content,
                timestamp: event.created_at
            };
            
            // Emit guild message event
            RelayWorldCore.eventBus.emit('guild:message', { 
                guild,
                message
            });
            
            return message;
        } catch (error) {
            console.error("[Guild] Failed to send guild message:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to send guild message: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
   // Promote a member to officer
    promoteMember: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { guildId, pubkey } = data;
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if leader
            if (guild.leader !== nostrModule.currentUser.pubkey) {
                throw new Error(`Only the guild leader can promote members`);
            }
            
            // Check if target is a member
            if (!guild.members.includes(pubkey)) {
                throw new Error(`User is not a member of the guild`);
            }
            
            // Check if already an officer
            if (guild.officers.includes(pubkey)) {
                throw new Error(`User is already an officer`);
            }
            
            console.log(`[Guild] Promoting ${pubkey.substring(0, 8)} to officer in guild: ${guild.name} (${guildId})`);
            
            // Update guild data
            guild.officers.push(pubkey);
            guild.updated_at = Math.floor(Date.now() / 1000);
            
            // Create guild update event
            const event = {
                kind: this.EVENT_KINDS.GUILD_UPDATE,
                content: JSON.stringify({
                    officers: guild.officers
                }),
                tags: [["d", guildId], ["t", "guild"]],
                created_at: guild.updated_at,
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Emit guild updated event
            RelayWorldCore.eventBus.emit('guild:updated', { guild });
            
            // Emit member promoted event
            RelayWorldCore.eventBus.emit('guild:memberPromoted', { 
                guild,
                pubkey
            });
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to promote member:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to promote member: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Demote an officer to regular member
    demoteMember: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { guildId, pubkey } = data;
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if leader
            if (guild.leader !== nostrModule.currentUser.pubkey) {
                throw new Error(`Only the guild leader can demote officers`);
            }
            
            // Check if target is a member
            if (!guild.members.includes(pubkey)) {
                throw new Error(`User is not a member of the guild`);
            }
            
            // Check if an officer
            if (!guild.officers.includes(pubkey)) {
                throw new Error(`User is not an officer`);
            }
            
            console.log(`[Guild] Demoting ${pubkey.substring(0, 8)} from officer in guild: ${guild.name} (${guildId})`);
            
            // Update guild data
            guild.officers = guild.officers.filter(p => p !== pubkey);
            guild.updated_at = Math.floor(Date.now() / 1000);
            
            // Create guild update event
            const event = {
                kind: this.EVENT_KINDS.GUILD_UPDATE,
                content: JSON.stringify({
                    officers: guild.officers
                }),
                tags: [["d", guildId], ["t", "guild"]],
                created_at: guild.updated_at,
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Emit guild updated event
            RelayWorldCore.eventBus.emit('guild:updated', { guild });
            
            // Emit member demoted event
            RelayWorldCore.eventBus.emit('guild:memberDemoted', { 
                guild,
                pubkey
            });
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to demote officer:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to demote officer: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Transfer guild leadership
    transferLeadership: async function(data) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const { guildId, pubkey } = data;
            
            // Check if guild exists
            if (!this.guilds.has(guildId)) {
                throw new Error(`Guild ${guildId} does not exist`);
            }
            
            const guild = this.guilds.get(guildId);
            
            // Check if leader
            if (guild.leader !== nostrModule.currentUser.pubkey) {
                throw new Error(`Only the guild leader can transfer leadership`);
            }
            
            // Check if target is a member
            if (!guild.members.includes(pubkey)) {
                throw new Error(`User is not a member of the guild`);
            }
            
            console.log(`[Guild] Transferring leadership of guild ${guild.name} (${guildId}) to ${pubkey.substring(0, 8)}`);
            
            // Update guild data
            const oldLeader = guild.leader;
            guild.leader = pubkey;
            
            // Make old leader an officer if not already
            if (!guild.officers.includes(oldLeader)) {
                guild.officers.push(oldLeader);
            }
            
            // Remove new leader from officers if they were one
            guild.officers = guild.officers.filter(p => p !== pubkey);
            
            guild.updated_at = Math.floor(Date.now() / 1000);
            
            // Create guild update event
            const event = {
                kind: this.EVENT_KINDS.GUILD_UPDATE,
                content: JSON.stringify({
                    leader: guild.leader,
                    officers: guild.officers
                }),
                tags: [["d", guildId], ["t", "guild"]],
                created_at: guild.updated_at,
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Emit guild updated event
            RelayWorldCore.eventBus.emit('guild:updated', { guild });
            
            // Emit leadership transferred event
            RelayWorldCore.eventBus.emit('guild:leadershipTransferred', { 
                guild,
                oldLeader,
                newLeader: pubkey
            });
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to transfer guild leadership:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to transfer guild leadership: ${error.message}`, "error");
            }
            
            throw error;
        }
    },
    
    // Handle case when a leader leaves the guild
    handleLeaderLeave: function(guild) {
        // Find a new leader (first officer, or first member if no officers)
        if (guild.officers.length > 0) {
            // Promote first officer to leader
            const newLeader = guild.officers[0];
            guild.leader = newLeader;
            guild.officers = guild.officers.filter(p => p !== newLeader);
            
            console.log(`[Guild] Leader left, promoting officer ${newLeader.substring(0, 8)} to leader`);
            
            // Emit leadership transferred event
            RelayWorldCore.eventBus.emit('guild:leadershipTransferred', { 
                guild,
                oldLeader: null, // Leader already left
                newLeader
            });
        } else if (guild.members.length > 0) {
            // Promote first member to leader
            const newLeader = guild.members[0];
            guild.leader = newLeader;
            
            console.log(`[Guild] Leader left, promoting member ${newLeader.substring(0, 8)} to leader`);
            
            // Emit leadership transferred event
            RelayWorldCore.eventBus.emit('guild:leadershipTransferred', { 
                guild,
                oldLeader: null, // Leader already left
                newLeader
            });
        } else {
            // No members left, disband the guild
            console.log(`[Guild] Last member left, disbanding guild ${guild.name} (${guild.id})`);
            this.guilds.delete(guild.id);
            
            // Emit guild disbanded event
            RelayWorldCore.eventBus.emit('guild:disbanded', { guild });
        }
    },
    
    // Load player's guilds
    loadPlayerGuilds: async function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.relayConnections.game) {
            console.error("[Guild] Nostr module or game relay not available");
            return false;
        }
        
        console.log(`[Guild] Loading guilds for player ${pubkey.substring(0, 8)}...`);
        
        try {
            // Get all guilds the player is a member of
            const memberGuilds = [];
            
            for (const [guildId, guild] of this.guilds.entries()) {
                if (guild.members.includes(pubkey)) {
                    memberGuilds.push(guildId);
                }
            }
            
            // Set member guilds
            this.memberGuilds.set(pubkey, memberGuilds);
            
            console.log(`[Guild] Loaded ${memberGuilds.length} guilds for player ${pubkey.substring(0, 8)}`);
            return true;
        } catch (error) {
            console.error("[Guild] Failed to load player guilds:", error);
            return false;
        }
    },
    
    // Load guild invitations for a player
    loadGuildInvitations: async function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.relayConnections.game) {
            console.error("[Guild] Nostr module or game relay not available");
            return false;
        }
        
        console.log(`[Guild] Loading guild invitations for player ${pubkey.substring(0, 8)}...`);
        
        try {
            // Create subscription for guild invites
            const filters = [{
                kinds: [this.EVENT_KINDS.GUILD_INVITE],
                "#p": [pubkey],
                limit: 50
            }];
            
            // Create subscription
            const sub = nostrModule.relayConnections.game.sub(filters);
            
            // Handle events
            sub.on('event', (event) => {
                this.handleGuildInvite(event);
            });
            
            // Wait a bit for events to arrive
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log(`[Guild] Loaded guild invitations for player ${pubkey.substring(0, 8)}`);
            return true;
        } catch (error) {
            console.error("[Guild] Failed to load guild invitations:", error);
            return false;
        }
    },
    
    // Helper: Add member to guild
    addMemberToGuild: function(pubkey, guildId, rank) {
        const guild = this.guilds.get(guildId);
        if (!guild) return false;
        
        // Add to members if not already a member
        if (!guild.members.includes(pubkey)) {
            guild.members.push(pubkey);
        }
        
        // Handle rank
        if (rank === this.RANKS.LEADER) {
            guild.leader = pubkey;
            // Remove from officers if needed
            guild.officers = guild.officers.filter(p => p !== pubkey);
        } else if (rank === this.RANKS.OFFICER) {
            // Add to officers if not already an officer
            if (!guild.officers.includes(pubkey)) {
                guild.officers.push(pubkey);
            }
        }
        
        // Add to member guilds map
        if (!this.memberGuilds.has(pubkey)) {
            this.memberGuilds.set(pubkey, []);
        }
        
        const memberGuilds = this.memberGuilds.get(pubkey);
        if (!memberGuilds.includes(guildId)) {
            memberGuilds.push(guildId);
        }
        
        return true;
    },
    
    // Helper: Remove member from guild
    removeMemberFromGuild: function(pubkey, guildId) {
        const guild = this.guilds.get(guildId);
        if (!guild) return false;
        
        // Remove from members
        guild.members = guild.members.filter(p => p !== pubkey);
        
        // Remove from officers if applicable
        guild.officers = guild.officers.filter(p => p !== pubkey);
        
        // Remove from member guilds map
        if (this.memberGuilds.has(pubkey)) {
            const memberGuilds = this.memberGuilds.get(pubkey);
            this.memberGuilds.set(
                pubkey, 
                memberGuilds.filter(id => id !== guildId)
            );
        }
        
        return true;
    },
    
    // Helper: Check if a player has an invitation to a guild
    hasInvitation: function(pubkey, guildId) {
        if (!this.invitations.has(pubkey)) return false;
        
        const invites = this.invitations.get(pubkey);
        return invites.some(invite => invite.guildId === guildId);
    },
    
    // Helper: Remove invitation
    removeInvitation: function(pubkey, guildId) {
        if (!this.invitations.has(pubkey)) return false;
        
        const invites = this.invitations.get(pubkey);
        this.invitations.set(
            pubkey,
            invites.filter(invite => invite.guildId !== guildId)
        );
        
        return true;
    },
    
    // Helper: Get member rank in guild
    getMemberRank: function(pubkey, guildId) {
        const guild = this.guilds.get(guildId);
        if (!guild) return null;
        
        if (guild.leader === pubkey) {
            return this.RANKS.LEADER;
        }
        
        if (guild.officers.includes(pubkey)) {
            return this.RANKS.OFFICER;
        }
        
        if (guild.members.includes(pubkey)) {
            return this.RANKS.MEMBER;
        }
        
        return null;
    },
    
    // Get player's guilds
    getPlayerGuilds: function(pubkey) {
        if (!this.memberGuilds.has(pubkey)) {
            return [];
        }
        
        const guildIds = this.memberGuilds.get(pubkey);
        return guildIds
            .map(id => this.guilds.get(id))
            .filter(Boolean) // Filter out any nulls
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    
    // Get player's invitations
    getPlayerInvitations: function(pubkey) {
        if (!this.invitations.has(pubkey)) {
            return [];
        }
        
        return this.invitations.get(pubkey)
            .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    },
    
    // Get guild details
    getGuildDetails: function(guildId) {
        return this.guilds.get(guildId);
    },
    
    // Get all guilds
    getAllGuilds: function() {
        return Array.from(this.guilds.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    
    // Get public guilds (for guild browser)
    getPublicGuilds: function() {
        return Array.from(this.guilds.values())
            .filter(guild => guild.visibility === 'public')
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    
    // Respond to guild invitation
    respondToInvitation: async function(data) {
        try {
            const { guildId, accept } = data;
            
            if (accept) {
                // Join the guild
                await this.joinGuild(guildId);
            } else {
                // Just remove the invitation
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (!nostrModule || !nostrModule.currentUser) {
                    throw new Error("Not authenticated");
                }
                
                this.removeInvitation(nostrModule.currentUser.pubkey, guildId);
                
                // Emit invitation declined event
                RelayWorldCore.eventBus.emit('guild:invitationDeclined', { 
                    guildId,
                    pubkey: nostrModule.currentUser.pubkey
                });
                
                // Show notification
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.showToast) {
                    const guild = this.guilds.get(guildId);
                    uiModule.showToast(`Declined invitation to guild "${guild?.name || guildId}"`, "info");
                }
            }
            
            return true;
        } catch (error) {
            console.error("[Guild] Failed to respond to invitation:", error);
            
            // Show error notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.showToast) {
                uiModule.showToast(`Failed to respond to invitation: ${error.message}`, "error");
            }
            
            throw error;
        }
    }
};