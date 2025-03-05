console.log("[GuildSystem] Faction membership published successfully");
        
        // Also publish updated player stats
        if (Nostr.publishPlayerStats) {
          Nostr.publishPlayerStats();
        }
      })
      .catch(error => {
        console.error("[GuildSystem] Failed to publish faction membership:", error);
      });
  },
  
  publishFactionLeave: function(factionId) {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GuildSystem] Game relay not connected");
      return;
    }
    
    // Create faction leave event
    const event = {
      kind: this.factionKind,
      content: JSON.stringify({
        action: "leave",
        faction: factionId,
        timestamp: Date.now()
      }),
      tags: [
        ["t", "faction"],
        ["g", "relay-world"],
        ["f", factionId], // Faction ID
        ["p", Player.pubkey]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, event)
      .then(() => {
        console.log("[GuildSystem] Faction leave published successfully");
        
        // Also publish updated player stats
        if (Nostr.publishPlayerStats) {
          Nostr.publishPlayerStats();
        }
      })
      .catch(error => {
        console.error("[GuildSystem] Failed to publish faction leave:", error);
      });
  },
  
  subscribeToGuilds: function() {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GuildSystem] Game relay not connected");
      return;
    }
    
    // Subscribe to guild events
    const filters = [{ kinds: [this.guildKind] }];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processGuildEvent(event),
        () => console.log("[GuildSystem] Guild events subscription complete")
      );
      
      console.log("[GuildSystem] Subscribed to guild events");
    } catch (error) {
      console.error("[GuildSystem] Failed to subscribe to guild events:", error);
    }
  },
  
  subscribeToFactions: function() {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GuildSystem] Game relay not connected");
      return;
    }
    
    // Subscribe to faction events
    const filters = [{ kinds: [this.factionKind] }];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processFactionEvent(event),
        () => console.log("[GuildSystem] Faction events subscription complete")
      );
      
      console.log("[GuildSystem] Subscribed to faction events");
    } catch (error) {
      console.error("[GuildSystem] Failed to subscribe to faction events:", error);
    }
  },
  
  processGuildEvent: function(event) {
    // Process incoming guild events
    // This would update the guild list and member stats
    console.log("[GuildSystem] Received guild event:", event);
  },
  
  processFactionEvent: function(event) {
    // Process incoming faction events
    // This would update faction membership and stats
    console.log("[GuildSystem] Received faction event:", event);
  },
  
  showFactionJoinEffect: function(factionId) {
    // Create a visual effect when joining a faction
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    const effect = document.createElement('div');
    effect.className = 'faction-join-effect';
    effect.innerHTML = this.getFactionEmoji(factionId);
    effect.style.position = 'absolute';
    effect.style.top = '50%';
    effect.style.left = '50%';
    effect.style.transform = 'translate(-50%, -50%)';
    effect.style.fontSize = '100px';
    effect.style.opacity = '0';
    effect.style.animation = 'factionJoinEffect 2s forwards';
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes factionJoinEffect {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.1); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
      }
    `;
    document.head.appendChild(style);
    
    gameContainer.appendChild(effect);
    
    // Remove after animation
    setTimeout(() => {
      effect.remove();
    }, 2000);
  }
};

// ========================
// 13. INITIALIZATION
// ========================

// Export all systems so they can be initialized
window.RelayWorldEnhancements = {
  PersistenceManager,
  LeaderboardManager,
  RelayExplorer,
  ZapManager,
  MobileUX,
  GameChat,
  ImprovedRendering,
  CornyChatIntegration,
  DirectMessaging,
  NotePublisher,
  BuildingSystem,
  InventorySystem,
  GuildSystem,
  
  // Initialize all systems
  init: function() {
    console.log("[RelayWorldEnhancements] Initializing all systems...");
    
    // Core systems first
    PersistenceManager.init();
    LeaderboardManager.init();
    RelayExplorer.init();
    ImprovedRendering.init();
    MobileUX.init();
    
    // Game features
    ZapManager.init();
    GameChat.init();
    DirectMessaging.init();
    
    // Additional features
    NotePublisher.init();
    CornyChatIntegration.init();
    BuildingSystem.init();
    InventorySystem.init();
    GuildSystem.init();
    
    // Patch Game update function to update building positions
    if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
      const originalUpdate = Game.update;
      
      Game.update = function(deltaTime) {
        // Call original update
        originalUpdate.call(Game, deltaTime);
        
        // Update building positions
        if (BuildingSystem && BuildingSystem.updateStructurePositions) {
          BuildingSystem.updateStructurePositions();
        }
      };
    }
    
    console.log("[RelayWorldEnhancements] All systems initialized");
  }
};
  setupShopSystem: function() {
    // Set up shop interface
    const shopButton = document.getElementById('shop-button');
    if (shopButton) {
      shopButton.addEventListener('click', this.showShopInterface.bind(this));
    }
    
    // Create shop interface
    const shopInterface = document.createElement('div');
    shopInterface.id = 'shop-interface';
    shopInterface.className = 'modal hide';
    shopInterface.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Shop</h3>
          <button id="shop-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="shop-categories">
            <button class="shop-category active" data-category="equipment">Equipment</button>
            <button class="shop-category" data-category="consumables">Consumables</button>
            <button class="shop-category" data-category="pets">Pets</button>
          </div>
          <div class="shop-items">
            <!-- Shop items will be added here -->
          </div>
        </div>
        <div class="modal-footer">
          <div class="shop-stats">
            <div class="shop-score">Your Score: <span id="shop-player-score">0</span></div>
          </div>
          <button id="shop-buy-button" class="primary-button">Buy Item</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .shop-categories {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .shop-category {
        flex: 1;
        padding: 8px;
        background-color: var(--color-dark);
        color: var(--color-light);
        border: 2px solid var(--color-dark);
        cursor: pointer;
      }
      
      .shop-category.active {
        background-color: var(--color-light);
        color: var(--color-dark);
      }
      
      .shop-items {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .shop-item {
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      
      .shop-item:hover {
        background-color: var(--color-very-light);
      }
      
      .shop-item.selected {
        background-color: var(--color-light);
        box-shadow: 0 0 10px var(--color-gold);
      }
      
      .shop-item-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }
      
      .shop-item-name {
        font-size: 12px;
        text-align: center;
      }
      
      .shop-item-price {
        font-size: 10px;
        margin-top: 5px;
        color: var(--color-medium);
      }
      
      .shop-item-description {
        font-size: 10px;
        margin-top: 5px;
        text-align: center;
        height: 30px;
        overflow: hidden;
      }
      
      .shop-stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .shop-score {
        font-size: 14px;
        color: var(--color-dark);
        font-weight: bold;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(shopInterface);
    
    // Add event listeners
    const closeButton = document.getElementById('shop-close');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideShopInterface.bind(this));
    }
    
    const buyButton = document.getElementById('shop-buy-button');
    if (buyButton) {
      buyButton.addEventListener('click', this.buySelectedItem.bind(this));
    }
    
    // Add category event listeners
    const categories = document.querySelectorAll('.shop-category');
    categories.forEach(category => {
      category.addEventListener('click', (e) => {
        // Remove active class from all categories
        categories.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked category
        e.target.classList.add('active');
        
        // Populate shop items for this category
        this.populateShopItems(e.target.dataset.category);
      });
    });
  },
  
  showShopInterface: function() {
    const shopInterface = document.getElementById('shop-interface');
    if (shopInterface) {
      shopInterface.classList.remove('hide');
      
      // Update player score display
      document.getElementById('shop-player-score').textContent = Utils.formatNumber(Player.score);
      
      // Populate shop items for default category
      this.populateShopItems('equipment');
    }
  },
  
  hideShopInterface: function() {
    const shopInterface = document.getElementById('shop-interface');
    if (shopInterface) shopInterface.classList.add('hide');
  },
  
  populateShopItems: function(category) {
    const shopItems = document.querySelector('.shop-items');
    if (!shopItems) return;
    
    // Clear current items
    shopItems.innerHTML = '';
    
    // Get items for this category
    const items = this.getShopItems(category);
    
    // Create items
    items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'shop-item';
      itemElement.dataset.id = item.id;
      itemElement.innerHTML = `
        <div class="shop-item-icon">${item.emoji}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-description">${item.description}</div>
        <div class="shop-item-price">${item.price} points</div>
      `;
      
      // Add click handler
      itemElement.addEventListener('click', () => {
        // Remove selected class from all items
        document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
        
        // Add selected class to clicked item
        itemElement.classList.add('selected');
        
        // Store selected item
        this.selectedItem = item;
      });
      
      shopItems.appendChild(itemElement);
    });
  },
  
  getShopItems: function(category) {
    // Return different items based on category
    switch (category) {
      case 'equipment':
        return [
          { 
            id: 'sword', 
            name: 'Pixel Sword', 
            emoji: '⚔️', 
            description: 'A basic sword made of pixels.',
            price: 500,
            category: 'equipment',
            slot: 'weapon',
            stats: { attack: 10 }
          },
          { 
            id: 'shield', 
            name: 'Nostr Shield', 
            emoji: '🛡️', 
            description: 'A shield with the Nostr logo.',
            price: 400,
            category: 'equipment',
            slot: 'offhand',
            stats: { defense: 8 }
          },
          { 
            id: 'helmet', 
            name: 'Miner\'s Helmet', 
            emoji: '⛑️', 
            description: 'A helmet for mining bitcoin.',
            price: 300,
            category: 'equipment',
            slot: 'head',
            stats: { defense: 5, mining: 3 }
          },
          { 
            id: 'boots', 
            name: 'Lightning Boots', 
            emoji: '👢', 
            description: 'Boots that increase movement speed.',
            price: 450,
            category: 'equipment',
            slot: 'feet',
            stats: { speed: 15 }
          },
          { 
            id: 'wand', 
            name: 'ZapWand', 
            emoji: '🪄', 
            description: 'A wand that channels lightning energy.',
            price: 600,
            category: 'equipment',
            slot: 'weapon',
            stats: { lightning: 12 }
          }
        ];
      case 'consumables':
        return [
          { 
            id: 'potion', 
            name: 'Health Potion', 
            emoji: '🧪', 
            description: 'Restores 50 health points.',
            price: 150,
            category: 'consumable',
            use: function(player) {
              player.health += 50;
              if (player.health > player.maxHealth) player.health = player.maxHealth;
              return `Restored 50 health. Current health: ${player.health}`;
            }
          },
          { 
            id: 'scroll', 
            name: 'Scroll of Speed', 
            emoji: '📜', 
            description: 'Temporarily increases movement speed.',
            price: 225,
            category: 'consumable',
            use: function(player) {
              player.buffs.push({
                id: "speed_boost",
                stat: "speed",
                value: 30,
                duration: 60 * 1000, // 60 seconds
                startTime: Date.now()
              });
              return "Movement speed increased for 60 seconds!";
            }
          },
          { 
            id: 'apple', 
            name: 'Golden Apple', 
            emoji: '🍎', 
            description: 'Gives 100 experience points.',
            price: 250,
            category: 'consumable',
            use: function(player) {
              player.experience += 100;
              player.checkLevelUp();
              return `Gained 100 experience points!`;
            }
          }
        ];
      case 'pets':
        return [
          { 
            id: 'pet_cat', 
            name: 'Pixelated Cat', 
            emoji: '🐱', 
            description: 'A digital cat that follows you around.',
            price: 1250,
            category: 'pet',
            stats: { luck: 5 }
          },
          { 
            id: 'pet_dog', 
            name: 'Relay Dog', 
            emoji: '🐶', 
            description: 'A loyal digital dog that finds hidden items.',
            price: 1500,
            category: 'pet',
            stats: { find: 7 }
          },
          { 
            id: 'pet_dragon', 
            name: 'Lightning Dragon', 
            emoji: '🐉', 
            description: 'A rare dragon pet that enhances zap powers.',
            price: 5000,
            category: 'pet',
            stats: { lightning: 10, attack: 15 }
          }
        ];
      default:
        return [];
    }
  },
  
  buySelectedItem: function() {
    if (!this.selectedItem) {
      UI.showToast("Please select an item to buy", "warning");
      return;
    }
    
    // Check if player has enough points
    if (Player.score < this.selectedItem.price) {
      UI.showToast(`Not enough points. Need ${this.selectedItem.price} points.`, "error");
      return;
    }
    
    // Deduct points
    Player.score -= this.selectedItem.price;
    
    // Add item to inventory
    const newItem = {
      ...this.selectedItem,
      id: `${this.selectedItem.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      purchased: Date.now()
    };
    
    Player.inventory.push(newItem);
    
    // Update UI
    UI.updatePlayerProfile();
    document.getElementById('shop-player-score').textContent = Utils.formatNumber(Player.score);
    
    // Publish purchase to game relay
    this.publishPurchase(newItem);
    
    // Show success message
    UI.showToast(`Purchased ${this.selectedItem.name} successfully!`, "success");
    UI.playSound('item');
  },
  
  publishPurchase: function(item) {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[InventorySystem] Game relay not connected");
      return;
    }
    
    // Create purchase event
    const purchaseEvent = {
      kind: 420003, // Item kind from the config
      content: JSON.stringify({
        action: "purchase",
        item: item,
        cost: item.price,
        timestamp: Date.now()
      }),
      tags: [
        ["t", "purchase"],
        ["g", "relay-world"],
        ["i", item.id], // Item ID
        ["p", Player.pubkey]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, purchaseEvent)
      .then(() => {
        console.log("[InventorySystem] Purchase published successfully");
        // Also publish updated inventory
        this.publishInventory();
      })
      .catch(error => {
        console.error("[InventorySystem] Failed to publish purchase:", error);
      });
  }
};

// ========================
// 12. GUILD & FACTION SYSTEM
// ========================

const GuildSystem = {
  guildKind: 420200, // Custom kind for guild data
  factionKind: 420201, // Custom kind for faction data
  
  init: function() {
    console.log("[GuildSystem] Initializing...");
    this.setupUI();
    this.subscribeToGuilds();
    this.subscribeToFactions();
    console.log("[GuildSystem] Initialized");
  },
  
  setupUI: function() {
    // Add guild UI button functionality to player profile
    const guildButton = document.getElementById('guild-button');
    if (guildButton) {
      guildButton.addEventListener('click', this.showGuildInterface.bind(this));
    }
    
    // Add faction UI button functionality to player profile
    const factionButton = document.getElementById('faction-button');
    if (factionButton) {
      factionButton.addEventListener('click', this.showFactionInterface.bind(this));
    }
    
    // Create guild interface
    const guildInterface = document.createElement('div');
    guildInterface.id = 'guild-interface';
    guildInterface.className = 'modal hide';
    guildInterface.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Guilds</h3>
          <button id="guild-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div id="guild-status">
            <h4>Your Guild</h4>
            <div id="player-guild-info">
              <p>You are not a member of any guild.</p>
              <button id="create-guild-button" class="secondary-button">Create Guild</button>
            </div>
          </div>
          <div id="guild-list">
            <h4>Available Guilds</h4>
            <div id="guild-entries">
              <p>Loading guilds...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Create faction interface
    const factionInterface = document.createElement('div');
    factionInterface.id = 'faction-interface';
    factionInterface.className = 'modal hide';
    factionInterface.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Factions</h3>
          <button id="faction-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div id="faction-status">
            <h4>Your Faction</h4>
            <div id="player-faction-info">
              <p>You have not joined any faction.</p>
            </div>
          </div>
          <div id="faction-list">
            <h4>Available Factions</h4>
            <div id="faction-entries">
              <div class="faction-entry" data-id="luminaries">
                <div class="faction-logo">☀️</div>
                <div class="faction-details">
                  <div class="faction-name">The Luminaries</div>
                  <div class="faction-description">Seekers of knowledge and light</div>
                </div>
                <button class="join-faction-button pixel-button" data-id="luminaries">Join</button>
              </div>
              <div class="faction-entry" data-id="shadows">
                <div class="faction-logo">🌙</div>
                <div class="faction-details">
                  <div class="faction-name">The Shadows</div>
                  <div class="faction-description">Masters of secrecy and anonymity</div>
                </div>
                <button class="join-faction-button pixel-button" data-id="shadows">Join</button>
              </div>
              <div class="faction-entry" data-id="engineers">
                <div class="faction-logo">⚙️</div>
                <div class="faction-details">
                  <div class="faction-name">The Engineers</div>
                  <div class="faction-description">Builders of the new world</div>
                </div>
                <button class="join-faction-button pixel-button" data-id="engineers">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles for guild and faction systems
    const style = document.createElement('style');
    style.textContent = `
      #guild-status, #faction-status {
        margin-bottom: 20px;
        padding: 10px;
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
      }
      
      .guild-entry, .faction-entry {
        display: flex;
        align-items: center;
        padding: 10px;
        margin-bottom: 10px;
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
      }
      
      .guild-logo, .faction-logo {
        font-size: 24px;
        margin-right: 10px;
      }
      
      .guild-details, .faction-details {
        flex: 1;
      }
      
      .guild-name, .faction-name {
        font-weight: bold;
        color: var(--color-dark);
      }
      
      .guild-description, .faction-description {
        font-size: 12px;
        color: var(--color-medium);
      }
      
      .guild-members, .faction-members {
        font-size: 12px;
        margin-top: 5px;
      }
      
      .guild-form, .faction-form {
        margin-top: 15px;
      }
      
      .guild-form input, .faction-form input {
        width: 100%;
        margin-bottom: 10px;
      }
      
      .guild-form textarea, .faction-form textarea {
        width: 100%;
        height: 80px;
        margin-bottom: 10px;
        resize: none;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(guildInterface);
    document.body.appendChild(factionInterface);
    
    // Add event listeners
    const guildCloseButton = document.getElementById('guild-close');
    if (guildCloseButton) {
      guildCloseButton.addEventListener('click', this.hideGuildInterface.bind(this));
    }
    
    const factionCloseButton = document.getElementById('faction-close');
    if (factionCloseButton) {
      factionCloseButton.addEventListener('click', this.hideFactionInterface.bind(this));
    }
    
    const createGuildButton = document.getElementById('create-guild-button');
    if (createGuildButton) {
      createGuildButton.addEventListener('click', this.showCreateGuildForm.bind(this));
    }
    
    // Add event listeners to faction join buttons
    const joinFactionButtons = document.querySelectorAll('.join-faction-button');
    joinFactionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const factionId = e.target.dataset.id;
        this.joinFaction(factionId);
      });
    });
  },
  
  showGuildInterface: function() {
    const guildInterface = document.getElementById('guild-interface');
    if (guildInterface) {
      guildInterface.classList.remove('hide');
      this.updateGuildList();
    }
  },
  
  hideGuildInterface: function() {
    const guildInterface = document.getElementById('guild-interface');
    if (guildInterface) guildInterface.classList.add('hide');
  },
  
  showFactionInterface: function() {
    const factionInterface = document.getElementById('faction-interface');
    if (factionInterface) {
      factionInterface.classList.remove('hide');
      this.updateFactionStatus();
    }
  },
  
  hideFactionInterface: function() {
    const factionInterface = document.getElementById('faction-interface');
    if (factionInterface) factionInterface.classList.add('hide');
  },
  
  updateGuildList: function() {
    // TODO: Fetch guilds from game relay
    // For now, just show a placeholder
    const guildEntries = document.getElementById('guild-entries');
    if (guildEntries) {
      guildEntries.innerHTML = '<p>No guilds available. Create the first one!</p>';
    }
  },
  
  updateFactionStatus: function() {
    // Get player's faction if any
    const playerFaction = this.getPlayerFaction();
    
    const playerFactionInfo = document.getElementById('player-faction-info');
    if (!playerFactionInfo) return;
    
    if (playerFaction) {
      playerFactionInfo.innerHTML = `
        <div class="faction-entry">
          <div class="faction-logo">${this.getFactionEmoji(playerFaction)}</div>
          <div class="faction-details">
            <div class="faction-name">${this.getFactionName(playerFaction)}</div>
            <div class="faction-description">${this.getFactionDescription(playerFaction)}</div>
          </div>
          <button class="leave-faction-button pixel-button" data-id="${playerFaction}">Leave</button>
        </div>
      `;
      
      // Add event listener to leave button
      const leaveButton = playerFactionInfo.querySelector('.leave-faction-button');
      if (leaveButton) {
        leaveButton.addEventListener('click', () => {
          this.leaveFaction(playerFaction);
        });
      }
    } else {
      playerFactionInfo.innerHTML = '<p>You have not joined any faction.</p>';
    }
  },
  
  getFactionEmoji: function(factionId) {
    switch (factionId) {
      case 'luminaries': return '☀️';
      case 'shadows': return '🌙';
      case 'engineers': return '⚙️';
      default: return '❓';
    }
  },
  
  getFactionName: function(factionId) {
    switch (factionId) {
      case 'luminaries': return 'The Luminaries';
      case 'shadows': return 'The Shadows';
      case 'engineers': return 'The Engineers';
      default: return 'Unknown Faction';
    }
  },
  
  getFactionDescription: function(factionId) {
    switch (factionId) {
      case 'luminaries': return 'Seekers of knowledge and light';
      case 'shadows': return 'Masters of secrecy and anonymity';
      case 'engineers': return 'Builders of the new world';
      default: return 'No description available';
    }
  },
  
  showCreateGuildForm: function() {
    const playerGuildInfo = document.getElementById('player-guild-info');
    if (!playerGuildInfo) return;
    
    playerGuildInfo.innerHTML = `
      <div class="guild-form">
        <input type="text" id="guild-name-input" placeholder="Guild Name">
        <textarea id="guild-description-input" placeholder="Guild Description"></textarea>
        <div class="guild-form-actions">
          <button id="guild-create-submit" class="primary-button">Create</button>
          <button id="guild-create-cancel" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('guild-create-submit').addEventListener('click', this.createGuild.bind(this));
    document.getElementById('guild-create-cancel').addEventListener('click', () => {
      playerGuildInfo.innerHTML = `
        <p>You are not a member of any guild.</p>
        <button id="create-guild-button" class="secondary-button">Create Guild</button>
      `;
      document.getElementById('create-guild-button').addEventListener('click', this.showCreateGuildForm.bind(this));
    });
  },
  
  createGuild: function() {
    const guildName = document.getElementById('guild-name-input').value.trim();
    const guildDescription = document.getElementById('guild-description-input').value.trim();
    
    if (!guildName) {
      UI.showToast("Guild name cannot be empty", "error");
      return;
    }
    
    if (!Player || !Player.pubkey) {
      UI.showToast("You must be logged in to create a guild", "error");
      return;
    }
    
    // Check if player has enough points (1000 for creating a guild)
    if (Player.score < 1000) {
      UI.showToast("Not enough points. Need 1,000 points to create a guild.", "error");
      return;
    }
    
    // Create guild object
    const guild = {
      id: `guild-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: guildName,
      description: guildDescription || "No description provided",
      founder: Player.pubkey,
      members: [Player.pubkey],
      created: Date.now()
    };
    
    // Deduct points
    Player.score -= 1000;
    UI.updatePlayerProfile();
    
    // Publish guild to game relay
    this.publishGuild(guild);
    
    // Update UI
    const playerGuildInfo = document.getElementById('player-guild-info');
    if (playerGuildInfo) {
      playerGuildInfo.innerHTML = `
        <div class="guild-entry">
          <div class="guild-logo">🏰</div>
          <div class="guild-details">
            <div class="guild-name">${guild.name}</div>
            <div class="guild-description">${guild.description}</div>
            <div class="guild-members">Members: 1 (You)</div>
          </div>
        </div>
      `;
    }
    
    UI.showToast(`Guild "${guild.name}" created successfully!`, "success");
  },
  
  joinFaction: function(factionId) {
    if (!Player || !Player.pubkey) {
      UI.showToast("You must be logged in to join a faction", "error");
      return;
    }
    
    // Check if already in a faction
    const currentFaction = this.getPlayerFaction();
    if (currentFaction) {
      UI.showToast(`You are already a member of ${this.getFactionName(currentFaction)}. Leave first to join another faction.`, "error");
      return;
    }
    
    // Set player's faction
    Player.faction = factionId;
    
    // Publish faction membership to game relay
    this.publishFactionMembership(factionId);
    
    // Update UI
    this.updateFactionStatus();
    
    UI.showToast(`You have joined ${this.getFactionName(factionId)}!`, "success");
    
    // Add faction visual effect
    this.showFactionJoinEffect(factionId);
  },
  
  leaveFaction: function(factionId) {
    if (!Player || !Player.pubkey) return;
    
    // Remove faction
    Player.faction = null;
    
    // Publish faction leave to game relay
    this.publishFactionLeave(factionId);
    
    // Update UI
    this.updateFactionStatus();
    
    UI.showToast(`You have left ${this.getFactionName(factionId)}.`, "info");
  },
  
  getPlayerFaction: function() {
    return Player ? Player.faction : null;
  },
  
  publishGuild: function(guild) {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GuildSystem] Game relay not connected");
      return;
    }
    
    // Create guild event
    const event = {
      kind: this.guildKind,
      content: JSON.stringify(guild),
      tags: [
        ["t", "guild"],
        ["g", "relay-world"],
        ["p", Player.pubkey]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, event)
      .then(() => {
        console.log("[GuildSystem] Guild published successfully");
      })
      .catch(error => {
        console.error("[GuildSystem] Failed to publish guild:", error);
      });
  },
  
  publishFactionMembership: function(factionId) {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GuildSystem] Game relay not connected");
      return;
    }
    
    // Create faction membership event
    const event = {
      kind: this.factionKind,
      content: JSON.stringify({
        action: "join",
        faction: factionId,
        timestamp: Date.now()
      }),
      tags: [
        ["t", "faction"],
        ["g", "relay-world"],
        ["f", factionId], // Faction ID
        ["p", Player.pubkey]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, event)
      .then(() => {
        console.log("[GuildSystem] Faction membership published successfully");
        
        // Also publish updated player stats
        if (Nostr.publishPlayerStats) {
          Nostr.publishPlayerStats();        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
      }
      
      .modal-footer {
        padding: 10px 15px;
        text-align: right;
        border-top: 2px solid var(--color-medium);
      }
      
      /* Enhanced note rendering */
      .user-note-content {
        white-space: pre-wrap;
      }
      
      .note-media {
        margin-top: 10px;
        cursor: pointer;
      }
      
      .note-media img {
        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
      }
      
      .note-media video,
      .note-media audio {
        max-width: 100%;
      }
      
      .media-expanded {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 20000;
      }
      
      .media-expanded img {
        max-width: 90%;
        max-height: 90%;
        border: none;
      }
      
      .media-expanded .close-button {
        position: absolute;
        top: 20px;
        right: 20px;
        background: var(--color-dark);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(modal);
    
    // Add event listeners
    const newNoteButton = document.getElementById('new-note-button');
    if (newNoteButton) {
      newNoteButton.addEventListener('click', this.showNoteModal.bind(this));
    }
    
    const closeButton = document.getElementById('note-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideNoteModal.bind(this));
    }
    
    const publishButton = document.getElementById('publish-note-button');
    if (publishButton) {
      publishButton.addEventListener('click', this.publishNote.bind(this));
    }
    
    const addImageButton = document.getElementById('add-image-button');
    if (addImageButton) {
      addImageButton.addEventListener('click', () => {
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.click();
      });
    }
    
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
      imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
    }
  },
  
  showNoteModal: function() {
    const modal = document.getElementById('note-publish-modal');
    if (modal) modal.classList.remove('hide');
    
    // Clear previous content
    const noteContent = document.getElementById('note-content');
    if (noteContent) noteContent.value = '';
    
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) imagePreview.innerHTML = '';
  },
  
  hideNoteModal: function() {
    const modal = document.getElementById('note-publish-modal');
    if (modal) modal.classList.add('hide');
  },
  
  handleImageUpload: function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      UI.showToast("Please select an image file", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const imagePreview = document.getElementById('image-preview');
      if (imagePreview) {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        imagePreview.dataset.imageData = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  },
  
  publishNote: function() {
    if (!Player || !Player.pubkey) {
      UI.showToast("You must be logged in to publish notes", "error");
      return;
    }
    
    const noteContent = document.getElementById('note-content');
    if (!noteContent) return;
    
    const content = noteContent.value.trim();
    if (!content) {
      UI.showToast("Note content cannot be empty", "error");
      return;
    }
    
    // Get image data if any
    const imagePreview = document.getElementById('image-preview');
    let imageData = null;
    if (imagePreview && imagePreview.dataset.imageData) {
      imageData = imagePreview.dataset.imageData;
    }
    
    // Prepare content - if image is included, use proper format with metadata tags
    let finalContent = content;
    const tags = [
      ["game", "relay-world"], // Add a game tag to identify this is from the Relay World game
      ["client", "relay-world"]
    ];
    
    // Add image data if present
    if (imageData) {
      // Check if data URL
      if (imageData.startsWith('data:image/')) {
        finalContent = content;
        tags.push(["image", imageData]);
      }
    }
    
    // Create note event
    const event = {
      kind: 1, // Regular note kind
      content: finalContent,
      tags: tags,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Show loader
    const publishButton = document.getElementById('publish-note-button');
    if (publishButton) {
      publishButton.disabled = true;
      publishButton.textContent = "Publishing...";
    }
    
    // Publish to active explorer relay (as regular notes go to explorer not game relay)
    if (Nostr && Nostr.explorerRelays && Nostr.activeExplorerRelay) {
      const relay = Nostr.explorerRelays.get(Nostr.activeExplorerRelay);
      
      if (relay) {
        Nostr.publishEvent(relay, event)
          .then(publishedEvent => {
            console.log("[NotePublisher] Note published successfully", publishedEvent);
            UI.showToast("Note published successfully", "success");
            this.hideNoteModal();
            
            // Also add to local user notes
            if (Nostr.users && Nostr.users.has(Player.pubkey)) {
              const user = Nostr.users.get(Player.pubkey);
              user.notes.unshift({
                id: publishedEvent.id,
                content: publishedEvent.content,
                created_at: publishedEvent.created_at,
                tags: publishedEvent.tags
              });
              
              // Update UI if user popup is open and showing current user
              const userPopup = document.getElementById('user-popup');
              if (userPopup && userPopup.dataset.pubkey === Player.pubkey && typeof UI !== 'undefined') {
                if (typeof UI.updateUserNotes === 'function') {
                  UI.updateUserNotes(Player.pubkey);
                }
              }
            }
          })
          .catch(error => {
            console.error("[NotePublisher] Failed to publish note:", error);
            UI.showToast(`Failed to publish note: ${error.message}`, "error");
          })
          .finally(() => {
            // Reset button
            if (publishButton) {
              publishButton.disabled = false;
              publishButton.textContent = "Publish";
            }
          });
      } else {
        UI.showToast("No active explorer relay to publish to", "error");
        if (publishButton) {
          publishButton.disabled = false;
          publishButton.textContent = "Publish";
        }
      }
    } else {
      UI.showToast("Nostr module not initialized", "error");
      if (publishButton) {
        publishButton.disabled = false;
        publishButton.textContent = "Publish";
      }
    }
  },
  
  enhanceNoteRendering: function() {
    // Override UI.updateUserNotes to improve note rendering
    UI.updateUserNotes = function(pubkey) {
      const user = Nostr.getUser(pubkey);
      if (!user) return;
      
      const notesContainer = document.getElementById('user-notes');
      if (!notesContainer) return;
      
      notesContainer.innerHTML = '';
      
      if (!user.notes || user.notes.length === 0) {
        notesContainer.innerHTML = '<div class="no-notes">No recent notes found</div>';
        return;
      }
      
      for (let i = 0; i < Math.min(user.notes.length, 5); i++) {
        const note = user.notes[i];
        const noteElement = document.createElement('div');
        noteElement.className = 'user-note';
        
        // Main content
        const contentElement = document.createElement('div');
        contentElement.className = 'user-note-content';
        contentElement.textContent = note.content;
        noteElement.appendChild(contentElement);
        
        // Process tags for media
        if (note.tags) {
          // Look for image tags
          const imageTags = note.tags.filter(tag => tag[0] === 'image');
          if (imageTags.length > 0) {
            const mediaElement = document.createElement('div');
            mediaElement.className = 'note-media';
            
            imageTags.forEach(tag => {
              const imageUrl = tag[1];
              const img = document.createElement('img');
              img.src = imageUrl;
              img.alt = "Media";
              img.addEventListener('click', (e) => {
                e.stopPropagation();
                NotePublisher.expandMedia(img.src);
              });
              mediaElement.appendChild(img);
            });
            
            noteElement.appendChild(mediaElement);
          }
        }
        
        // Timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'user-note-timestamp';
        timestampElement.textContent = Utils.formatDate(note.created_at);
        noteElement.appendChild(timestampElement);
        
        notesContainer.appendChild(noteElement);
      }
    };
  },
  
  expandMedia: function(src) {
    // Create expanded view
    const expandedContainer = document.createElement('div');
    expandedContainer.className = 'media-expanded';
    
    const expandedImage = document.createElement('img');
    expandedImage.src = src;
    expandedImage.alt = "Expanded media";
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      expandedContainer.remove();
    });
    
    expandedContainer.appendChild(expandedImage);
    expandedContainer.appendChild(closeButton);
    
    // Add to body
    document.body.appendChild(expandedContainer);
    
    // Close on click outside image
    expandedContainer.addEventListener('click', (e) => {
      if (e.target === expandedContainer) {
        expandedContainer.remove();
      }
    });
  }
};

// ========================
// 10. EXTENDED GAME FEATURES (BUILDING, INVENTORY, SHOP)
// ========================

const BuildingSystem = {
  buildingKind: 420100, // Custom kind for building data
  structures: [],
  
  init: function() {
    console.log("[BuildingSystem] Initializing...");
    this.setupUI();
    this.subscribeToBuildings();
    console.log("[BuildingSystem] Initialized");
  },
  
  setupUI: function() {
    // Add building UI button to player profile
    const stashButton = document.getElementById('stash-button');
    if (stashButton) {
      stashButton.textContent = "Build";
      stashButton.addEventListener('click', this.showBuildingInterface.bind(this));
    }
    
    // Create building interface
    const buildingInterface = document.createElement('div');
    buildingInterface.id = 'building-interface';
    buildingInterface.className = 'modal hide';
    buildingInterface.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Building Mode</h3>
          <button id="building-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="building-categories">
            <button class="building-category active" data-category="house">Houses</button>
            <button class="building-category" data-category="decoration">Decorations</button>
            <button class="building-category" data-category="utility">Utilities</button>
          </div>
          <div class="building-items">
            <!-- Building items will be added here -->
          </div>
        </div>
        <div class="modal-footer building-footer">
          <div class="building-instructions">Select an item to build and place it in the world</div>
          <button id="building-mode-button" class="primary-button">Start Building</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .building-categories {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .building-category {
        flex: 1;
        padding: 8px;
        background-color: var(--color-dark);
        color: var(--color-light);
        border: 2px solid var(--color-dark);
        cursor: pointer;
      }
      
      .building-category.active {
        background-color: var(--color-light);
        color: var(--color-dark);
      }
      
      .building-items {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .building-item {
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      
      .building-item:hover {
        background-color: var(--color-very-light);
      }
      
      .building-item.selected {
        background-color: var(--color-light);
        box-shadow: 0 0 10px var(--color-gold);
      }
      
      .building-item-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }
      
      .building-item-name {
        font-size: 12px;
        text-align: center;
      }
      
      .building-item-cost {
        font-size: 10px;
        margin-top: 5px;
      }
      
      .building-instructions {
        font-size: 12px;
        color: var(--color-dark);
        margin-bottom: 10px;
      }
      
      .building-ghost {
        position: absolute;
        pointer-events: none;
        opacity: 0.7;
        z-index: 1000;
      }
      
      .building-structure {
        position: absolute;
        z-index: 25;
        cursor: pointer;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(buildingInterface);
    
    // Add event listeners
    const closeButton = document.getElementById('building-close');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideBuildingInterface.bind(this));
    }
    
    const buildingModeButton = document.getElementById('building-mode-button');
    if (buildingModeButton) {
      buildingModeButton.addEventListener('click', this.toggleBuildingMode.bind(this));
    }
    
    // Populate building items
    this.populateBuildingItems('house');
    
    // Add category event listeners
    const categories = document.querySelectorAll('.building-category');
    categories.forEach(category => {
      category.addEventListener('click', (e) => {
        // Remove active class from all categories
        categories.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked category
        e.target.classList.add('active');
        
        // Populate building items for this category
        this.populateBuildingItems(e.target.dataset.category);
      });
    });
  },
  
  showBuildingInterface: function() {
    const buildingInterface = document.getElementById('building-interface');
    if (buildingInterface) buildingInterface.classList.remove('hide');
  },
  
  hideBuildingInterface: function() {
    const buildingInterface = document.getElementById('building-interface');
    if (buildingInterface) buildingInterface.classList.add('hide');
    
    // Disable building mode if active
    if (this.buildingMode) {
      this.toggleBuildingMode();
    }
  },
  
  populateBuildingItems: function(category) {
    const buildingItems = document.querySelector('.building-items');
    if (!buildingItems) return;
    
    // Clear current items
    buildingItems.innerHTML = '';
    
    // Get items for this category
    const items = this.getBuildingItems(category);
    
    // Create items
    items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'building-item';
      itemElement.dataset.id = item.id;
      itemElement.innerHTML = `
        <div class="building-item-icon">${item.emoji}</div>
        <div class="building-item-name">${item.name}</div>
        <div class="building-item-cost">${item.cost} points</div>
      `;
      
      // Add click handler
      itemElement.addEventListener('click', () => {
        // Remove selected class from all items
        document.querySelectorAll('.building-item').forEach(i => i.classList.remove('selected'));
        
        // Add selected class to clicked item
        itemElement.classList.add('selected');
        
        // Store selected item
        this.selectedItem = item;
      });
      
      buildingItems.appendChild(itemElement);
    });
  },
  
  getBuildingItems: function(category) {
    // Return different items based on category
    switch (category) {
      case 'house':
        return [
          { id: 'small_house', name: 'Small House', emoji: '🏠', cost: 500, width: 64, height: 64 },
          { id: 'medium_house', name: 'Medium House', emoji: '🏡', cost: 1000, width: 80, height: 80 },
          { id: 'large_house', name: 'Large House', emoji: '🏘️', cost: 2000, width: 100, height: 100 }
        ];
      case 'decoration':
        return [
          { id: 'tree', name: 'Tree', emoji: '🌳', cost: 100, width: 32, height: 32 },
          { id: 'flower', name: 'Flowers', emoji: '🌷', cost: 50, width: 24, height: 24 },
          { id: 'fountain', name: 'Fountain', emoji: '⛲', cost: 300, width: 48, height: 48 }
        ];
      case 'utility':
        return [
          { id: 'shop', name: 'Shop', emoji: '🏪', cost: 1500, width: 80, height: 80 },
          { id: 'workshop', name: 'Workshop', emoji: '🔨', cost: 800, width: 64, height: 64 },
          { id: 'flag', name: 'Flag', emoji: '🚩', cost: 200, width: 24, height: 48 }
        ];
      default:
        return [];
    }
  },
  
  toggleBuildingMode: function() {
    const button = document.getElementById('building-mode-button');
    
    if (this.buildingMode) {
      // Disable building mode
      this.buildingMode = false;
      button.textContent = "Start Building";
      
      // Remove ghost element if exists
      const ghost = document.querySelector('.building-ghost');
      if (ghost) ghost.remove();
      
      // Remove canvas event listeners
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        canvas.removeEventListener('mousemove', this.handleBuildingMouseMove);
        canvas.removeEventListener('click', this.handleBuildingClick);
      }
    } else {
      // Check if item is selected
      if (!this.selectedItem) {
        UI.showToast("Please select an item to build", "warning");
        return;
      }
      
      // Check if player has enough points
      if (Player.score < this.selectedItem.cost) {
        UI.showToast(`Not enough points. Need ${this.selectedItem.cost} points.`, "error");
        return;
      }
      
      // Enable building mode
      this.buildingMode = true;
      button.textContent = "Cancel Building";
      
      // Create ghost element
      const ghost = document.createElement('div');
      ghost.className = 'building-ghost';
      ghost.innerHTML = `<div style="font-size: ${this.selectedItem.width / 2}px">${this.selectedItem.emoji}</div>`;
      ghost.style.width = `${this.selectedItem.width}px`;
      ghost.style.height = `${this.selectedItem.height}px`;
      
      document.getElementById('game-container').appendChild(ghost);
      
      // Add canvas event listeners
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        this.handleBuildingMouseMove = this.handleBuildingMouseMove.bind(this);
        this.handleBuildingClick = this.handleBuildingClick.bind(this);
        
        canvas.addEventListener('mousemove', this.handleBuildingMouseMove);
        canvas.addEventListener('click', this.handleBuildingClick);
      }
      
      UI.showToast("Click on the map to place your building", "info");
    }
  },
  
  handleBuildingMouseMove: function(e) {
    const ghost = document.querySelector('.building-ghost');
    if (!ghost) return;
    
    // Get mouse position relative to canvas
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Center the ghost on the mouse
    ghost.style.left = `${x - ghost.offsetWidth / 2}px`;
    ghost.style.top = `${y - ghost.offsetHeight / 2}px`;
  },
  
  handleBuildingClick: function(e) {
    if (!this.selectedItem) return;
    
    // Get mouse position relative to canvas
    const rect = e.target.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Convert to world coordinates
    const worldX = screenX + Game.camera.x - Game.canvas.width / 2;
    const worldY = screenY + Game.camera.y - Game.canvas.height / 2;
    
    // Place the building in the world
    this.placeBuilding(this.selectedItem, worldX, worldY);
    
    // Disable building mode
    this.toggleBuildingMode();
  },
  
  placeBuilding: function(item, x, y) {
    // Create building structure in game world
    const structure = {
      id: `${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: item.id,
      name: item.name,
      emoji: item.emoji,
      x: x,
      y: y,
      width: item.width,
      height: item.height,
      owner: Player.pubkey,
      createdAt: Date.now()
    };
    
    // Add to local structures list
    this.structures.push(structure);
    
    // Create visual element
    this.createStructureElement(structure);
    
    // Deduct cost from player score
    Player.score -= item.cost;
    UI.updatePlayerProfile();
    
    // Publish structure to game relay
    this.publishStructure(structure);
    
    UI.showToast(`${item.name} built successfully!`, "success");
  },
  
  createStructureElement: function(structure) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    // Calculate screen coordinates
    const screenX = structure.x - (Game.camera.x - Game.canvas.width / 2);
    const screenY = structure.y - (Game.camera.y - Game.canvas.height / 2);
    
    // Create structure element
    const element = document.createElement('div');
    element.className = 'building-structure';
    element.id = `structure-${structure.id}`;
    element.innerHTML = `<div style="font-size: ${structure.width / 2}px">${structure.emoji}</div>`;
    element.style.width = `${structure.width}px`;
    element.style.height = `${structure.height}px`;
    element.style.left = `${screenX - structure.width / 2}px`;
    element.style.top = `${screenY - structure.height / 2}px`;
    
    // Add click handler
    element.addEventListener('click', () => {
      this.showStructureInfo(structure);
    });
    
    gameContainer.appendChild(element);
  },
  
  updateStructurePositions: function() {
    // Update positions of all structures based on camera position
    this.structures.forEach(structure => {
      const element = document.getElementById(`structure-${structure.id}`);
      if (!element) return;
      
      // Calculate screen coordinates
      const screenX = structure.x - (Game.camera.x - Game.canvas.width / 2);
      const screenY = structure.y - (Game.camera.y - Game.canvas.height / 2);
      
      element.style.left = `${screenX - structure.width / 2}px`;
      element.style.top = `${screenY - structure.height / 2}px`;
    });
  },
  
  showStructureInfo: function(structure) {
    UI.showToast(`${structure.name} built by ${structure.owner === Player.pubkey ? 'you' : 'another player'}`, "info");
  },
  
  publishStructure: function(structure) {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[BuildingSystem] Game relay not connected");
      return;
    }
    
    // Create building event
    const event = {
      kind: this.buildingKind,
      content: JSON.stringify(structure),
      tags: [
        ["t", "building"],
        ["g", "relay-world"],
        ["p", structure.owner] // Tag with owner's pubkey
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, event)
      .then(publishedEvent => {
        console.log("[BuildingSystem] Structure published successfully", publishedEvent);
      })
      .catch(error => {
        console.error("[BuildingSystem] Failed to publish structure:", error);
        UI.showToast("Failed to save your building to the network", "error");
      });
  },
  
  subscribeToBuildings: function() {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[BuildingSystem] Game relay not connected");
      return;
    }
    
    // Subscribe to building events
    const filters = [{ kinds: [this.buildingKind] }];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processStructureEvent(event),
        () => console.log("[BuildingSystem] Building events subscription complete")
      );
      
      console.log("[BuildingSystem] Subscribed to building events");
    } catch (error) {
      console.error("[BuildingSystem] Failed to subscribe to building events:", error);
    }
  },
  
  processStructureEvent: function(event) {
    if (!event || !event.content) return;
    
    try {
      const structure = JSON.parse(event.content);
      
      // Check if we already have this structure
      const existingIndex = this.structures.findIndex(s => s.id === structure.id);
      
      if (existingIndex === -1) {
        // New structure
        this.structures.push(structure);
        this.createStructureElement(structure);
      }
    } catch (error) {
      console.error("[BuildingSystem] Error processing building event:", error);
    }
  }
};

// ========================
// 11. INVENTORY AND SHOP SYSTEM
// ========================

const InventorySystem = {
  init: function() {
    console.log("[InventorySystem] Initializing...");
    this.enhanceInventoryUI();
    this.setupShopSystem();
    console.log("[InventorySystem] Initialized");
  },
  
  enhanceInventoryUI: function() {
    // Enhance existing inventory interface
    // Add publishing to game relay
    const originalUpdateInventoryUI = UI.updateInventoryUI;
    
    UI.updateInventoryUI = function() {
      originalUpdateInventoryUI.call(UI);
      
      // Also publish inventory to game relay
      InventorySystem.publishInventory();
    };
  },
  
  publishInventory: function() {
    if (!Player || !Player.pubkey || !Nostr || !Nostr.gameRelay) return;
    
    // Create inventory event
    const inventoryEvent = {
      kind: 420003, // Item kind from the config
      content: JSON.stringify({
        inventory: Player.inventory,
        equipment: Player.equipment,
        pet: Player.pet
      }),
      tags: [
        ["t", "inventory"],
        ["g", "relay-world"],
        ["p", Player.pubkey]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Publish to game relay
    Nostr.publishEvent(Nostr.gameRelay, inventoryEvent)
      .then(() => {
        console.log("[InventorySystem] Inventory published successfully");
      })
      .catch(error => {
        console.error("[InventorySystem] Failed to publish inventory:", error);
      });
  },
  
  setupShopSystem: function() {
    // Set up shop// ========================
// 7. CORNYCHAT IFRAME INTEGRATION
// ========================

const CornyChatIntegration = {
  init: function() {
    console.log("[CornyChatIntegration] Initializing...");
    this.createIframe();
    console.log("[CornyChatIntegration] Initialized");
  },
  
  createIframe: function() {
    // Create iframe container
    const container = document.createElement('div');
    container.id = 'cornychat-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.width = '350px';
    container.style.height = '500px';
    container.style.zIndex = '10000';
    container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    container.style.border = '4px solid var(--color-dark)';
    container.style.borderRadius = '5px';
    container.style.transition = 'all 0.3s ease';
    
    // Create header with controls
    const header = document.createElement('div');
    header.style.backgroundColor = 'var(--color-medium)';
    header.style.color = 'var(--color-very-light)';
    header.style.padding = '5px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.innerHTML = '<span>CornyChatIntegration</span>';
    
    // Add minimize and close buttons
    const controls = document.createElement('div');
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.marginRight = '5px';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.background = 'none';
    minimizeBtn.style.color = 'var(--color-very-light)';
    minimizeBtn.style.fontSize = '18px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.onclick = this.minimizeIframe.bind(this);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'none';
    closeBtn.style.color = 'var(--color-very-light)';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = this.closeIframe.bind(this);
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(controls);
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'https://cornychat.com/relayworld';
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 30px)';
    iframe.style.border = 'none';
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(iframe);
    
    // Add to body
    document.body.appendChild(container);
    
    // Make draggable
    this.makeDraggable(container, header);
    
    // Store reference
    this.container = container;
    this.iframe = iframe;
    this.isMinimized = false;
  },
  
  minimizeIframe: function() {
    if (this.isMinimized) {
      // Restore
      this.container.style.height = '500px';
      this.iframe.style.display = 'block';
      this.isMinimized = false;
    } else {
      // Minimize
      this.container.style.height = '30px';
      this.iframe.style.display = 'none';
      this.isMinimized = true;
    }
  },
  
  closeIframe: function() {
    this.container.style.display = 'none';
  },
  
  makeDraggable: function(elmnt, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // Get the mouse cursor position at startup
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // Call a function whenever the cursor moves
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // Calculate the new cursor position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // Set the element's new position
      const newTop = elmnt.offsetTop - pos2;
      const newLeft = elmnt.offsetLeft - pos1;
      
      // Constrain to window boundaries
      if (newTop > 0 && newTop < window.innerHeight - 30) {
        elmnt.style.top = newTop + "px";
      }
      
      if (newLeft > 0 && newLeft < window.innerWidth - 100) {
        elmnt.style.left = newLeft + "px";
      }
    }
    
    function closeDragElement() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
};

// ========================
// 8. DIRECT MESSAGING & USER INTERACTIONS
// ========================

const DirectMessaging = {
  init: function() {
    console.log("[DirectMessaging] Initializing...");
    this.setupUI();
    console.log("[DirectMessaging] Initialized");
  },
  
  setupUI: function() {
    // Add direct message UI to user popup
    const userPopup = document.getElementById('user-popup');
    if (!userPopup) return;
    
    // Check if direct message UI already exists
    if (document.getElementById('direct-message-container')) return;
    
    // Create direct message container
    const dmContainer = document.createElement('div');
    dmContainer.id = 'direct-message-container';
    dmContainer.className = 'hide';
    dmContainer.innerHTML = `
      <div class="dm-header">
        <h4>Direct Messages</h4>
      </div>
      <div id="direct-message-content"></div>
      <div class="dm-input">
        <textarea id="dm-message" placeholder="Type your message..."></textarea>
        <button id="send-dm-button" class="pixel-button">Send</button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #direct-message-container {
        margin-top: 15px;
        border-top: 2px solid var(--color-medium);
        padding-top: 15px;
      }
      
      #direct-message-content {
        max-height: 200px;
        overflow-y: auto;
        margin: 10px 0;
        padding: 10px;
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
      }
      
      .dm-message {
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 5px;
        max-width: 80%;
        position: relative;
      }
      
      .dm-message.from-me {
        background-color: var(--color-medium);
        color: var(--color-very-light);
        margin-left: auto;
      }
      
      .dm-message.from-them {
        background-color: var(--color-light);
        color: var(--color-dark);
      }
      
      .dm-timestamp {
        font-size: 10px;
        text-align: right;
        margin-top: 5px;
        opacity: 0.7;
      }
      
      .dm-input {
        display: flex;
        gap: 10px;
      }
      
      #dm-message {
        flex: 1;
        height: 60px;
        resize: none;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to user popup
    userPopup.appendChild(dmContainer);
    
    // Add event listeners
    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
      chatButton.addEventListener('click', this.toggleDirectMessageUI.bind(this));
    }
    
    const sendButton = document.getElementById('send-dm-button');
    if (sendButton) {
      sendButton.addEventListener('click', this.sendDirectMessage.bind(this));
    }
    
    const messageInput = document.getElementById('dm-message');
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendDirectMessage();
        }
      });
    }
  },
  
  toggleDirectMessageUI: function() {
    const dmContainer = document.getElementById('direct-message-container');
    if (!dmContainer) return;
    
    dmContainer.classList.toggle('hide');
    
    if (!dmContainer.classList.contains('hide')) {
      // Focus message input
      const messageInput = document.getElementById('dm-message');
      if (messageInput) messageInput.focus();
      
      // Load previous messages
      this.loadPreviousMessages();
    }
  },
  
  loadPreviousMessages: function() {
    const userPopup = document.getElementById('user-popup');
    if (!userPopup) return;
    
    const pubkey = userPopup.dataset.pubkey;
    if (!pubkey) return;
    
    // Clear previous messages
    const messageContent = document.getElementById('direct-message-content');
    if (messageContent) messageContent.innerHTML = '';
    
    // In a real implementation, we would fetch previous messages from the relays
    // For now, display a placeholder message
    const placeholderMessage = document.createElement('div');
    placeholderMessage.className = 'dm-placeholder';
    placeholderMessage.textContent = 'Start a new conversation';
    placeholderMessage.style.textAlign = 'center';
    placeholderMessage.style.color = 'var(--color-medium)';
    placeholderMessage.style.padding = '20px';
    placeholderMessage.style.fontStyle = 'italic';
    
    if (messageContent) messageContent.appendChild(placeholderMessage);
  },
  
  sendDirectMessage: function() {
    const userPopup = document.getElementById('user-popup');
    if (!userPopup) return;
    
    const pubkey = userPopup.dataset.pubkey;
    if (!pubkey) return;
    
    const messageInput = document.getElementById('dm-message');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Create message UI element immediately
    UI.addDirectMessage('You', message, true);
    
    // Clear input
    messageInput.value = '';
    
    // Send the message via Nostr
    if (Nostr.publishDirectMessage) {
      Nostr.publishDirectMessage(pubkey, message)
        .then(() => {
          console.log("[DirectMessaging] Message sent successfully");
        })
        .catch(error => {
          console.error("[DirectMessaging] Failed to send message:", error);
          UI.showToast("Failed to send direct message", "error");
        });
    }
  }
};

// ========================
// 9. KIND 1 NOTE PUBLISHING & RENDERING
// ========================

const NotePublisher = {
  init: function() {
    console.log("[NotePublisher] Initializing...");
    this.setupUI();
    this.enhanceNoteRendering();
    console.log("[NotePublisher] Initialized");
  },
  
  setupUI: function() {
    // Add note publishing UI to player profile
    const playerProfile = document.getElementById('player-profile');
    if (!playerProfile) return;
    
    // Check if note publisher already exists
    if (document.getElementById('note-publisher')) return;
    
    // Create note publisher container
    const publisherContainer = document.createElement('div');
    publisherContainer.id = 'note-publisher';
    publisherContainer.className = 'note-publisher';
    publisherContainer.innerHTML = `
      <button id="new-note-button" class="action-button">Publish Note</button>
    `;
    
    // Add to player profile
    playerProfile.appendChild(publisherContainer);
    
    // Create note publishing modal
    const modal = document.createElement('div');
    modal.id = 'note-publish-modal';
    modal.className = 'modal hide';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Publish Note</h3>
          <button id="note-modal-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <textarea id="note-content" placeholder="What's on your mind?"></textarea>
          <div class="note-attachments">
            <button id="add-image-button" class="pixel-button">Add Image</button>
            <input type="file" id="image-upload" accept="image/*" style="display: none;">
            <div id="image-preview"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="publish-note-button" class="primary-button">Publish</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .note-publisher {
        margin-top: 10px;
      }
      
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: var(--z-modal);
      }
      
      .modal-content {
        background-color: var(--color-light);
        border: 6px solid var(--color-dark);
        width: 80%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.3);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background-color: var(--color-medium);
        color: var(--color-very-light);
      }
      
      .modal-header h3 {
        margin: 0;
        color: var(--color-very-light);
      }
      
      .close-button {
        background: none;
        border: none;
        color: var(--color-very-light);
        font-size: 24px;
        cursor: pointer;
      }
      
      .modal-body {
        padding: 15px;
      }
      
      #note-content {
        width: 100%;
        min-height: 150px;
        margin-bottom: 15px;
        resize: vertical;
      }
      
      .note-attachments {
        margin-top: 10px;
      }
      
      #image-preview {
        margin-top: 10px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      #image-preview img {
        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
      }
      
      .modal-footer {
        padding: 10px 15px;
        text-align: right;
        border-top: 2px solid var(--color-medium);
      }
      
      /* Enhanced note rendering */
      .user-note-content {
        white-space: pre-wrap;
      }
      
      .note-media {
        margin-top: 10px;
        cursor: pointer;
      }
      
      .note-media img {
        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
      }
      
      .note-media video,
      .note-media audio {
        max-width: 100/**
 * relay-world-improvements.js
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
const originalUpdateLeaderboard = UI.updateLeaderboard;
UI.updateLeaderboard = function() {
  const leaderboardEntries = document.getElementById('leaderboard-entries');
  leaderboardEntries.innerHTML = '';
  
  const activeTab = document.querySelector('#leaderboard-tabs .tab-button.active');
  const type = activeTab ? activeTab.dataset.type : 'score';
  
  // Include all users, including the current player
  let users = Array.from(Nostr.users.values());
  
  // Add current player if not already included
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
        UI.showUserPopup(user.pubkey);
      });
    }
    
    leaderboardEntries.appendChild(entry);
  });
};

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
    selector.appendChild(explorerGroup);
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
      option.selected = RelayWorld.config.EXPLORER_KINDS.includes(kindInfo.kind);
      commonGroup.appendChild(option);
    });
    
    // Add game kinds group
    const gameGroup = document.createElement('optgroup');
    gameGroup.label = "Game Kinds";
    
    for (const [name, kind] of Object.entries(RelayWorld.config.EVENT_KINDS)) {
      const option = document.createElement('option');
      option.value = kind;
      option.textContent = `Kind ${kind} (${name.toLowerCase()})`;
      gameGroup.appendChild(option);
    }
    
    // Add custom kinds group if any
    if (Game && Game.subscribedGameKinds) {
      const customKinds = Game.subscribedGameKinds.filter(kind => 
        !Object.values(RelayWorld.config.EVENT_KINDS).includes(kind) &&
        !commonKinds.some(k => k.kind === kind)
      );
      
      if (customKinds.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = "Custom Kinds";
        
        customKinds.forEach(kind => {
          const option = document.createElement('option');
          option.value = kind;
          option.textContent = `Kind ${kind}`;
          customGroup.appendChild(option);
        });
        
        selector.appendChild(customGroup);
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
          UI.showToast(`Switched explorer to ${relayUrl}`, "success");
        }
      });
    }
    
    // Custom relay input event listener
    const addRelayButton = document.getElementById('add-relay-button');
    if (addRelayButton) {
      addRelayButton.addEventListener('click', () => {
        const input = document.getElementById('custom-relay-input');
        let relayUrl = input.value.trim();
        
        if (!relayUrl) {
          UI.showToast("Please enter a relay URL", "error");
          return;
        }
        
        if (!relayUrl.startsWith('wss://')) {
          relayUrl = `wss://${relayUrl}`;
        }
        
        // Check if it's the game relay
        if (relayUrl === RelayWorld.config.GAME_RELAY) {
          UI.showToast("Cannot add the game relay as an explorer", "error");
          return;
        }
        
        if (Nostr && Nostr.connectToExplorerRelay) {
          UI.showToast(`Connecting to ${relayUrl}...`, "info");
          
          Nostr.connectToExplorerRelay(relayUrl)
            .then(() => {
              UI.showToast(`Connected to ${relayUrl}`, "success");
              this.updateRelaySelector();
              input.value = '';
            })
            .catch(error => {
              UI.showToast(`Failed to connect: ${error.message}`, "error");
            });
        }
      });
    }
    
    // Kind selector and add custom kind
    const kindsSelector = document.getElementById('kinds-selector');
    if (kindsSelector) {
      kindsSelector.addEventListener('change', (e) => {
        const selectedKinds = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
        
        if (Nostr && Nostr.subscribeToKinds) {
          Nostr.subscribeToKinds(selectedKinds);
          UI.showToast(`Updated subscription to kinds: ${selectedKinds.join(', ')}`, "success");
        }
      });
    }
    
    const addKindButton = document.getElementById('add-kind-button');
    if (addKindButton) {
      addKindButton.addEventListener('click', () => {
        const input = document.getElementById('custom-kind-input');
        const kindStr = input.value.trim();
        
        if (!kindStr) {
          UI.showToast("Please enter an event kind", "error");
          return;
        }
        
        const kind = parseInt(kindStr);
        if (isNaN(kind) || kind < 0) {
          UI.showToast("Event kind must be a positive integer", "error");
          return;
        }
        
        if (Nostr && Nostr.subscribeToKinds) {
          Nostr.subscribeToKinds([kind]);
          UI.showToast(`Added subscription to kind ${kind}`, "success");
          input.value = '';
          this.updateKindsSelector();
        }
      });
    }
  }
};

// Add methods to subscribe to specific kinds in Nostr
Nostr.subscribeToKinds = function(kinds) {
  if (!Array.isArray(kinds) || kinds.length === 0 || !this.activeExplorerRelay) {
    return false;
  }
  
  const relay = this.explorerRelays.get(this.activeExplorerRelay);
  if (!relay) return false;
  
  console.log(`[Nostr] Subscribing to kinds: ${kinds.join(', ')} on ${this.activeExplorerRelay}`);
  
  // Update EXPLORER_KINDS config
  RelayWorld.config.EXPLORER_KINDS = kinds;
  
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
        document.getElementById('zap-amount').value = amount;
        
        // Clear active class from all presets
        presets.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked preset
        preset.classList.add('active');
      });
    });
    
    // Send button
    const sendButton = document.getElementById('zap-send-button');
    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendZap());
    }
  },
  
  showZapInterface: function(pubkey) {
    const user = Nostr.getUser(pubkey);
    if (!user) {
      UI.showToast("User not found", "error");
      return;
    }
    
    // First check if user has a lightning address
    if (!user.profile || !user.profile.lud16) {
      UI.showToast(`${user.profile?.name || 'User'} doesn't have a lightning address`, "error");
      return;
    }
    
    // Check if Bitcoin Connect is available
    if (!window.BitcoinConnect) {
      UI.showToast("BitcoinConnect not available. Connecting via WebLN...", "info");
      this.checkWebLNProvider();
    }
    
    // Update zap interface with user info
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) {
      UI.showToast("Zap interface not found", "error");
      return;
    }
    
    const userImage = document.getElementById('zap-target-image');
    const userName = document.getElementById('zap-target-name');
    
    userImage.src = user.profile?.picture || "assets/icons/default-avatar.png";
    userName.textContent = user.profile?.name || user.pubkey.slice(0, 8);
    
    // Set default amount
    document.getElementById('zap-amount').value = "21";
    document.getElementById('zap-message').value = "";
    
    // Reset preset buttons
    document.querySelectorAll('.zap-preset').forEach(preset => {
      preset.classList.remove('active');
    });
    document.querySelector('.zap-preset[data-amount="21"]').classList.add('active');
    
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
      document.getElementById('bitcoin-connect-modal').classList.remove('hide');
      return false;
    } catch (error) {
      console.error("[ZapManager] Failed to check WebLN provider:", error);
      UI.showToast("No lightning wallet found. Please connect one.", "error");
      return false;
    }
  },
  
  sendZap: async function() {
    const zapInterface = document.getElementById('zap-interface');
    const targetPubkey = zapInterface.dataset.targetPubkey;
    
    if (!targetPubkey) {
      UI.showToast("No zap target selected", "error");
      return;
    }
    
    const user = Nostr.getUser(targetPubkey);
    if (!user) {
      UI.showToast("User not found", "error");
      return;
    }
    
    // Check for lightning address (lud16) or lnurl in user profile
    const lightningAddress = user.profile?.lud16;
    if (!lightningAddress) {
      UI.showToast("User doesn't have a lightning address", "error");
      return;
    }
    
    // Get zap amount and message
    const amount = parseInt(document.getElementById('zap-amount').value);
    const message = document.getElementById('zap-message').value;
    
    if (isNaN(amount) || amount <= 0) {
      UI.showToast("Invalid zap amount", "error");
      return;
    }
    
    try {
      // Check if WebLN is available
      const hasWebLN = await this.checkWebLNProvider();
      if (!hasWebLN) {
        UI.showToast("Please connect a lightning wallet first", "error");
        return;
      }
      
      // Show loading state
      const sendButton = document.getElementById('zap-send-button');
      sendButton.disabled = true;
      sendButton.textContent = "Sending...";
      
      // Create a zap request event (kind 9734)
      const zapRequest = await this.createZapRequest(targetPubkey, amount, message);
      
      // Get LNURL pay info from lightning address
      const lnurlInfo = await this.getLnurlInfo(lightningAddress);
      
      // Send zap
      if (lnurlInfo.allowsNostr && lnurlInfo.nostrPubkey) {
        await this.sendZapPayment(lnurlInfo, zapRequest, amount);
      } else {
        await this.sendRegularPayment(lightningAddress, amount, message);
      }
      
      // Track zap sent
      Player.zapsSent = (Player.zapsSent || 0) + 1;
      Player.score += Math.floor(amount / 10); // 10% of zap amount as score
      
      // Publish player stats
      if (Nostr.publishPlayerStats) {
        Nostr.publishPlayerStats();
      }
      
      // Update UI
      UI.updatePlayerProfile();
      
      // Create zap visual effect
      this.createZapEffect(user.x, user.y);
      
      // Show success message
      UI.showToast(`Zapped ${user.profile?.name || targetPubkey.slice(0, 8)} ${amount} sats!`, "success");
      
      // Hide zap interface
      zapInterface.classList.add('hide');
      
      // Save to local storage
      PersistenceManager.saveToStorage();
      
    } catch (error) {
      console.error("[ZapManager] Failed to send zap:", error);
      UI.showToast(`Zap failed: ${error.message}`, "error");
    } finally {
      // Reset button state
      const sendButton = document.getElementById('zap-send-button');
      sendButton.disabled = false;
      sendButton.textContent = "Send Zap";
    }
  },
  
  createZapRequest: async function(recipientPubkey, amount, comment) {
    try {
      if (!window.NostrTools) {
        throw new Error("NostrTools not found");
      }
      
      // Create zap request event (kind 9734)
      const zapRequestEvent = {
        kind: 9734,
        content: comment || "",
        tags: [
          ["p", recipientPubkey],
          ["amount", (amount * 1000).toString()], // Convert to millisats
          ["relays", ...Array.from(Nostr.relays || [])],
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: Player.pubkey
      };
      
      // Sign the event
      const signedEvent = await Nostr.signEvent(zapRequestEvent);
      return signedEvent;
      
    } catch (error) {
      console.error("[ZapManager] Failed to create zap request:", error);
      throw error;
    }
  },
  
  getLnurlInfo: async function(lightningAddress) {
    try {
      // Parse lightning address
      const [name, domain] = lightningAddress.split('@');
      
      // Fetch LNURL info
      const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lightning address info: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        callback: data.callback,
        minSendable: data.minSendable,
        maxSendable: data.maxSendable,
        nostrPubkey: data.nostrPubkey,
        allowsNostr: data.allowsNostr || false
      };
    } catch (error) {
      console.error("[ZapManager] Failed to get LNURL info:", error);
      throw new Error("Failed to get lightning address info");
    }
  },
  
  sendZapPayment: async function(lnurlInfo, zapRequest, amount) {
    try {
      if (!window.webln && !window.alby) {
        throw new Error("No WebLN provider available");
      }
      
      const webln = window.webln || window.alby;
      
      // Amount in millisats
      const millisats = amount * 1000;
      
      // Check against min/max
      if (millisats < lnurlInfo.minSendable) {
        throw new Error(`Amount too small. Minimum is ${lnurlInfo.minSendable / 1000} sats.`);
      }
      
      if (millisats > lnurlInfo.maxSendable) {
        throw new Error(`Amount too large. Maximum is ${lnurlInfo.maxSendable / 1000} sats.`);
      }
      
      // Encode zap request as JSON and encode for URL
      const encodedZapRequest = encodeURIComponent(JSON.stringify(zapRequest));
      
      // Create callback URL with zap request
      const callbackUrl = `${lnurlInfo.callback}?amount=${millisats}&nostr=${encodedZapRequest}`;
      
      // Fetch invoice
      const response = await fetch(callbackUrl);
      if (!response.ok) {
        throw new Error(`Failed to get invoice: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.pr) {
        throw new Error("No invoice received from lightning provider");
      }
      
      // Pay invoice
      const result = await webln.sendPayment(data.pr);
      
      console.log("[ZapManager] Zap payment sent:", result);
      return result;
      
    } catch (error) {
      console.error("[ZapManager] Failed to send zap payment:", error);
      throw error;
    }
  },
  
  sendRegularPayment: async function(lightningAddress, amount, message) {
    try {
      if (!window.webln && !window.alby) {
        throw new Error("No WebLN provider available");
      }
      
      const webln = window.webln || window.alby;
      
      // Parse lightning address
      const [name, domain] = lightningAddress.split('@');
      
      // Fetch LNURL info
      const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lightning address info: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Amount in millisats
      const millisats = amount * 1000;
      
      // Check against min/max
      if (millisats < data.minSendable) {
        throw new Error(`Amount too small. Minimum is ${data.minSendable / 1000} sats.`);
      }
      
      if (millisats > data.maxSendable) {
        throw new Error(`Amount too large. Maximum is ${data.maxSendable / 1000} sats.`);
      }
      
      // Create callback URL
      let callbackUrl = `${data.callback}?amount=${millisats}`;
      
      // Add comment if provided
      if (message && data.commentAllowed && message.length <= data.commentAllowed) {
        callbackUrl += `&comment=${encodeURIComponent(message)}`;
      }
      
      // Fetch invoice
      const invoiceResponse = await fetch(callbackUrl);
      if (!invoiceResponse.ok) {
        throw new Error(`Failed to get invoice: ${invoiceResponse.status}`);
      }
      
      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error("No invoice received from lightning provider");
      }
      
      // Pay invoice
      const result = await webln.sendPayment(invoiceData.pr);
      
      console.log("[ZapManager] Lightning payment sent:", result);
      return result;
      
    } catch (error) {
      console.error("[ZapManager] Failed to send lightning payment:", error);
      throw error;
    }
  },
  
  createZapEffect: function(x, y) {
    if (!Game) return;
    
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
    
    // Create hamburger menu button
    this.createHamburgerMenu();
    
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
  
  createHamburgerMenu: function() {
    // Create hamburger menu button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.id = 'mobile-menu-toggle';
    hamburgerBtn.className = 'hamburger-menu';
    hamburgerBtn.innerHTML = `
      <div class="hamburger-lines">
        <span class="line line1"></span>
        <span class="line line2"></span>
        <span class="line line3"></span>
      </div>
    `;
    
    // Add button to top bar
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      topBar.prepend(hamburgerBtn);
    }
    
    // Create mobile menu container
    const mobileMenu = document.createElement('div');
    mobileMenu.id = 'mobile-menu';
    mobileMenu.className = 'mobile-menu hide';
    mobileMenu.innerHTML = `
      <div class="mobile-menu-header">
        <h3>Menu</h3>
        <button id="mobile-menu-close">×</button>
      </div>
      <div class="mobile-menu-content">
        <div class="mobile-section" id="mobile-player-section">
          <!-- Player profile will be moved here on mobile -->
        </div>
        <div class="mobile-section" id="mobile-explorer-section">
          <!-- Explorer controls will be moved here on mobile -->
        </div>
        <div class="mobile-section" id="mobile-leaderboard-section">
          <!-- Leaderboard will be moved here on mobile -->
        </div>
      </div>
    `;
    
    // Add to UI container
    const uiContainer = document.getElementById('ui-container');
    if (uiContainer) {
      uiContainer.appendChild(mobileMenu);
    }
    
    // Add event listeners
    hamburgerBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hide');
      hamburgerBtn.classList.toggle('active');
    });
    
    const closeBtn = document.getElementById('mobile-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        mobileMenu.classList.add('hide');
        hamburgerBtn.classList.remove('active');
      });
    }
  },
  
  createResponsiveStyles: function() {
    // Create style element for responsive styles
    const styleEl = document.createElement('style');
    styleEl.id = 'responsive-styles';
    styleEl.innerHTML = `
      /* Mobile Menu Styles */
      .hamburger-menu {
        display: none;
        flex-direction: column;
        justify-content: space-between;
        width: 30px;
        height: 24px;
        cursor: pointer;
        z-index: 200;
        background: none;
        border: none;
        padding: 0;
      }
      
      .hamburger-lines {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 24px;
      }
      
      .hamburger-menu .line {
        display: block;
        height: 4px;
        width: 100%;
        background-color: #ffffff;
        border-radius: 10px;
        transition: all 0.3s ease;
      }
      
      .hamburger-menu.active .line1 {
        transform: translateY(10px) rotate(45deg);
      }
      
      .hamburger-menu.active .line2 {
        opacity: 0;
      }
      
      .hamburger-menu.active .line3 {
        transform: translateY(-10px) rotate(-45deg);
      }
      
      .mobile-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 80%;
        height: 100%;
        background-color: var(--color-dark);
        border-right: 4px solid var(--color-medium);
        z-index: var(--z-modal);
        transition: transform 0.3s ease;
        overflow-y: auto;
        transform: translateX(-100%);
      }
      
      .mobile-menu:not(.hide) {
        transform: translateX(0);
      }
      
      .mobile-menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background-color: var(--color-medium);
        border-bottom: 4px solid var(--color-dark);
      }
      
      .mobile-menu-header h3 {
        margin: 0;
        color: var(--color-very-light);
      }
      
      #mobile-menu-close {
        background: none;
        border: none;
        color: var(--color-very-light);
        font-size: 24px;
        cursor: pointer;
      }
      
      .mobile-menu-content {
        padding: 15px;
      }
      
      .mobile-section {
        margin-bottom: 20px;
      }
      
      /* Mobile Responsiveness */
      @media (max-width: ${this.breakpoints.mobile}px) {
        .hamburger-menu {
          display: flex;
        }
        
        #player-profile,
        #leaderboard-container {
          display: none !important;
        }
        
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
        
        /* Modify toast position */
        #toast-container {
          top: 60px;
          width: 90%;
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
      this.moveElementsToMobileMenu();
    }
  },
  
  moveElementsToMobileMenu: function() {
    // Move player profile to mobile menu
    const playerProfile = document.getElementById('player-profile');
    const mobilePlayerSection = document.getElementById('mobile-player-section');
    
    if (playerProfile && mobilePlayerSection) {
      const playerProfileClone = playerProfile.cloneNode(true);
      playerProfileClone.id = 'mobile-player-profile';
      playerProfileClone.classList.remove('hide');
      
      // Clear previous content if any
      mobilePlayerSection.innerHTML = '';
      mobilePlayerSection.appendChild(playerProfileClone);
    }
    
    // Move explorer controls to mobile menu
    const gameControls = document.getElementById('game-controls');
    const mobileExplorerSection = document.getElementById('mobile-explorer-section');
    
    if (gameControls && mobileExplorerSection) {
      const gameControlsClone = gameControls.cloneNode(true);
      gameControlsClone.id = 'mobile-game-controls';
      
      // Clear previous content if any
      mobileExplorerSection.innerHTML = '<h4>Explorer</h4>';
      mobileExplorerSection.appendChild(gameControlsClone);
    }
    
    // Move leaderboard to mobile menu
    const leaderboard = document.getElementById('leaderboard-container');
    const mobileLeaderboardSection = document.getElementById('mobile-leaderboard-section');
    
    if (leaderboard && mobileLeaderboardSection) {
      const leaderboardClone = leaderboard.cloneNode(true);
      leaderboardClone.id = 'mobile-leaderboard';
      leaderboardClone.classList.remove('hide');
      
      // Clear previous content if any
      mobileLeaderboardSection.innerHTML = '';
      mobileLeaderboardSection.appendChild(leaderboardClone);
    }
  },
  
  handleResize: function() {
    const isMobile = window.innerWidth <= this.breakpoints.mobile;
    
    // Update mobile menu elements if resized across breakpoint
    if (isMobile) {
      this.moveElementsToMobileMenu();
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
    if (event.pubkey === Player.pubkey) return;
    
    try {
      const content = event.content;
      
      // Get user's name
      let username = "Unknown";
      const user = Nostr.getUser(event.pubkey);
      if (user && user.profile && user.profile.name) {
        username = user.profile.name;
      } else {
        username = Utils.formatPubkey(event.pubkey, { short: true });
      }
      
      // Add message to chat
      UI.addChatMessage(username, content);
      
      // Play notification sound if message is recent (within last 10 seconds)
      const messageAge = Math.floor(Date.now() / 1000) - event.created_at;
      if (messageAge < 10 && UI.playSound) {
        UI.playSound('chat');
      }
      
    } catch (error) {
      console.error("[GameChat] Error processing game chat event:", error);
    }
  },
  
  sendGameChatMessage: function() {
    if (!Player || !Player.pubkey || !Nostr || !Nostr.gameRelay) return;
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Create game chat event with proper tag structure (no duplicate tag identifiers)
    const event = {
      kind: this.GAME_CHAT_KIND,
      content: message,
      tags: [
        ["t", "gamechat"],
        ["g", "relay-world"], // Using 'g' tag for game identifier instead of repeating 't'
        ["p", Player.pubkey], // Tagging the sender's pubkey
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Get user's name
    let username = "You";
    if (Player.profile && Player.profile.name) {
      username = Player.profile.name;
    } else {
      username = Utils.formatPubkey(Player.pubkey, { short: true });
    }
    
    // Add message to chat immediately (don't wait for relay)
    UI.addChatMessage(username, message, true);
    
    // Clear input
    input.value = '';
    
    // Increment chat messages counter
    Player.chatMessages = (Player.chatMessages || 0) + 1;
    
    // Publish event to game relay
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
        UI.showToast("Failed to send message", "error");
      });
  }
};

// ========================
// 6. IMPROVED PLAYER & NPC RENDERING
// ========================

const ImprovedRendering = {
  // Improved sprites
  sprites: {
    playerBody: null,
    npcBody: null
  },
  
  // Animation frames
  animFrames: {
    idle: [0],
    walk: [0, 1, 2, 3],
    currentFrame: 0,
    frameCounter: 0,
    frameSpeed: 8 // Lower = faster animation
  },
  
  init: function() {
    console.log("[ImprovedRendering] Initializing...");
    this.loadSprites();
    this.improveBackgroundRendering();
    console.log("[ImprovedRendering] Initialized");
  },
  
  loadSprites: function() {
    // Create player body sprite
    this.sprites.playerBody = new Image();
    this.sprites.playerBody.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyMi0wMS0wNlQxNTowNzo1OCswMTowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjItMDEtMDZUMTU6MTU6MTcrMDE6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjItMDEtMDZUMTU6MTU6MTcrMDE6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDc4YThjNzAtYmQ0Yi0zZDQxLWI2YTAtNGFhYTIwN2FhZDYwIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjA3OGE4YzcwLWJkNGItM2Q0MS1iNmEwLTRhYWEyMDdhYWQ2MCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjA3OGE4YzcwLWJkNGItM2Q0MS1iNmEwLTRhYWEyMDdhYWQ2MCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDc4YThjNzAtYmQ0Yi0zZDQxLWI2YTAtNGFhYTIwN2FhZDYwIiBzdEV2dDp3aGVuPSIyMDIyLTAxLTA2VDE1OjA3OjU4KzAxOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjO2p0UAAAiYSURBVHja7Z1bbFRFGMd/u9vSAloLpaAtpUiKIKiJiQnRJzUKiRgVEy+JidGIl5gYgcTLixf0wQRvifHyIIYXb2/GBB+8RGOFVCMCGiGIEC61HL21pVva4/fb2bN7trvd7bns7Mx8X3JCObs9c2b+/5n55puZb1pGRkYwStbBjh3w4Yfm3StugMBL6l1hAXz7rcmRrdXrC+XlsHMnbN8OjY2m21JNDADJNNxYWmoKFo9R8nPRfAB/rlkDu3ZBUVHc+9OtQMwHyDCTxfDOnXDFFWZApQEwoFKfwHzVPNAA5Djd+nUi2LSptxcOHYJz5+C666CiQq1WzWTqDvCfJJNiNu7YASdOwNBQcgMbFIB0PO6gAVA7IiUVKDgqKMidLv6qq+D55+GnnyDgwZvS6hNkitaQmyvN3NPCrISTUd95J/z8s2n97e2mrNQ2AVmjkWNcbWoClpebjm5hoQFguMF07c5TLuGWwxNPwJkz0NUFx45BTY2JLg4AuVLnpWU3cWLK/YpXXTXlecfZs3DkCJw/b8q0ZSXQqPzWLZCuLPjTJvmHNVZXm8Hu0FDvb+q7pCQ2F2AAGOOqq2DFCujpAZlGnnYaPv8c9u2D+nqorISFC+H66wN1MWaaAhQXm+jhwAH46SczJTx7FgYHzUgjEgcAFRVm2vjbb/DaazA8DE1N0NcXrDPcmwm0xTCPPQbffAOXLsE778DgIFRVwcMP+7syY5qAINLKlSYJQ1YmN282g97OTrOMfPvt5jl8ZaV5jz3bDZrTLABM8kZtrdl8gQQCxcXQ0xPfPNgAmIsKAACmrp2dY7bsjGsC1B0AAtpoBvQVlLALV+8GxqyilDYBtgfIpIaZrQkwiWKxSdqm0jqR0icA8wFyUwKoO6CSBDAbQKVWl1YATAJEhjQvMSnhmbIppA4AEfC4uj8RmYlYNRMB7wJmKgFM+pWLC0XS6h0WoFKNjQlIQQkbAFmgAgYAs3ybiVSyAWCCLRVNQAR8Dl2f7iDHzASCWl8pHySuKwC2/rFPZ5hJEGkDIM6y6fy2kkm2CYgABH3aDQwAdufPAOCzBPBTAqgD4NdqWtpWA4PwBZx5fj8lgD0T6OcQUSeAo8S2E5l2CeC3ExzUDkZaAXBLAPUBIqBLw8mkgvUBIOkAmM1+qTYBXk8GGQBsvxqowqYQoY3ZOSaArAZqk/yXAW4JYCbfVAAI2WRQSk8F2wDYEsBPCWCzg9U0AdwSoKNDnwR4P7ODbQngtwTQBQDXvj7/5uH1HiCJdSUSUgKvJICuGUG7YeQWnMm7gUFIANM6NJAAvkkAkK2gfI1L7B0hOwA+SoBYCWDXBnSZAOaSqSsSrI8J8FsC2ADoAoCbHexrhrDtAzQ1GQlA/JIAtgTwKx8w+RJAbQlgSwC/5gDqSgCyDOuHCfBjgYh3CaAPALZlMRJATQnQ3T2xg6dCdnAmASJm+dZtjnLJBDQ1GQCcj+jq0gOAWwKozg5Wi3BUq3YA5tGvqZrsdQEzQs55DQUCARp+UHBwGwkmNzX7egBHI6tBVq+G996DtWvj3q/XdLAuhKOa1QBobob33oN166CsDJYuhU8+gSNH4PXXTXmmptBc5E49yJB7AHGLslSrsxfU0mLy8B56CC6/HL7/Hu69144Aa/cct8Ph5Ptf/hJ8/nnTr/PnYd++hHqq160A/f3w5z/DyZNw8SL09sKlS/Dss/D738OxY7Bnj+njiROwfTvs3An//AMffWQEwQcfQEcHzJgBCxaYYSxcCPfcA7fdBnPnmv0dPmw+p/0zZsD06TB/PsyfB8uXw5w50qfLl834vvgC9u83n587B5cvw1//mgx9fY9ZGzhyxHzn5ctw4QKcOWP6Pz5uWu3YMUtxW2w3rMAVV0BLC0RJADIiALq7YckSw+Cz8qnZts0YdsMNsHKlacx8+SWcPWvW+q1aBdu2mc937zaMcdFF02bBpk1w1VXGJYnTgQPwwguwe7cxrq4urrWLRg1DaWgwwDx8OIGfCYDubli6FM4KJuMRLEbgUAsABw+aP96YmK/ddpvJGSK9ckQg3H+/OTZNEBP9hdfqw4eFswT8Wq5GTu8lk0mEGpuVQCAAnnrKsGJaVABIkly61BhQUGAYRXVxvnDdOiMPOjtTA0BfnxlPuEqJkT09sGGDOQvSG0fvAKxYAXfdBY2N5nplJTz9dPy+ZGcAiAaIdLjmGnNGQp0TTW3fnvAzQKpTgDyBDRuMdiFBs3495OcnMMIcSwEDJgZZhIJ+6ik4fdqM/557YM0a097E28dbb4XXXkssyG+8Ed5800gnMQJZGBgaB0i7Xr5cMPNkAcBBz7M9n1h5tqWXkzlUqTe1bVtCI0h/APDf/zZqtukiY4MFTujrn30G998PS5aYTh07Bm+/DR9/DCdPmuuJAGBoCJ56Gubxwd3HHrsNmhuNZxGtU9q0ejXceCNMrTU2GnsjK8dF+l28mLBYcKaQQIu2jHp+gwLgm29g714jkNasIei3NDb+b6UX9PbC8ePw1VdmTnDqlMkVJif96iuoqYFhWZcWBdkJkdSJsGDB2wIiU1KdwPPPw8qV5v6rV5t7EvPqNdVff9sA+PBDs+xpfFy4vWPHYpTkKrm5cPXVxlxmgWXlSli0KMnHLKm7HXTH88JXCWuJ+T3FQPVfk6Qj5m7bNiMRpd1btxpDOOkiwYVg3boUhCmvtwB1xvrhm5RsY+YFwJtvwvPPm8/eeMPMmGTPuXLFjFgWTZK6DNxDgFQeAuQakXbxsiiiBbP6Qgal+F26ZOK1ggKzXkBHEcHlJfW18Mwz8OKL5hWklGghSYRhSP0CMkrHcbBaNi0AAAAASUVORK5CYII=';
    
    // Create NPC body sprite
    this.sprites.npcBody = new Image();
    this.sprites.npcBody.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyMi0wMS0wNlQxNTowNzo1OCswMTowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjItMDEtMDZUMTU6MTU6MTcrMDE6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjItMDEtMDZUMTU6MTU6MTcrMDE6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDc4YThjNzAtYmQ0Yi0zZDQxLWI2YTAtNGFhYTIwN2FhZDYwIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjA3OGE4YzcwLWJkNGItM2Q0MS1iNmEwLTRhYWEyMDdhYWQ2MCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjA3OGE4YzcwLWJkNGItM2Q0MS1iNmEwLTRhYWEyMDdhYWQ2MCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDc4YThjNzAtYmQ0Yi0zZDQxLWI2YTAtNGFhYTIwN2FhZDYwIiBzdEV2dDp3aGVuPSIyMDIyLTAxLTA2VDE1OjA3OjU4KzAxOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjE71R0AAAFkSURBVHja7c9BFcAgEARBCuGwcWBpQAQWcUE/NiGBTkw/Aer2PQHgXc9a7zNnrufdGwEnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABACwCjkgYgACEMw1AW+rZt33EcRVEUzhmsQOaqqsJ13QuB3ntZD28nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8BoCqsgYgAAUcRZE1NHVd7zRN8zzLsixd152bE/A8z2UYhnzf9wnBdV1lvbzrDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwDoAvqNvnKVCjtMAAAAASUVORK5CYII=';

    // Wait for sprites to load
    this.sprites.playerBody.onload = () => {
      console.log("[ImprovedRendering] Player body sprite loaded");
    };
    
    this.sprites.npcBody.onload = () => {
      console.log("[ImprovedRendering] NPC body sprite loaded");
    };
  },
  
  // Export all systems so they can be initialized
window.RelayWorldEnhancements = {
  PersistenceManager,      // Handles player data persistence
  LeaderboardManager,      // Manages the leaderboard
  RelayExplorer,           // Enhances relay selection and event viewing
  ZapManager,              // Handles lightning/zap functionality
  MobileUX,                // Provides mobile responsiveness and UX tweaks
  GameChat,                // Implements in-game chat features
  ImprovedRendering,       // Improves background and overall rendering (includes improveBackgroundRendering)
  CornyChatIntegration,    // Integrates the CornyChat iframe
  DirectMessaging,         // Handles direct messages between users
  NotePublisher,           // Publishes and renders user notes (kind 1 events)
  BuildingSystem,          // Manages in-game building placement and updates
  InventorySystem,         // Handles inventory management and the shop system
  GuildSystem,             // Manages guild and faction features

  /**
   * Initializes all systems in the proper order.
   */
  init: function() {
    console.log("[RelayWorldEnhancements] Initializing all systems...");

    // Initialize core systems first
    PersistenceManager.init();
    LeaderboardManager.init();
    RelayExplorer.init();
    ImprovedRendering.init();
    MobileUX.init();

    // Initialize game features
    ZapManager.init();
    GameChat.init();
    DirectMessaging.init();

    // Initialize additional features
    NotePublisher.init();
    CornyChatIntegration.init();
    BuildingSystem.init();
    InventorySystem.init();
    GuildSystem.init();

    // Patch Game.update to update building positions
    if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
      const originalUpdate = Game.update;
      Game.update = function(deltaTime) {
        originalUpdate.call(Game, deltaTime);
        if (BuildingSystem && BuildingSystem.updateStructurePositions) {
          BuildingSystem.updateStructurePositions();
        }
      };
    }

    console.log("[RelayWorldEnhancements] All systems initialized");
  }
};

// Optionally, export as the default export if using a module system
export default window.RelayWorldEnhancements;
