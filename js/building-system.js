/**
 * building-system.js - Enables players to build and place structures in the game world
 * These structures are stored as Nostr events and visible to all players
 */

const BuildingSystem = {
  buildingKind: 420100, // Custom kind for building data
  structures: [],
  buildingMode: false,
  selectedItem: null,
  
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
    
    // Create building interface if it doesn't exist
    if (!document.getElementById('building-interface')) {
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
    }
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
    if (!button) return;
    
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
        if (UI && UI.showToast) {
          UI.showToast("Please select an item to build", "warning");
        }
        return;
      }
      
      // Check if player has enough points
      if (Player && Player.score < this.selectedItem.cost) {
        if (UI && UI.showToast) {
          UI.showToast(`Not enough points. Need ${this.selectedItem.cost} points.`, "error");
        }
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
      
      if (UI && UI.showToast) {
        UI.showToast("Click on the map to place your building", "info");
      }
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
    if (Player) {
      Player.score -= item.cost;
      if (UI && UI.updatePlayerProfile) {
        UI.updatePlayerProfile();
      }
    }
    
    // Publish structure to game relay
    this.publishStructure(structure);
    
    if (UI && UI.showToast) {
      UI.showToast(`${item.name} built successfully!`, "success");
    }
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
    if (!Game || !Game.camera || !Game.canvas) return;
    
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
    const isOwner = Player && Player.pubkey === structure.owner;
    const ownerText = isOwner ? "you" : "another player";
    
    if (UI && UI.showToast) {
      UI.showToast(`${structure.name} built by ${ownerText}`, "info");
    }
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
      .then(() => {
        console.log("[BuildingSystem] Structure published successfully");
      })
      .catch(error => {
        console.error("[BuildingSystem] Failed to publish structure:", error);
        if (UI && UI.showToast) {
          UI.showToast("Failed to save your building to the network", "error");
        }
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

// Export the BuildingSystem
export default BuildingSystem;
