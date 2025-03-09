/**
 * improved-login.js
 * Enhanced login functionality for Relay World
 */

// Wait for page load
document.addEventListener('DOMContentLoaded', function() {
  // Create toast container if it doesn't exist
  createToastContainer();
  
  // Fix the login animations
  fixLoginAnimations();
  
  // Set up login buttons
  setupLoginButtons();
  
  // Initialize 3D engine if available
  initializeGame();
});

// Create toast container
function createToastContainer() {
  if (!document.getElementById('toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '10000';
    document.body.appendChild(toastContainer);
    
    // Add toast animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      .toast {
        background-color: #f0f0f0;
        color: #333;
        padding: 12px;
        margin: 10px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 300px;
        position: relative;
        animation: slideIn 0.3s, fadeOut 0.5s 2.5s;
        border-left: 4px solid #5555ff;
      }
      .toast.success {
        background-color: #ccffcc;
        border-left: 4px solid #55cc55;
      }
      .toast.error {
        background-color: #ffcccc;
        border-left: 4px solid #ff5555;
      }
    `;
    document.head.appendChild(style);
  }
}

// Fix login animations
function fixLoginAnimations() {
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
  
  // Ensure animation keyframes are defined
  const animationStyle = document.createElement('style');
  animationStyle.textContent = `
    @keyframes float {
      0% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0); }
    }
    
    @keyframes triforce-spin {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(360deg); }
    }
    
    @keyframes triforce-pulse {
      0% { opacity: 0.8; }
      100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.9)); }
    }
    
    @keyframes sound-wave {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    }
  `;
  document.head.appendChild(animationStyle);
}

// Set up login buttons
function setupLoginButtons() {
  // Check and ensure there's a guest login button
  const existingGuestButton = document.getElementById('guest-login-button');
  const loginButton = document.getElementById('login-button');
  
  if (!existingGuestButton && loginButton && loginButton.parentNode) {
    // Create guest login button
    const guestLoginButton = document.createElement('button');
    guestLoginButton.id = 'guest-login-button';
    guestLoginButton.className = 'secondary-button';
    guestLoginButton.textContent = 'PLAY AS GUEST';
    
    // Insert after the main login button
    loginButton.parentNode.insertBefore(guestLoginButton, loginButton.nextSibling);
    
    // Set up guest login
    setupGuestLogin(guestLoginButton);
  } else if (existingGuestButton) {
    // If the button already exists, just set up its logic
    setupGuestLogin(existingGuestButton);
  }
  
  // Set up regular login button
  if (loginButton) {
    setupNostrLogin(loginButton);
  }
}

// Set up Nostr login
function setupNostrLogin(loginButton) {
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  loginButton.addEventListener('click', async function() {
    loginButton.disabled = true;
    if (loginLoader) loginLoader.classList.remove('hide');
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
        showToast('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.', 'error');
        throw new Error('Nostr extension not found');
      }
      
      if (loginStatus) loginStatus.textContent = 'Extension found! Requesting pubkey...';
      const pubkey = await window.nostr.getPublicKey();
      
      if (!pubkey) {
        throw new Error('No pubkey returned from extension');
      }
      
      if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
      
      // Play login animation
      const soundWave = document.getElementById('sound-wave');
      if (soundWave) {
        soundWave.style.animation = 'sound-wave 4s ease-out infinite';
      }
      
      // Hide login screen after a delay
      setTimeout(() => {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
          loginScreen.style.opacity = '0';
          loginScreen.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            loginScreen.classList.add('hide');
            loginScreen.style.opacity = '1';
          }, 500);
        }
        
        // Show game UI
        document.getElementById('top-bar')?.classList.remove('hide');
        document.getElementById('chat-container')?.classList.remove('hide');
        document.getElementById('player-profile')?.classList.remove('hide');
        document.getElementById('leaderboard-container')?.classList.remove('hide');
        
        // Set player profile info
        const nameEl = document.getElementById('player-profile-name');
        const npubEl = document.getElementById('player-profile-npub');
        
        if (nameEl) nameEl.textContent = `User ${pubkey.substring(0, 8)}`;
        if (npubEl) npubEl.textContent = pubkey.substring(0, 8);
        
        showToast('Login successful! Welcome to Relay World!', 'success');
        
        // Initialize game if needed
        initializeGameWithPlayer(pubkey);
      }, 1500);
    } catch (error) {
      console.error('Login error:', error);
      if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
      showToast('Login failed: ' + error.message, 'error');
    } finally {
      if (loginLoader) loginLoader.classList.add('hide');
      loginButton.disabled = false;
    }
  });
}

// Set up guest login with improved UI
function setupGuestLogin(guestLoginButton) {
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  guestLoginButton.addEventListener('click', function() {
    // Create modern username input dialog
    createUsernameDialog(username => {
      if (!username) return; // User canceled
      
      guestLoginButton.disabled = true;
      if (loginLoader) loginLoader.classList.remove('hide');
      if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
      
      // Generate a random guest ID
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
      
      // Play animation
      const soundWave = document.getElementById('sound-wave');
      if (soundWave) {
        soundWave.style.animation = 'sound-wave 4s ease-out infinite';
      }
      
      // Hide login screen after a delay
      setTimeout(() => {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
          loginScreen.style.opacity = '0';
          loginScreen.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            loginScreen.classList.add('hide');
            loginScreen.style.opacity = '1';
          }, 500);
        }
        
        // Show game UI
        document.getElementById('top-bar')?.classList.remove('hide');
        document.getElementById('chat-container')?.classList.remove('hide');
        document.getElementById('player-profile')?.classList.remove('hide');
        document.getElementById('leaderboard-container')?.classList.remove('hide');
        
        // Set player profile info
        const nameEl = document.getElementById('player-profile-name');
        const npubEl = document.getElementById('player-profile-npub');
        const profileImg = document.getElementById('player-profile-image');
        
        if (nameEl) nameEl.textContent = username;
        if (npubEl) npubEl.textContent = 'Guest';
        if (profileImg) profileImg.src = 'assets/icons/default-avatar.png';
        
        showToast(`Welcome, ${username}! You are playing as a guest.`, 'success');
        
        if (loginLoader) loginLoader.classList.add('hide');
        guestLoginButton.disabled = false;
        
        // Initialize game with guest profile
        initializeGameWithPlayer(guestId, {
          name: username,
          picture: 'assets/icons/default-avatar.png',
          isGuest: true
        });
      }, 1000);
    });
  });
}

// Create a modern username input dialog
function createUsernameDialog(callback) {
  // Create a stylish modal overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '10000';
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = 'var(--color-light)';
  dialog.style.border = '8px solid var(--color-medium)';
  dialog.style.padding = '24px';
  dialog.style.maxWidth = '90%';
  dialog.style.width = '400px';
  dialog.style.boxShadow = '0 0 0 4px var(--color-dark), 8px 8px 0 0 rgba(0,0,0,0.5)';
  dialog.style.position = 'relative';
  
  // Add heading
  const heading = document.createElement('h2');
  heading.textContent = 'Enter Your Guest Username';
  heading.style.color = 'var(--color-dark)';
  heading.style.marginBottom = '20px';
  heading.style.textAlign = 'center';
  
  // Add input field
  const inputContainer = document.createElement('div');
  inputContainer.style.marginBottom = '20px';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Username (3-20 characters)';
  input.value = 'Guest' + Math.floor(Math.random() * 1000);
  input.style.width = '100%';
  input.style.padding = '12px';
  input.style.boxSizing = 'border-box';
  input.style.border = '2px solid var(--color-dark)';
  input.style.fontSize = '16px';
  
  // Add error message area
  const errorMsg = document.createElement('div');
  errorMsg.style.color = 'var(--color-danger)';
  errorMsg.style.fontSize = '14px';
  errorMsg.style.marginTop = '5px';
  errorMsg.style.visibility = 'hidden';
  errorMsg.textContent = 'Username must be 3-20 characters';
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(errorMsg);
  
  // Add buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '10px';
  
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Continue';
  submitButton.className = 'primary-button';
  submitButton.style.flex = '1';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'secondary-button';
  cancelButton.style.flex = '1';
  
  buttonsContainer.appendChild(submitButton);
  buttonsContainer.appendChild(cancelButton);
  
  // Assemble dialog
  dialog.appendChild(heading);
  dialog.appendChild(inputContainer);
  dialog.appendChild(buttonsContainer);
  overlay.appendChild(dialog);
  
  // Add to document
  document.body.appendChild(overlay);
  
  // Focus input
  setTimeout(() => input.focus(), 100);
  
  // Handle input validation
  const validateInput = () => {
    const value = input.value.trim();
    if (value.length < 3 || value.length > 20) {
      errorMsg.style.visibility = 'visible';
      return false;
    } else {
      errorMsg.style.visibility = 'hidden';
      return true;
    }
  };
  
  // Handle submit
  const handleSubmit = () => {
    if (validateInput()) {
      const username = input.value.trim();
      document.body.removeChild(overlay);
      callback(username);
    }
  };
  
  // Submit when Enter key is pressed
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  });
  
  // Handle cancel
  const handleCancel = () => {
    document.body.removeChild(overlay);
    callback(null);
  };
  
  // Attach event listeners
  submitButton.addEventListener('click', handleSubmit);
  cancelButton.addEventListener('click', handleCancel);
  
  // Close when clicking outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleCancel();
    }
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = message;
  
  // Add to container
  container.appendChild(toast);
  
  // Remove after animation completes
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Initialize game engine
function initializeGame() {
  // Wait for RelayWorld3D or other game modules to be available
  setTimeout(() => {
    if (window.RelayWorld3D && !window.RelayWorld3D.initialized) {
      window.RelayWorld3D.init().then(() => {
        console.log("[Improved Login] 3D engine initialized");
      }).catch(error => {
        console.error("[Improved Login] Failed to initialize 3D engine:", error);
      });
    }
  }, 1000);
}

// Initialize game with a specific player
function initializeGameWithPlayer(pubkey, playerData) {
  // Wait for RelayWorld3D to be available
  const maxAttempts = 20;
  let attempts = 0;
  
  const checkAndInitialize = () => {
    if (window.RelayWorld3D) {
      if (!window.RelayWorld3D.initialized) {
        window.RelayWorld3D.init().then(() => {
          addPlayerToGame(pubkey, playerData);
        });
      } else {
        addPlayerToGame(pubkey, playerData);
      }
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(checkAndInitialize, 300);
    }
  };
  
  checkAndInitialize();
}

// Add a player to the game
function addPlayerToGame(pubkey, playerData) {
  if (!window.RelayWorld3D || !window.RelayWorld3D.addPlayer) return;
  
  // Create default data if not provided
  if (!playerData) {
    playerData = {
      name: `User ${pubkey.substring(0, 8)}`,
      picture: 'assets/icons/default-avatar.png'
    };
  }
  
  // Add player to the game world
  try {
    window.RelayWorld3D.addPlayer(pubkey, playerData);
    console.log(`[Improved Login] Added player ${playerData.name} to the game`);
    
    // Spawn collectibles if none exist
    if (window.RelayWorld3D.collectibles.length === 0) {
      window.RelayWorld3D.spawnRandomCollectibles(30);
    }
  } catch (error) {
    console.error("[Improved Login] Failed to add player to game:", error);
  }
}
