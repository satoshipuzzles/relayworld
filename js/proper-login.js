// proper-login.js
document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('login-button');
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  if (loginButton) {
    loginButton.addEventListener('click', async function() {
      loginButton.disabled = true;
      if (loginLoader) loginLoader.style.display = 'block';
      if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
      
      try {
        // Wait for window.nostr to be available
        let nostrAvailable = false;
        let attempts = 0;
        
        while (!nostrAvailable && attempts < 10) {
          if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
            nostrAvailable = true;
          } else {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
          }
        }
        
        if (!nostrAvailable) {
          throw new Error('Nostr extension not found or not ready. Please install a NIP-07 extension like Alby or nos2x.');
        }
        
        if (loginStatus) loginStatus.textContent = 'Extension found! Requesting pubkey...';
        const pubkey = await window.nostr.getPublicKey();
        
        if (!pubkey) {
          throw new Error('No pubkey returned from extension');
        }
        
        if (loginStatus) loginStatus.textContent = 'Got pubkey, initializing game...';
        
        // Wait a moment for RelayWorld to initialize
        await new Promise(r => setTimeout(r, 1000));
        
        // Try to use RelayWorld's login if available
        if (window.RelayWorld) {
          console.log("Using RelayWorld login");
          
          // Wait for RelayWorldCore to be fully initialized
          let coreReady = false;
          attempts = 0;
          
          while (!coreReady && attempts < 10) {
            if (window.RelayWorldCore) {
              coreReady = true;
            } else {
              await new Promise(r => setTimeout(r, 500));
              attempts++;
            }
          }
          
          if (coreReady) {
            const authModule = window.RelayWorldCore.getModule('auth');
            if (authModule && typeof authModule.loginWithNostr === 'function') {
              await authModule.loginWithNostr(pubkey);
              if (loginStatus) loginStatus.textContent = 'Login successful!';
              
              // Hide login screen after a delay
              setTimeout(() => {
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) loginScreen.classList.add('hide');
              }, 1000);
              
              return;
            }
          }
        }
        
        // Fallback to manual login if RelayWorld system isn't available
        console.log("Falling back to manual login process");
        if (loginStatus) loginStatus.textContent = 'Logging in manually...';
        
        // Hide login screen
        setTimeout(() => {
          const loginScreen = document.getElementById('login-screen');
          if (loginScreen) {
            loginScreen.style.opacity = "0";
            setTimeout(() => loginScreen.classList.add('hide'), 1000);
          }
          
          // Show game UI
          document.getElementById('top-bar')?.classList.remove('hide');
          document.getElementById('chat-container')?.classList.remove('hide');
          document.getElementById('player-profile')?.classList.remove('hide');
          document.getElementById('leaderboard-container')?.classList.remove('hide');
          document.getElementById('mobile-controls')?.classList.remove('hide');
          
          // Add the player's pubkey to the profile
          const npubEl = document.getElementById('player-profile-npub');
          const nameEl = document.getElementById('player-profile-name');
          
          if (npubEl) npubEl.textContent = pubkey.substring(0, 8);
          if (nameEl) nameEl.textContent = `User ${pubkey.substring(0, 8)}`;
          
          // Set up simple game if needed
          setupSimpleGame(pubkey);
        }, 1000);
        
      } catch (error) {
        console.error('Login error:', error);
        if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
      } finally {
        if (loginLoader) loginLoader.style.display = 'none';
        loginButton.disabled = false;
      }
    });
  }
  
  function setupSimpleGame(pubkey) {
    // Create a simple game if RelayWorld failed to initialize
    if (!window.simpleGame) {
      window.simpleGame = {
        canvas: document.getElementById('game-canvas'),
        ctx: null,
        running: false,
        player: {
          pubkey: pubkey,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          size: 20,
          speed: 5,
          color: '#FF0000'
        },
        input: {
          up: false,
          down: false,
          left: false,
          right: false
        },
        otherPlayers: [],
        
        init: function() {
          if (!this.canvas) {
            console.error("Game canvas not found!");
            return false;
          }
          
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
          this.ctx = this.canvas.getContext('2d');
          
          if (!this.ctx) {
            console.error("Could not get canvas context!");
            return false;
          }
          
          // Set up key listeners
          window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.input.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') this.input.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = true;
          });
          
          window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.input.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') this.input.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = false;
          });
          
          // Generate random players
          for (let i = 0; i < 15; i++) {
            this.otherPlayers.push({
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              size: 20,
              color: `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`,
              name: `Player ${i+1}`
            });
          }
          
          return true;
        },
        
        start: function() {
          if (this.init()) {
            this.running = true;
            this.loop();
            console.log("Simple game started");
            return true;
          }
          return false;
        },
        
        loop: function() {
          if (!this.running) return;
          
          this.update();
          this.draw();
          
          requestAnimationFrame(() => this.loop());
        },
        
        update: function() {
          // Move player based on input
          if (this.input.up) this.player.y -= this.player.speed;
          if (this.input.down) this.player.y += this.player.speed;
          if (this.input.left) this.player.x -= this.player.speed;
          if (this.input.right) this.player.x += this.player.speed;
          
          // Keep player on screen
          this.player.x = Math.max(this.player.size, Math.min(this.player.x, this.canvas.width - this.player.size));
          this.player.y = Math.max(this.player.size, Math.min(this.player.y, this.canvas.height - this.player.size));
          
          // Random movement for other players
          this.otherPlayers.forEach(p => {
            if (Math.random() < 0.02) {
              p.x += (Math.random() - 0.5) * 10;
              p.y += (Math.random() - 0.5) * 10;
              
              p.x = Math.max(p.size, Math.min(p.x, this.canvas.width - p.size));
              p.y = Math.max(p.size, Math.min(p.y, this.canvas.height - p.size));
            }
          });
        },
        
        draw: function() {
          // Clear canvas
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Draw grid background
          this.ctx.strokeStyle = "#306230";
          this.ctx.lineWidth = 1;
          const gridSize = 100;
          
          for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
          }
          
          for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
          }
          
          // Draw other players
          this.otherPlayers.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.font = "12px 'Press Start 2P', Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(p.name, p.x, p.y - p.size - 5);
          });
          
          // Draw player
          this.ctx.fillStyle = this.player.color;
          this.ctx.beginPath();
          this.ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Draw player name
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.font = "16px 'Press Start 2P', Arial";
          this.ctx.textAlign = "center";
          this.ctx.fillText("You", this.player.x, this.player.y - this.player.size - 10);
          
          // Draw coordinates
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.font = "12px Arial";
          this.ctx.textAlign = "left";
          this.ctx.fillText(`X: ${Math.round(this.player.x)}, Y: ${Math.round(this.player.y)}`, 10, 20);
        }
      };
      
      window.simpleGame.start();
    }
  }
});
