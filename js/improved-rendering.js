/**
 * improved-rendering.js - Enhanced rendering for Relay World
 * Improves player sprites, world rendering, and visual effects
 */

const ImprovedRendering = {
  // Sprite references
  sprites: {
    playerBody: null,
    npcBody: null,
    background: null
  },
  
  // Animation frames
  animFrames: {
    idle: [0, 1],
    walk: [0, 1, 2, 3],
    currentFrame: 0,
    frameCounter: 0,
    frameSpeed: 8 // Lower = faster animation
  },
  
  init: function() {
    console.log("[ImprovedRendering] Initializing...");
    this.loadSprites();
    this.improveBackgroundRendering();
    this.patchPlayerRendering();
    this.enhanceLightningEffects();
    console.log("[ImprovedRendering] Initialized");
  },
  
  loadSprites: function() {
    // Create player body sprite - improved pixel art character
    this.sprites.playerBody = new Image();
    this.sprites.playerBody.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAACAAgMAAAADHJJ4AAAACVBMVEUAAAAbq+IbreMIAK+oAAAAA3RSTlMA/4CE5eovAAAAb0lEQVR4Ae3NIQIAIQxE0e+JT/U1cUk9VzDRQRAsXyJY5mVHdvSVaCLIlgh5rQhZI5FxnyjCJCKbWKA5sZ92aFLI8zH0DQGdyJ6lsyfs/TSTeCJgFnFbAYxYRNyUi4BWxG3pCBhE3NZDQCPiAXCpjDOmeu5UAAAAAElFTkSuQmCC';
    
    // Create NPC body sprite - different colored pixel art character
    this.sprites.npcBody = new Image();
    this.sprites.npcBody.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAACAAgMAAAADHJJ4AAAACVBMVEUAAABWrd5Xrd55W9jzAAAAA3RSTlMA/4CE5eovAAAAb0lEQVR4Ae3NIQIAIQxE0e+JT/U1cUk9VzDRQRAsXyJY5mVHdvSVaCLIlgh5rQhZI5FxnyjCJCKbWKA5sZ92aFLI8zH0DQGdyJ6lsyfs/TSTeCJgFnFbAYxYRNyUi4BWxG3pCBhE3NZDQCPiAXCpjDOmeu5UAAAAAElFTkSuQmCC';
    
    // Create background pattern for improved terrain
    this.sprites.background = new Image();
    this.sprites.background.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAgMAAAAEEcUXAAAACVBMVEUbq+IAAAAaqu9DFFL7AAAAAnRSTlMAAHaTzTgAAABdSURBVHhe7cuhEYAwEATBb0IJGbmEMnLp/yWcWwfDTAUTbFXyY+Pxn05jUW9p0KFDhw4dOnTo0KHjv45bHvSjQ4cOHTp06NChQ4eOBR38okOHDh06dOjQoUPHfh0PVWwbJ8T/8U8AAAAASUVORK5CYII=';

    // Wait for sprites to load
    this.sprites.playerBody.onload = () => {
      console.log("[ImprovedRendering] Player body sprite loaded");
    };
    
    this.sprites.npcBody.onload = () => {
      console.log("[ImprovedRendering] NPC body sprite loaded");
    };
    
    this.sprites.background.onload = () => {
      console.log("[ImprovedRendering] Background pattern loaded");
    };
  },
  
  improveBackgroundRendering: function() {
    // Patch Game.drawBackground if it exists
    if (typeof Game !== 'undefined' && typeof Game.drawBackground === 'function') {
      console.log("[ImprovedRendering] Enhancing background rendering");
      
      const originalDrawBackground = Game.drawBackground;
      Game.drawBackground = function() {
        const ctx = this.ctx;
        if (!ctx) {
          return originalDrawBackground.call(this);
        }
        
        // Draw terrain background with pattern
        if (ImprovedRendering.sprites.background.complete) {
          const pattern = ctx.createPattern(ImprovedRendering.sprites.background, 'repeat');
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw grid on top with more subtle lines
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
          const screenX = x - (this.camera.x - this.canvas.width / 2);
          if (screenX < 0 || screenX > this.canvas.width) continue;
          
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, this.canvas.height);
          ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
          const screenY = y - (this.camera.y - this.canvas.height / 2);
          if (screenY < 0 || screenY > this.canvas.height) continue;
          
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(this.canvas.width, screenY);
          ctx.stroke();
        }
        
        // Add subtle hills and environment features
        this.drawEnvironmentFeatures(ctx);
      };
      
      // Add method to draw environment features
      Game.drawEnvironmentFeatures = function(ctx) {
        // Only draw environment features that are in view
        const viewportLeft = this.camera.x - this.canvas.width / 2;
        const viewportTop = this.camera.y - this.canvas.height / 2;
        const viewportRight = viewportLeft + this.canvas.width;
        const viewportBottom = viewportTop + this.canvas.height;
        
        // Draw some hills using a deterministic pattern
        for (let x = Math.floor(viewportLeft / 200) * 200; x < viewportRight; x += 200) {
          for (let y = Math.floor(viewportTop / 200) * 200; y < viewportBottom; y += 200) {
            // Use position to determine feature type
            const hash = (x * 31 + y * 17) % 100;
            
            const screenX = x - (this.camera.x - this.canvas.width / 2);
            const screenY = y - (this.camera.y - this.canvas.height / 2);
            
            // Draw different features based on the hash
            if (hash < 20) {  // Draw a small hill
              ctx.fillStyle = 'rgba(139, 172, 15, 0.2)';
              ctx.beginPath();
              ctx.arc(screenX, screenY, 40, 0, Math.PI * 2);
              ctx.fill();
            } else if (hash < 25) {  // Draw a tree
              ctx.fillStyle = 'rgba(100, 150, 50, 0.3)';
              ctx.beginPath();
              ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = 'rgba(139, 80, 15, 0.3)';
              ctx.fillRect(screenX - 3, screenY + 15, 6, 20);
            } else if (hash < 30) {  // Draw a rock
              ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
              ctx.beginPath();
              ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
              ctx.fill();
            }
            // Other locations stay empty
          }
        }
      };
    }
  },
  
  patchPlayerRendering: function() {
    // Patch Game.drawPlayers if it exists
    if (typeof Game !== 'undefined' && typeof Game.drawPlayers === 'function') {
      console.log("[ImprovedRendering] Enhancing player rendering");
      
      const originalDrawPlayers = Game.drawPlayers;
      Game.drawPlayers = function() {
        if (typeof Nostr === 'undefined' || typeof Player === 'undefined' || !Nostr.users) {
          return originalDrawPlayers.call(this);
        }
        
        const ctx = this.ctx;
        
        // Update animation frame counter
        ImprovedRendering.animFrames.frameCounter++;
        if (ImprovedRendering.animFrames.frameCounter >= ImprovedRendering.animFrames.frameSpeed) {
          ImprovedRendering.animFrames.frameCounter = 0;
          ImprovedRendering.animFrames.currentFrame = 
            (ImprovedRendering.animFrames.currentFrame + 1) % ImprovedRendering.animFrames.walk.length;
        }
        
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
              ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(img, screenX - 16, screenY - 36, 32, 32);
            } catch (e) {
              // Fallback if image fails to load
              ctx.fillStyle = user.isNPC ? '#6B8E23' : '#9BBC0F';
              ctx.beginPath();
              ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = user.isNPC ? '#6B8E23' : '#9BBC0F';
            ctx.beginPath();
            ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
          
          // Draw player body using the sprite
          if (ImprovedRendering.sprites.playerBody.complete && ImprovedRendering.sprites.npcBody.complete) {
            const sprite = user.isNPC ? ImprovedRendering.sprites.npcBody : ImprovedRendering.sprites.playerBody;
            const frameIndex = ImprovedRendering.animFrames.walk[ImprovedRendering.animFrames.currentFrame];
            const frameWidth = sprite.width / 4; // 4 frames in the spritesheet
            const frameHeight = sprite.height;
            
            ctx.drawImage(
              sprite,
              frameIndex * frameWidth, 0, frameWidth, frameHeight,
              screenX - 16, screenY - 5, 32, 32
            );
          } else {
            // Fallback to simple shape if sprite not loaded
            ctx.save();
            ctx.strokeStyle = user.isNPC ? '#AAAAAA' : '#FFFFFF';
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
          }
          
          // Draw player name with improved style
          ctx.save();
          // Add name background for better readability
          const name = user.profile?.name || pubkey.slice(0, 8);
          const nameWidth = ctx.measureText(name).width + 10;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(screenX - nameWidth/2, screenY - 52, nameWidth, 16);
          
          ctx.fillStyle = user.isNPC ? '#CCCCCC' : '#FFFFFF';
          ctx.font = "10px 'Press Start 2P', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(name, screenX, screenY - 40);
          
          // NPC indicator
          if (user.isNPC) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(screenX - 20, screenY - 65, 40, 12);
            
            ctx.fillStyle = '#AAAAAA';
            ctx.font = "8px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("[NPC]", screenX, screenY - 55);
          }
          ctx.restore();
          
          // Draw voice indicator if speaking
          if (typeof Audio !== 'undefined' && Audio.isUserSpeaking && Audio.isUserSpeaking(pubkey)) {
            ctx.save();
            
            // Draw sound waves
            ctx.strokeStyle = user.isNPC ? '#6B8E23' : '#8BAC0F';
            ctx.lineWidth = 2;
            const waveRadius = 10 + Math.sin(Date.now() / 200) * 3;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY - 50, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(screenX, screenY - 50, waveRadius/2, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
          }
        }
      };
      
      // Patch player rendering
      const originalDrawPlayer = Game.drawPlayer;
      Game.drawPlayer = function() {
        if (typeof Player === 'undefined') {
          return originalDrawPlayer.call(this);
        }
        
        const ctx = this.ctx;
        
        // Player is always drawn at the center of the screen
        const screenX = this.canvas.width / 2;
        const screenY = this.canvas.height / 2 + Player.bobOffset;
        
        // Draw player
        ctx.save();
        
        // Draw player avatar
        if (Player.profile && Player.profile.picture) {
          const img = new Image();
          img.src = Player.profile.picture;
          
          try {
            ctx.beginPath();
            ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, screenX - 16, screenY - 36, 32, 32);
          } catch (e) {
            // Fallback if image fails to load
            ctx.fillStyle = '#8BAC0F';
            ctx.beginPath();
            ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#8BAC0F';
          ctx.beginPath();
          ctx.arc(screenX, screenY - 20, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
        
        // Draw player body using sprite
        if (ImprovedRendering.sprites.playerBody.complete) {
          // Determine animation frame based on movement
          let frameIndex = 0;
          if (Player.input.up || Player.input.down || Player.input.left || Player.input.right) {
            frameIndex = ImprovedRendering.animFrames.walk[ImprovedRendering.animFrames.currentFrame];
          } else {
            frameIndex = ImprovedRendering.animFrames.idle[Math.floor(Date.now() / 500) % 2];
          }
          
          const frameWidth = ImprovedRendering.sprites.playerBody.width / 4; // 4 frames in the spritesheet
          const frameHeight = ImprovedRendering.sprites.playerBody.height;
          
          ctx.drawImage(
            ImprovedRendering.sprites.playerBody,
            frameIndex * frameWidth, 0, frameWidth, frameHeight,
            screenX - 16, screenY - 5, 32, 32
          );
        } else {
          // Fallback to simple shape if sprite not loaded
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
        }
        
        // Draw player name with improved style
        ctx.save();
        // Add name background for better readability
        const name = Player.profile?.name || Player.pubkey.slice(0, 8);
        const nameWidth = ctx.measureText(name).width + 10;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - nameWidth/2, screenY - 52, nameWidth, 16);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = "10px 'Press Start 2P', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name, screenX, screenY - 40);
        ctx.restore();
        
        // Draw voice indicator if speaking
        if (typeof Audio !== 'undefined' && Audio.isLocalUserSpeaking && Audio.isLocalUserSpeaking()) {
          ctx.save();
          
          // Draw sound waves
          ctx.strokeStyle = '#8BAC0F';
          ctx.lineWidth = 2;
          const waveRadius = 10 + Math.sin(Date.now() / 200) * 3;
          
          ctx.beginPath();
          ctx.arc(screenX, screenY - 50, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(screenX, screenY - 50, waveRadius/2, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
        }
      };
    }
  },
  
  enhanceLightningEffects: function() {
    // Enhance lightning effects in the weather system
    if (typeof Game !== 'undefined' && Game.weather) {
      console.log("[ImprovedRendering] Enhancing lightning effects");
      
      // Create a lightning effect function
      Game.createLightningEffect = function() {
        const weatherOverlay = document.getElementById('weather-overlay');
        if (!weatherOverlay) return;
        
        // Create lightning flash
        const lightning = document.createElement('div');
        lightning.className = 'lightning-flash';
        
        // Apply dynamic styles
        lightning.style.position = 'absolute';
        lightning.style.top = '0';
        lightning.style.left = '0';
        lightning.style.width = '100%';
        lightning.style.height = '100%';
        lightning.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        lightning.style.pointerEvents = 'none';
        lightning.style.zIndex = '100';
        
        // Add to weather overlay
        weatherOverlay.appendChild(lightning);
        
        // Create forked lightning bolts
        const bolt = document.createElement('div');
        bolt.className = 'lightning-bolt';
        bolt.style.position = 'absolute';
        bolt.style.top = '0';
        bolt.style.left = `${Math.random() * 80 + 10}%`;
        bolt.style.height = `${Math.random() * 40 + 40}%`;
        bolt.style.width = '3px';
        bolt.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        bolt.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5)';
        bolt.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        lightning.appendChild(bolt);
        
        // Create branch bolts
        const branches = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < branches; i++) {
          const branch = document.createElement('div');
          branch.className = 'lightning-branch';
          branch.style.position = 'absolute';
          branch.style.top = `${Math.random() * 80}%`;
          branch.style.left = '0';
          branch.style.height = '2px';
          branch.style.width = `${Math.random() * 30 + 20}px`;
          branch.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          branch.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.8)';
          branch.style.transform = `rotate(${Math.random() * 40 - 20}deg)`;
          bolt.appendChild(branch);
        }
        
        // Play thunder sound
        if (UI && UI.playSound) {
          setTimeout(() => {
            UI.playSound('thunder');
          }, Math.random() * 1000 + 100);
        }
        
        // Remove after effect completes
        setTimeout(() => {
          lightning.remove();
        }, 200);
      };
      
      // Modify the weather update function if it exists
      if (Game.weather.change) {
        const originalWeatherChange = Game.weather.change;
        Game.weather.change = function() {
          originalWeatherChange.call(this);
          
          // Add periodic lightning for storm weather
          if (this.current === 'storm') {
            if (Math.random() < 0.01) { // Random chance to create lightning
              Game.createLightningEffect();
            }
          }
        };
      }
      
      // Add thunder sound if UI.loadSound exists
      if (UI && UI.loadSound) {
        UI.loadSound('thunder', 'assets/sounds/thunder.mp3');
      }
    }
  }
};

// Export for use in the game
export default ImprovedRendering;
