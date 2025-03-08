// proper-login.js with guest login support
document.addEventListener('DOMContentLoaded', function() {
  // Apply styling fixes immediately
  fixLoginStyles();
  
  // Set up login buttons
  const loginButton = document.getElementById('login-button');
  const guestLoginButton = document.createElement('button');
  guestLoginButton.id = 'guest-login-button';
  guestLoginButton.className = 'secondary-button';
  guestLoginButton.textContent = 'PLAY AS GUEST';
  
  // Add guest login button after the main login button
  if (loginButton && loginButton.parentNode) {
    loginButton.parentNode.insertBefore(guestLoginButton, loginButton.nextSibling);
  }
  
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  // Handle normal Nostr login
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
        
        // Play sound and animation
        playLoginAnimation();
        
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
  
  // Handle guest login
  if (guestLoginButton) {
    guestLoginButton.addEventListener('click', async function() {
      guestLoginButton.disabled = true;
      if (loginLoader) loginLoader.style.display = 'block';
      if (loginStatus) loginStatus.textContent = 'Creating guest account...';
      
      try {
        // Generate a random guest ID
        const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
        const pubkey = guestId;
        
        if (loginStatus) loginStatus.textContent = 'Guest account created!';
        
        // Play sound and animation
        playLoginAnimation();
        
        // Wait a moment for RelayWorld to initialize
        await new Promise(r => setTimeout(r, 1000));
        
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
          
          // Add the guest's info to the profile
          const npubEl = document.getElementById('player-profile-npub');
          const nameEl = document.getElementById('player-profile-name');
          
          if (npubEl) npubEl.textContent = 'Guest';
          if (nameEl) nameEl.textContent = `Guest ${guestId.substring(6, 10)}`;
          
          // Set up simple game
          setupSimpleGame(pubkey);
        }, 1000);
        
      } catch (error) {
        console.error('Guest login error:', error);
        if (loginStatus) loginStatus.textContent = 'Guest login failed: ' + error.message;
      } finally {
        if (loginLoader) loginLoader.style.display = 'none';
        guestLoginButton.disabled = false;
      }
    });
  }
  
  // Play login sound and animation
  function playLoginAnimation() {
    // Play sound if available
    try {
      const audio = new Audio('assets/sounds/login.mp3');
      audio.play().catch(() => console.log('Unable to play sound'));
    } catch (e) {
      console.log('Sound playback not available');
    }
    
    // Animate sound wave
    const soundWave = document.getElementById('sound-wave');
    if (soundWave) {
      soundWave.style.animation = 'sound-wave 4s ease-out infinite';
      setTimeout(() => {
        soundWave.style.animation = 'none';
      }, 4000);
    }
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
          color: '#FF0000',
          score: 0
        },
        input: {
          up: false,
          down: false,
          left: false,
          right: false
        },
        otherPlayers: [],
        collectibles: [],
        
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
          
          // Generate collectibles
          this.generateCollectibles(30);
          
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
          
          // Handle window resize
          window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
          });
          
          // Generate random players
          for (let i = 0; i < 15; i++) {
            this.otherPlayers.push({
              x: Math.random() * this.canvas.width,
              y: Math.random() * this.canvas.height,
              size: 20,
              color: `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`,
              name: `Player ${i+1}`
            });
          }
          
          return true;
        },
        
        generateCollectibles: function(count) {
          for (let i = 0; i < count; i++) {
            this.collectibles.push({
              x: Math.random() * this.canvas.width,
              y: Math.random() * this.canvas.height,
              size: 15,
              value: Math.floor(Math.random() * 50) + 10,
              emoji: ["💎", "🍄", "🔮", "⚡", "🔑"][Math.floor(Math.random() * 5)]
            });
          }
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
          
          // Check collectible collisions
          for (let i = 0; i < this.collectibles.length; i++) {
            const collectible = this.collectibles[i];
            const distance = Math.hypot(this.player.x - collectible.x, this.player.y - collectible.y);
            
            if (distance < this.player.size + collectible.size) {
              // Collect item
              this.player.score += collectible.value;
              this.collectibles.splice(i, 1);
              i--;
              
              // Update score display
              const scoreDisplay = document.getElementById('score-display');
              if (scoreDisplay) scoreDisplay.textContent = `Score: ${this.player.score}`;
              
              const profileScore = document.getElementById('profile-score');
              if (profileScore) profileScore.textContent = this.player.score;
              
              // Show collection effect
              this.showToast(`Collected ${collectible.emoji} +${collectible.value} points!`);
              
              // Spawn new collectible
              if (Math.random() < 0.5) {
                this.generateCollectibles(1);
              }
            }
          }
          
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
          
          // Draw collectibles
          this.collectibles.forEach(item => {
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(item.emoji, item.x, item.y);
          });
          
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
          
          // Draw coordinates and score
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.font = "12px Arial";
          this.ctx.textAlign = "left";
          this.ctx.fillText(`X: ${Math.round(this.player.x)}, Y: ${Math.round(this.player.y)}`, 10, 20);
          this.ctx.fillText(`Score: ${this.player.score}`, 10, 40);
        },
        
        showToast: function(message) {
          const container = document.getElementById('toast-container');
          if (!container) return;
          
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.textContent = message;
          container.appendChild(toast);
          
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 3000);
        }
      };
      
      window.simpleGame.start();
    }
  }
  
  // Apply styling fixes to login page
  function fixLoginStyles() {
    // Make sure the triforce animation is working
    const triforceContainer = document.querySelector('.triforce-container');
    if (triforceContainer) {
      triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
    }
    
    const triforces = document.querySelectorAll('.triforce');
    triforces.forEach(t => {
      t.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
    });
    
    // Fix sound wave
    const soundWave = document.getElementById('sound-wave');
    if (soundWave) {
      // Initially no animation, will be triggered on login
      soundWave.style.animation = 'none';
    }
    
    // Make sure login panel floating animation works
    const loginPanel = document.getElementById('login-panel');
    if (loginPanel) {
      loginPanel.style.animation = 'float 3s ease-in-out infinite';
    }
    
    // Fix login screen positioning
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.style.justifyContent = 'center';
      loginScreen.style.alignItems = 'center';
      loginScreen.style.height = '100vh';
      loginScreen.style.width = '100vw';
      loginScreen.style.position = 'fixed';
      loginScreen.style.top = '0';
      loginScreen.style.left = '0';
      loginScreen.style.zIndex = '9999';
    }
  }
});
