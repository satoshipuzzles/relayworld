/**
 * player-module.js
 * Player state and movement for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const PlayerModule = {
    // Module metadata
    name: "player",
    description: "Player state and movement",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["utils"],
    priority: 20, // Initialize after core modules but before game
    critical: true, // Critical module
    
    // Module state
    initialized: false,
    
    // Identity
    pubkey: null,
    profile: null,
    
    // Position in world
    x: 0,
    y: 0,
    
    // Movement
    bobOffset: 0,
    input: {
        up: false,
        down: false,
        left: false,
        right: false
    },
    
    // Properties for chat focus tracking
    chatFocused: false,   // Flag to track if chat input is focused
    _inputState: {},      // Store input state when chat is focused
    
    // Stats
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    score: 0,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    baseSpeed: 200,
    
    // Inventory and equipment
    inventory: [],
    equipment: {
        head: null,
        body: null,
        weapon: null,
        offhand: null,
        feet: null,
        accessory: null
    },
    pet: null,
    
    // Active effects
    buffs: [],
    
    // Progress tracking
    itemsCollected: 0,
    distanceTraveled: 0,
    interactions: 0,
    completedQuests: [],
    chatMessages: 0,
    follows: 0,
    treasuresOpened: 0,
    zapsSent: 0,
    zapsReceived: 0,
    
    // Initialize player module
    init: function() {
        console.log("[Player] Initializing player module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Load saved player data
        this.loadSavedData();
        
        this.initialized = true;
        console.log("[Player] Player module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for auth:login event
        RelayWorldCore.eventBus.on('auth:login', (data) => {
            this.setPubkey(data.pubkey);
        });
        
        // Listen for nostr:profileUpdate event
        RelayWorldCore.eventBus.on('nostr:profileUpdate', (data) => {
            if (data.pubkey === this.pubkey) {
                this.setProfile(data.profile);
            }
        });
        
        // Listen for chat focus events
        document.addEventListener('focusin', (e) => {
            if (e.target.id === 'chat-input') {
                this.handleChatFocus();
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (e.target.id === 'chat-input') {
                this.handleChatBlur();
            }
        });
        
        // Listen for beforeunload to save player data
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
    },
    
    // Set player's public key
    setPubkey: function(pubkey) {
        this.pubkey = pubkey;
        console.log(`[Player] Public key set: ${pubkey.substring(0, 8)}...`);
        
        // Emit event
        RelayWorldCore.eventBus.emit('player:pubkeySet', { pubkey });
    },
    
    // Set player profile
    setProfile: function(profile) {
        this.profile = profile;
        console.log("[Player] Profile set");
        
        // Emit event
        RelayWorldCore.eventBus.emit('player:profileSet', { profile });
    },
    
    // Handle chat input focus
    handleChatFocus: function() {
        // Store current input state
        this._inputState = { ...this.input };
        
        // Reset input to prevent movement
        this.input.up = false;
        this.input.down = false;
        this.input.left = false;
        this.input.right = false;
        
        this.chatFocused = true;
    },
    
    // Handle chat input blur
    handleChatBlur: function() {
        // Restore input state
        this.input = { ...this._inputState };
        this.chatFocused = false;
    },
    
    // Check if input should be processed
    isInputAllowed: function() {
        // Don't process movement input when chat or other inputs are focused
        if (this.chatFocused || 
            document.activeElement && document.activeElement.tagName && 
            (document.activeElement.tagName.toLowerCase() === 'input' || 
             document.activeElement.tagName.toLowerCase() === 'textarea')) {
            return false;
        }
        return true;
    },
    
    // Get player's speed (base + modifiers)
    getSpeed: function() {
        let speed = this.baseSpeed;
        
        // Add equipment bonuses
        for (const slot in this.equipment) {
            if (this.equipment[slot] && this.equipment[slot].stats && this.equipment[slot].stats.speed) {
                speed += this.equipment[slot].stats.speed;
            }
        }
        
        // Add pet bonuses
        if (this.pet && this.pet.stats && this.pet.stats.speed) {
            speed += this.pet.stats.speed;
        }
        
        // Add buffs
        for (const buff of this.buffs) {
            if (buff.stat === "speed") {
                speed += buff.value;
            }
        }
        
        return speed;
    },
    
    // Get attack power
    getAttack: function() {
        let attack = 10; // Base attack
        
        // Add equipment bonuses
        for (const slot in this.equipment) {
            if (this.equipment[slot] && this.equipment[slot].stats && this.equipment[slot].stats.attack) {
                attack += this.equipment[slot].stats.attack;
            }
        }
        
       // Add pet bonuses
        if (this.pet && this.pet.stats && this.pet.stats.attack) {
            attack += this.pet.stats.attack;
        }
        
        return attack;
    },
    
    // Get defense power
    getDefense: function() {
        let defense = 5; // Base defense
        
        // Add equipment bonuses
        for (const slot in this.equipment) {
            if (this.equipment[slot] && this.equipment[slot].stats && this.equipment[slot].stats.defense) {
                defense += this.equipment[slot].stats.defense;
            }
        }
        
        return defense;
    },
    
    // Update player stats based on equipment and buffs
    updateStats: function() {
        // Recalculate max health
        this.maxHealth = 100 + (this.level * 10);
        
        // Ensure health doesn't exceed max
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
        
        // Recalculate max energy
        this.maxEnergy = 100 + (this.level * 5);
        
        // Ensure energy doesn't exceed max
        if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
        }
        
        // Emit stats updated event
        RelayWorldCore.eventBus.emit('player:statsUpdated', {
            health: this.health,
            maxHealth: this.maxHealth,
            energy: this.energy,
            maxEnergy: this.maxEnergy,
            level: this.level,
            experience: this.experience,
            score: this.score
        });
    },
    
    // Check for level up
    checkLevelUp: function() {
        if (this.experience >= this.experienceToNextLevel) {
            this.level++;
            this.experience -= this.experienceToNextLevel;
            this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);
            
            // Update stats
            this.updateStats();
            
            // Heal to full on level up
            this.health = this.maxHealth;
            this.energy = this.maxEnergy;
            
            // Show notification
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule) {
                uiModule.showToast(`Level up! You are now level ${this.level}`, "success");
                if (uiModule.playSound) {
                    uiModule.playSound("levelup");
                }
            }
            
            // Create level up effect
            this.createLevelUpEffect();
            
            // Publish level up event
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule && nostrModule.publishPlayerStats) {
                nostrModule.publishPlayerStats();
            }
            
            // Emit level up event
            RelayWorldCore.eventBus.emit('player:levelUp', { level: this.level });
            
            // Check if we need to level up again
            this.checkLevelUp();
            
            return true;
        }
        
        return false;
    },
    
    // Create level up visual effect
    createLevelUpEffect: function() {
        // Create level up element
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const effect = document.createElement('div');
        effect.className = 'level-up-effect';
        effect.textContent = 'LEVEL UP!';
        effect.style.position = 'absolute';
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.width = '200px';
        effect.style.height = '60px';
        effect.style.display = 'flex';
        effect.style.justifyContent = 'center';
        effect.style.alignItems = 'center';
        effect.style.color = 'gold';
        effect.style.fontSize = '24px';
        effect.style.fontWeight = 'bold';
        effect.style.textShadow = '2px 2px 0 #000';
        effect.style.zIndex = '1000';
        effect.style.pointerEvents = 'none';
        effect.style.animation = 'levelUp 2s ease-out forwards';
        
        gameContainer.appendChild(effect);
        
        // Remove after animation completes
        setTimeout(() => {
            effect.remove();
        }, 2000);
    },
    
    // Update buffs (remove expired ones)
    updateBuffs: function(deltaTime) {
        const now = Date.now();
        
        // Filter out expired buffs
        this.buffs = this.buffs.filter(buff => {
            return now < buff.startTime + buff.duration;
        });
    },
    
    // Add a buff
    addBuff: function(buffId, stat, value, duration) {
        // Remove existing buff of the same ID if present
        this.buffs = this.buffs.filter(buff => buff.id !== buffId);
        
        // Add new buff
        this.buffs.push({
            id: buffId,
            stat,
            value,
            duration,
            startTime: Date.now()
        });
        
        console.log(`[Player] Buff added: ${buffId}, ${stat} +${value} for ${duration/1000}s`);
        
        // Emit buff added event
        RelayWorldCore.eventBus.emit('player:buffAdded', {
            buffId,
            stat,
            value,
            duration
        });
    },
    
    // Remove a buff by ID
    removeBuff: function(buffId) {
        const initialLength = this.buffs.length;
        this.buffs = this.buffs.filter(buff => buff.id !== buffId);
        
        if (this.buffs.length < initialLength) {
            console.log(`[Player] Buff removed: ${buffId}`);
            
            // Emit buff removed event
            RelayWorldCore.eventBus.emit('player:buffRemoved', { buffId });
            
            return true;
        }
        
        return false;
    },
    
    // Save player data to localStorage
    saveData: function() {
        try {
            const data = {
                level: this.level,
                experience: this.experience,
                experienceToNextLevel: this.experienceToNextLevel,
                score: this.score,
                inventory: this.inventory,
                equipment: this.equipment,
                pet: this.pet,
                itemsCollected: this.itemsCollected,
                distanceTraveled: this.distanceTraveled,
                interactions: this.interactions,
                completedQuests: this.completedQuests,
                chatMessages: this.chatMessages,
                follows: this.follows,
                treasuresOpened: this.treasuresOpened,
                zapsSent: this.zapsSent,
                zapsReceived: this.zapsReceived
            };
            
            localStorage.setItem('relayworld_player_data', JSON.stringify(data));
            console.log("[Player] Player data saved to localStorage");
            
            return true;
        } catch (error) {
            console.error("[Player] Failed to save player data:", error);
            return false;
        }
    },
    
    // Load player data from localStorage
    loadSavedData: function() {
        try {
            const savedData = localStorage.getItem('relayworld_player_data');
            
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Copy saved data to player object
                for (const key in data) {
                    if (this.hasOwnProperty(key)) {
                        this[key] = data[key];
                    }
                }
                
                console.log("[Player] Player data loaded from localStorage");
                
                // Update stats based on loaded data
                this.updateStats();
                
                // Emit player data loaded event
                RelayWorldCore.eventBus.emit('player:dataLoaded', { data });
                
                return true;
            }
        } catch (error) {
            console.error("[Player] Failed to load player data:", error);
        }
        
        return false;
    },
    
    // Reset player data (for testing)
    resetData: function() {
        // Reset to initial values
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        this.score = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        
        // Clear inventory and equipment
        this.inventory = [];
        this.equipment = {
            head: null,
            body: null,
            weapon: null,
            offhand: null,
            feet: null,
            accessory: null
        };
        this.pet = null;
        
        // Reset progress tracking
        this.itemsCollected = 0;
        this.distanceTraveled = 0;
        this.interactions = 0;
        this.completedQuests = [];
        this.chatMessages = 0;
        this.follows = 0;
        this.treasuresOpened = 0;
        this.zapsSent = 0;
        this.zapsReceived = 0;
        
        // Clear localStorage
        localStorage.removeItem('relayworld_player_data');
        
        console.log("[Player] Player data reset");
        
        // Emit player reset event
        RelayWorldCore.eventBus.emit('player:dataReset', null);
        
        return true;
    },
    
    // Get total inventory value
    getInventoryValue: function() {
        return this.inventory.reduce((total, item) => total + (item.value || 0), 0);
    },
    
    // Get total equipped value
    getEquippedValue: function() {
        let total = 0;
        
        for (const slot in this.equipment) {
            if (this.equipment[slot]) {
                total += this.equipment[slot].value || 0;
            }
        }
        
        if (this.pet) {
            total += this.pet.value || 0;
        }
        
        return total;
    },
    
    // Check if a quest is completed
    isQuestCompleted: function(questId) {
        return this.completedQuests.includes(questId);
    },
    
    // Add experience points
    addExperience: function(amount) {
        this.experience += amount;
        
        // Emit experience gained event
        RelayWorldCore.eventBus.emit('player:experienceGained', {
            amount,
            total: this.experience,
            needed: this.experienceToNextLevel
        });
        
        this.checkLevelUp();
    },
    
    // Add score points
    addScore: function(amount) {
        this.score += amount;
        
        // Emit score gained event
        RelayWorldCore.eventBus.emit('player:scoreGained', {
            amount,
            total: this.score
        });
        
        // Update UI
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.updatePlayerProfile) {
            uiModule.updatePlayerProfile();
        }
        
        // Publish score update
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (nostrModule && nostrModule.publishPlayerStats) {
            nostrModule.publishPlayerStats();
        }
    },
    
    // Take damage
    takeDamage: function(amount) {
        // Apply defense reduction
        const defense = this.getDefense();
        const reducedAmount = Math.max(1, amount - defense);
        
        this.health -= reducedAmount;
        
        // Emit damage taken event
        RelayWorldCore.eventBus.emit('player:damageTaken', {
            amount: reducedAmount,
            remaining: this.health
        });
        
        // Check if dead
        if (this.health <= 0) {
            this.health = 0;
            this.handleDeath();
            return true;
        }
        
        return false;
    },
    
    // Handle player death
    handleDeath: function() {
        console.log("[Player] Player died");
        
        // Reset position to center of world
        const gameModule = RelayWorldCore.getModule('game');
        if (gameModule && gameModule.world) {
            this.x = gameModule.world.width / 2;
            this.y = gameModule.world.height / 2;
        }
        
        // Restore some health
        this.health = Math.floor(this.maxHealth * 0.5);
        
        // Show death notification
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule) {
            uiModule.showToast("You have been defeated! Returning to spawn point.", "error");
            if (uiModule.playSound) uiModule.playSound("death");
        }
        
        // Emit death event
        RelayWorldCore.eventBus.emit('player:death', null);
    },
    
    // Use energy
    useEnergy: function(amount) {
        if (this.energy >= amount) {
            this.energy -= amount;
            
            // Emit energy used event
            RelayWorldCore.eventBus.emit('player:energyUsed', {
                amount,
                remaining: this.energy
            });
            
            return true;
        }
        
        return false;
    },
    
    // Restore energy
    restoreEnergy: function(amount) {
        const oldEnergy = this.energy;
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        
        const restored = this.energy - oldEnergy;
        
        // Emit energy restored event
        if (restored > 0) {
            RelayWorldCore.eventBus.emit('player:energyRestored', {
                amount: restored,
                total: this.energy,
                max: this.maxEnergy
            });
        }
    },
    
    // Add item to inventory
    addItem: function(item) {
        // Generate unique item ID if needed
        if (!item.id) {
            const utilsModule = RelayWorldCore.getModule('utils');
            if (utilsModule && utilsModule.randomId) {
                item.id = utilsModule.randomId('item-');
            } else {
                item.id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            }
        }
        
        // Add collection timestamp
        item.collectedAt = Date.now();
        
        // Add to inventory
        this.inventory.push(item);
        
        // Update collection stats
        this.itemsCollected++;
        
        // Add score if item has value
        if (item.value) {
            this.addScore(item.value);
        }
        
        // Emit item collected event
        RelayWorldCore.eventBus.emit('player:itemCollected', { item });
        
        // Update UI
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule) {
            uiModule.showToast(`Found ${item.name}!`, "success");
            if (uiModule.updatePlayerProfile) {
                uiModule.updatePlayerProfile();
            }
            if (uiModule.playSound) {
                uiModule.playSound("item");
            }
        }
        
        return true;
    },
    
    // Remove item from inventory
    removeItem: function(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        
        if (index === -1) {
            return false;
        }
        
        const item = this.inventory[index];
        this.inventory.splice(index, 1);
        
        // Emit item removed event
        RelayWorldCore.eventBus.emit('player:itemRemoved', { item });
        
        return true;
    },
    
    // Use an item
    useItem: function(itemId) {
        const itemsModule = RelayWorldCore.getModule('items');
        if (!itemsModule || !itemsModule.useItem) {
            return { success: false, message: "Items module not available" };
        }
        
        return itemsModule.useItem(itemId);
    },
    
    // Equip an item
    equipItem: function(itemId) {
        const itemsModule = RelayWorldCore.getModule('items');
        if (!itemsModule || !itemsModule.equipItem) {
            return { success: false, message: "Items module not available" };
        }
        
        return itemsModule.equipItem(itemId);
    },
    
    // Unequip an item
    unequipItem: function(slot) {
        const itemsModule = RelayWorldCore.getModule('items');
        if (!itemsModule || !itemsModule.unequipItem) {
            return { success: false, message: "Items module not available" };
        }
        
        return itemsModule.unequipItem(slot);
    },
    
    // Add completed quest
    addCompletedQuest: function(questId, reward) {
        if (this.completedQuests.includes(questId)) {
            return false;
        }
        
        this.completedQuests.push(questId);
        
        // Add reward if provided
        if (reward) {
            this.addScore(reward);
        }
        
        // Emit quest completed event
        RelayWorldCore.eventBus.emit('player:questCompleted', {
            questId,
            reward,
            totalCompleted: this.completedQuests.length
        });
        
        return true;
    }
};