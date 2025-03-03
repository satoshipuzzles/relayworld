/**
 * game.js - Core game loop and world logic
 * Handles game state, rendering, and core mechanics
 */

const Game = {
    // Game state
    running: false,
    canvas: null,
    ctx: null,
    lastFrameTime: 0,
    animationFrame: 0,
    lastWeatherChange: 0,
    
    // Game world
    world: {
        width: RelayWorld.config.WORLD_SIZE,
        height: RelayWorld.config.WORLD_SIZE,
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
                Nostr.publishWeatherEvent(this.current);
                UI.showToast(`Weather changed to ${this.current}!`);
                UI.updateWeatherEffects(this.current);
                this.lastChange = now;
            }
        }
    },
    
    quests: {
        active: null,
        completed: 0,
        
        startQuest: function() {
            if (!this.active) {
                const availableQuests = Items.quests.filter(q => !Player.completedQuests.includes(q.id));
                if (availableQuests.length === 0) return;
                
                const quest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
                this.active = { 
                    ...quest, 
                    progress: 0, 
                    startTime: Date.now() 
                };
                
                Nostr.publishQuestEvent("start", quest.id);
                UI.updateQuestDisplay();
                UI.showToast(`New quest: ${quest.name}`, "success");
            }
        },
        
        update: function() {
            if (!this.active) return;
            
            // Update progress based on quest type
            this.active.progress = this.checkProgress(this.active);
            
            // Check for completion
            if (this.active.progress >= this.active.target) {
                Player.score += this.active.reward;
                Player.completedQuests.push(this.active.id);
                this.completed += 1;
                
                Nostr.publishQuestEvent("complete", this.active.id, this.active.reward);
                Nostr.publishScoreEvent();
                
                UI.updatePlayerProfile();
                UI.updateQuestDisplay();
                UI.showToast(`Quest "${this.active.name}" completed! +${this.active.reward} points`, "success");
                
                this.active = null;
                setTimeout(() => this.startQuest(), 5000);
            } else {
                UI.updateQuestDisplay();
            }
        },
        
        checkProgress: function(quest) {
            switch(quest.type) {
                case 'collect':
                    return Player.itemsCollected;
                case 'explore':
                    return Player.distanceTraveled;
                case 'interact':
                    return Player.interactions;
                case 'chat':
                    return Player.chatMessages;
                case 'follow':
                    return Player.follows;
                case 'score':
                    return Player.score;
                default:
                    return 0;
            }
        }
    },
    
    // Game initialization
    init: function() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize canvas size
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Initialize mini-map
        this.initMiniMap();
        
        // Place player in the world
        Player.x = this.world.width / 2;
        Player.y = this.world.height / 2;
        
        console.log("[Game] Initialized successfully");
    },
    
    // Start the game loop
    start: function() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.quests.startQuest();
        requestAnimationFrame(this.gameLoop.bind(this));
        console.log("[Game] Game loop started");
    },
    
    // Stop the game loop
    stop: function() {
        this.running = false;
        console.log("[Game] Game loop stopped");
    },
    
    // Main game loop
    gameLoop: function(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time (time since last frame)
        const deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        
        // Increment animation frame counter (used for animations)
        this.animationFrame = (this.animationFrame + 1) % 60;
        
        // Update game state
        this.update(deltaTime);
        
        // Render the game
        this.render();
        
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
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
        Player.checkLevelUp();
        
        // Update voice range indicators if proximity chat is active
        if (Audio.isVoiceChatActive) {
            Audio.updateVoiceIndicators();
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
        
        // Draw enemies
        this.drawEnemies();
        
        // Draw other players
        this.drawPlayers();
        
        // Draw player
        this.drawPlayer();
        
        // Draw voice indicators
        if (Audio.isVoiceChatActive) {
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
    
    // Setup input handlers
    setupInputHandlers: function() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    Player.input.up = true;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    Player.input.down = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    Player.input.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    Player.input.right = true;
                    break;
                case 'e':
                case 'E':
                case ' ':
                    this.triggerInteraction();
                    break;
                case 'v':
                case 'V':
                    Audio.toggleVoiceChat();
                    break;
                case 'z':
                case 'Z':
                    this.triggerZap();
                    break;
                case 'i':
                case 'I':
                    UI.toggleInventory();
                    break;
                case 'Enter':
                    if (document.activeElement !== document.getElementById('chat-input')) {
                        document.getElementById('chat-input').focus();
                    }
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    Player.input.up = false;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    Player.input.down = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    Player.input.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    Player.input.right = false;
                    break;
            }
        });
        
        // Touch controls for mobile
        const touchButtons = document.getElementById('mobile-controls');
        if (touchButtons) {
            document.getElementById('mobile-control-up').addEventListener('touchstart', () => { Player.input.up = true; });
            document.getElementById('mobile-control-up').addEventListener('touchend', () => { Player.input.up = false; });
            document.getElementById('mobile-control-down').addEventListener('touchstart', () => { Player.input.down = true; });
            document.getElementById('mobile-control-down').addEventListener('touchend', () => { Player.input.down = false; });
            document.getElementById('mobile-control-left').addEventListener('touchstart', () => { Player.input.left = true; });
            document.getElementById('mobile-control-left').addEventListener('touchend', () => { Player.input.left = false; });
            document.getElementById('mobile-control-right').addEventListener('touchstart', () => { Player.input.right = true; });
            document.getElementById('mobile-control-right').addEventListener('touchend', () => { Player.input.right = false; });
            document.getElementById('mobile-control-action').addEventListener('touchstart', () => { this.triggerInteraction(); });
        }
        
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
            for (const [pubkey, user] of Nostr.users) {
                if (pubkey === Player.pubkey) continue;
                
                const distance = Math.sqrt(
                    Math.pow(user.x - worldX, 2) + 
                    Math.pow(user.y - worldY, 2)
                );
                
                if (distance < 30) {
                    UI.showUserPopup(pubkey);
                    return;
                }
            }
        });
    },
    
    // Update player movement
    updatePlayerMovement: function(deltaTime) {
        // Reset velocity
        let dx = 0;
        let dy = 0;
        
        // Apply input
        if (Player.input.up) dy -= 1;
        if (Player.input.down) dy += 1;
        if (Player.input.left) dx -= 1;
        if (Player.input.right) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        // Apply player speed and modifiers
        let speed = Player.getSpeed();
        
        // Weather effects on speed
        if (this.weather.current === "storm") speed *= 0.75;
        
        // Apply movement
        if (dx !== 0 || dy !== 0) {
            Player.x += dx * speed * deltaTime;
            Player.y += dy * speed * deltaTime;
            
            // Add to total distance traveled
            Player.distanceTraveled += Math.sqrt(
                Math.pow(dx * speed * deltaTime, 2) + 
                Math.pow(dy * speed * deltaTime, 2)
            );
            
            // Animate player bobbing when moving
            Player.bobOffset = Math.sin(this.animationFrame * 0.2) * 5;
        } else {
            Player.bobOffset = 0;
        }
        
        // Constrain to world bounds
        Player.x = Math.max(0, Math.min(Player.x, this.world.width));
        Player.y = Math.max(0, Math.min(Player.y, this.world.height));
    },
    
    // Update camera position to follow player
    updateCamera: function() {
        this.camera.x = Player.x;
        this.camera.y = Player.y;
    },
    
    // Check for collectible pickup
    checkCollectibles: function() {
        for (let i = 0; i < this.world.collectibles.length; i++) {
            const item = this.world.collectibles[i];
            const distance = Math.sqrt(
                Math.pow(Player.x - item.x, 2) + 
                Math.pow(Player.y - item.y, 2)
            );
            
            if (distance < 30) {
                // Add to inventory
                Player.inventory.push({
                    ...item,
                    collectedAt: Date.now()
                });
                
                // Update player stats
                Player.score += item.value;
                Player.itemsCollected++;
                
                // Remove from world
                this.world.collectibles.splice(i, 1);
                i--;
                
                // Create collection effect
                this.createCollectEffect(item.x, item.y);
                
                // Play sound
                UI.playSound("item");
                
                // Show notification
                UI.showToast(`Found ${item.name}! +${item.value} points`, "success");
                
                // Publish event
                Nostr.publishItemCollectionEvent(item.id);
                Nostr.publishScoreEvent();
                
                // Update UI
                UI.updatePlayerProfile();
                
                break;
            }
        }
    },
    
    // Check for treasures
    checkTreasures: function() {
        for (let i = 0; i < this.world.treasures.length; i++) {
            const treasure = this.world.treasures[i];
            const distance = Math.sqrt(
                Math.pow(Player.x - treasure.x, 2) + 
                Math.pow(Player.y - treasure.y, 2)
            );
            
            if (distance < 30 && !treasure.unlocking) {
                this.unlockTreasure(treasure);
            }
        }
    },
    
    // Unlock a treasure
    unlockTreasure: function(treasure) {
        treasure.unlocking = true;
        treasure.unlockStart = Date.now();
        
        // Create visual effect
        const treasureEl = document.createElement('div');
        treasureEl.className = 'treasure chest-unlock';
        treasureEl.style.left = `${treasure.x - this.camera.x + this.canvas.width / 2 - 16}px`;
        treasureEl.style.top = `${treasure.y - this.camera.y + this.canvas.height / 2 - 16}px`;
        document.getElementById('game-container').appendChild(treasureEl);
        
        // Start unlock timer
        setTimeout(() => {
            if (!treasure.unlocking) return;
            
            // Select a random rare item
            const rarity = Math.random() < 0.3 ? 'legendary' : 'rare';
            const possibleItems = Items.getByRarity(rarity);
            const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            
            // Add to player inventory
            Player.inventory.push({
                ...item,
                id: `${item.id}-${Date.now()}`,
                collectedAt: Date.now()
            });
            
            // Update player stats
            Player.score += 500;
            Player.treasuresOpened++;
            
            // Remove treasure from world
            this.world.treasures = this.world.treasures.filter(t => t !== treasure);
            
            // Remove visual element
            treasureEl.remove();
            
            // Play sound
            UI.playSound("treasure");
            
            // Show notification
            UI.showToast(`Treasure opened! Found ${item.emoji} ${item.name} (+500 points)`, "success");
            
            // Publish events
            Nostr.publishTreasureEvent("open", treasure.id);
            Nostr.publishScoreEvent();
            
            // Update UI
            UI.updatePlayerProfile();
            
        }, 3000);
    },
    
    // Check for player interactions
    checkPlayerInteractions: function() {
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(Player.x - user.x, 2) + 
                Math.pow(Player.y - user.y, 2)
            );
            
            // Visual indication when a player is in range
            if (distance < RelayWorld.config.INTERACTION_RANGE) {
                // Highlight player somehow
                
                // Check if in voice chat range for WebRTC
                if (distance < RelayWorld.config.VOICE_CHAT_RANGE) {
                    // Add to nearby users for voice chat
                    Audio.addNearbyUser(pubkey, distance);
                } else {
                    // Remove from nearby users if out of range
                    Audio.removeNearbyUser(pubkey);
                }
            } else {
                // Remove from nearby users if out of range
                Audio.removeNearbyUser(pubkey);
            }
        }
    },
    
    // Create collectible pickup effect
    createCollectEffect: function(x, y) {
        const effect = document.createElement('div');
        effect.className = 'collectible-effect';
        effect.style.left = `${x - this.camera.x + this.canvas.width / 2 - 20}px`;
        effect.style.top = `${y - this.camera.y + this.canvas.height / 2 - 20}px`;
        document.getElementById('game-container').appendChild(effect);
        
        // Remove after animation completes
        setTimeout(() => {
            effect.remove();
        }, 500);
    },
    
    // Initialize mini-map
    initMiniMap: function() {
        const miniMap = document.getElementById('mini-map');
        miniMap.classList.remove('hide');
        this.miniMapCtx = miniMap.getContext('2d');
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
        
        // Draw other players
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(user.x * scale, user.y * scale, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw player
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(Player.x * scale, Player.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw voice chat range
        if (Audio.isVoiceChatActive) {
            ctx.strokeStyle = 'rgba(139, 172, 15, 0.5)';
            ctx.beginPath();
            ctx.arc(Player.x * scale, Player.y * scale, RelayWorld.config.VOICE_CHAT_RANGE * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    
    // Generate initial world items
    generateWorldItems: function() {
        // Clear existing items
        this.world.collectibles = [];
        
        // Generate random collectibles
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * this.world.width;
            const y = Math.random() * this.world.height;
            const item = Items.getRandomItem();
            
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
    
    // Publish player position periodically
    publishPlayerPosition: (function() {
        let lastPublish = 0;
        const PUBLISH_INTERVAL = 200; // 5 times per second
        
        return function() {
            const now = Date.now();
            if (now - lastPublish >= PUBLISH_INTERVAL) {
                Nostr.publishPlayerPosition(Player.x, Player.y);
                lastPublish = now;
            }
        };
    })(),
    
    // Trigger interaction with nearby entities
    triggerInteraction: function() {
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        // Find closest player
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(Player.x - user.x, 2) + 
                Math.pow(Player.y - user.y, 2)
            );
            
            if (distance < RelayWorld.config.INTERACTION_RANGE && distance < closestDistance) {
                closestPlayer = pubkey;
                closestDistance = distance;
            }
        }
        
        // Interact with closest player
        if (closestPlayer) {
            UI.showUserPopup(closestPlayer);
            Player.interactions++;
            Player.score += 20;
            Nostr.publishScoreEvent();
            UI.updatePlayerProfile();
            UI.playSound("success");
            UI.showToast("Interacted with user! +20 points", "success");
            return;
        }
        
        // Check for treasures
        for (const treasure of this.world.treasures) {
            const distance = Math.sqrt(
                Math.pow(Player.x - treasure.x, 2) + 
                Math.pow(Player.y - treasure.y, 2)
            );
            
            if (distance < 50 && !treasure.unlocking) {
                this.unlockTreasure(treasure);
                return;
            }
        }
        
        // Check for portals
        for (const portal of this.world.portals) {
            const distance = Math.sqrt(
                Math.pow(Player.x - portal.x, 2) + 
                Math.pow(Player.y - portal.y, 2)
            );
            
            if (distance < 50) {
                this.usePortal(portal);
                return;
            }
        }
    },
    
    // Use a portal to teleport
    usePortal: function(portal) {
        // Teleport to the other portal
        const otherPortal = this.world.portals.find(p => p.id !== portal.id);
        if (!otherPortal) return;
        
        // Create teleport effect
        const effect = document.createElement('div');
        effect.className = 'teleport-effect';
        effect.style.position = 'absolute';
        effect.style.left = `${Player.x - this.camera.x + this.canvas.width / 2 - 50}px`;
        effect.style.top = `${Player.y - this.camera.y + this.canvas.height / 2 - 50}px`;
        effect.style.width = '100px';
        effect.style.height = '100px';
        effect.style.backgroundColor = portal.color;
        effect.style.borderRadius = '50%';
        effect.style.opacity = '0.7';
        effect.style.zIndex = '100';
        document.getElementById('game-container').appendChild(effect);
        
        // Teleport after effect starts
        setTimeout(() => {
            Player.x = otherPortal.x;
            Player.y = otherPortal.y;
            
            // Update camera immediately
            this.camera.x = Player.x;
            this.camera.y = Player.y;
            
            // Remove teleport effect
            effect.remove();
            
            // Show notification
            UI.showToast(`Teleported to ${otherPortal.id}!`, "success");
            
            // Publish event
            Nostr.publishPortalEvent(otherPortal.id);
        }, 500);
        
        // Play sound
        UI.playSound("portal");
    },
    
    // Trigger zap for nearby players
    triggerZap: function() {
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        // Find closest player
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
            const distance = Math.sqrt(
                Math.pow(Player.x - user.x, 2) + 
                Math.pow(Player.y - user.y, 2)
            );
            
            if (distance < RelayWorld.config.INTERACTION_RANGE && distance < closestDistance) {
                closestPlayer = pubkey;
                closestDistance = distance;
            }
        }
        
        // Zap closest player
        if (closestPlayer) {
            Zaps.showZapInterface(closestPlayer);
            return;
        }
        
        UI.showToast("No players nearby to zap!", "warning");
    },
    
    // Drawing functions
    drawBackground: function() {
        const ctx = this.ctx;
        const gridSize = 50;
        
        ctx.strokeStyle = 'rgba(139, 172, 15, 0.1)';
        ctx.lineWidth = 1;
        
        // Calculate grid boundaries based on camera position
        const startX = Math.floor(this.camera.x / gridSize) * gridSize - Math.floor(this.canvas.width / 2);
        const startY = Math.floor(this.camera.y / gridSize) * gridSize - Math.floor(this.canvas.height / 2);
        const endX = startX + this.canvas.width + gridSize;
        const endY = startY + this.canvas.height + gridSize;
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            const screenX = x - (this.camera.x - this.canvas.width / 2);
            
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, this.canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            const screenY = y - (this.camera.y - this.canvas.height / 2);
            
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(this.canvas.width, screenY);
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
        const screenWidth = this.world.width;
        const screenHeight = this.world.height;
        
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
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
            ctx.font = "16px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.emoji, screenX, screenY);
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
            ctx.font = "20px 'Press Start 2P'";
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
    
    drawEnemies: function() {
        const ctx = this.ctx;
        
        for (const enemy of this.world.enemies) {
            // Calculate screen coordinates
            const screenX = enemy.x - (this.camera.x - this.canvas.width / 2);
            const screenY = enemy.y - (this.camera.y - this.canvas.height / 2);
            
            // Skip if out of view
            if (screenX < -20 || screenX > this.canvas.width + 20 ||
                screenY < -20 || screenY > this.canvas.height + 20) {
                continue;
            }
            
            // Draw enemy
            ctx.save();
            
            ctx.fillStyle = '#CF6679';
            ctx.fillRect(screenX - 15, screenY - 15, 30, 30);
            
            // Draw health bar
            const healthPercent = enemy.health / 100;
            
            ctx.fillStyle = '#111';
            ctx.fillRect(screenX - 15, screenY + 20, 30, 5);
            
            ctx.fillStyle = '#CF6679';
            ctx.fillRect(screenX - 15, screenY + 20, 30 * healthPercent, 5);
            
            ctx.restore();
        }
    },
    
    drawPlayers: function() {
        const ctx = this.ctx;
        
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
            // Calculate screen coordinates
            const screenX = user.x - (this.camera.x - this.canvas.width / 2);
            const screenY = user.y - (this.camera.y - this.canvas.height / 2) + (user.bobOffset || 0);
            
            // Skip if out of view
            if (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }
            
            // Draw player
            ctx.save();
            
            // Draw player avatar
            if (user.profile?.picture) {
                const img = new Image();
                img.src = user.profile.picture;
                
                try {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, screenX - 15, screenY - 30, 30, 30);
                } catch (e) {
                    // Fallback if image fails to load
                    ctx.fillStyle = '#9BBC0F';
                    ctx.beginPath();
                    ctx.arc(screenX, screenY - 15, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = '#9BBC0F';
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
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(user.profile?.name || pubkey.slice(0, 8), screenX, screenY - 40);
            ctx.restore();
            
            // Draw voice indicator if speaking
            if (Audio.isUserSpeaking(pubkey)) {
                ctx.save();
                ctx.fillStyle = '#8BAC0F';
                ctx.beginPath();
                ctx.arc(screenX, screenY - 50, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    },
    
    drawPlayer: function() {
        const ctx = this.ctx;
        
        // Player is always drawn at the center of the screen
        const screenX = this.canvas.width / 2;
        const screenY = this.canvas.height / 2 + Player.bobOffset;
        
        // Draw player
        ctx.save();
        
        // Draw player avatar
        if (Player.profile?.picture) {
            const img = new Image();
            img.src = Player.profile.picture;
            
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
        ctx.font = "10px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText(Player.profile?.name || Player.pubkey.slice(0, 8), screenX, screenY - 40);
        ctx.restore();
        
        // Draw voice indicator if speaking
        if (Audio.isVoiceChatActive && Audio.isLocalUserSpeaking()) {
            ctx.save();
            ctx.fillStyle = '#8BAC0F';
            ctx.beginPath();
            ctx.arc(screenX, screenY - 50, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },
    
    drawVoiceIndicators: function() {
        const ctx = this.ctx;
        
        // Draw voice chat range indicator
        ctx.save();
        ctx.strokeStyle = 'rgba(139, 172, 15, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            RelayWorld.config.VOICE_CHAT_RANGE, 
            0, 
            Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }
};
