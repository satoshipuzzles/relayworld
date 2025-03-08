/**
 * ui-module.js
 * User interface management for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';
import { NostrUtils } from '../utils/nostr-utils.js';

export const UIModule = {
    // Module metadata
    name: "ui",
    description: "User interface management for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["auth", "nostr"],
    priority: 30, // Medium priority
    critical: true, // Critical module
    
    // Module state
    initialized: false,
    activePopup: null,
    activeTab: "score",
    toasts: [],
    
    // Sound effects
    audioContext: null,
    sounds: {},
    loadedSounds: 0,
    totalSounds: 0,
    
    // Initialize the UI module
    init: async function() {
        console.log("[UI] Initializing UI module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Initialize simple sound system
        this._initAudio();
        
        this.initialized = true;
        console.log("[UI] UI module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        console.log("[UI] Setting up event listeners...");
        
        // Listen for auth events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        RelayWorldCore.eventBus.on('auth:logout', this.handleLogout.bind(this));
        
        // Listen for Nostr events
        RelayWorldCore.eventBus.on('nostr:connected', this.handleNostrConnected.bind(this));
        RelayWorldCore.eventBus.on('nostr:disconnected', this.handleNostrDisconnected.bind(this));
        
        // Listen for DM events
        RelayWorldCore.eventBus.on('dm:messageReceived', this.handleDMReceived.bind(this));
        RelayWorldCore.eventBus.on('dm:fileReceived', this.handleFileReceived.bind(this));
        
        // Listen for game events
        RelayWorldCore.eventBus.on('game:ready', this.handleGameReady.bind(this));
        RelayWorldCore.eventBus.on('game:questUpdated', this.updateQuestDisplay.bind(this));
        
        // Set up UI element event listeners
        this._setupUIControls();
    },
    
    // Set up UI controls
    _setupUIControls: function() {
        // Chat controls
        const chatInput = document.getElementById('chat-input');
        const sendChatButton = document.getElementById('send-chat-button');
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
            
            chatInput.addEventListener('focus', () => {
                const playerModule = RelayWorldCore.getModule('player');
                if (playerModule) {
                    playerModule.chatFocused = true;
                }
            });
            
            chatInput.addEventListener('blur', () => {
                const playerModule = RelayWorldCore.getModule('player');
                if (playerModule) {
                    playerModule.chatFocused = false;
                }
            });
        }
        
        if (sendChatButton) {
            sendChatButton.addEventListener('click', () => this.sendChatMessage());
        }
        
        // User popup controls
        const userPopupClose = document.getElementById('user-popup-close');
        if (userPopupClose) {
            userPopupClose.addEventListener('click', () => this.hideUserPopup());
        }
        
        const followButton = document.getElementById('follow-button');
        if (followButton) {
            followButton.addEventListener('click', () => this.toggleFollowUser());
        }
        
        const chatButton = document.getElementById('chat-button');
        if (chatButton) {
            chatButton.addEventListener('click', () => this.openDirectChat());
        }
        
        const voiceChatButton = document.getElementById('voice-chat-button');
        if (voiceChatButton) {
            voiceChatButton.addEventListener('click', () => this.toggleVoiceChat());
        }
        
        const tradeButton = document.getElementById('trade-button');
        if (tradeButton) {
            tradeButton.addEventListener('click', () => this.initiateTrade());
        }
        
        const zapButton = document.getElementById('zap-button');
        if (zapButton) {
            zapButton.addEventListener('click', () => this.initiateZap());
        }
        
        // Leaderboard tabs
        const leaderboardTabs = document.querySelectorAll('#leaderboard-tabs .tab-button');
        leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.type);
            });
        });
        
        // Inventory controls
        const inventoryButton = document.getElementById('inventory-button');
        if (inventoryButton) {
            inventoryButton.addEventListener('click', () => this.toggleInventory());
        }
        
        const inventoryClose = document.getElementById('inventory-close');
        if (inventoryClose) {
            inventoryClose.addEventListener('click', () => this.toggleInventory());
        }
        
        // Feature buttons
        const featureButtons = [
            'guild-button', 'shop-button', 'pet-button', 
            'faction-button', 'dungeon-button', 'stash-button'
        ];
        
        featureButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                const featureName = buttonId.replace('-button', '');
                button.addEventListener('click', () => this.showFeatureNotice(featureName));
            }
        });
    },
    
    // Initialize audio system
    _initAudio: function() {
        try {
            console.log("[UI] Initializing audio system...");
            
            // Initialize Web Audio API
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Define sounds to load
            const soundsToLoad = {
                'item': 'assets/sounds/item.mp3',
                'chat': 'assets/sounds/chat.mp3',
                'success': 'assets/sounds/success.mp3',
                'error': 'assets/sounds/error.mp3',
                'portal': 'assets/sounds/portal.mp3',
                'treasure': 'assets/sounds/treasure.mp3',
                'zap': 'assets/sounds/zap.mp3',
                'levelup': 'assets/sounds/levelup.mp3',
                'death': 'assets/sounds/death.mp3',
                'login': 'assets/sounds/login.mp3'
            };
            
            this.totalSounds = Object.keys(soundsToLoad).length;
            this.loadedSounds = 0;
            this.sounds = {};
            
            // Load sounds
            for (const [name, url] of Object.entries(soundsToLoad)) {
                this._loadSound(name, url);
            }
        } catch (error) {
            console.error("[UI] Failed to initialize audio system:", error);
        }
    },
    
    // Load a sound
    _loadSound: function(name, url) {
        try {
            const audio = new Audio();
            audio.src = url;
            
            // Set callbacks
            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
                this.loadedSounds++;
                
                if (this.loadedSounds === this.totalSounds) {
                    console.log("[UI] All sounds loaded successfully");
                }
            };
            
            audio.onerror = (error) => {
                console.warn(`[UI] Failed to load sound "${name}":`, error);
                this.loadedSounds++;
            };
            
            // Start loading
            audio.load();
        } catch (error) {
            console.error(`[UI] Failed to load sound "${name}":`, error);
        }
    },
    
    // Play a sound
    playSound: function(name) {
        if (!this.sounds[name]) {
            console.warn(`[UI] Sound "${name}" not found`);
            return;
        }
        
        try {
            // Clone the audio to allow multiple instances
            const soundClone = this.sounds[name].cloneNode();
            soundClone.volume = 0.5;
            soundClone.play().catch(e => {
                console.warn(`[UI] Failed to play sound: ${e.message}`);
            });
        } catch (error) {
            console.error(`[UI] Failed to play sound "${name}":`, error);
        }
    },
    
    // Handle login event
    handleLogin: function(data) {
        console.log("[UI] Handling login...");
        // Nothing to do here, auth module handles login UI
    },
    
    // Handle logout event
    handleLogout: function() {
        console.log("[UI] Handling logout...");
        // Refresh the page to return to login screen
        window.location.reload();
    },
    
    // Handle Nostr connected event
    handleNostrConnected: function(data) {
        console.log("[UI] Nostr connected");
        this.showToast("Connected to Nostr", "success");
    },
    
    // Handle Nostr disconnected event
    handleNostrDisconnected: function() {
        console.log("[UI] Nostr disconnected");
        this.showToast("Disconnected from Nostr", "error");
    },
    
    // Handle DM received event
    handleDMReceived: function(data) {
        const { conversationId, message, conversation } = data;
        
        // Update UI if DM panel is open
        const dmPanel = document.getElementById('dm-panel');
        if (dmPanel && dmPanel.dataset.conversationId === conversationId) {
            this.addMessageToChat(message);
        }
        
        // Show notification
        const senderName = this._getUserName(message.sender);
        this.showToast(`New message from ${senderName}`, "info");
        this.playSound("chat");
        
        // Update DM list
        this.updateDMList();
    },
    
    // Handle file received event
    handleFileReceived: function(data) {
        const { conversationId, message, conversation } = data;
        
        // Update UI if DM panel is open
        const dmPanel = document.getElementById('dm-panel');
        if (dmPanel && dmPanel.dataset.conversationId === conversationId) {
            this.addFileToChat(message);
        }
        
        // Show notification
        const senderName = this._getUserName(message.sender);
        this.showToast(`New file from ${senderName}`, "info");
        this.playSound("chat");
        
        // Update DM list
        this.updateDMList();
    },
    
    // Handle game ready event
    handleGameReady: function() {
        console.log("[UI] Game ready");
        this.hideLoginScreen();
        this.updatePlayerProfile();
        this.updateLeaderboard();
    },
    
    // Hide login screen
    hideLoginScreen: function() {
        console.log("[UI] Hiding login screen");
        
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.opacity = 0;
            setTimeout(() => {
                loginScreen.style.display = 'none';
                this._showGameInterface();
            }, 500);
        }
    },
    
    // Show game interface
    _showGameInterface: function() {
        const uiElements = [
            'top-bar', 'player-profile', 'leaderboard-container',
            'chat-container', 'mini-map', 'quest-display'
        ];
        
        uiElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('hide');
            }
        });
        
        // Show mobile controls on small screens
        if (window.innerWidth <= 768) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.classList.remove('hide');
            }
        }
        
        // Play login completed sound
        this.playLoginSound();
    },
    
    // Play login sound with effect
    playLoginSound: function() {
        this.playSound('login');
        
        // Create sound wave effect
        const soundWave = document.getElementById('sound-wave');
        if (soundWave) {
            soundWave.style.animation = 'sound-wave 2s ease-out';
            setTimeout(() => {
                soundWave.style.animation = 'none';
            }, 2000);
        }
    },
    
    // Show a toast notification
    showToast: function(message, type = 'info') {
        console.log(`[UI] Toast: ${message} (${type})`);
        
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Play sound based on type
        if (type === 'success') this.playSound('success');
        else if (type === 'error') this.playSound('error');
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        // Store in toast history
        this.toasts.push({
            message,
            type,
            timestamp: Date.now()
        });
        
        // Keep maximum 20 toasts in history
        if (this.toasts.length > 20) {
            this.toasts.shift();
        }
    },
    
    // Update player profile display
    updatePlayerProfile: function() {
        console.log("[UI] Updating player profile");
        
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        if (!playerModule || !nostrModule) {
            console.warn("[UI] Player or Nostr module not available");
            return;
        }
        
        const currentUser = nostrModule.users.get(playerModule.pubkey);
        if (!currentUser) {
            console.warn("[UI] Current user data not found");
            return;
        }
        
        // Update profile image
        const profileImage = document.getElementById('player-profile-image');
        if (profileImage) {
            profileImage.src = currentUser.profile?.picture || 'assets/icons/default-avatar.png';
        }
        
        // Update profile name
        const profileName = document.getElementById('player-profile-name');
        if (profileName) {
            profileName.textContent = currentUser.profile?.name || 
                NostrUtils.formatPubkey(playerModule.pubkey, { short: true });
        }
        
        // Update profile npub
        const profileNpub = document.getElementById('player-profile-npub');
        if (profileNpub) {
            profileNpub.textContent = NostrUtils.formatPubkey(playerModule.pubkey, { 
                short: true, 
                useNpub: true 
            });
        }
        
        // Update stats
        const statsFields = {
            'profile-level': playerModule.level,
            'profile-score': playerModule.score,
            'profile-items': playerModule.inventory.length,
            'profile-interactions': playerModule.interactions,
            'profile-zaps': (playerModule.zapsSent || 0) + (playerModule.zapsReceived || 0)
        };
        
        for (const [id, value] of Object.entries(statsFields)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' && value > 1000 
                    ? this._formatNumber(value) 
                    : value;
            }
        }
        
        // Update score display
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Score: ${this._formatNumber(playerModule.score)}`;
        }
    },
    
    // Update leaderboard
    updateLeaderboard: function() {
        console.log("[UI] Updating leaderboard");
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        const playerModule = RelayWorldCore.getModule('player');
        
        if (!nostrModule || !playerModule) {
            console.warn("[UI] Nostr or Player module not available");
            return;
        }
        
        const leaderboardEntries = document.getElementById('leaderboard-entries');
        if (!leaderboardEntries) return;
        
        // Clear existing entries
        leaderboardEntries.innerHTML = '';
        
        // Get sorting type from active tab
        const type = this.activeTab || 'score';
        
        // Get users and add current player
        const users = Array.from(nostrModule.users.values())
            .filter(user => user.pubkey !== playerModule.pubkey);
        
        // Add current player to the list
        users.unshift({
            pubkey: playerModule.pubkey,
            profile: nostrModule.users.get(playerModule.pubkey)?.profile,
            score: playerModule.score,
            itemsCollected: playerModule.itemsCollected,
            questsCompleted: playerModule.completedQuests?.length || 0,
            zapsSent: playerModule.zapsSent || 0,
            zapsReceived: playerModule.zapsReceived || 0
        });
        
        // Sort users based on selected type
        users.sort((a, b) => {
            if (type === 'score') {
                return (b.score || 0) - (a.score || 0);
            } else if (type === 'items') {
                return (b.itemsCollected || 0) - (a.itemsCollected || 0);
            } else if (type === 'quests') {
                return (b.questsCompleted || 0) - (a.questsCompleted || 0);
            } else if (type === 'zaps') {
                const aTotal = (a.zapsSent || 0) + (a.zapsReceived || 0);
                const bTotal = (b.zapsSent || 0) + (b.zapsReceived || 0);
                return bTotal - aTotal;
            }
            return 0;
        });
        
        // Create leaderboard entries (top 10)
        for (let i = 0; i < Math.min(users.length, 10); i++) {
            const user = users[i];
            
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            
            // Add rank
            const rank = document.createElement('div');
            rank.className = 'leaderboard-rank';
            rank.textContent = i + 1;
            entry.appendChild(rank);
            
            // Add avatar
            const avatar = document.createElement('img');
            avatar.className = 'leaderboard-avatar';
            avatar.src = user.profile?.picture || 'assets/icons/default-avatar.png';
            avatar.alt = 'Avatar';
            entry.appendChild(avatar);
            
            // Add info
            const info = document.createElement('div');
            info.className = 'leaderboard-info';
            
            // Add name
            const name = document.createElement('div');
            name.className = 'leaderboard-name';
            name.textContent = user.profile?.name || 
                NostrUtils.formatPubkey(user.pubkey, { short: true });
            
            // Add NPC indicator if applicable
            if (user.isNPC) {
                name.textContent += ' [NPC]';
                name.className += ' npc-user';
            }
            
            info.appendChild(name);
            
            // Add score/value
            const score = document.createElement('div');
            score.className = 'leaderboard-score';
            
            // Display appropriate value based on type
            if (type === 'score') {
                score.textContent = `${this._formatNumber(user.score || 0)} pts`;
            } else if (type === 'items') {
                score.textContent = `${this._formatNumber(user.itemsCollected || 0)} items`;
            } else if (type === 'quests') {
                score.textContent = `${this._formatNumber(user.questsCompleted || 0)} quests`;
            } else if (type === 'zaps') {
                const totalZaps = (user.zapsSent || 0) + (user.zapsReceived || 0);
                score.textContent = `${this._formatNumber(totalZaps)} zaps`;
            }
            
            info.appendChild(score);
            entry.appendChild(info);
            
            // Highlight current player
            if (user.pubkey === playerModule.pubkey) {
                entry.classList.add('current-player');
            } else {
                // Add click handler for other players
                entry.addEventListener('click', () => this.showUserPopup(user.pubkey));
            }
            
            leaderboardEntries.appendChild(entry);
        }
    },
    
    // Show user popup
    showUserPopup: function(pubkey) {
        console.log(`[UI] Showing user popup for ${pubkey.slice(0, 8)}`);
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            console.warn("[UI] Nostr module not available");
            return;
        }
        
        const user = nostrModule.users.get(pubkey);
        if (!user) {
            console.warn("[UI] User not found");
            this.showToast("User not found", "error");
            return;
        }
        
        // Set active popup
        this.activePopup = 'user';
        
        // Get popup element
        const popup = document.getElementById('user-popup');
        if (!popup) return;
        
        // Set pubkey
        popup.dataset.pubkey = pubkey;
        
        // Update basic info
        document.getElementById('user-popup-image').src = 
            user.profile?.picture || 'assets/icons/default-avatar.png';
            
        document.getElementById('user-popup-name').textContent = 
            user.profile?.name || NostrUtils.formatPubkey(pubkey, { short: true });
            
        document.getElementById('user-popup-npub').textContent = 
            NostrUtils.formatPubkey(pubkey, { short: true, useNpub: true });
        
        // Update user stats
        document.getElementById('user-level').textContent = user.level || '1';
        document.getElementById('user-score').textContent = this._formatNumber(user.score || 0);
        document.getElementById('user-guild').textContent = user.guild || 'None';
        document.getElementById('user-faction').textContent = user.faction || 'None';
        
        // Add NPC indicator if applicable
        const userTitle = document.getElementById('user-popup-name');
        if (user.isNPC) {
            userTitle.textContent += ' [NPC]';
            userTitle.className = 'npc-user';
        } else {
            userTitle.className = '';
        }
        
        // Update follow button
        this.updateFollowButton(pubkey);
        
        // Update user notes
        this.updateUserNotes(pubkey);
        
        // Show popup
        popup.classList.remove('hide');
    },
    
    // Hide user popup
    hideUserPopup: function() {
        console.log("[UI] Hiding user popup");
        
        const popup = document.getElementById('user-popup');
        if (popup) {
            popup.classList.add('hide');
        }
        
        this.activePopup = null;
    },
    
    // Update follow button
    updateFollowButton: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const followButton = document.getElementById('follow-button');
        if (!followButton) return;
        
        // Check if user is followed
        const isFollowing = nostrModule.isFollowing?.(pubkey);
        
        followButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
        followButton.className = isFollowing ? 
            'user-popup-button following' : 'user-popup-button';
    },
    
    // Toggle follow user
    toggleFollowUser: async function() {
        const nostrModule = RelayWorldCore.getModule('nostr');
        const playerModule = RelayWorldCore.getModule('player');
        
        if (!nostrModule || !playerModule) {
            console.warn("[UI] Nostr or Player module not available");
            return;
        }
        
        const popup = document.getElementById('user-popup');
        if (!popup) return;
        
        const pubkey = popup.dataset.pubkey;
        if (!pubkey) return;
        
        // Check if user is followed
        const isFollowing = nostrModule.isFollowing?.(pubkey);
        
        try {
            if (isFollowing) {
                // Unfollow user
                await nostrModule.unfollowUser(pubkey);
                this.updateFollowButton(pubkey);
                this.showToast(`Unfollowed ${this._getUserName(pubkey)}`, "info");
            } else {
                // Follow user
                await nostrModule.followUser(pubkey);
                this.updateFollowButton(pubkey);
                this.showToast(`Following ${this._getUserName(pubkey)}`, "success");
                
                // Update player stats
                playerModule.follows++;
                playerModule.interactions++;
                playerModule.score += 50;
                
                // Publish updated stats
                nostrModule.publishPlayerStats();
                
                // Update UI
                this.updatePlayerProfile();
            }
        } catch (error) {
            console.error("[UI] Failed to toggle follow:", error);
            this.showToast(`Failed to ${isFollowing ? 'unfollow' : 'follow'}: ${error.message}`, "error");
        }
    },
    
    // Update user notes
    updateUserNotes: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const user = nostrModule.users.get(pubkey);
        if (!user) return;
        
        const notesContainer = document.getElementById('user-notes');
        if (!notesContainer) return;
        
        // Clear existing notes
        notesContainer.innerHTML = '';
        
        // Check if user has notes
        if (!user.notes || user.notes.length === 0) {
            notesContainer.innerHTML = '<div class="no-notes">No recent notes found</div>';
            return;
        }
        
        // Add notes (limited to 5)
        for (let i = 0; i < Math.min(user.notes.length, 5); i++) {
            const note = user.notes[i];
            
            const noteElement = document.createElement('div');
            noteElement.className = 'user-note';
            
            // Add content
            const contentElement = document.createElement('div');
            contentElement.className = 'user-note-content';
            contentElement.textContent = note.content;
            noteElement.appendChild(contentElement);
            
            // Add timestamp
            const timestampElement = document.createElement('div');
            timestampElement.className = 'user-note-timestamp';
            timestampElement.textContent = NostrUtils.formatTimestamp(note.created_at);
            noteElement.appendChild(timestampElement);
            
            notesContainer.appendChild(noteElement);
        }
    },
    
    // Open direct chat
    openDirectChat: function() {
        const dmModule = RelayWorldCore.getModule('dm');
        if (!dmModule) {
            this.showFeatureNotice('Direct Chat');
            return;
        }
        
        const popup = document.getElementById('user-popup');
        if (!popup) return;
        
        const pubkey = popup.dataset.pubkey;
        if (!pubkey) return;
        
        // Hide user popup
        this.hideUserPopup();
        
        // Create conversation ID
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.currentUser) return;
        
        const conversationId = NostrUtils.createConversationId([
            nostrModule.currentUser.pubkey,
            pubkey
        ]);
        
        // Show DM panel
        this.showDMPanel(conversationId);
    },
    
    // Show DM panel (continued)
        dmPanel.classList.remove('hide');
        
        // Focus input
        setTimeout(() => {
            dmPanel.querySelector('#dm-input').focus();
        }, 100);
    },
    
    // Add message to chat
    addMessageToChat: function(message, container = null) {
        // Get container if not provided
        if (!container) {
            const dmPanel = document.getElementById('dm-panel');
            if (!dmPanel) return;
            
            container = dmPanel.querySelector('#dm-messages');
            if (!container) return;
        }
        
        // Get current user pubkey
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.currentUser) return;
        
        const currentUserPubkey = nostrModule.currentUser.pubkey;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `dm-message ${message.sender === currentUserPubkey ? 'from-me' : 'from-them'}`;
        
        // Add content
        const contentElement = document.createElement('div');
        contentElement.className = 'dm-content';
        contentElement.textContent = message.content;
        messageElement.appendChild(contentElement);
        
        // Add timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'dm-timestamp';
        timestampElement.textContent = NostrUtils.formatTimestamp(message.created_at);
        messageElement.appendChild(timestampElement);
        
        // Add to container
        container.appendChild(messageElement);
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },
    
    // Add file to chat
    addFileToChat: function(message, container = null) {
        // Get container if not provided
        if (!container) {
            const dmPanel = document.getElementById('dm-panel');
            if (!dmPanel) return;
            
            container = dmPanel.querySelector('#dm-messages');
            if (!container) return;
        }
        
        // Get current user pubkey
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.currentUser) return;
        
        const currentUserPubkey = nostrModule.currentUser.pubkey;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `dm-message ${message.sender === currentUserPubkey ? 'from-me' : 'from-them'}`;
        
        // Add content based on file type
        const contentElement = document.createElement('div');
        contentElement.className = 'dm-content dm-file';
        
        const fileType = message.fileMetadata?.fileType || '';
        
        if (fileType.startsWith('image/')) {
            // Image file
            const img = document.createElement('img');
            img.src = message.content;
            img.alt = 'Image';
            
            // Add blurhash placeholder if available
            if (message.fileMetadata?.blurhash) {
                img.style.background = `url(${message.fileMetadata.blurhash})`;
            }
            
            // Add thumbnail if available
            if (message.fileMetadata?.thumbnail) {
                img.dataset.thumbnail = message.fileMetadata.thumbnail;
            }
            
            contentElement.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            // Video file
            const video = document.createElement('video');
            video.src = message.content;
            video.controls = true;
            contentElement.appendChild(video);
        } else if (fileType.startsWith('audio/')) {
            // Audio file
            const audio = document.createElement('audio');
            audio.src = message.content;
            audio.controls = true;
            contentElement.appendChild(audio);
        } else {
            // Other file types
            const fileLink = document.createElement('a');
            fileLink.href = message.content;
            fileLink.target = '_blank';
            fileLink.textContent = 'Download File';
            contentElement.appendChild(fileLink);
        }
        
        messageElement.appendChild(contentElement);
        
        // Add timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'dm-timestamp';
        timestampElement.textContent = NostrUtils.formatTimestamp(message.created_at);
        messageElement.appendChild(timestampElement);
        
        // Add to container
        container.appendChild(messageElement);
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },
    
    // Send direct message
    sendDirectMessage: async function(conversationId) {
        const dmModule = RelayWorldCore.getModule('dm');
        if (!dmModule) return;
        
        const dmPanel = document.getElementById('dm-panel');
        if (!dmPanel) return;
        
        const input = dmPanel.querySelector('#dm-input');
        if (!input) return;
        
        const content = input.value.trim();
        if (!content) return;
        
        // Get conversation
        const conversation = dmModule.conversations.get(conversationId);
        if (!conversation) {
            console.warn("[UI] Conversation not found");
            return;
        }
        
        // Get recipients (everyone except self)
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.currentUser) return;
        
        const currentUserPubkey = nostrModule.currentUser.pubkey;
        
        const recipients = conversation.participants.filter(
            pubkey => pubkey !== currentUserPubkey
        );
        
        // Options
        const options = {};
        
        // Add subject if available
        if (conversation.subject) {
            options.subject = conversation.subject;
        }
        
        // Send message
        try {
            await dmModule.createDirectMessage(recipients, content, options);
            
            // Clear input
            input.value = '';
            
            // Play sound
            this.playSound('chat');
        } catch (error) {
            console.error("[UI] Failed to send direct message:", error);
            this.showToast(`Failed to send message: ${error.message}`, "error");
        }
    },
    
    // Send direct file
    sendDirectFile: async function(conversationId) {
        const dmModule = RelayWorldCore.getModule('dm');
        if (!dmModule) return;
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Listen for file selection
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                fileInput.remove();
                return;
            }
            
            const file = fileInput.files[0];
            
            // Get conversation
            const conversation = dmModule.conversations.get(conversationId);
            if (!conversation) {
                console.warn("[UI] Conversation not found");
                fileInput.remove();
                return;
            }
            
            // Get recipients (everyone except self)
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                fileInput.remove();
                return;
            }
            
            const currentUserPubkey = nostrModule.currentUser.pubkey;
            
            const recipients = conversation.participants.filter(
                pubkey => pubkey !== currentUserPubkey
            );
            
            // Show uploading toast
            this.showToast("Uploading file...", "info");
            
            try {
                // Encrypt file
                const cryptoUtils = RelayWorldCore.getModule('utils').crypto;
                if (!cryptoUtils) throw new Error("Crypto utils not available");
                
                const encryptedFile = await cryptoUtils.encryptFile(file);
                
                // TODO: Upload file to a storage service
                // For now, we'll use a fake URL
                const fileUrl = `https://example.com/files/${Date.now()}-${file.name}`;
                
                // File metadata
                const fileMetadata = {
                    fileType: file.type,
                    size: file.size,
                    ...encryptedFile.metadata
                };
                
                // Add image-specific metadata
                if (file.type.startsWith('image/')) {
                    // Get dimensions
                    const dimensions = await this._getImageDimensions(file);
                    if (dimensions) {
                        fileMetadata.dimensions = `${dimensions.width}x${dimensions.height}`;
                    }
                    
                    // TODO: Generate blurhash
                    // For now, use a placeholder
                    fileMetadata.blurhash = 'placeholder';
                    
                    // TODO: Generate thumbnail
                }
                
                // Options
                const options = {};
                
                // Add subject if available
                if (conversation.subject) {
                    options.subject = conversation.subject;
                }
                
                // Send file message
                await dmModule.createDirectFileMessage(recipients, fileUrl, fileMetadata, options);
                
                // Play sound
                this.playSound('chat');
                
                // Show success toast
                this.showToast("File sent successfully", "success");
            } catch (error) {
                console.error("[UI] Failed to send file:", error);
                this.showToast(`Failed to send file: ${error.message}`, "error");
            } finally {
                fileInput.remove();
            }
        });
        
        // Trigger file selection
        fileInput.click();
    },
    
    // Get image dimensions
    _getImageDimensions: function(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    },
    
    // Update DM list
    updateDMList: function() {
        const dmModule = RelayWorldCore.getModule('dm');
        if (!dmModule) return;
        
        const dmList = document.getElementById('dm-list');
        if (!dmList) return;
        
        // Clear list
        dmList.innerHTML = '';
        
        // Get conversations
        const conversations = dmModule.getConversations();
        
        // Create list items
        for (const conversation of conversations) {
            const item = document.createElement('div');
            item.className = `dm-list-item ${conversation.unread > 0 ? 'unread' : ''}`;
            item.dataset.conversationId = conversation.id;
            
            // Get other participants
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) continue;
            
            const currentUserPubkey = nostrModule.currentUser.pubkey;
            
            const otherParticipants = conversation.participants.filter(
                pubkey => pubkey !== currentUserPubkey
            );
            
            // Create title (subject or participants' names)
            const title = document.createElement('div');
            title.className = 'dm-list-title';
            
            if (conversation.subject) {
                title.textContent = conversation.subject;
            } else {
                // Use participants' names
                const names = otherParticipants.map(pubkey => this._getUserName(pubkey));
                title.textContent = names.join(', ');
            }
            
            item.appendChild(title);
            
            // Create preview
            if (conversation.lastMessage) {
                const preview = document.createElement('div');
                preview.className = 'dm-list-preview';
                
                // Show sender name for groups
                if (otherParticipants.length > 1) {
                    const senderName = this._getUserName(conversation.lastMessage.sender);
                    preview.textContent = `${senderName}: `;
                }
                
                // Add message preview
                if (conversation.lastMessage.type === 'text') {
                    preview.textContent += conversation.lastMessage.content;
                } else if (conversation.lastMessage.type === 'file') {
                    preview.textContent += '[File]';
                }
                
                item.appendChild(preview);
                
                // Add timestamp
                const timestamp = document.createElement('div');
                timestamp.className = 'dm-list-timestamp';
                timestamp.textContent = NostrUtils.formatTimestamp(conversation.lastMessage.created_at);
                item.appendChild(timestamp);
            }
            
            // Add unread badge
            if (conversation.unread > 0) {
                const badge = document.createElement('div');
                badge.className = 'dm-list-badge';
                badge.textContent = conversation.unread;
                item.appendChild(badge);
            }
            
            // Add click handler
            item.addEventListener('click', () => {
                this.showDMPanel(conversation.id);
            });
            
            dmList.appendChild(item);
        }
    },
    
    // Toggle voice chat
    toggleVoiceChat: function() {
        const audioModule = RelayWorldCore.getModule('audio');
        if (!audioModule) {
            this.showFeatureNotice('Voice Chat');
            return;
        }
        
        if (audioModule.isVoiceChatActive) {
            audioModule.stopVoiceChat();
            this.showToast("Voice chat disabled", "info");
        } else {
            audioModule.startVoiceChat()
                .then(success => {
                    if (success) {
                        this.showToast("Voice chat activated - nearby players can hear you", "success");
                    }
                })
                .catch(error => {
                    this.showToast(`Failed to start voice chat: ${error.message}`, "error");
                });
        }
    },
    
    // Initiate trade
    initiateTrade: function() {
        const marketplaceModule = RelayWorldCore.getModule('marketplace');
        if (!marketplaceModule) {
            this.showFeatureNotice('Trading');
            return;
        }
        
        const popup = document.getElementById('user-popup');
        if (!popup) return;
        
        const pubkey = popup.dataset.pubkey;
        if (!pubkey) return;
        
        // Hide user popup
        this.hideUserPopup();
        
        // Start trade
        marketplaceModule.startTrade(pubkey)
            .then(() => {
                this.showToast(`Trade request sent to ${this._getUserName(pubkey)}`, "success");
            })
            .catch(error => {
                this.showToast(`Failed to start trade: ${error.message}`, "error");
            });
    },
    
    // Initiate zap
    initiateZap: function() {
        const zapsModule = RelayWorldCore.getModule('zaps');
        if (!zapsModule) {
            this.showFeatureNotice('Zapping');
            return;
        }
        
        const popup = document.getElementById('user-popup');
        if (!popup) return;
        
        const pubkey = popup.dataset.pubkey;
        if (!pubkey) return;
        
        // Hide user popup
        this.hideUserPopup();
        
        // Show zap interface
        zapsModule.showZapInterface(pubkey);
    },
    
    // Send chat message
    sendChatMessage: function() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            console.warn("[UI] Nostr module not available");
            return;
        }
        
        // Publish message
        nostrModule.publishChatMessage(message)
            .then(success => {
                if (success) {
                    // Add message to chat
                    const playerModule = RelayWorldCore.getModule('player');
                    if (!playerModule) return;
                    
                    const username = this._getUserName(playerModule.pubkey);
                    this.addChatMessage(username, message, true);
                    
                    // Clear input
                    chatInput.value = '';
                    
                    // Update stats
                    playerModule.chatMessages++;
                    
                    // Play sound
                    this.playSound('chat');
                    
                    // Publish stats update
                    nostrModule.publishPlayerStats();
                }
            })
            .catch(error => {
                console.error("[UI] Failed to send chat message:", error);
                this.showToast(`Failed to send message: ${error.message}`, "error");
            });
    },
    
    // Add chat message
    addChatMessage: function(username, message, isFromMe = false) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isFromMe ? 'from-me' : ''}`;
        
        // Add username
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = username;
        messageElement.appendChild(usernameSpan);
        
        // Add timestamp
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = ` [${new Date().toLocaleTimeString()}] `;
        messageElement.appendChild(timestampSpan);
        
        // Add content
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = message;
        messageElement.appendChild(contentSpan);
        
        // Add to chat
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    // Update quest display
    updateQuestDisplay: function(data) {
        const gameModule = RelayWorldCore.getModule('game');
        if (!gameModule || !gameModule.quests) return;
        
        const questDisplay = document.getElementById('quest-display');
        if (!questDisplay) return;
        
        // Get active quest
        const activeQuest = gameModule.quests.active;
        
        if (!activeQuest) {
            questDisplay.classList.add('hide');
            return;
        }
        
        // Update quest display
        questDisplay.innerHTML = `
            <div class="quest-title">${activeQuest.name}</div>
            <div class="quest-description">${activeQuest.description}</div>
            <div class="quest-progress-container">
                <div class="quest-progress-text">Progress: ${activeQuest.progress} / ${activeQuest.target}</div>
                <div class="quest-progress-bar">
                    <div class="quest-progress-fill" style="width: ${Math.min(100, (activeQuest.progress / activeQuest.target) * 100)}%"></div>
                </div>
            </div>
            <div class="quest-reward">Reward: ${activeQuest.reward} points</div>
        `;
        
        questDisplay.classList.remove('hide');
    },
    
    // Switch tab
    switchTab: function(tabId) {
        console.log(`[UI] Switching to tab: ${tabId}`);
        
        // Set active tab
        this.activeTab = tabId;
        
        // Update UI
        const tabButtons = document.querySelectorAll('#leaderboard-tabs .tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.type === tabId);
        });
        
        // Update content
        this.updateLeaderboard();
    },
    
    // Toggle inventory
    toggleInventory: function() {
        console.log("[UI] Toggling inventory");
        
        const inventory = document.getElementById('inventory-interface');
        if (!inventory) return;
        
        if (inventory.classList.contains('hide')) {
            this.updateInventoryUI();
            inventory.classList.remove('hide');
        } else {
            inventory.classList.add('hide');
        }
    },
    
    // Update inventory UI
    updateInventoryUI: function() {
        console.log("[UI] Updating inventory UI");
        
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        const container = document.getElementById('inventory-content');
        if (!container) return;
        
        // Clear inventory
        container.innerHTML = '';
        
        // Check if inventory is empty
        if (playerModule.inventory.length === 0) {
            container.innerHTML = '<div class="empty-inventory">Your inventory is empty</div>';
            return;
        }
        
        // Add inventory items
        for (const item of playerModule.inventory) {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.dataset.id = item.id;
            
            // Add icon
            const iconElement = document.createElement('div');
            iconElement.className = 'inventory-item-icon';
            iconElement.textContent = item.emoji || '❓';
            itemElement.appendChild(iconElement);
            
            // Add name
            const nameElement = document.createElement('div');
            nameElement.className = 'inventory-item-name';
            nameElement.textContent = item.name;
            itemElement.appendChild(nameElement);
            
            // Add rarity if available
            if (item.rarity) {
                const itemsModule = RelayWorldCore.getModule('items');
                if (itemsModule && itemsModule.rarity) {
                    const rarityInfo = itemsModule.rarity[item.rarity];
                    
                    const rarityElement = document.createElement('div');
                    rarityElement.className = `inventory-item-rarity rarity-${item.rarity.toLowerCase()}`;
                    rarityElement.textContent = rarityInfo?.name || item.rarity;
                    rarityElement.style.color = rarityInfo?.color || '#FFFFFF';
                    itemElement.appendChild(rarityElement);
                }
            }
            
            // Add click handler
            itemElement.addEventListener('click', () => this.showItemDetails(item));
            
            container.appendChild(itemElement);
        }
    },
    
    // Show item details
    showItemDetails: function(item) {
        console.log(`[UI] Showing details for item: ${item.id}`);
        
        const itemsModule = RelayWorldCore.getModule('items');
        if (!itemsModule) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'item-details-modal';
        
        // Create content
        modal.innerHTML = `
            <div class="item-details-content">
                <div class="item-details-header">
                    <div class="item-icon">${item.emoji || '❓'}</div>
                    <div class="item-title">
                        <h3>${item.name}</h3>
                        ${item.rarity ? `
                            <div class="item-rarity rarity-${item.rarity.toLowerCase()}"
                                 style="color: ${itemsModule.rarity?.[item.rarity]?.color || '#FFFFFF'}">
                                ${itemsModule.rarity?.[item.rarity]?.name || item.rarity}
                            </div>
                        ` : ''}
                    </div>
                    <button class="item-close-button">×</button>
                </div>
                <div class="item-description">${item.description || 'No description available.'}</div>
                <div class="item-stats">
                    <div class="item-stat"><span class="label">Value:</span> <span class="value">${item.value}</span></div>
                    ${item.stats ? Object.entries(item.stats).map(([stat, value]) => 
                        `<div class="item-stat"><span class="label">${stat.charAt(0).toUpperCase() + stat.slice(1)}:</span> <span class="value">+${value}</span></div>`
                    ).join('') : ''}
                </div>
                <div class="item-actions">
                    ${item.category === itemsModule.categories?.CONSUMABLE ? 
                        '<button class="item-action-button use-button">Use</button>' : ''}
                    ${item.category === itemsModule.categories?.EQUIPMENT ? 
                        '<button class="item-action-button equip-button">Equip</button>' : ''}
                    ${item.category === itemsModule.categories?.PET ? 
                        '<button class="item-action-button equip-pet-button">Equip Pet</button>' : ''}
                    <button class="item-action-button drop-button">Drop</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButton = modal.querySelector('.item-close-button');
        closeButton.addEventListener('click', () => modal.remove());
        
        // Use button
        const useButton = modal.querySelector('.use-button');
        if (useButton) {
            useButton.addEventListener('click', () => {
                const result = itemsModule.useItem(item.id);
                if (result.success) {
                    this.showToast(result.message, "success");
                    this.updateInventoryUI();
                    this.updatePlayerProfile();
                    modal.remove();
                } else {
                    this.showToast(result.message, "error");
                }
            });
        }
        
        // Equip button
        const equipButton = modal.querySelector('.equip-button');
        if (equipButton) {
            equipButton.addEventListener('click', () => {
                const result = itemsModule.equipItem(item.id);
                if (result.success) {
                    this.showToast(result.message, "success");
                    this.updateInventoryUI();
                    modal.remove();
                } else {
                    this.showToast(result.message, "error");
                }
            });
        }
        
        // Equip pet button
        const equipPetButton = modal.querySelector('.equip-pet-button');
        if (equipPetButton) {
            equipPetButton.addEventListener('click', () => {
                const result = itemsModule.equipPet(item.id);
                if (result.success) {
                    this.showToast(result.message, "success");
                    this.updateInventoryUI();
                    modal.remove();
                } else {
                    this.showToast(result.message, "error");
                }
            });
        }
        
        // Drop button
        const dropButton = modal.querySelector('.drop-button');
        if (dropButton) {
            dropButton.addEventListener('click', () => {
                if (confirm(`Are you sure you want to drop ${item.name}?`)) {
                    const playerModule = RelayWorldCore.getModule('player');
                    if (!playerModule) return;
                    
                    const index = playerModule.inventory.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        playerModule.inventory.splice(index, 1);
                        this.updateInventoryUI();
                        this.updatePlayerProfile();
                        this.showToast(`Dropped ${item.name}`, "info");
                        modal.remove();
                    }
                }
            });
        }
    },
    
    // Show feature notice
    showFeatureNotice: function(featureName) {
        this.showToast(`${featureName} feature coming soon!`, "info");
    },
    
    // Update weather effects
    updateWeatherEffects: function(weather) {
        console.log(`[UI] Updating weather effects: ${weather}`);
        
        const weatherOverlay = document.getElementById('weather-overlay');
        if (!weatherOverlay) return;
        
        // Clear weather overlay
        weatherOverlay.innerHTML = '';
        weatherOverlay.className = 'weather-effect';
        
        if (weather === 'rain') {
            weatherOverlay.classList.add('rain');
            
            // Create raindrops
            for (let i = 0; i < 100; i++) {
                const raindrop = document.createElement('div');
                raindrop.className = 'raindrop';
                raindrop.style.left = `${Math.random() * 100}%`;
                raindrop.style.animationDelay = `${Math.random() * 2}s`;
                weatherOverlay.appendChild(raindrop);
            }
        } else if (weather === 'storm') {
            weatherOverlay.classList.add('storm');
            
            // Create raindrops
            for (let i = 0; i < 200; i++) {
                const raindrop = document.createElement('div');
                raindrop.className = 'raindrop';
                raindrop.style.left = `${Math.random() * 100}%`;
                raindrop.style.animationDelay = `${Math.random() * 2}s`;
                weatherOverlay.appendChild(raindrop);
            }
            
            // Create lightning
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            weatherOverlay.appendChild(lightning);
            
            // Flash lightning occasionally
            setInterval(() => {
                if (weatherOverlay.classList.contains('storm')) {
                    lightning.style.display = 'block';
                    setTimeout(() => lightning.style.display = 'none', 100);
                }
            }, 5000 + Math.random() * 10000);
        }
    },
    
    // Update relay selector
    updateRelaySelector: function() {
        console.log("[UI] Updating relay selector");
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const selector = document.getElementById('relay-selector');
        if (!selector) return;
        
        // Clear selector
        selector.innerHTML = '';
        
        // Add game relay group
        const gameGroup = document.createElement('optgroup');
        gameGroup.label = "Game Relay (Locked)";
        
        const gameOption = document.createElement('option');
        gameOption.value = nostrModule.config.GAME_RELAY;
        gameOption.textContent = nostrModule.config.GAME_RELAY.replace('wss://', '');
        gameOption.disabled = true;
        gameGroup.appendChild(gameOption);
        selector.appendChild(gameGroup);
        
        // Add login relay group
        const loginGroup = document.createElement('optgroup');
        loginGroup.label = "Login Relay (Default)";
        
        const loginOption = document.createElement('option');
        loginOption.value = nostrModule.config.LOGIN_RELAY;
        loginOption.textContent = nostrModule.config.LOGIN_RELAY.replace('wss://', '');
        loginOption.disabled = true;
        loginGroup.appendChild(loginOption);
        selector.appendChild(loginGroup);
        
        // Add explorer relays group
        const explorerGroup = document.createElement('optgroup');
        explorerGroup.label = "Explorer Relays";
        
        for (const [relayUrl] of nostrModule.relayConnections.explorers) {
            // Skip game and login relays in this section
            if (relayUrl === nostrModule.config.GAME_RELAY || 
                relayUrl === nostrModule.config.LOGIN_RELAY) continue;
                
            const option = document.createElement('option');
            option.value = relayUrl;
            option.textContent = relayUrl.replace('wss://', '');
            option.selected = relayUrl === nostrModule.activeExplorerRelay;
            explorerGroup.appendChild(option);
        }
        
        selector.appendChild(explorerGroup);
        
        // Add event listener
        selector.addEventListener('change', (e) => {
            const relayUrl = e.target.value;
            if (nostrModule.setActiveExplorerRelay) {
                nostrModule.setActiveExplorerRelay(relayUrl);
            }
        });
    },
    
    // Show relay info
    showRelayInfo: function() {
        console.log("[UI] Showing relay info");
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        // Create content
        const content = `
            <h3>Relay Configuration</h3>
            <div class="relay-info">
                <div class="relay-group">
                    <h4>Game Relay</h4>
                    <p>${nostrModule.config.GAME_RELAY}</p>
                    <small>All game events and player positions</small>
                </div>
                <div class="relay-group">
                    <h4>Login Relay</h4>
                    <p>${nostrModule.config.LOGIN_RELAY}</p>
                    <small>Default login and explorer relay</small>
                </div>
                <div class="relay-group">
                    <h4>Active Explorer</h4>
                    <p>${nostrModule.activeExplorerRelay || "None selected"}</p>
                    <small>Current explorer relay providing content</small>
                </div>
                <div class="relay-group">
                    <h4>DM Inbox Relays</h4>
                    <p>${this._formatRelayList(nostrModule.config.DM_INBOX_RELAYS || [])}</p>
                    <small>Relays for receiving direct messages</small>
                </div>
            </div>
        `;
        
        // Create modal
        this._showModal("Relay Information", content);
    },
    
    // Show modal
    _showModal: function(title, content) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        // Create content
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="modal-button modal-close-button">Close</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-button');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },
    
    // Format relay list
    _formatRelayList: function(relays) {
        if (!relays || relays.length === 0) {
            return "None";
        }
        
        return relays.map(relay => relay.replace('wss://', '')).join(', ');
    },
    
    // Format number
    _formatNumber: function(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    // Get user name
    _getUserName: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return pubkey.slice(0, 8);
        
        const user = nostrModule.users.get(pubkey);
        return user?.profile?.name || NostrUtils.formatPubkey(pubkey, { short: true });
    }
};