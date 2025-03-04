/**
 * game.js - Core game loop and world logic
 * Handles game state, rendering, and core mechanics
 */

const Game = {
    // Existing properties...
    
    // Add a list of game event kinds
    subscribedGameKinds: null,
    
    // Initialize to populate from RelayWorld config
    init: function() {
        console.log("[Game] Initializing game...");
        
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[Game] Canvas element not found");
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Get game event kinds from RelayWorld config
        if (typeof RelayWorld !== 'undefined' && RelayWorld.config && RelayWorld.config.EVENT_KINDS) {
            this.subscribedGameKinds = Object.values(RelayWorld.config.EVENT_KINDS);
        } else {
            // Fallback to hardcoded values if config not available
            this.subscribedGameKinds = [
                420001, 420002, 420003, 420004, 420005,
                420006, 420007, 420008, 420009, 420010
            ];
        }
        
        // Initialize canvas size
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Initialize mini-map
        this.initMiniMap();
        
        // Place player in the world
        if (typeof Player !== 'undefined') {
            Player.x = this.world.width / 2;
            Player.y = this.world.height / 2;
        }
        
        console.log("[Game] Initialized successfully");
        return true;
    },
    
    // Update method to publish position to game relay
    publishPlayerPosition: (function() {
        let lastPublish = 0;
        const PUBLISH_INTERVAL = 200; // 5 times per second
        
        return function() {
            if (typeof Nostr === 'undefined' || typeof Player === 'undefined' || 
                !Nostr.publishPlayerPosition) return;
            
            const now = Date.now();
            if (now - lastPublish >= PUBLISH_INTERVAL) {
                Nostr.publishPlayerPosition(Player.x, Player.y);
                lastPublish = now;
            }
        };
    })(),
    
    // Draw players with visual distinction between NPCs and live players
    drawPlayers: function() {
        if (typeof Nostr === 'undefined' || typeof Player === 'undefined' || !Nostr.users) return;
        
        const ctx = this.ctx;
        
        for (const [pubkey, user] of Nostr.users) {
            if (pubkey === Player.pubkey) continue;
            
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
            if (typeof Audio !== 'undefined' && Audio.isUserSpeaking && Audio.isUserSpeaking(pubkey)) {
                ctx.save();
                ctx.fillStyle = user.isNPC ? '#6B8E23' : '#8BAC0F';
                ctx.beginPath();
                ctx.arc(screenX, screenY - 50, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    },
    
    // Update minimap to show NPCs differently
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
        if (typeof Nostr !== 'undefined' && typeof Player !== 'undefined' && Nostr.users) {
            for (const [pubkey, user] of Nostr.users) {
                if (pubkey === Player.pubkey) continue;
                
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
            ctx.arc(Player.x * scale, Player.y * scale, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw voice chat range
            if (typeof Audio !== 'undefined' && typeof RelayWorld !== 'undefined' && 
                Audio.isVoiceChatActive && RelayWorld.config) {
                ctx.strokeStyle = 'rgba(139, 172, 15, 0.5)';
                ctx.beginPath();
                ctx.arc(Player.x * scale, Player.y * scale, RelayWorld.config.VOICE_CHAT_RANGE * scale, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    // Other existing methods...
}

// Export Game as the default export
export default Game;
