/**
 * ui.js - User Interface management
 * Handles UI interactions, updates, and display
 */

const UI = {
    // Audio context for sound effects
    audioContext: null,
    sounds: {},
    loadedSounds: 0,
    totalSounds: 0,
    
    // Initialize UI
    init: function() {
        console.log("[UI] Initializing UI...");
        
        // Initialize sound system
        this.loadSoundsSimple();
        
        // Initialize event listeners
        this.setupEventListeners();
        
        console.log("[UI] UI initialized");
    },
    
    // Simple sound loading implementation (replaces initAudio)
    loadSoundsSimple: function() {
        console.log("[UI] Initializing simple audio system...");
        
        // Define sounds to load with simpler implementation
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
        
        // Use HTML5 Audio elements instead
        this.sounds = {};
        
        for (const [name, url] of Object.entries(soundsToLoad)) {
            // Create audio element
            const audio = new Audio();
            audio.src = url;
            audio.preload = 'auto';
            
            // Store in sounds object
            this.sounds[name] = audio;
            
            // Log success
            console.log(`[UI] Sound '${name}' loaded successfully`);
        }
        
        console.log('[UI] Simple sound system initialized');
    },
    
    // Initialize audio system (original method - replaced by loadSoundsSimple)
    initAudio: function() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
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
            
            // Load each sound
            for (const [name, url] of Object.entries(soundsToLoad)) {
                this.loadSound(name, url);
            }
            
            console.log("[UI] Audio system initialized");
        } catch (error) {
            console.error("[UI] Failed to initialize audio:", error);
        }
    },
    
    // Load a sound file (used by original initAudio method)
    loadSound: function(name, url) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.audioContext.decodeAudioData(buffer))
            .then(decodedData => {
                this.sounds[name] = decodedData;
                this.loadedSounds++;
                
                if (this.loadedSounds === this.totalSounds) {
                    console.log("[UI] All sounds loaded successfully");
                }
            })
            .catch(error => {
                console.error(`[UI] Failed to load sound "${name}":`, error);
            });
    },
    
    // Play a sound
    playSound: function(name) {
        if (!this.sounds[name]) {
            console.warn(`[UI] Sound "${name}" not found`);
            return;
        }
        
        try {
            // Simple audio element approach
            const soundClone = this.sounds[name].cloneNode();
            soundClone.volume = 0.5; // 50% volume
            soundClone.play().catch(e => {
                console.warn(`[UI] Failed to play sound: ${e.message}`);
            });
        } catch (error) {
            console.error(`[UI] Failed to play sound "${name}":`, error);
        }
    },
    
    // Original playSound method (for Web Audio API approach)
    playSound_original: function(name) {
        if (!this.sounds[name]) {
            console.warn(`[UI] Sound "${name}" not found`);
            return;
        }
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create sound source
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[name];
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.5; // 50% volume
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play sound
            source.start(0);
        } catch (error) {
            console.error(`[UI] Failed to play sound "${name}":`, error);
        }
    },
    
    // Setup UI event listeners
    setupEventListeners: function() {
        // Inventory button
        document.getElementById('inventory-button').addEventListener('click', this.toggleInventory.bind(this));
        document.getElementById('inventory-close').addEventListener('click', this.toggleInventory.bind(this));
        
        // Chat input
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        document.getElementById('send-chat-button').addEventListener('click', this.sendChatMessage.bind(this));
        
        // User popup close button
        document.getElementById('user-popup-close').addEventListener('click', this.hideUserPopup.bind(this));
        
        // Follow button in user popup
        document.getElementById('follow-button').addEventListener('click', this.toggleFollowUser.bind(this));
        
        // Chat button in user popup
        document.getElementById('chat-button').addEventListener('click', this.openDirectChat.bind(this));
        
        // Voice chat button in user popup
        document.getElementById('voice-chat-button').addEventListener('click', this.toggleVoiceChat.bind(this));
        
        // Trade button in user popup
        document.getElementById('trade-button').addEventListener('click', this.initiateTrade.bind(this));
        
        // Zap button in user popup
        document.getElementById('zap-button').addEventListener('click', this.initiateZap.bind(this));
        
        // Tab system
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab || e.target.dataset.type;
                if (tab) {
                    this.switchTab(tab, e.target.closest('.tab-container'));
                }
            });
        });
        
        // Relay selector
        document.getElementById('relay-selector').addEventListener('change', (e) => {
            const relayUrl = e.target.value;
            Nostr.setActiveRelay(relayUrl);
        });
        
        // Add relay button
        document.getElementById('add-relay-button').addEventListener('click', this.addCustomRelay.bind(this));
        
        // Add kind button
        document.getElementById('add-kind-button').addEventListener('click', this.addCustomKind.bind(this));
        
        // Action buttons
        document.getElementById('guild-button').addEventListener('click', () => this.showFeatureNotice('Guild'));
        document.getElementById('shop-button').addEventListener('click', () => this.showFeatureNotice('Shop'));
        document.getElementById('pet-button').addEventListener('click', () => this.showFeatureNotice('Pet'));
        document.getElementById('faction-button').addEventListener('click', () => this.showFeatureNotice('Faction'));
        document.getElementById('dungeon-button').addEventListener('click', () => this.showFeatureNotice('Dungeon'));
        document.getElementById('stash-button').addEventListener('click', () => this.showFeatureNotice('Stash'));
    },
    
    // Show login status
    setLoginStatus: function(message) {
        const statusElement = document.getElementById('login-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },
    
    // Hide login screen
    hideLoginScreen: function() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.opacity = 0;
            
            setTimeout(() => {
                loginScreen.style.display = 'none';
                
                // Show game UI
                document.getElementById('top-bar').classList.remove('hide');
                document.getElementById('player-profile').classList.remove('hide');
                document.getElementById('leaderboard-container').classList.remove('hide');
                document.getElementById('chat-container').classList.remove('hide');
                document.getElementById('mini-map').classList.remove('hide');
                
                // Show mobile controls on mobile devices
                if (window.innerWidth <= 768) {
                    document.getElementById('mobile-controls').classList.remove('hide');
                }
            }, 500);
        }
    },
    
    // Play login success sound
    playLoginSound: function() {
        this.playSound('login');
        
        // Trigger sound wave animation
        const soundWave = document.getElementById('sound-wave');
        soundWave.style.animation = 'sound-wave 2s ease-out';
        
        setTimeout(() => {
            soundWave.style.animation = 'none';
        }, 2000);
    },
    
    // Show toast notification
    showToast: function(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Play sound based on type
        if (type === 'success') {
            this.playSound('success');
        } else if (type === 'error') {
            this.playSound('error');
        }
        
        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },
    
    // Update player profile UI
    updatePlayerProfile: function() {
        document.getElementById('player-profile-image').src = Player.profile?.picture || 'assets/icons/default-avatar.png';
        document.getElementById('player-profile-name').textContent = Player.profile?.name || Utils.formatPubkey(Player.pubkey, { short: true });
        document.getElementById('player-profile-npub').textContent = Utils.formatPubkey(Player.pubkey, { short: true, useNpub: true });
        
        // Update stats
        document.getElementById('profile-level').textContent = Player.level;
        document.getElementById('profile-score').textContent = Utils.formatNumber(Player.score);
        document.getElementById('profile-items').textContent = Player.inventory.length;
        document.getElementById('profile-interactions').textContent = Player.interactions;
        document.getElementById('profile-zaps').textContent = Player.zapsSent + Player.zapsReceived;
        
        // Update score display in top bar
        document.getElementById('score-display').textContent = `Score: ${Utils.formatNumber(Player.score)}`;
    },
    
    // Update relay selector
    updateRelaySelector: function() {
        const selector = document.getElementById('relay-selector');
        selector.innerHTML = '';
        
        // Add all connected relays to the selector
        for (const relayUrl of Nostr.relays) {
            const option = document.createElement('option');
            option.value = relayUrl;
            option.textContent = relayUrl.replace('wss://', '');
            option.selected = relayUrl === Nostr.activeRelay;
            selector.appendChild(option);
        }
    },
    
    // Add a custom relay
    addCustomRelay: function() {
        const input = document.getElementById('custom-relay-input');
        let relayUrl = input.value.trim();
        
        if (!relayUrl) {
            this.showToast("Please enter a relay URL", "error");
            return;
        }
        
        // Ensure URL starts with wss://
        if (!relayUrl.startsWith('wss://')) {
            relayUrl = `wss://${relayUrl}`;
        }
        
        // Try to connect to relay
        Nostr.connectRelay(relayUrl)
            .then(() => {
                this.showToast(`Connected to relay: ${relayUrl}`, "success");
                this.updateRelaySelector();
                input.value = '';
            })
            .catch(error => {
                this.showToast(`Failed to connect to relay: ${error.message}`, "error");
            });
    },
    
    // Add a custom event kind
    addCustomKind: function() {
        const input = document.getElementById('custom-kind-input');
        const kindStr = input.value.trim();
        
        if (!kindStr) {
            this.showToast("Please enter an event kind", "error");
            return;
        }
        
        // Parse as integer
        const kind = parseInt(kindStr);
        
        if (isNaN(kind) || kind < 0) {
            this.showToast("Event kind must be a positive integer", "error");
            return;
        }
        
        // Add to subscribed kinds
        Game.subscribedKinds.add(kind);
        
        // Update kinds selector
        this.updateKindsSelector();
        
        // Clear input
        input.value = '';
        
        this.showToast(`Added event kind ${kind} to subscription`, "success");
    },
    
    // Update kinds selector
    updateKindsSelector: function() {
        const selector = document.getElementById('kinds-selector');
        selector.innerHTML = '';
        
        // Add all subscribed kinds to the selector
        for (const kind of Game.subscribedKinds) {
            const option = document.createElement('option');
            option.value = kind;
            option.textContent = `Kind ${kind}`;
            
            // Add human-readable names for known kinds
            switch (kind) {
                case 0:
                    option.textContent += " (Metadata)";
                    break;
                case 1:
                    option.textContent += " (Text Note)";
                    break;
                case 3:
                    option.textContent += " (Contacts)";
                    break;
                case 4:
                    option.textContent += " (Direct Message)";
                    break;
                case 9:
                    option.textContent += " (Chat)";
                    break;
                case 30023:
                    option.textContent += " (Long-form Content)";
                    break;
            }
            
            selector.appendChild(option);
        }
    },
    
    // Send a chat message
    sendChatMessage: function() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Send message to relays
        if (Nostr.publishChatMessage(message)) {
            // Add to chat UI immediately
            const username = Player.profile?.name || Utils.formatPubkey(Player.pubkey, { short: true });
            this.addChatMessage(username, message, true);
            
            // Clear input
            input.value = '';
            
            // Update player stats
            Player.chatMessages++;
            
            // Play sound
            this.playSound('chat');
        }
    },
    
    // Add a message to the chat UI
    addChatMessage: function(username, message, isFromMe = false) {
        const chatMessages = document.getElementById('chat-messages');
        
        // Create message element
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
        
        // Add message content
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = message;
        messageElement.appendChild(contentSpan);
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    // Show user popup
    showUserPopup: function(pubkey) {
        const user = Nostr.getUser(pubkey);
        if (!user) return;
        
        const popup = document.getElementById('user-popup');
        popup.dataset.pubkey = pubkey;
        
        // Update popup content
        document.getElementById('user-popup-image').src = user.profile?.picture || 'assets/icons/default-avatar.png';
        document.getElementById('user-popup-name').textContent = user.profile?.name || Utils.formatPubkey(pubkey, { short: true });
        document.getElementById('user-popup-npub').textContent = Utils.formatPubkey(pubkey, { short: true, useNpub: true });
        
        // Update user stats
        document.getElementById('user-level').textContent = user.level || '1';
        document.getElementById('user-score').textContent = Utils.formatNumber(user.score || 0);
        document.getElementById('user-guild').textContent = user.guild || 'None';
        document.getElementById('user-faction').textContent = user.faction || 'None';
        
        // Update follow button
        this.updateFollowButton(pubkey);
        
        // Update user notes
        this.updateUserNotes(pubkey);
        
        // Show popup
        popup.classList.remove('hide');
    },
    
    // Hide user popup
    hideUserPopup: function() {
        document.getElementById('user-popup').classList.add('hide');
    },
    
    // Update follow button based on follow status
    updateFollowButton: function(pubkey) {
        const followButton = document.getElementById('follow-button');
        const isFollowing = Nostr.isFollowing(pubkey);
        
        followButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
        followButton.className = isFollowing ? 'user-popup-button following' : 'user-popup-button';
    },
    
    // Toggle follow status for a user
    toggleFollowUser: function() {
        const popup = document.getElementById('user-popup');
        const pubkey = popup.dataset.pubkey;
        
        if (!pubkey) return;
        
        const isFollowing = Nostr.isFollowing(pubkey);
        
        if (isFollowing) {
            // Unfollow
            Nostr.unfollowUser(pubkey)
                .then(() => {
                    this.updateFollowButton(pubkey);
                    this.showToast(`Unfollowed ${Nostr.getUser(pubkey)?.profile?.name || Utils.formatPubkey(pubkey, { short: true })}`, "info");
                })
                .catch(error => {
                    this.showToast(`Failed to unfollow: ${error.message}`, "error");
                });
        } else {
            // Follow
            Nostr.followUser(pubkey)
                .then(() => {
                    this.updateFollowButton(pubkey);
                    this.showToast(`Following ${Nostr.getUser(pubkey)?.profile?.name || Utils.formatPubkey(pubkey, { short: true })}`, "success");
                    
                    // Update player stats
                    Player.follows++;
                    Player.interactions++;
                    Player.score += 50;
                    Nostr.publishScoreEvent();
                    this.updatePlayerProfile();
                })
                .catch(error => {
                    this.showToast(`Failed to follow: ${error.message}`, "error");
                });
        }
    },
    
    // Update user notes in popup
    updateUserNotes: function(pubkey) {
        const user = Nostr.getUser(pubkey);
        if (!user) return;
        
        const notesContainer = document.getElementById('user-notes');
        notesContainer.innerHTML = '';
        
        if (!user.notes || user.notes.length === 0) {
            notesContainer.innerHTML = '<div class="no-notes">No recent notes found</div>';
            return;
        }
        
        // Add each note
        for (let i = 0; i < Math.min(user.notes.length, 5); i++) {
            const note = user.notes[i];
            
            const noteElement = document.createElement('div');
            noteElement.className = 'user-note';
            
            // Add note content
            const contentElement = document.createElement('div');
            contentElement.className = 'user-note-content';
            contentElement.textContent = note.content;
            noteElement.appendChild(contentElement);
            
            // Add timestamp
            const timestampElement = document.createElement('div');
            timestampElement.className = 'user-note-timestamp';
            timestampElement.textContent = Utils.formatDate(note.created_at);
            noteElement.appendChild(timestampElement);
            
            // Add note to container
            notesContainer.appendChild(noteElement);
        }
    },
    
    // Open direct chat with user
    openDirectChat: function() {
        // To be implemented
        this.showFeatureNotice('Direct Chat');
    },
    
    // Toggle voice chat
    toggleVoiceChat: function() {
        if (Audio.isVoiceChatActive) {
            Audio.stopVoiceChat();
            this.showToast("Voice chat disabled", "info");
        } else {
            Audio.startVoiceChat()
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
    
    // Initiate trade with user
    initiateTrade: function() {
        // To be implemented
        this.showFeatureNotice('Trading');
    },
    
    // Initiate zap
    initiateZap: function() {
        const popup = document.getElementById('user-popup');
        const pubkey = popup.dataset.pubkey;
        
        if (!pubkey) return;
        
        // Show zap interface
        Zaps.showZapInterface(pubkey);
    },
    
    // Toggle inventory
    toggleInventory: function() {
        const inventory = document.getElementById('inventory-interface');
        
        if (inventory.classList.contains('hide')) {
            // Show inventory
            this.updateInventoryUI();
            inventory.classList.remove('hide');
        } else {
            // Hide inventory
            inventory.classList.add('hide');
        }
    },
    
    // Update inventory UI
    updateInventoryUI: function() {
        const container = document.getElementById('inventory-content');
        container.innerHTML = '';
        
        if (Player.inventory.length === 0) {
            container.innerHTML = '<div class="empty-inventory">Your inventory is empty</div>';
            return;
        }
        
        // Group items by category
        const itemsByCategory = {};
        
        for (const item of Player.inventory) {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            
            itemsByCategory[item.category].push(item);
        }
        
        // Add items to UI
        for (const item of Player.inventory) {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.dataset.id = item.id;
            
            // Add item icon
            const iconElement = document.createElement('div');
            iconElement.className = 'inventory-item-icon';
            iconElement.textContent = item.emoji;
            itemElement.appendChild(iconElement);
            
            // Add item name
            const nameElement = document.createElement('div');
            nameElement.className = 'inventory-item-name';
            nameElement.textContent = item.name;
            itemElement.appendChild(nameElement);
            
            // Add item rarity if available
            if (item.rarity) {
                const rarityElement = document.createElement('div');
                rarityElement.className = `inventory-item-rarity rarity-${item.rarity.toLowerCase()}`;
                rarityElement.textContent = Items.rarity[item.rarity].name;
                itemElement.appendChild(rarityElement);
            }
            
            // Add click handler
            itemElement.addEventListener('click', () => {
                this.showItemDetails(item);
            });
            
            // Add to container
            container.appendChild(itemElement);
        }
    },
    
    // Show item details
    showItemDetails: function(item) {
        // Create a modal for item details
        const modal = document.createElement('div');
        modal.className = 'item-details-modal';
        modal.innerHTML = `
            <div class="item-details-content">
                <div class="item-details-header">
                    <div class="item-icon">${item.emoji}</div>
                    <div class="item-title">
                        <h3>${item.name}</h3>
                        ${item.rarity ? `<div class="item-rarity rarity-${item.rarity.toLowerCase()}">${Items.rarity[item.rarity].name}</div>` : ''}
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
                    ${item.category === Items.categories.CONSUMABLE ? '<button class="item-action-button use-button">Use</button>' : ''}
                    ${item.category === Items.categories.EQUIPMENT ? '<button class="item-action-button equip-button">Equip</button>' : ''}
                    ${item.category === Items.categories.PET ? '<button class="item-action-button equip-pet-button">Equip Pet</button>' : ''}
                    <button class="item-action-button drop-button">Drop</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButton = modal.querySelector('.item-close-button');
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
        
        // Use button
        const useButton = modal.querySelector('.use-button');
        if (useButton) {
            useButton.addEventListener('click', () => {
                const result = Items.useItem(item.id);
                
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
                const result = Items.equipItem(item.id);
                
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
                const result = Items.equipPet(item.id);
                
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
                    // Remove from inventory
                    const index = Player.inventory.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        Player.inventory.splice(index, 1);
                        
                        // Update UI
                        this.updateInventoryUI();
                        this.updatePlayerProfile();
                        this.showToast(`Dropped ${item.name}`, "info");
                        modal.remove();
                    }
                }
            });
        }
    },
    
    // Show quest display
    updateQuestDisplay: function() {
        const questDisplay = document.getElementById('quest-display');
        
        if (!Game.quests.active) {
            questDisplay.classList.add('hide');
            return;
        }
        
        // Update quest information
        questDisplay.innerHTML = `
            <div class="quest-title">${Game.quests.active.name}</div>
            <div class="quest-description">${Game.quests.active.description}</div>
            <div class="quest-progress-container">
                <div class="quest-progress-text">Progress: ${Game.quests.active.progress} / ${Game.quests.active.target}</div>
                <div class="quest-progress-bar">
                    <div class="quest-progress-fill" style="width: ${Math.min(100, (Game.quests.active.progress / Game.quests.active.target) * 100)}%"></div>
                </div>
            </div>
            <div class="quest-reward">Reward: ${Game.quests.active.reward} points</div>
        `;
        
        // Show quest display
        questDisplay.classList.remove('hide');
    },
    
    // Update leaderboard
    updateLeaderboard: function() {
        const leaderboardEntries = document.getElementById('leaderboard-entries');
        
        // Clear previous entries
        leaderboardEntries.innerHTML = '';
        
        // Get active tab
        const activeTab = document.querySelector('#leaderboard-tabs .tab-button.active');
        const type = activeTab ? activeTab.dataset.type : 'score';
        
        // Get users sorted by score
        const users = Array.from(Nostr.users.values())
            .filter(user => user.pubkey !== Player.pubkey) // Exclude current player
            .sort((a, b) => {
                if (type === 'score') {
                    return (b.score || 0) - (a.score || 0);
                } else if (type === 'items') {
                    return (b.itemsCollected || 0) - (a.itemsCollected || 0);
                } else if (type === 'quests') {
                    return (b.questsCompleted || 0) - (a.questsCompleted || 0);
                } else if (type === 'zaps') {
                    const bZaps = (b.zapsSent || 0) + (b.zapsReceived || 0);
                    const aZaps = (a.zapsSent || 0) + (a.zapsReceived || 0);
                    return bZaps - aZaps;
                }
                return 0;
            });
        
        // Add current player to the list
        users.unshift({
            pubkey: Player.pubkey,
            profile: Player.profile,
            score: Player.score,
            itemsCollected: Player.itemsCollected,
            questsCompleted: Player.completedQuests.length,
            zapsSent: Player.zapsSent,
            zapsReceived: Player.zapsReceived
        });
        
        // Add top entries to leaderboard
        for (let i = 0; i < Math.min(users.length, 10); i++) {
            const user = users[i];
            
            // Create leaderboard entry
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            
            // Rank
            const rank = document.createElement('div');
            rank.className = 'leaderboard-rank';
            rank.textContent = i + 1;
            entry.appendChild(rank);
            
            // Avatar
            const avatar = document.createElement('img');
            avatar.className = 'leaderboard-avatar';
            avatar.src = user.profile?.picture || 'assets/icons/default-avatar.png';
            avatar.alt = 'Avatar';
            entry.appendChild(avatar);
            
            // Info
            const info = document.createElement('div');
            info.className = 'leaderboard-info';
            
            // Name
            const name = document.createElement('div');
            name.className = 'leaderboard-name';
            name.textContent = user.profile?.name || Utils.formatPubkey(user.pubkey, { short: true });
            info.appendChild(name);
            
            // Score
            const score = document.createElement('div');
            score.className = 'leaderboard-score';
            
            if (type === 'score') {
                score.textContent = `${Utils.formatNumber(user.score || 0)} pts`;
            } else if (type === 'items') {
                score.textContent = `${Utils.formatNumber(user.itemsCollected || 0)} items`;
            } else if (type === 'quests') {
                score.textContent = `${Utils.formatNumber(user.questsCompleted || 0)} quests`;
            } else if (type === 'zaps') {
                const total = (user.zapsSent || 0) + (user.zapsReceived || 0);
                score.textContent = `${Utils.formatNumber(total)} zaps`;
            }
            
            info.appendChild(score);
            entry.appendChild(info);
            
            // Add highlight for current player
            if (user.pubkey === Player.pubkey) {
                entry.classList.add('current-player');
            }
            
            // Add click handler to show user popup
            if (user.pubkey !== Player.pubkey) {
                entry.addEventListener('click', () => {
                    this.showUserPopup(user.pubkey);
                });
            }
            
            // Add to container
            leaderboardEntries.appendChild(entry);
        }
    },
    
    // Switch tabs
    switchTab: function(tabId, container) {
        // Get all tab buttons in this container
        const tabButtons = container.querySelectorAll('.tab-button');
        
        // Remove active class from all tabs
        tabButtons.forEach(button => {
            button.classList.remove('active');
            
            // Add active to matching tab
            if (button.dataset.tab === tabId || button.dataset.type === tabId) {
                button.classList.add('active');
            }
        });
        
        // Handle specific tab containers
        if (container.id === 'leaderboard-tabs') {
            this.updateLeaderboard();
        } else if (container.id === 'inventory-tabs') {
            this.updateInventoryUI();
        }
    },
    
    // Show feature not implemented notice
    showFeatureNotice: function(featureName) {
        this.showToast(`${featureName} feature coming soon!`, "info");
    },
    
    // Update weather effects
    updateWeatherEffects: function(weather) {
        const weatherOverlay = document.getElementById('weather-overlay');
        
        // Clear existing effects
        weatherOverlay.innerHTML = '';
        weatherOverlay.className = 'weather-effect';
        
        if (weather === 'rain') {
            weatherOverlay.classList.add('rain');
            
            // Add raindrops
            for (let i = 0; i < 100; i++) {
                const raindrop = document.createElement('div');
                raindrop.className = 'raindrop';
                raindrop.style.left = `${Math.random() * 100}%`;
                raindrop.style.animationDelay = `${Math.random() * 2}s`;
                weatherOverlay.appendChild(raindrop);
            }
        } else if (weather === 'storm') {
            weatherOverlay.classList.add('storm');
            
            // Add raindrops
            for (let i = 0; i < 200; i++) {
                const raindrop = document.createElement('div');
                raindrop.className = 'raindrop';
                raindrop.style.left = `${Math.random() * 100}%`;
                raindrop.style.animationDelay = `${Math.random() * 2}s`;
                weatherOverlay.appendChild(raindrop);
            }
            
            // Add lightning flash
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            weatherOverlay.appendChild(lightning);
            
            // Trigger lightning occasionally
            setInterval(() => {
                if (Game.weather.current === 'storm') {
                    lightning.style.display = 'block';
                    setTimeout(() => {
                        lightning.style.display = 'none';
                    }, 100);
                }
            }, 5000 + Math.random() * 10000);
        }
    },
    
    // Update user information in popup
    updateUserPopup: function(pubkey) {
        const user = Nostr.getUser(pubkey);
        if (!user) return;
        
        const popup = document.getElementById('user-popup');
        if (popup.classList.contains('hide') || popup.dataset.pubkey !== pubkey) return;
        
        // Update popup content
        document.getElementById('user-popup-image').src = user.profile?.picture || 'assets/icons/default-avatar.png';
        document.getElementById('user-popup-name').textContent = user.profile?.name || Utils.formatPubkey(pubkey, { short: true });
        document.getElementById('user-popup-npub').textContent = Utils.formatPubkey(pubkey, { short: true, useNpub: true });
        
        // Update user stats
        document.getElementById('user-level').textContent = user.level || '1';
        document.getElementById('user-score').textContent = Utils.formatNumber(user.score || 0);
        document.getElementById('user-guild').textContent = user.guild || 'None';
        document.getElementById('user-faction').textContent = user.faction || 'None';
        
        // Update follow button
        this.updateFollowButton(pubkey);
        
        // Update user notes
        this.updateUserNotes(pubkey);
    },
    
    // Add a direct message to the chat
    addDirectMessage: function(username, message, isFromMe = false) {
        const dmContainer = document.getElementById('direct-message-content');
        if (!dmContainer) return;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `dm-message ${isFromMe ? 'from-me' : 'from-them'}`;
        
        // Add message content
        const contentElement = document.createElement('div');
        contentElement.className = 'dm-content';
        contentElement.textContent = message;
        messageElement.appendChild(contentElement);
        
        // Add timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'dm-timestamp';
        timestampElement.textContent = new Date().toLocaleTimeString();
        messageElement.appendChild(timestampElement);
        
        // Add to container
        dmContainer.appendChild(messageElement);
        
        // Scroll to bottom
        dmContainer.scrollTop = dmContainer.scrollHeight;
    }
};
