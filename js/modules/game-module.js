/**
 * game-module.js
 * Game loop and world mechanics for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const GameModule = {
    // Module metadata
    name: "game",
    description: "Game loop and world mechanics",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["player", "items", "ui", "audio"],
    priority: 30, // Initialize after core systems
    critical: true, // Critical module
    
    // Game state
    running: false,
    canvas: null,
    ctx: null,
    lastFrameTime: 0,
    animationFrame: 0,
    
    // World properties
    world: {
        width: 3000,
        height: 3000,
        collectibles: [],
        treasures: [],
        portals: [],
        enemies: []
    },
    
    // Camera
    camera: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    },
    
    // Game systems
    weather: {
        current: "clear",
        lastChange: 0,
        types: ["clear", "rain", "storm"],
        change: function() {
            const now = Date.now();
            if (now - this.lastChange >= 600000) { // 10 minutes
                this.current = this.types[Math.floor(Math.random() * this.types.length)];
                
                // Publish weather event
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule && nostrModule.publishWeatherEvent) {
                    nostrModule.publishWeatherEvent(this.current);
                }
                
                // Update UI
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule) {
                    uiModule.showToast(`Weather changed to ${this.current}!`);
                    if (uiModule.updateWeatherEffects) {
                        uiModule.updateWeatherEffects(this.current);
                    }
                }
                
                this.lastChange = now;
            }
        }
    },
    
    // Quest system
    quests: {
        active: null,
        completed: 0,
        
        startQuest: function() {
            if (!this.active) {
                const itemsModule = RelayWorldCore.getModule('items');
                const playerModule = RelayWorldCore.getModule('player');
                
                if (!itemsModule || !playerModule) return;
                
                const availableQuests = itemsModule.quests.filter(q => 
                    !playerModule.completedQuests.includes(q.id)
                );
                
                if (availableQuests.length === 0) return;
                
                const quest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
                this.active = { 
                    ...quest, 
                    progress: 0, 
                    startTime: Date.now() 
                };
                
                // Publish quest event
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule && nostrModule.publishQuestEvent) {
                    nostrModule.publishQuestEvent("start", quest.id);
                }
                
                // Update UI
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule) {
                    if (uiModule.updateQuestDisplay) {
                        uiModule.updateQuestDisplay();
                    }
                    uiModule.showToast(`New quest: ${quest.name}`, "success");
                }
            }
        },
        
        update: function() {
            if (!this.active) return;
            
            // Update progress based on quest type
            this.active.progress = this.checkProgress(this.active);
            
            // Check for completion
            if (this.active.progress >= this.active.target) {
                const playerModule = RelayWorldCore.getModule('player');
                if (playerModule) {
                    playerModule.score += this.active.reward;
                    playerModule.completedQuests.push(this.active.id);
                    this.completed += 1;
                }
                
                // Publish quest completion
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule) {
                    if (nostrModule.publishQuestEvent) {
                        nostrModule.publishQuestEvent("complete", this.active.id, this.active.reward);
                    }
                    if (nostrModule.publishPlayerStats) {
                        nostrModule.publishPlayerStats();
                    }
                }
                
                // Update UI
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule) {
                    if (uiModule.updatePlayerProfile) {
                        uiModule.updatePlayerProfile();
                    }
                    if (uiModule.updateQuestDisplay) {
                        uiModule.updateQuestDisplay();
                    }
                    uiModule.showToast(`Quest "${this.active.name}" completed! +${this.active.reward} points`, "success");
                }
                
                this.active = null;
                setTimeout(() => this.startQuest(), 5000);
            } else {
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule && uiModule.updateQuestDisplay) {
                    uiModule.updateQuestDisplay();
                }
            }
        },
        
        checkProgress: function(quest) {
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule) return 0;
            
            switch(quest.type) {
                case 'collect':
                    return playerModule.itemsCollected || 0;
                case 'explore':
                    return playerModule.distanceTraveled || 0;
                case 'interact':
                    return playerModule.interactions || 0;
                case 'chat':
                    return playerModule.chatMessages || 0;
                case 'follow':
                    return playerModule.follows || 0;
                case 'score':
                    return playerModule.score || 0;
                default:
                    return 0;
            }
        }
    },
    
    // Initialize the game module
    init: function() {
        console.log("[Game] Initializing game module...");
        
        // Get canvas element
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[Game] Canvas element not found");
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Initialize canvas size
        this.resizeCanvas();
        
        // Load configuration
        this.world.width = RelayWorldCore.getConfig('WORLD_SIZE', 3000);
        this.world.height = RelayWorldCore.getConfig('WORLD_SIZE', 3000);
        
        // Initialize mini-map
        this.initMiniMap();
        
        this.initialized = true;
        console.log("[Game] Game module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Handle window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Listen for auth:login event to start game
        RelayWorldCore.eventBus.on('auth:login', () => {
            // Wait a bit to ensure all modules are ready
            setTimeout(() => this.start(), 1000);
        });
        
        // Listen for game:stop event
        RelayWorldCore.eventBus.on('game:stop', () => {
            this.stop();
        });
        
        // Setup keyboard controls
        window.addEventListener('keydown', (e) => {
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule || !playerModule.input) return;
            
            // Check if input should be processed
            if (!playerModule.isInputAllowed()) return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    playerModule.input.up = true;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    playerModule.input.down = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    playerModule.input.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    playerModule.input.right = true;
                    break;
                case 'e':
                case 'E':
                case ' ':
                    this.triggerInteraction();
                    break;
                case 'v':
                case 'V':
                    const audioModule = RelayWorldCore.getModule('audio');
                    if (audioModule && audioModule.toggleVoiceChat) {
                        audioModule.toggleVoiceChat();
                    }
                    break;
                case 'z':
                case 'Z':
                    this.triggerZap();
                    break;
                case 'i':
                case 'I':
                    const uiModule = RelayWorldCore.getModule('ui');
                    if (uiModule && uiModule.toggleInventory) {
                        uiModule.toggleInventory();
                    }
                    break;
                case 'Enter':
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput && document.activeElement !== chatInput) {
                        chatInput.focus();
                    }
                    break;
            }
        });
        
        // Handle key up
        window.addEventListener('keyup', (e) => {
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule || !playerModule.input) return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    playerModule.input.up = false;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    playerModule.input.down = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    playerModule.input.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    playerModule.input.right = false;
                    break;
            }
        });
        
        // Canvas click handler for interactions
        this.canvas.addEventListener('click', (e) => {
            // Get click position in canvas coordinates
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            // Convert to world coordinates
            const worldX = canvasX + this.camera.x - this.canvas.width / 2;
            const worldY = canvasY + this.camera.y - this.canvas.height / 2;
            
            // Check if clicked on a player
            const nostrModule = RelayWorldCore.getModule('nostr');
            const playerModule = RelayWorldCore.getModule('player');
            const uiModule = RelayWorldCore.getModule('ui');
            
            if (nostrModule && nostrModule.users && playerModule && uiModule && uiModule.showUserPopup) {
                for (const [pubkey, user] of nostrModule.users) {
                    if (pubkey === playerModule.pubkey) continue;
                    
                    const distance = Math.sqrt(
                        Math.pow(user.x - worldX, 2) + 
                        Math.pow(user.y - worldY, 2)
                    );
                    
                    if (distance < 30) {
                        uiModule.showUserPopup(pubkey);
                        return;
                    }
                }
            }
        });
    },
    
    // Start the game
    start: function() {
        if (this.running) return;
        
        console.log("[Game] Starting game...");
        
        this.running = true;
        this.lastFrameTime = performance.now();
        
        // Position player in the world
        const playerModule = RelayWorldCore.getModule('player');
        if (playerModule) {
            playerModule.x = this.world.width / 2;
            playerModule.y = this.world.height / 2;
        }
        
        // Start quests
        this.quests.startQuest();
        
        // Generate world items
        this.generateWorldItems();
        
        // Start game loop
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // Emit game:started event
        RelayWorldCore.eventBus.emit('game:started', null);
        
        console.log("[Game] Game started");
    },
    
    // Stop the game
    stop: function() {
        if (!this.running) return;
        
        console.log("[Game] Stopping game...");
        
        this.running = false;
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Emit game:stopped event
        RelayWorldCore.eventBus.emit('game:stopped', null);
        
        console.log("[Game] Game stopped");
    },
    
    // Main game loop
    gameLoop: function(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time (time since last frame)
        const deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        
        // Increment animation frame counter
        this.animationFrame = (this.animationFrame + 1) % 60;
        
        // Update game state
        this.update(deltaTime);
        
        // Render the game
        this.render();
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    },
    
    // Update game state
    update: function(deltaTime) {
        // Update player movement
        this.updatePlayerMovement(deltaTime);
        
        // Update camera position
        this.updateCamera();
        
        // Check for collectible pickup
        this.checkCollectibles();
        
        // Check for treasures
        this.checkTreasures();
        
        // Check for player interactions
        this.checkPlayerInteractions();
        
        // Update weather
        this.weather.change();
        
        // Update quests
        this.quests.update();
        
        // Check for level up
        const playerModule = RelayWorldCore.getModule('player');
        if (playerModule && playerModule.checkLevelUp) {
            playerModule.checkLevelUp();
        }
        
        // Update voice range indicators
        const audioModule = RelayWorldCore.getModule('audio');
        if (audioModule && audioModule.isVoiceChatActive && audioModule.updateVoiceIndicators) {
            audioModule.updateVoiceIndicators();
        }
        
        // Publish player position periodically
        this.publishPlayerPosition();
    },
    
    // Render the game
    render: function() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background grid
        this.drawBackground();
        
        // Draw world boundaries
        this.drawWorldBounds();
        
        // Draw collectibles
        this.drawCollectibles();
        
        // Draw treasures
        this.drawTreasures();
        
        // Draw portals
        this.drawPortals();
        
        // Draw other players
        this.drawPlayers();
        
        // Draw player
        this.drawPlayer();
        
        // Draw voice indicators
        const audioModule = RelayWorldCore.getModule('audio');
        if (audioModule && audioModule.isVoiceChatActive && this.drawVoiceIndicators) {
            this.drawVoiceIndicators();
        }
        
        // Update mini-map
        this.updateMiniMap();
    },
    
    // Resize canvas to fill window
    resizeCanvas: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.width = window.innerWidth;
        this.camera.height = window.innerHeight;
    },
    
    // Update player movement
    updatePlayerMovement: function(deltaTime) {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule || !playerModule.input) return;
        
        // Check if input should be processed
        if (!playerModule.isInputAllowed()) return;
        
        // Reset velocity
        let dx = 0;
        let dy = 0;
        
        // Apply input
        if (playerModule.input.up) dy -= 1;
        if (playerModule.input.down) dy += 1;
        if (playerModule.input.left) dx -= 1;
        if (playerModule.input.right) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        // Apply player speed and modifiers
        let speed = playerModule.getSpeed ? playerModule.getSpeed() : 200;
        
        // Weather effects on speed
        if (this.weather.current === "storm") speed *= 0.75;
        
        // Apply movement
        if (dx !== 0 || dy !== 0) {
            playerModule.x += dx * speed * deltaTime;
            playerModule.y += dy * speed * deltaTime;
            
            // Add to total distance traveled
            if (typeof playerModule.distanceTraveled !== 'undefined') {
                playerModule.distanceTraveled += Math.sqrt(
                    Math.pow(dx * speed * deltaTime, 2) + 
                    Math.pow(dy * speed * deltaTime, 2)
                );
            }
            
            // Animate player bobbing when moving
            playerModule.bobOffset = Math.sin(this.animationFrame * 0.2) * 5;
        } else {
            playerModule.bobOffset = 0;
        }
        
        // Constrain to world bounds
        playerModule.x = Math.max(0, Math.min(playerModule.x, this.world.width));
        playerModule.y = Math.max(0, Math.min(playerModule.y, this.world.height));
    },
    
    // Update camera position to follow player
    updateCamera: function() {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        this.camera.x = playerModule.x;
        this.camera.y = playerModule.y;
    },
    
    // Check for collectible pickup
    checkCollectibles: function() {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        for (let i = 0; i < this.world.collectibles.length; i++) {
            const item = this.world.collectibles[i];
            const distance = Math.sqrt(
                Math.pow(playerModule.x - item.x, 2) + 
                Math.pow(playerModule.y - item.y, 2)
            );
            
            if (distance < 30) {
                // Add to inventory
                playerModule.inventory.push({
                    ...item,
                    collectedAt: Date.now()
                });
                
                // Update player stats
                playerModule.score += item.value || 0;
                playerModule.itemsCollected++;
                
                // Remove from world
                this.world.collectibles.splice(i, 1);
                i--;
                
                // Create collection effect
                this.createCollectEffect(item.x, item.y);
                
                // Play sound
                const uiModule = RelayWorldCore.getModule('ui');
                if (uiModule) {
                    if (uiModule.playSound) {
                        uiModule.playSound("item");
                    }
                    uiModule.showToast(`Found ${item.name}! +${item.value} points`, "success");
                    if (uiModule.updatePlayerProfile) {
                        uiModule.updatePlayerProfile();
                    }
                }
                
                // Publish event
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (nostrModule) {
                    if (nostrModule.publishItemCollection) {
                        nostrModule.publishItemCollection(item.id);
                    }
                    if (nostrModule.publishPlayerStats) {
                        nostrModule.publishPlayerStats();
                    }
                }
                
                break;
            }
        }
    },
    
    // Check for treasures
    checkTreasures: function() {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule) return;
        
        for (let i = 0; i < this.world.treasures.length; i++) {
            const treasure = this.world.treasures[i];
            const distance = Math.sqrt(
                Math.pow(playerModule.x - treasure.x, 2) + 
                Math.pow(playerModule.y - treasure.y, 2)
            );
            
            if (distance < 30 && !treasure.unlocking) {
                this.unlockTreasure(treasure);
            }
        }
    },
    
    // Unlock a treasure
    unlockTreasure: function(treasure) {
        const playerModule = RelayWorldCore.getModule('player');
        const itemsModule = RelayWorldCore.getModule('items');
        
        if (!playerModule || !itemsModule) return;
        
        treasure.unlocking = true;
        treasure.unlockStart = Date.now();
        
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        // Create visual effect
        const treasureEl = document.createElement('div');
        treasureEl.className = 'treasure chest-unlock';
        treasureEl.style.position = 'absolute';
        treasureEl.style.left = `${treasure.x - this.camera.x + this.canvas.width / 2 - 16}px`;
        treasureEl.style.top = `${treasure.y - this.camera.y + this.canvas.height / 2 - 16}px`;
        treasureEl.style.width = '32px';
        treasureEl.style.height = '32px';
        treasureEl.style.backgroundImage = 'url("assets/sprites/treasure.png")';
        treasureEl.style.backgroundSize = 'contain';
        treasureEl.style.zIndex = '100';
        gameContainer.appendChild(treasureEl);
        
        // Start unlock timer
        setTimeout(() => {
            if (!treasure.unlocking) return;
            
            // Get random rare item
            let item;
            if (itemsModule.getRandomItem) {
                item = itemsModule.getRandomItem();
            } else {
                item = {
                    id: `treasure-item-${Date.now()}`,
                    name: "Treasure Item",
                    emoji: "💎",
                    value: 500,
                    rarity: "RARE"
                };
            }
            
            // Add to player inventory
            playerModule.inventory.push({
                ...item,
                id: `${item.id}-${Date.now()}`,
                collectedAt: Date.now()
            });
            
            // Update player stats
            playerModule.score += 500;
            if (typeof playerModule.treasuresOpened !== 'undefined') {
                playerModule.treasuresOpened++;
            }
            
            // Remove treasure from world
            this.world.treasures = this.world.treasures.filter(t => t !== treasure);
            
            // Remove visual element
            treasureEl.remove();
            
            // Play sound
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule) {
                if (uiModule.playSound) {
                    uiModule.playSound("treasure");
                }
                uiModule.showToast(`Treasure opened! Found ${item.emoji} ${item.name} (+500 points)`, "success");
                if (uiModule.updatePlayerProfile) {
                    uiModule.updatePlayerProfile();
                }
            }
            
            // Publish events
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule) {
                if (nostrModule.publishTreasureEvent) {
                    nostrModule.publishTreasureEvent("open", treasure.id);
                }
                if (nostrModule.publishPlayerStats) {
                    nostrModule.publishPlayerStats();
                }
            }
        }, 3000);
    },
    
    // Check for player interactions
    checkPlayerInteractions: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        const audioModule = RelayWorldCore.getModule('audio');
        
        if (!playerModule || !nostrModule || !nostrModule.users || !audioModule) return;
        
        const interactionRange = RelayWorldCore.getConfig('INTERACTION_RANGE', 100);
        const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
        
        for (const [pubkey, user] of nostrModule.users) {
            if (pubkey === playerModule.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(playerModule.x - user.x, 2) + 
                Math.pow(playerModule.y - user.y, 2)
            );
            
            // Check if in voice chat range
            if (distance < voiceChatRange) {
                // Add to nearby users for voice chat
                if (audioModule.addNearbyUser) {
                    audioModule.addNearbyUser(pubkey, distance);
                }
            } else {
                // Remove from nearby users if out of range
                if (audioModule.removeNearbyUser) {
                    audioModule.removeNearbyUser(pubkey);
                }
            }
        }
    },
    
    // Trigger interaction with nearby entities
    triggerInteraction: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        const uiModule = RelayWorldCore.getModule('ui');
        
        if (!playerModule || !nostrModule || !nostrModule.users || !uiModule) return;
        
        const interactionRange = RelayWorldCore.getConfig('INTERACTION_RANGE', 100);
        
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        // Find closest player
        for (const [pubkey, user] of nostrModule.users) {
            if (pubkey === playerModule.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(playerModule.x - user.x, 2) + 
                Math.pow(playerModule.y - user.y, 2)
            );
            
            if (distance < interactionRange && distance < closestDistance) {
                closestPlayer = pubkey;
                closestDistance = distance;
            }
        }
        
        // Interact with closest player
        if (closestPlayer && uiModule.showUserPopup) {
            uiModule.showUserPopup(closestPlayer);
            playerModule.interactions++;
            playerModule.score += 20;
            
            // Publish stats update
            if (nostrModule.publishPlayerStats) {
                nostrModule.publishPlayerStats();
            }
            
            // Update UI
            if (uiModule.updatePlayerProfile) {
                uiModule.updatePlayerProfile();
            }
            
            // Play sound
            if (uiModule.playSound) {
                uiModule.playSound("success");
            }
            
            uiModule.showToast("Interacted with user! +20 points", "success");
            return;
        }
        
        // Check for treasures
        for (const treasure of this.world.treasures) {
            const distance = Math.sqrt(
                Math.pow(playerModule.x - treasure.x, 2) + 
                Math.pow(playerModule.y - treasure.y, 2)
            );
            
            if (distance < 50 && !treasure.unlocking) {
                this.unlockTreasure(treasure);
                return;
            }
        }
        
        // Check for portals
        for (const portal of this.world.portals) {
            const distance = Math.sqrt(
                Math.pow(playerModule.x - portal.x, 2) + 
                Math.pow(playerModule.y - portal.y, 2)
            );
            
            if (distance < 50) {
                this.usePortal(portal);
                return;
            }
        }
    },
    
    // Trigger zap for nearby players
    triggerZap: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        const zapsModule = RelayWorldCore.getModule('zaps');
        const uiModule = RelayWorldCore.getModule('ui');
        
        if (!playerModule || !nostrModule || !nostrModule.users || !zapsModule || !uiModule) return;
        
        const interactionRange = RelayWorldCore.getConfig('INTERACTION_RANGE', 100);
        
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        // Find closest player
        for (const [pubkey, user] of nostrModule.users) {
            if (pubkey === playerModule.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(playerModule.x - user.x, 2) + 
                Math.pow(playerModule.y - user.y, 2)
            );
            
            if (distance < interactionRange && distance < closestDistance) {
                closestPlayer = pubkey;
                closestDistance = distance;
            }
        }
        
        // Zap closest player
        if (closestPlayer && zapsModule.showZapInterface) {
            zapsModule.showZapInterface(closestPlayer);
            return;
        }
        
        uiModule.showToast("No players nearby to zap!", "warning");
    },
    
    // Use a portal to teleport
    usePortal: function(portal) {
        const playerModule = RelayWorldCore.getModule('player');
        const uiModule = RelayWorldCore.getModule('ui');
        
        if (!playerModule || !uiModule) return;
        
        // Teleport to the other portal
        const otherPortal = this.world.portals.find(p => p.id !== portal.id);
        if (!otherPortal) return;
        
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        // Create teleport effect
        const effect = document.createElement('div');
        effect.className = 'teleport-effect';
        effect.style.position = 'absolute';
        effect.style.left = `${playerModule.x - this.camera.x + this.canvas.width / 2 - 50}px`;
        effect.style.top = `${playerModule.y - this.camera.y + this.canvas.height / 2 - 50}px`;
        effect.style.width = '100px';
        effect.style.height = '100px';
        effect.style.backgroundColor = portal.color;
        effect.style.borderRadius = '50%';
        effect.style.opacity = '0.7';
        effect.style.zIndex = '100';
        gameContainer.appendChild(effect);
        
        // Teleport after effect starts
        setTimeout(() => {
            playerModule.x = otherPortal.x;
            playerModule.y = otherPortal.y;
            
            // Update camera immediately
            this.camera.x = playerModule.x;
            this.camera.y = playerModule.y;
            
            // Remove teleport effect
            effect.remove();
            
            // Show notification
            uiModule.showToast(`Teleported to ${otherPortal.id}!`, "success");
            
            // Publish event
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule && nostrModule.publishPortalEvent) {
                nostrModule.publishPortalEvent(otherPortal.id);
            }
        }, 500);
        
        // Play sound
        if (uiModule.playSound) {
            uiModule.playSound("portal");
        }
    },
    
    // Create collectible pickup effect
    createCollectEffect: function(x, y) {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const effect = document.createElement('div');
        effect.className = 'collectible-effect';
        effect.style.position = 'absolute';
        effect.style.left = `${x - this.camera.x + this.canvas.width / 2 - 20}px`;
        effect.style.top = `${y - this.camera.y + this.canvas.height / 2 - 20}px`;
        effect.style.width = '40px';
        effect.style.height = '40px';
        effect.style.background = 'transparent';
        effect.style.borderRadius = '50%';
        effect.style.border = '2px solid gold';
        effect.style.animation = 'collectEffect 0.5s ease-out forwards';
        effect.style.zIndex = '100';
        gameContainer.appendChild(effect);
        
        // Remove after animation completes
        setTimeout(() => {
            effect.remove();
        }, 500);
    },
    
    // Initialize mini-map
    initMiniMap: function() {
        const miniMap = document.getElementById('mini-map');
        if (miniMap) {
            miniMap.classList.remove('hide');
            this.miniMapCtx = miniMap.getContext('2d');
        }
    },
    
    // Update mini-map
    updateMiniMap: function() {
        if (!this.miniMapCtx) return;
        
        const ctx = this.miniMapCtx;
        const mapWidth = 150;
        const mapHeight = 150;
        
        // Clear mini-map
        ctx.clearRect(0, 0, mapWidth, mapHeight);
        
        // Draw background
        ctx.fillStyle = 'rgba(48, 98, 48, 0.8)';
        ctx.fillRect(0, 0, mapWidth, mapHeight);
        
        // Calculate scale
        const scale = mapWidth / this.world.width;
        
        // Draw collectibles
        ctx.fillStyle = '#FFD700';
        for (const item of this.world.collectibles) {
            ctx.beginPath();
            ctx.arc(item.x * scale, item.y * scale, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw treasures
        ctx.fillStyle = '#FF8C00';
        for (const treasure of this.world.treasures) {
            ctx.beginPath();
            ctx.arc(treasure.x * scale, treasure.y * scale, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw other players if Nostr is defined
        const nostrModule = RelayWorldCore.getModule('nostr');
        const playerModule = RelayWorldCore.getModule('player');
        
        if (nostrModule && nostrModule.users && playerModule) {
            for (const [pubkey, user] of nostrModule.users) {
                if (pubkey === playerModule.pubkey) continue;
                
                // Different colors for NPCs vs live players
                ctx.fillStyle = user.isNPC ? '#8fbc8f' : '#FFFFFF';
                ctx.globalAlpha = user.isNPC ? 0.5 : 1.0; // More transparent for NPCs
                
                ctx.beginPath();
                ctx.arc(user.x * scale, user.y * scale, user.isNPC ? 1 : 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = 1.0; // Reset alpha
            }
            
            // Draw player
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(playerModule.x * scale, playerModule.y * scale, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw voice chat range
            const audioModule = RelayWorldCore.getModule('audio');
            if (audioModule && audioModule.isVoiceChatActive) {
                const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
                ctx.strokeStyle = 'rgba(139, 172, 15, 0.5)';
                ctx.beginPath();
                ctx.arc(playerModule.x * scale, playerModule.y * scale, voiceChatRange * scale, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },
    
    // Generate initial world items
    generateWorldItems: function() {
        console.log("[Game] Generating world items...");
        
        // Clear existing items
        this.world.collectibles = [];
        this.world.treasures = [];
        this.world.portals = [];
        
        // Generate random collectibles
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * this.world.width;
            const y = Math.random() * this.world.height;
            
            const itemsModule = RelayWorldCore.getModule('items');
            let item;
            
            if (itemsModule && itemsModule.getRandomItem) {
                item = itemsModule.getRandomItem();
            } else {
                // Fallback if Items module not available
                item = {
                    id: `item-${Date.now()}-${i}`,
                    name: "Mystery Item",
                    emoji: "❓",
                    value: 10,
                    rarity: "COMMON"
                };
            }
            
            this.world.collectibles.push({
                id: `${item.id}-${Date.now()}-${i}`,
                x, y,
                ...item
            });
        }
        
        // Generate treasures
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * this.world.width;
            const y = Math.random() * this.world.height;
            
            this.world.treasures.push({
                id: `treasure-${Date.now()}-${i}`,
                x, y,
                unlocking: false,
                unlockStart: 0
            });
        }
        
        // Generate portals
        this.world.portals = [
            { id: "forest", x: 500, y: 500, color: "#228B22" },
            { id: "mountain", x: this.world.width - 500, y: this.world.height - 500, color: "#808080" }
        ];
        
        console.log(`[Game] Generated ${this.world.collectibles.length} collectibles, ${this.world.treasures.length} treasures, and ${this.world.portals.length} portals`);
    },
    
    // Publish player position to game relay
    publishPlayerPosition: (function() {
        let lastPublish = 0;
        const PUBLISH_INTERVAL = 200; // 5 times per second
        
        return function() {
            const nostrModule = RelayWorldCore.getModule('nostr');
            const playerModule = RelayWorldCore.getModule('player');
            
            if (!nostrModule || !playerModule || !nostrModule.publishPlayerPosition) return;
            
            const now = Date.now();
            if (now - lastPublish >= PUBLISH_INTERVAL) {
                nostrModule.publishPlayerPosition(playerModule.x, playerModule.y);
                lastPublish = now;
            }
        };
    })(),
    
    // Drawing functions
    drawBackground: function() {
        const ctx = this.ctx;
        const gridSize = 50;
        
        ctx.strokeStyle = 'rgba(139, 172, 15, 0.1)';
        ctx.lineWidth = 1;
        
        // Calculate grid boundaries based on camera position
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.camera.width + gridSize;
        const endY = startY + this.camera.height + gridSize;
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x - (this.camera.x - this.canvas.width / 2), 0);
            ctx.lineTo(x - (this.camera.x - this.canvas.width / 2), this.canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y - (this.camera.y - this.canvas.height / 2));
            ctx.lineTo(this.canvas.width, y - (this.camera.y - this.canvas.height / 2));
            ctx.stroke();
        }
    },
    
    drawWorldBounds: function() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        
        // Calculate screen coordinates of world bounds
        const screenX = 0 - (this.camera.x - this.canvas.width / 2);
        const screenY = 0 - (this.camera.y - this.canvas.height / 2);
        
        // Draw world border
        ctx.strokeRect(screenX, screenY, this.world.width, this.world.height);
    },
    
    drawCollectibles: function() {
        const ctx = this.ctx;
        
        for (const item of this.world.collectibles) {
            // Calculate screen coordinates
            const screenX = item.x - (this.camera.x - this.canvas.width / 2);
            const screenY = item.y - (this.camera.y - this.canvas.height / 2);
            
            // Skip if out of view
            if (screenX < -20 || screenX > this.canvas.width + 20 ||
                screenY < -20 || screenY > this.canvas.height + 20) {
                continue;
            }
            
            // Draw item
            ctx.save();
            ctx.font = "16px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.emoji || "❓", screenX, screenY);
            ctx.restore();
        }
    },
    
    drawTreasures: function() {
        const ctx = this.ctx;
        
        for (const treasure of this.world.treasures) {
            // Calculate screen coordinates
            const screenX = treasure.x - (this.camera.x - this.canvas.width / 2);
            const screenY = treasure.y - (this.camera.y - this.canvas.height / 2);
            
            // Skip if out of view
            if (screenX < -20 || screenX > this.canvas.width + 20 ||
                screenY < -20 || screenY > this.canvas.height + 20) {
                continue;
            }
            
            // Draw treasure
            ctx.save();
            ctx.font = "20px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🎁", screenX, screenY);
            
            // If unlocking, draw progress circle
            if (treasure.unlocking) {
                const elapsed = (Date.now() - treasure.unlockStart) / 3000; // 3 second unlock
                
                ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
                ctx.beginPath();
                ctx.arc(screenX, screenY, 25, 0, Math.PI * 2 * Math.min(elapsed, 1));
                ctx.fill();
            }
            
            ctx.restore();
        }
    },
    
    drawPortals: function() {
        const ctx = this.ctx;
        
        for (const portal of this.world.portals) {
            // Calculate screen coordinates
            const screenX = portal.x - (this.camera.x - this.canvas.width / 2);
            const screenY = portal.y - (this.camera.y - this.canvas.height / 2);
            
            // Skip if out of view
            if (screenX < -30 || screenX > this.canvas.width + 30 ||
                screenY < -30 || screenY > this.canvas.height + 30) {
                continue;
            }
            
            // Draw portal
            ctx.save();
            
            // Draw outer circle
            const gradient = ctx.createRadialGradient(
                screenX, screenY, 5,
                screenX, screenY, 25
            );
            gradient.addColorStop(0, portal.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw inner circle
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.animationFrame * 0.1);
            ctx.beginPath();
            ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    },
    
    drawPlayers: function() {
        const nostrModule = RelayWorldCore.getModule('nostr');
        const playerModule = RelayWorldCore.getModule('player');
        const audioModule = RelayWorldCore.getModule('audio');
        
        if (!nostrModule || !nostrModule.users || !playerModule) return;
        
        const ctx = this.ctx;
        
        for (const [pubkey, user] of nostrModule.users) {
            if (pubkey === playerModule.pubkey) continue;
            
            // Calculate screen coordinates
            const screenX = user.x - (this.camera.x - this.canvas.width / 2);
            const screenY = user.y - (this.camera.y - this.canvas.height / 2) + (user.isNPC ? 0 : (user.bobOffset || 0));
            
            // Skip if out of view
            if (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }
            
            // Draw player with different styling for NPCs vs live players
            ctx.save();
            
            // Apply transparency for NPCs
            if (user.isNPC) {
                ctx.globalAlpha = 0.7;
            }
            
            // Draw player avatar
            if (user.profile && user.profile.picture) {
                const img = new Image();
                img.src = user.profile.picture;
                
                try {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, screenX - 15, screenY - 30, 30, 30);
                } catch (e) {
                    // Fallback if image fails to load
                    ctx.fillStyle = user.isNPC ? '#6B8E23' : '#9BBC0F'; // Different color for NPCs
                    ctx.beginPath();
                    ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = user.isNPC ? '#6B8E23' : '#9BBC0F'; // Different color for NPCs
                ctx.beginPath();
                ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            
            // Draw player body
            ctx.save();
            ctx.strokeStyle = user.isNPC ? '#AAAAAA' : '#FFFFFF'; // Grayer for NPCs
            ctx.lineWidth = 2;
            
            // Body
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX, screenY + 20);
            ctx.stroke();
            
            // Arms
            ctx.beginPath();
            ctx.moveTo(screenX - 10, screenY + 10);
            ctx.lineTo(screenX + 10, screenY + 10);
            ctx.stroke();
            
            // Legs
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + 20);
            ctx.lineTo(screenX - 10, screenY + 30);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + 20);
            ctx.lineTo(screenX + 10, screenY + 30);
            ctx.stroke();
            
            ctx.restore();
            
            // Draw player name
            ctx.save();
            ctx.fillStyle = user.isNPC ? '#CCCCCC' : '#FFFFFF'; // Grayer for NPCs
            ctx.font = "10px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(user.profile?.name || pubkey.slice(0, 8), screenX, screenY - 40);
            ctx.restore();
            
            // NPC indicator
            if (user.isNPC) {
                ctx.save();
                ctx.fillStyle = '#AAAAAA';
                ctx.font = "8px 'Press Start 2P', sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("[NPC]", screenX, screenY - 55);
                ctx.restore();
            }
            
            // Draw voice indicator if speaking
            if (audioModule && audioModule.isUserSpeaking && audioModule.isUserSpeaking(pubkey)) {
                ctx.save();
                ctx.fillStyle = user.isNPC ? '#6B8E23' : '#8BAC0F';
                ctx.beginPath();
                ctx.arc(screenX, screenY - 50, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    },
    
    drawPlayer: function() {
        const playerModule = RelayWorldCore.getModule('player');
        const audioModule = RelayWorldCore.getModule('audio');
        
        if (!playerModule) return;
        
        const ctx = this.ctx;
        
        // Player is always drawn at the center of the screen
        const screenX = this.canvas.width / 2;
        const screenY = this.canvas.height / 2 + playerModule.bobOffset;
        
        // Draw player
        ctx.save();
        
        // Draw player avatar
        if (playerModule.profile && playerModule.profile.picture) {
            const img = new Image();
            img.src = playerModule.profile.picture;
            
            try {
                ctx.beginPath();
                ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, screenX - 15, screenY - 30, 30, 30);
            } catch (e) {
                // Fallback if image fails to load
                ctx.fillStyle = '#8BAC0F';
                ctx.beginPath();
                ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#8BAC0F';
            ctx.beginPath();
            ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Draw player body
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        // Body
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY + 20);
        ctx.stroke();
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(screenX - 10, screenY + 10);
        ctx.lineTo(screenX + 10, screenY + 10);
        ctx.stroke();
        
        // Legs
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + 20);
        ctx.lineTo(screenX - 10, screenY + 30);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + 20);
        ctx.lineTo(screenX + 10, screenY + 30);
        ctx.stroke();
        
        ctx.restore();
        
        // Draw player name
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = "10px 'Press Start 2P', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(playerModule.profile?.name || playerModule.pubkey.slice(0, 8), screenX, screenY - 40);
        ctx.restore();
        
        // Draw voice indicator if speaking
        if (audioModule && audioModule.isLocalUserSpeaking && audioModule.isLocalUserSpeaking()) {
            ctx.save();
            ctx.fillStyle = '#8BAC0F';
            ctx.beginPath();
            ctx.arc(screenX, screenY - 50, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },
    
    drawVoiceIndicators: function() {
        const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
        const ctx = this.ctx;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(139, 172, 15, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            voiceChatRange, 
            0, 
            Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }
};