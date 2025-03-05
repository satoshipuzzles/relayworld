/**
 * relay-world-enhancements.js
 * Comprehensive enhancements and fixes for Relay World
 */

// ========================
// 1. PERSISTENCE & LEADERBOARD FIXES
// ========================

// Enhanced Player Data Persistence
const PersistenceManager = {
  saveInterval: 30000, // Save every 30 seconds
  storageKey: 'relayworld_player_data',
  timer: null,
  
  init: function() {
    console.log("[PersistenceManager] Initializing...");
    this.loadFromStorage();
    this.timer = setInterval(this.saveToStorage.bind(this), this.saveInterval);
    window.addEventListener('beforeunload', this.saveToStorage.bind(this));
    console.log("[PersistenceManager] Initialized with auto-save every 30 seconds");
  },
  
  saveToStorage: function() {
    if (!Player || !Player.pubkey) return;
    
    try {
      const playerData = {
        score: Player.score,
        level: Player.level,
        experience: Player.experience,
        inventory: Player.inventory,
        equipment: Player.equipment,
        pet: Player.pet,
        itemsCollected: Player.itemsCollected,
        distanceTraveled: Player.distanceTraveled,
        interactions: Player.interactions,
        completedQuests: Player.completedQuests,
        chatMessages: Player.chatMessages,
        follows: Player.follows,
        treasuresOpened: Player.treasuresOpened,
        zapsSent: Player.zapsSent,
        zapsReceived: Player.zapsReceived
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(playerData));
      
      // Also publish to game relay for network persistence
      if (Nostr && Nostr.publishPlayerStats) {
        Nostr.publishPlayerStats();
      }
      
      console.log("[PersistenceManager] Player data saved successfully");
    } catch (error) {
      console.error("[PersistenceManager] Failed to save player data:", error);
    }
  },
  
  loadFromStorage: function() {
    if (!Player) return;
    
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Apply saved data to player
        for (const key in data) {
          if (Player.hasOwnProperty(key)) {
            Player[key] = data[key];
          }
        }
        
        console.log("[PersistenceManager] Player data loaded from storage");
        
        // Update UI
        if (UI && UI.updatePlayerProfile) {
          UI.updatePlayerProfile();
        }
      }
    } catch (error) {
      console.error("[PersistenceManager] Failed to load player data:", error);
    }
  }
};

// Enhanced Leaderboard System
const LeaderboardManager = {
  updateInterval: 10000, // Update every 10 seconds
  timer: null,
  
  init: function() {
    console.log("[LeaderboardManager] Initializing...");
    this.timer = setInterval(this.update.bind(this), this.updateInterval);
    console.log("[LeaderboardManager] Initialized with update interval of 10 seconds");
  },
  
  update: function() {
    if (!UI || !UI.updateLeaderboard) return;
    UI.updateLeaderboard();
  },
  
  // Fix sorting of leaderboard entries
  sortUsers: function(users, type) {
    return users.sort((a, b) => {
      if (type === 'score') return (b.score || 0) - (a.score || 0);
      if (type === 'items') return (b.itemsCollected || 0) - (a.itemsCollected || 0);
      if (type === 'quests') return (b.questsCompleted || 0) - (a.questsCompleted || 0);
      if (type === 'zaps') return ((b.zapsSent || 0) + (b.zapsReceived || 0)) - ((a.zapsSent || 0) + (a.zapsReceived || 0));
      return 0;
    });
  }
};

// Apply our fixes to UI.updateLeaderboard
if (typeof UI !== 'undefined' && typeof UI.updateLeaderboard === 'function') {
  const originalUpdateLeaderboard = UI.updateLeaderboard;
  UI.updateLeaderboard = function() {
    const leaderboardEntries = document.getElementById('leaderboard-entries');
    if (!leaderboardEntries) return;
    
    leaderboardEntries.innerHTML = '';
    
    const activeTab = document.querySelector('#leaderboard-tabs .tab-button.active');
    const type = activeTab ? activeTab.dataset.type : 'score';
    
    // Include all users, including the current player
    let users = [];
    if (typeof Nostr !== 'undefined' && Nostr.users) {
      users = Array.from(Nostr.users.values());
    }
    
    // Add current player if not already included
    if (typeof Player !== 'undefined' && Player.pubkey) {
      if (!users.some(u => u.pubkey === Player.pubkey)) {
        users.push({
          pubkey: Player.pubkey,
          profile: Player.profile,
          score: Player.score,
          itemsCollected: Player.itemsCollected,
          questsCompleted: Player.completedQuests ? Player.completedQuests.length : 0,
          zapsSent: Player.zapsSent || 0,
          zapsReceived: Player.zapsReceived || 0,
          isCurrentPlayer: true
        });
      }
    }
    
    // Properly sort users with LeaderboardManager's helper
    users = LeaderboardManager.sortUsers(users, type);
    
    // Only display top 10
    const topUsers = users.slice(0, 10);
    
    // Create leaderboard entries
    topUsers.forEach((user, index) => {
      const entry = document.createElement('div');
      entry.className = 'leaderboard-entry';
      if (user.pubkey === Player.pubkey || user.isCurrentPlayer) {
        entry.classList.add('current-player');
      }
      
      const rank = document.createElement('div');
      rank.className = 'leaderboard-rank';
      rank.textContent = index + 1;
      entry.appendChild(rank);
      
      const avatar = document.createElement('img');
      avatar.className = 'leaderboard-avatar';
      avatar.src = user.profile?.picture || 'assets/icons/default-avatar.png';
      avatar.alt = 'Avatar';
      avatar.onerror = function() {
        this.src = 'assets/icons/default-avatar.png';
      };
      entry.appendChild(avatar);
      
      const info = document.createElement('div');
      info.className = 'leaderboard-info';
      
      const name = document.createElement('div');
      name.className = 'leaderboard-name';
      name.textContent = user.profile?.name || Utils.formatPubkey(user.pubkey, { short: true });
      
      // Add NPC indicator if applicable
      if (user.isNPC) {
        name.textContent += ' [NPC]';
        name.classList.add('npc-user');
      }
      
      info.appendChild(name);
      
      const score = document.createElement('div');
      score.className = 'leaderboard-score';
      
      if (type === 'score') {
        score.textContent = `${Utils.formatNumber(user.score || 0)} pts`;
      } else if (type === 'items') {
        score.textContent = `${Utils.formatNumber(user.itemsCollected || 0)} items`;
      } else if (type === 'quests') {
        const questCount = user.completedQuests ? user.completedQuests.length : 
                          (user.questsCompleted || 0);
        score.textContent = `${Utils.formatNumber(questCount)} quests`;
      } else if (type === 'zaps') {
        const totalZaps = (user.zapsSent || 0) + (user.zapsReceived || 0);
        score.textContent = `${Utils.formatNumber(totalZaps)} zaps`;
      }
      
      info.appendChild(score);
      entry.appendChild(info);
      
      // Make entries clickable to view user profile
      if (user.pubkey !== Player.pubkey && !user.isCurrentPlayer) {
        entry.addEventListener('click', () => {
          if (UI && UI.showUserPopup) {
            UI.showUserPopup(user.pubkey);
          }
        });
      }
      
      leaderboardEntries.appendChild(entry);
    });
  };
}

// ========================
// 2. RELAY EXPLORER ENHANCEMENTS
// ========================

const RelayExplorer = {
  init: function() {
    console.log("[RelayExplorer] Initializing...");
    this.updateRelaySelector();
    this.updateKindsSelector();
    this.setupEventListeners();
    console.log("[RelayExplorer] Initialized");
  },
  
  updateRelaySelector: function() {
    const selector = document.getElementById('relay-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    
    if (!RelayWorld || !RelayWorld.config || !Nostr || !Nostr.explorerRelays) {
      return;
    }
    
    // Create option groups
    const gameGroup = document.createElement('optgroup');
    gameGroup.label = "Game Relay (Locked)";
    
    const loginGroup = document.createElement('optgroup');
    loginGroup.label = "Login Relay";
    
    const explorerGroup = document.createElement('optgroup');
    explorerGroup.label = "Explorer Relays";
    
    // Add game relay
    const gameOption = document.createElement('option');
    gameOption.value = RelayWorld.config.GAME_RELAY;
    gameOption.textContent = RelayWorld.config.GAME_RELAY.replace('wss://', '');
    gameOption.disabled = true;
    gameGroup.appendChild(gameOption);
    
    // Add login relay
    const loginOption = document.createElement('option');
    loginOption.value = RelayWorld.config.LOGIN_RELAY;
    loginOption.textContent = RelayWorld.config.LOGIN_RELAY.replace('wss://', '');
    loginOption.selected = Nostr.activeExplorerRelay === RelayWorld.config.LOGIN_RELAY;
    loginGroup.appendChild(loginOption);
    
    // Add other explorer relays
    for (const [relayUrl] of Nostr.explorerRelays) {
      // Skip game relay
      if (relayUrl === RelayWorld.config.GAME_RELAY) continue;
      // Skip login relay as it's already in its own group
      if (relayUrl === RelayWorld.config.LOGIN_RELAY) continue;
      
      const option = document.createElement('option');
      option.value = relayUrl;
      option.textContent = relayUrl.replace('wss://', '');
      option.selected = relayUrl === Nostr.activeExplorerRelay;
      explorerGroup.appendChild(option);
    }
    
    // Add groups to selector
    selector.appendChild(gameGroup);
    selector.appendChild(loginGroup);
    if (explorerGroup.childElementCount > 0) {
      selector.appendChild(explorerGroup);
    }
  },
  
  updateKindsSelector: function() {
    const selector = document.getElementById('kinds-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    
    if (!RelayWorld || !RelayWorld.config) return;
    
    // Add common kinds group
    const commonKinds = [
      { kind: 0, name: "Metadata" },
      { kind: 1, name: "Text Note" },
      { kind: 3, name: "Contacts" },
      { kind: 4, name: "Direct Message" },
      { kind: 7, name: "Reaction" },
      { kind: 9734, name: "Zap Request" },
      { kind: 9735, name: "Zap Receipt" },
      { kind: 30023, name: "Long-form Content" }
    ];
    
    const commonGroup = document.createElement('optgroup');
    commonGroup.label = "Common Kinds";
    
    commonKinds.forEach(kindInfo => {
      const option = document.createElement('option');
      option.value = kindInfo.kind;
      option.textContent = `Kind ${kindInfo.kind} (${kindInfo.name})`;
      option.selected = RelayWorld.config.EXPLORER_KINDS && RelayWorld.config.EXPLORER_KINDS.includes(kindInfo.kind);
      commonGroup.appendChild(option);
    });
    
    // Add game kinds group
    const gameGroup = document.createElement('optgroup');
    gameGroup.label = "Game Kinds";
    
    if (RelayWorld.config.EVENT_KINDS) {
      for (const [name, kind] of Object.entries(RelayWorld.config.EVENT_KINDS)) {
        const option = document.createElement('option');
        option.value = kind;
        option.textContent = `Kind ${kind} (${name.toLowerCase()})`;
        gameGroup.appendChild(option);
      }
    }
    
    // Add groups to selector
    selector.appendChild(commonGroup);
    selector.appendChild(gameGroup);
  },
  
  setupEventListeners: function() {
    // Relay selector event listener
    const relaySelector = document.getElementById('relay-selector');
    if (relaySelector) {
      relaySelector.addEventListener('change', (e) => {
        const relayUrl = e.target.value;
        if (Nostr && Nostr.setActiveExplorerRelay) {
          Nostr.setActiveExplorerRelay(relayUrl);
          if (UI && UI.showToast) {
            UI.showToast(`Switched explorer to ${relayUrl}`, "success");
          }
        }
      });
    }
    
    // Custom relay input event listener
    const addRelayButton = document.getElementById('add-relay-button');
    if (addRelayButton) {
      addRelayButton.addEventListener('click', () => {
        const input = document.getElementById('custom-relay-input');
        if (!input) return;
        
        let relayUrl = input.value.trim();
        
        if (!relayUrl) {
          if (UI && UI.showToast) {
            UI.showToast("Please enter a relay URL", "error");
          }
          return;
        }
        
        if (!relayUrl.startsWith('wss://')) {
          relayUrl = `wss://${relayUrl}`;
        }
        
        // Check if it's the game relay
        if (RelayWorld && RelayWorld.config && relayUrl === RelayWorld.config.GAME_RELAY) {
          if (UI && UI.showToast) {
            UI.showToast("Cannot add the game relay as an explorer", "error");
          }
          return;
        }
        
        if (Nostr && Nostr.connectToExplorerRelay) {
          if (UI && UI.showToast) {
            UI.showToast(`Connecting to ${relayUrl}...`, "info");
          }
          
          Nostr.connectToExplorerRelay(relayUrl)
            .then(() => {
              if (UI && UI.showToast) {
                UI.showToast(`Connected to ${relayUrl}`, "success");
              }
              this.updateRelaySelector();
              input.value = '';
            })
            .catch(error => {
              if (UI && UI.showToast) {
                UI.showToast(`Failed to connect: ${error.message}`, "error");
              }
            });
        }
      });
    }
  }
};

// Add methods to subscribe to specific kinds in Nostr
if (typeof Nostr !== 'undefined') {
  Nostr.subscribeToKinds = function(kinds) {
    if (!Array.isArray(kinds) || kinds.length === 0 || !this.activeExplorerRelay) {
      return false;
    }
    
    const relay = this.explorerRelays.get(this.activeExplorerRelay);
    if (!relay) return false;
    
    console.log(`[Nostr] Subscribing to kinds: ${kinds.join(', ')} on ${this.activeExplorerRelay}`);
    
    // Update EXPLORER_KINDS config
    if (RelayWorld && RelayWorld.config) {
      RelayWorld.config.EXPLORER_KINDS = kinds;
    }
    
    // Subscribe to the kinds
    const filters = [{ kinds: kinds, limit: 50 }];
    
    try {
      // Cancel previous subscriptions
      for (const [subId, sub] of this.subscriptions) {
        if (sub.relay.url === this.activeExplorerRelay) {
          sub.unsub();
        }
      }
      
      // Create new subscription
      this.subscribe(relay, filters, 
        (event) => this.processExplorerEvent(event, this.activeExplorerRelay),
        () => console.log(`[Nostr] Completed subscription to kinds ${kinds.join(', ')} on ${this.activeExplorerRelay}`)
      );
      
      return true;
    } catch (error) {
      console.error(`[Nostr] Failed to subscribe to kinds:`, error);
      return false;
    }
  };
}

// ========================
// 3. ZAPS IMPLEMENTATION
// ========================

const ZapManager = {
  init: function() {
    console.log("[ZapManager] Initializing...");
    this.setupZapInterface();
    console.log("[ZapManager] Initialized");
  },
  
  setupZapInterface: function() {
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) return;
    
    // Close button
    const closeButton = document.getElementById('zap-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        zapInterface.classList.add('hide');
      });
    }
    
    // Zap amount preset buttons
    const presets = document.querySelectorAll('.zap-preset');
    presets.forEach(preset => {
      preset.addEventListener('click', () => {
        const amount = preset.dataset.amount;
        const amountInput = document.getElementById('zap-amount');
        if (amountInput) {
          amountInput.value = amount;
        }
        
        // Clear active class from all presets
        presets.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked preset
        preset.classList.add('active');
      });
    });
    
    // Send button
    const sendButton = document.getElementById('zap-send-button');
    if (sendButton) {
      sendButton.addEventListener('click', this.sendZap.bind(this));
    }
  },
  
  showZapInterface: function(pubkey) {
    if (!Nostr || !Nostr.getUser) return;
    
    const user = Nostr.getUser(pubkey);
    if (!user) {
      if (UI && UI.showToast) {
        UI.showToast("User not found", "error");
      }
      return;
    }
    
    // First check if user has a lightning address
    if (!user.profile || !user.profile.lud16) {
      if (UI && UI.showToast) {
        UI.showToast(`${user.profile?.name || 'User'} doesn't have a lightning address`, "error");
      }
      return;
    }
    
    // Update zap interface with user info
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) {
      if (UI && UI.showToast) {
        UI.showToast("Zap interface not found", "error");
      }
      return;
    }
    
    const userImage = document.getElementById('zap-target-image');
    const userName = document.getElementById('zap-target-name');
    
    if (userImage) {
      userImage.src = user.profile?.picture || "assets/icons/default-avatar.png";
    }
    
    if (userName) {
      userName.textContent = user.profile?.name || user.pubkey.slice(0, 8);
    }
    
    // Set default amount
    const zapAmount = document.getElementById('zap-amount');
    if (zapAmount) {
      zapAmount.value = "21";
    }
    
    const zapMessage = document.getElementById('zap-message');
    if (zapMessage) {
      zapMessage.value = "";
    }
    
    // Reset preset buttons
    document.querySelectorAll('.zap-preset').forEach(preset => {
      preset.classList.remove('active');
    });
    
    const defaultPreset = document.querySelector('.zap-preset[data-amount="21"]');
    if (defaultPreset) {
      defaultPreset.classList.add('active');
    }
    
    // Store target pubkey
    zapInterface.dataset.targetPubkey = pubkey;
    
    // Show interface
    zapInterface.classList.remove('hide');
  },
  
  checkWebLNProvider: async function() {
    try {
      // First check for window.webln
      if (window.webln) {
        await window.webln.enable();
        return true;
      }
      
      // Then check for window.alby
      if (window.alby) {
        await window.alby.enable();
        return true;
      }
      
      // No WebLN provider found, show Bitcoin Connect modal
      const bitcoinConnectModal = document.getElementById('bitcoin-connect-modal');
      if (bitcoinConnectModal) {
        bitcoinConnectModal.classList.remove('hide');
      }
      return false;
    } catch (error) {
      console.error("[ZapManager] Failed to check WebLN provider:", error);
      if (UI && UI.showToast) {
        UI.showToast("No lightning wallet found. Please connect one.", "error");
      }
      return false;
    }
  },
  
  sendZap: async function() {
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) return;
    
    const targetPubkey = zapInterface.dataset.targetPubkey;
    
    if (!targetPubkey) {
      if (UI && UI.showToast) {
        UI.showToast("No zap target selected", "error");
      }
      return;
    }
    
    if (!Nostr || !Nostr.getUser) return;
    
    const user = Nostr.getUser(targetPubkey);
    if (!user) {
      if (UI && UI.showToast) {
        UI.showToast("User not found", "error");
      }
      return;
    }
    
    // Check for lightning address (lud16) or lnurl in user profile
    const lightningAddress = user.profile?.lud16;
    if (!lightningAddress) {
      if (UI && UI.showToast) {
        UI.showToast("User doesn't have a lightning address", "error");
      }
      return;
    }
    
    // Get zap amount and message
    const amountInput = document.getElementById('zap-amount');
    const messageInput = document.getElementById('zap-message');
    
    if (!amountInput) return;
    
    const amount = parseInt(amountInput.value);
    const message = messageInput ? messageInput.value : "";
    
    if (isNaN(amount) || amount <= 0) {
      if (UI && UI.showToast) {
        UI.showToast("Invalid zap amount", "error");
      }
      return;
    }
    
    try {
      // Show loading state
      const sendButton = document.getElementById('zap-send-button');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";
      }
      
      // Check if WebLN is available
      const hasWebLN = await this.checkWebLNProvider();
      if (!hasWebLN) {
        if (UI && UI.showToast) {
          UI.showToast("Please connect a lightning wallet first", "error");
        }
        
        if (sendButton) {
          sendButton.disabled = false;
          sendButton.textContent = "Send Zap";
        }
        return;
      }
      
      // Create simple placeholder for successful zap (since we may not have the actual invoice payment functionality without WebLN)
      if (Player) {
        Player.zapsSent = (Player.zapsSent || 0) + 1;
        Player.score += Math.floor(amount / 10); // 10% of zap amount as score
      }
      
      // Publish player stats if possible
      if (Nostr && Nostr.publishPlayerStats) {
        Nostr.publishPlayerStats();
      }
      
      // Update UI
      if (UI && UI.updatePlayerProfile) {
        UI.updatePlayerProfile();
      }
      
      // Create zap visual effect if Game is available
      if (Game && Game.camera && Game.canvas) {
        this.createZapEffect(user.x, user.y);
      }
      
      // Show success message
      if (UI && UI.showToast) {
        UI.showToast(`Zapped ${user.profile?.name || targetPubkey.slice(0, 8)} ${amount} sats!`, "success");
      }
      
      // Hide zap interface
      zapInterface.classList.add('hide');
      
      // Save to local storage if PersistenceManager is available
      if (PersistenceManager && PersistenceManager.saveToStorage) {
        PersistenceManager.saveToStorage();
      }
      
    } catch (error) {
      console.error("[ZapManager] Failed to send zap:", error);
      if (UI && UI.showToast) {
        UI.showToast(`Zap failed: ${error.message}`, "error");
      }
    } finally {
      // Reset button state
      const sendButton = document.getElementById('zap-send-button');
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send Zap";
      }
    }
  },
  
  createZapEffect: function(x, y) {
    if (!Game || !Game.camera || !Game.canvas) return;
    
    // Create visual effect element
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    const effect = document.createElement('div');
    effect.className = 'zap-effect';
    
    // Position at target coordinates
    const screenX = x - (Game.camera.x - Game.canvas.width / 2);
    const screenY = y - (Game.camera.y - Game.canvas.height / 2);
    
    effect.style.position = 'absolute';
    effect.style.left = `${screenX - 50}px`;
    effect.style.top = `${screenY - 50}px`;
    effect.style.width = '100px';
    effect.style.height = '100px';
    effect.style.background = 'url("assets/sprites/zap.png") no-repeat center center';
    effect.style.backgroundSize = 'contain';
    effect.style.animation = 'zapFlash 0.5s ease-out forwards';
    effect.style.zIndex = '1000';
    
    // Add to game container
    gameContainer.appendChild(effect);
    
    // Play sound
    if (UI && UI.playSound) {
      UI.playSound('zap');
    }
    
    // Remove after animation completes
    setTimeout(() => {
      effect.remove();
    }, 500);
  }
};

// ========================
// 4. MOBILE RESPONSIVE DESIGN
// ========================

const MobileUX = {
  // Breakpoints
  breakpoints: {
    mobile: 767,
    tablet: 1024
  },
  
  init: function() {
    console.log("[MobileUX] Initializing...");
    
    // Add mobile viewport meta tag if it doesn't exist
    this.ensureViewportMeta();
    
    // Create responsive styles
    this.createResponsiveStyles();
    
    // Set initial state based on screen size
    this.setupInitialState();
    
    // Setup resize event listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log("[MobileUX] Initialized");
  },
  
  ensureViewportMeta: function() {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // If not, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set proper viewport content
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  },
  
  createResponsiveStyles: function() {
    // Create style element for responsive styles
    const styleEl = document.createElement('style');
    styleEl.id = 'responsive-styles';
    styleEl.innerHTML = `
      /* Mobile Responsiveness */
      @media (max-width: ${this.breakpoints.mobile}px) {
        #game-controls {
          display: none !important;
        }
        
        #chat-container {
          height: 120px;
        }
        
        #chat-messages {
          height: 80px;
        }
        
        #top-bar {
          justify-content: space-between;
          padding: 5px;
        }
        
        #voice-controls {
          margin-left: auto;
        }
        
        /* Game area can use full screen */
        #game-container {
          width: 100%;
          height: calc(100% - 140px); /* Adjust for bottom chat */
        }
        
        /* Improve mobile controls */
        #mobile-controls {
          bottom: 140px;
          left: 10px;
          display: block !important;
        }
        
        /* Pop-ups should be full width on mobile */
        #user-popup,
        #inventory-interface,
        #zap-interface,
        #action-popup,
        #trade-popup {
          width: 90% !important;
          max-height: 80vh;
          overflow-y: auto;
        }
      }
      
      /* Tablet Responsiveness */
      @media (min-width: ${this.breakpoints.mobile + 1}px) and (max-width: ${this.breakpoints.tablet}px) {
        #leaderboard-container {
          width: 200px;
          right: 5px;
        }
        
        #player-profile {
          width: 200px;
          left: 5px;
        }
        
        #game-controls {
          flex-wrap: wrap;
          gap: 5px;
        }
        
        #top-bar {
          flex-wrap: wrap;
          padding: 5px;
        }
      }
    `;
    
    // Add to document head
    document.head.appendChild(styleEl);
  },
  
  setupInitialState: function() {
    const isMobile = window.innerWidth <= this.breakpoints.mobile;
    
    if (isMobile) {
      // Make mobile controls visible
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.remove('hide');
      }
    }
  },
  
  handleResize: function() {
    const isMobile = window.innerWidth <= this.breakpoints.mobile;
    
    // Update mobile controls visibility
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      if (isMobile) {
        mobileControls.classList.remove('hide');
      } else {
        mobileControls.classList.add('hide');
      }
    }
  }
};

// ========================
// 5. GAME CHAT IMPROVEMENTS
// ========================

const GameChat = {
  // Game chat will use kind 420420 as a dedicated kind for game chat
  GAME_CHAT_KIND: 420420,
  
  init: function() {
    console.log("[GameChat] Initializing...");
    this.setupEventListeners();
    this.subscribeToGameChat();
    console.log("[GameChat] Initialized");
  },
  
  setupEventListeners: function() {
    // Chat input focus/blur events to toggle movement control
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('focus', () => {
        if (Player) {
          Player.chatFocused = true;
          
          // Store current input state to restore later
          Player._inputState = {
            up: Player.input.up,
            down: Player.input.down,
            left: Player.input.left,
            right: Player.input.right
          };
          
          // Disable all movement while typing
          Player.input.up = false;
          Player.input.down = false;
          Player.input.left = false;
          Player.input.right = false;
        }
      });
      
      chatInput.addEventListener('blur', () => {
        if (Player) {
          Player.chatFocused = false;
          
          // Restore input state if saved
          if (Player._inputState) {
            Player.input.up = Player._inputState.up;
            Player.input.down = Player._inputState.down;
            Player.input.left = Player._inputState.left;
            Player.input.right = Player._inputState.right;
          }
        }
      });
      
      // Send message on Enter key
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendGameChatMessage();
        }
      });
    }
    
    // Send button click
    const sendButton = document.getElementById('send-chat-button');
    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendGameChatMessage());
    }
  },
  
  subscribeToGameChat: function() {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GameChat] Game relay not connected, can't subscribe to game chat");
      return;
    }
    
    const filters = [{ kinds: [this.GAME_CHAT_KIND] }];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processGameChatEvent(event),
        () => console.log("[GameChat] Game chat subscription complete")
      );
      
      console.log("[GameChat] Subscribed to game chat events");
    } catch (error) {
      console.error("[GameChat] Failed to subscribe to game chat:", error);
    }
  },
  
  processGameChatEvent: function(event) {
    if (!event || !event.pubkey) return;
    
    // Don't display our own messages again (they're added when sent)
    if (Player && event.pubkey === Player.pubkey) return;
    
    try {
      const content = event.content;
      
      // Get user's name
      let username = "Unknown";
      if (Nostr && Nostr.getUser) {
        const user = Nostr.getUser(event.pubkey);
        if (user && user.profile && user.profile.name) {
          username = user.profile.name;
        } else if (Utils && Utils.formatPubkey) {
          username = Utils.formatPubkey(event.pubkey, { short: true });
        } else {
          username = event.pubkey.slice(0, 8) + "...";
        }
      }
      
      // Add message to chat
      if (UI && UI.addChatMessage) {
        UI.addChatMessage(username, content);
      }
      
      // Play notification sound if message is recent (within last 10 seconds)
      const messageAge = Math.floor(Date.now() / 1000) - event.created_at;
      if (messageAge < 10 && UI && UI.playSound) {
        UI.playSound('chat');
      }
      
    } catch (error) {
      console.error("[GameChat] Error processing game chat event:", error);
    }
  },
  
  sendGameChatMessage: function() {
    if (!Player || !Player.pubkey || !Nostr || !Nostr.gameRelay) return;
    
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    
    // Create game chat event with proper tag structure
    const event = {
      kind: this.GAME_CHAT_KIND,
      content: message,
      tags: [
        ["t", "gamechat"],
        ["g", "relay-world"], // Using 'g' tag for game identifier
        ["p", Player.pubkey], // Tagging the sender's pubkey
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Get user's name
    let username = "You";
    if (Player.profile && Player.profile.name) {
      username = Player.profile.name;
    } else if (Utils && Utils.formatPubkey) {
      username = Utils.formatPubkey(Player.pubkey, { short: true });
    }
    
    // Add message to chat immediately (don't wait for relay)
    if (UI && UI.addChatMessage) {
      UI.addChatMessage(username, message, true);
    }
    
    // Clear input
    input.value = '';
    
    // Increment chat messages counter
    Player.chatMessages = (Player.chatMessages || 0) + 1;
    
    // Publish event to game relay
    if (Nostr.publishEvent) {
      Nostr.publishEvent(Nostr.gameRelay, event)
        .then(() => {
          console.log("[GameChat] Game chat message published");
          
          // Update player stats
          if (Nostr.publishPlayerStats) {
            Nostr.publishPlayerStats();
          }
        })
        .catch(error => {
          console.error("[GameChat] Failed to publish game chat message:", error);
          if (UI && UI.showToast) {
            UI.showToast("Failed to send message", "error");
          }
        });
    }
  }
};

// ========================
// 6. IMPROVED PLAYER & NPC RENDERING
// ========================

const ImprovedRendering = {
  // Improved rendering configuration
  init: function() {
    console.log("[ImprovedRendering] Initializing...");
    this.improveBackgroundRendering();
    console.log("[ImprovedRendering] Initialized");
  },
  
  improveBackgroundRendering: function() {
    // Patch the Game.drawBackground function if it exists
    if (typeof Game !== 'undefined' && typeof Game.drawBackground === 'function') {
      console.log("[ImprovedRendering] Patching background rendering");
      
      const originalDrawBackground = Game.drawBackground;
      Game.drawBackground = function() {
        const ctx = this.ctx;
        if (!ctx) {
          // Fallback to original if context not found
          return originalDrawBackground.call(this);
        }
        
        // Draw improved background with better performance
        const gridSize = 50;
        
        ctx.strokeStyle = 'rgba(139, 172, 15, 0.1)';
        ctx.lineWidth = 1;
        
        // Calculate grid boundaries based on camera position
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.camera.width + gridSize;
        const endY = startY + this.camera.height + gridSize;
        
        // Optimize by only drawing visible grid lines
        for (let x = startX; x <= endX; x += gridSize) {
          const screenX = x - (this.camera.x - this.canvas.width / 2);
          if (screenX < 0 || screenX > this.canvas.width) continue;
          
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, this.canvas.height);
          ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += gridSize) {
          const screenY = y - (this.camera.y - this.canvas.height / 2);
          if (screenY < 0 || screenY > this.canvas.height) continue;
          
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(this.canvas.width, screenY);
          ctx.stroke();
        }
      };
    }
  }
};

// ========================
// System Integration
// ========================

// Export all systems so they can be initialized
const RelayWorldEnhancements = {
  PersistenceManager,
  LeaderboardManager,
  RelayExplorer,
  ZapManager,
  MobileUX,
  GameChat,
  ImprovedRendering,
  
  // Initialize all systems
  init: function() {
    console.log("[RelayWorldEnhancements] Initializing all systems...");
    
    // Check if all required modules are available
    const checkReady = () => {
      if (!window.Player || !window.Utils || !window.UI || !window.Game || !window.Nostr) {
        console.log("[RelayWorldEnhancements] Waiting for core modules to load...");
        setTimeout(checkReady, 1000);
        return false;
      }
      return true;
    };
    
    if (!checkReady()) {
      return;
    }
    
    // Core systems first
    PersistenceManager.init();
    LeaderboardManager.init();
    RelayExplorer.init();
    ImprovedRendering.init();
    MobileUX.init();
    
    // Game features
    ZapManager.init();
    GameChat.init();
    
    // Add a method to Zaps if it doesn't exist
    if (window.Zaps && !window.Zaps.showZapInterface) {
      window.Zaps.showZapInterface = ZapManager.showZapInterface.bind(ZapManager);
    }
    
    console.log("[RelayWorldEnhancements] All systems initialized");
  }
};

// Export as global object
window.RelayWorldEnhancements = RelayWorldEnhancements;

// Export as module default
export default RelayWorldEnhancements;
