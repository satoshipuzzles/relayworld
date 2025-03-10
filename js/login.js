/**
 * login.js
 * Consolidated login functionality for Relay World
 */

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Login] Initializing login system...');
  
  // Create toast container if it doesn't exist
  setupToastContainer();
  
  // Fix animations
  setupAnimations();
  
  // Set up login buttons
  setupLoginButtons();
  
  // Ensure THREE.js is loaded
  ensureThreeJsLoaded();
});

/**
 * Set up the toast notification container
 */
function setupToastContainer() {
  if (!document.getElementById('toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Add CSS for toast notifications
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
      #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none;
      }
      
      .toast {
        background-color: #f0f0f0;
        color: #333;
        padding: 12px 16px;
        margin: 8px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        max-width: 300px;
        animation: toast-slide-in 0.3s, toast-fade-out 0.5s 2.5s forwards;
        border-left: 5px solid #306230;
      }
      
      .toast.success {
        background-color: #e0f8d0;
        border-left: 5px solid #10B981;
      }
      
      .toast.error {
        background-color: #fdd;
        border-left: 5px solid #cf6679;
      }
      
      @keyframes toast-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes toast-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(toastStyle);
  }
}

/**
 * Set up login screen animations
 */
function setupAnimations() {
  // Make sure animation styles are defined
  const animationsExist = document.querySelector('style[data-type="login-animations"]');
  if (!animationsExist) {
    const animationStyle = document.createElement('style');
    animationStyle.setAttribute('data-type', 'login-animations');
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
  
  // Apply animations to elements
  const loginPanel = document.getElementById('login-panel');
  if (loginPanel) {
    loginPanel.style.animation = 'float 3s ease-in-out infinite';
  }
  
  const triforceContainer = document.querySelector('.triforce-container');
  if (triforceContainer) {
    triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
  }
  
  const triforces = document.querySelectorAll('.triforce');
  triforces.forEach(t => {
    t.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
  });
  
  // Position login screen correctly
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    loginScreen.style.justifyContent = 'center';
    loginScreen.style.alignItems = 'center';
  }
  
  // Reset sound wave (will be animated on login)
  const soundWave = document.getElementById('sound-wave');
  if (soundWave) {
    soundWave.style.animation = 'none';
  }
}

/**
 * Set up login buttons and their event handlers
 */
function setupLoginButtons() {
  // Set up Nostr login button
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', handleNostrLogin);
  }
  
  // Set up or create Guest login button
  const guestLoginButton = document.getElementById('guest-login-button');
  if (!guestLoginButton && loginButton && loginButton.parentNode) {
    // Create guest login button if it doesn't exist
    const newGuestButton = document.createElement('button');
    newGuestButton.id = 'guest-login-button';
    newGuestButton.className = 'secondary-button';
    newGuestButton.textContent = 'PLAY AS GUEST';
    
    // Insert it after the main login button
    loginButton.parentNode.insertBefore(newGuestButton, loginButton.nextSibling);
    
    // Add click handler
    newGuestButton.addEventListener('click', handleGuestLogin);
  } else if (guestLoginButton) {
    // Add click handler to existing button
    guestLoginButton.addEventListener('click', handleGuestLogin);
  }
}

/**
 * Handle Nostr login process
 */
async function handleNostrLogin() {
  const loginButton = document.getElementById('login-button');
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  if (loginButton) loginButton.disabled = true;
  if (loginLoader) loginLoader.classList.remove('hide');
  if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
  
  try {
    // Check if window.nostr is available
    if (!window.nostr) {
      showToast('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.', 'error');
      throw new Error('Nostr extension not found');
    }
    
    // Wait for window.nostr to be fully available (some extensions load asynchronously)
    let attempts = 0;
    while (!window.nostr.getPublicKey && attempts < 10) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }
    
    if (!window.nostr.getPublicKey) {
      showToast('Nostr extension not responding. Please try again.', 'error');
      throw new Error('Nostr extension not responding');
    }
    
    if (loginStatus) loginStatus.textContent = 'Extension found! Requesting pubkey...';
    
    // Request public key from extension
    const pubkey = await window.nostr.getPublicKey();
    
    if (!pubkey) {
      showToast('No pubkey returned from extension. Did you deny the request?', 'error');
      throw new Error('No pubkey returned from extension');
    }
    
    if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
    
    // Play login animation
    playLoginAnimation();
    
    // Try using RelayWorldCore auth module if available
    let useAuthModule = false;
    
    if (window.RelayWorldCore && typeof window.RelayWorldCore.getModule === 'function') {
      const authModule = window.RelayWorldCore.getModule('auth');
      if (authModule && typeof authModule.loginWithNostr === 'function') {
        try {
          await authModule.loginWithNostr(pubkey);
          useAuthModule = true;
        } catch (e) {
          console.error('Auth module login failed:', e);
          // Continue with manual login below
        }
      }
    }
    
    // If auth module didn't work, do a manual login
    if (!useAuthModule) {
      // Handle login manually
      await manualLogin(pubkey);
    }
    
    showToast(`Welcome back! You are logged in with Nostr`, 'success');
    
  } catch (error) {
    console.error('Login error:', error);
    if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
    showToast('Login failed: ' + error.message, 'error');
  } finally {
    if (loginLoader) loginLoader.classList.add('hide');
    if (loginButton) loginButton.disabled = false;
  }
}

/**
 * Handle Guest login process
 */
function handleGuestLogin() {
  // Show name input dialog
  showUsernameDialog(username => {
    if (!username) return; // User canceled
    
    const guestLoginButton = document.getElementById('guest-login-button');
    const loginLoader = document.getElementById('login-loader');
    const loginStatus = document.getElementById('login-status');
    
    if (guestLoginButton) guestLoginButton.disabled = true;
    if (loginLoader) loginLoader.classList.remove('hide');
    if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
    
    // Generate a pseudo-random guest ID
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
    
    // Play login animation
    playLoginAnimation();
    
    // Guest profile data
    const guestProfile = {
      name: username,
      picture: 'assets/icons/default-avatar.png',
      isGuest: true
    };
    
    // Try using RelayWorldCore auth module if available
    let useAuthModule = false;
    
    if (window.RelayWorldCore && typeof window.RelayWorldCore.getModule === 'function') {
      const authModule = window.RelayWorldCore.getModule('auth');
      const nostrModule = window.RelayWorldCore.getModule('nostr');
      
      if (authModule && nostrModule) {
        try {
          // Set user data in modules
          authModule.currentUser = { pubkey: guestId, isGuest: true };
          
          nostrModule.currentUser = { 
            pubkey: guestId, 
            profile: guestProfile,
            isGuest: true
          };
          
          // Add to users map
          if (nostrModule.users && typeof nostrModule.users.set === 'function') {
            nostrModule.users.set(guestId, {
              pubkey: guestId,
              profile: guestProfile,
              isGuest: true,
              createdAt: Math.floor(Date.now() / 1000)
            });
          }
          
          // Notify about login
          if (window.RelayWorldCore.eventBus && typeof window.RelayWorldCore.eventBus.emit === 'function') {
            window.RelayWorldCore.eventBus.emit('auth:login', { pubkey: guestId, isGuest: true });
          }
          
          // Show game UI
          const uiModule = window.RelayWorldCore.getModule('ui');
          if (uiModule) {
            uiModule.hideLoginScreen();
            uiModule.showGameUI();
            uiModule.updatePlayerProfile();
            useAuthModule = true;
          }
        } catch (e) {
          console.error('Auth module guest login failed:', e);
          // Continue with manual login
        }
      }
    }
    
    // If auth module didn't work, do a manual login
    if (!useAuthModule) {
      // Handle login manually
      manualGuestLogin(guestId, guestProfile);
    }
    
    showToast(`Welcome, ${username}! You are playing as a guest`, 'success');
    
    if (loginLoader) loginLoader.classList.add('hide');
    if (guestLoginButton) guestLoginButton.disabled = false;
    
    // Initialize game with this guest
    initializeGameWithPlayer(guestId, guestProfile);
  });
}

/**
 * Show dialog for username input
 * @param {function} callback - Called with username when submitted
 */
function showUsernameDialog(callback) {
  // Create overlay for the dialog
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
  overlay.style.zIndex = '9999';
  
  // Create dialog box
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = 'var(--color-light, #8bac0f)';
  dialog.style.border = '8px solid var(--color-medium, #306230)';
  dialog.style.boxShadow = '0 0 0 4px var(--color-dark, #0f380f), 8px 8px 0 rgba(0,0,0,0.5)';
  dialog.style.padding = '24px';
  dialog.style.maxWidth = '90%';
  dialog.style.width = '400px';
  dialog.style.position = 'relative';
  
  // Create dialog content
  dialog.innerHTML = `
    <h2 style="color: var(--color-dark, #0f380f); margin-bottom: 20px; text-align: center;">Enter Your Guest Username</h2>
    <div style="margin-bottom: 20px;">
      <input type="text" id="guest-username-input" placeholder="Username (3-20 characters)" value="Guest${Math.floor(Math.random() * 1000)}" 
             style="width: 100%; padding: 12px; box-sizing: border-box; border: 2px solid var(--color-dark, #0f380f); font-size: 16px;">
      <div id="username-error" style="color: var(--color-danger, #cf6679); font-size: 14px; margin-top: 5px; visibility: hidden;">
        Username must be 3-20 characters
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="username-submit" class="primary-button" style="flex: 1;">Continue</button>
      <button id="username-cancel" class="secondary-button" style="flex: 1;">Cancel</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Focus on input field
  const input = document.getElementById('guest-username-input');
  setTimeout(() => input && input.focus(), 100);
  
  // Set up event handlers
  const submitButton = document.getElementById('username-submit');
  const cancelButton = document.getElementById('username-cancel');
  const errorMsg = document.getElementById('username-error');
  
  const validateInput = () => {
    const value = input.value.trim();
    const isValid = value.length >= 3 && value.length <= 20;
    
    if (errorMsg) {
      errorMsg.style.visibility = isValid ? 'hidden' : 'visible';
    }
    
    return isValid;
  };
  
  const handleSubmit = () => {
    if (validateInput()) {
      const username = input.value.trim();
      document.body.removeChild(overlay);
      callback(username);
    }
  };
  
  if (submitButton) {
    submitButton.addEventListener('click', handleSubmit);
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
      callback(null);
    });
  }
  
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    });
    
    // Validate on input
    input.addEventListener('input', validateInput);
  }
  
  // Close when clicking outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      callback(null);
    }
  });
}

/**
 * Manual login implementation when RelayWorldCore auth module is not available
 * @param {string} pubkey - The user's public key
 */
async function manualLogin(pubkey) {
  // Hide login screen
  hideLoginScreen();
  
  // Show game UI elements
  showGameUI();
  
  // Update profile display with basic data
  const nameEl = document.getElementById('player-profile-name');
  const npubEl = document.getElementById('player-profile-npub');
  
  if (nameEl) nameEl.textContent = `User ${pubkey.substring(0, 8)}`;
  if (npubEl) npubEl.textContent = pubkey.substring(0, 8);
  
  // Try to fetch profile data
  try {
    const profile = await fetchNostrProfile(pubkey);
    if (profile) {
      // Update UI with profile data
      if (nameEl && profile.name) nameEl.textContent = profile.name;
      
      const profileImg = document.getElementById('player-profile-image');
      if (profileImg && profile.picture) {
        profileImg.src = profile.picture;
      }
      
      // Initialize game with this profile
      initializeGameWithPlayer(pubkey, profile);
    } else {
      // Initialize game with basic info
      initializeGameWithPlayer(pubkey);
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    // Initialize game anyway with basic info
    initializeGameWithPlayer(pubkey);
  }
}

/**
 * Manual guest login implementation when RelayWorldCore auth module is not available
 * @param {string} guestId - Generated guest ID
 * @param {object} profile - Guest profile data
 */
function manualGuestLogin(guestId, profile) {
  // Hide login screen
  hideLoginScreen();
  
  // Show game UI elements
  showGameUI();
  
  // Update profile display
  const nameEl = document.getElementById('player-profile-name');
  const npubEl = document.getElementById('player-profile-npub');
  const profileImg = document.getElementById('player-profile-image');
  
  if (nameEl) nameEl.textContent = profile.name || 'Guest';
  if (npubEl) npubEl.textContent = 'Guest';
  if (profileImg) profileImg.src = profile.picture || 'assets/icons/default-avatar.png';
  
  // Initialize 3D model
  initializeGameWithPlayer(guestId, profile);
}

/**
 * Fetch a user's Nostr profile
 * @param {string} pubkey - Public key to fetch profile for
 * @returns {Promise<object|null>} Profile data or null
 */
async function fetchNostrProfile(pubkey) {
  // Try to use an existing relay connection
  if (window.RelayWorldCore) {
    const nostrModule = window.RelayWorldCore.getModule('nostr');
    if (nostrModule && typeof nostrModule.fetchProfile === 'function') {
      try {
        return await nostrModule.fetchProfile(pubkey);
      } catch (e) {
        console.warn('Failed to fetch profile through nostr module:', e);
        // Fall through to manual method
      }
    }
  }
  
  // Fallback to manual relay connection
  try {
    // Connect to a public relay
    const relayUrl = "wss://relay.damus.io";
    
    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => resolve(null), 5000);
      
      try {
        const ws = new WebSocket(relayUrl);
        
        ws.onopen = () => {
          // Create a subscription for this profile
          const subId = "profile_" + Math.random().toString(36).substring(2, 10);
          ws.send(JSON.stringify([
            "REQ",
            subId,
            {
              kinds: [0],
              authors: [pubkey],
              limit: 1
            }
          ]));
          
          // Set timeout for the whole operation
          const timeout = setTimeout(() => {
            ws.close();
            clearTimeout(connectTimeout);
            resolve(null);
          }, 5000);
          
          // Handle incoming messages
          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              
              if (message[0] === "EVENT" && message[1] === subId && message[2].kind === 0) {
                const profile = JSON.parse(message[2].content);
                clearTimeout(timeout);
                clearTimeout(connectTimeout);
                ws.close();
                resolve(profile);
              } else if (message[0] === "EOSE" && message[1] === subId) {
                // End of stored events
                clearTimeout(timeout);
                clearTimeout(connectTimeout);
                ws.close();
                resolve(null);
              }
            } catch (e) {
              console.error('Error parsing relay message:', e);
            }
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            clearTimeout(connectTimeout);
            resolve(null);
          };
        };
        
        ws.onerror = () => {
          clearTimeout(connectTimeout);
          resolve(null);
        };
      } catch (e) {
        clearTimeout(connectTimeout);
        resolve(null);
      }
    });
  } catch (error) {
    console.error('Error connecting to relay:', error);
    return null;
  }
}

/**
 * Hide the login screen
 */
function hideLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    // Animate the transition
    loginScreen.style.opacity = '0';
    loginScreen.style.transition = 'opacity 0.5s ease';
    
    // Actually hide after animation
    setTimeout(() => {
      loginScreen.classList.add('hide');
      // Reset opacity for next time
      loginScreen.style.opacity = '1';
    }, 500);
  }
}

/**
 * Show game UI elements
 */
function showGameUI() {
  // Show main UI elements
  document.getElementById('top-bar')?.classList.remove('hide');
  document.getElementById('chat-container')?.classList.remove('hide');
  document.getElementById('player-profile')?.classList.remove('hide');
  document.getElementById('leaderboard-container')?.classList.remove('hide');
  
  // Show mobile controls if on mobile
  if (isMobileDevice()) {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.classList.remove('hide');
    }
  }
  
  // Start game if there's a game module
  if (window.RelayWorldCore) {
    const gameModule = window.RelayWorldCore.getModule('game');
    if (gameModule && typeof gameModule.start === 'function' && !gameModule.running) {
      gameModule.start();
    }
  }
}

/**
 * Check if the current device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Play login animation
 */
function playLoginAnimation() {
  // Animate sound wave
  const soundWave = document.getElementById('sound-wave');
  if (soundWave) {
    soundWave.style.animation = 'sound-wave 4s ease-out infinite';
  }
  
  // Play sound effect if available
  try {
    const audio = new Audio('assets/sounds/login.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play audio:', e));
  } catch (e) {
    console.log('Audio not supported');
  }
}

/**
 * Initialize the game with a player
 * @param {string} pubkey - Player's public key
 * @param {object} [profileData] - Optional profile data
 */
function initializeGameWithPlayer(pubkey, profileData) {
  // For 3D mode
  if (window.RelayWorld3D) {
    // Initialize 3D engine if not already initialized
    if (!window.RelayWorld3D.initialized) {
      window.RelayWorld3D.init()
        .then(() => {
          addPlayerToGame(pubkey, profileData);
        })
        .catch(error => {
          console.error('Failed to initialize 3D engine:', error);
          // Try again with delay
          setTimeout(() => {
            if (!window.RelayWorld3D.initialized) {
              window.RelayWorld3D.init()
                .then(() => addPlayerToGame(pubkey, profileData))
                .catch(e => console.error('Second attempt failed:', e));
            } else {
              addPlayerToGame(pubkey, profileData);
            }
          }, 1000);
        });
    } else {
      addPlayerToGame(pubkey, profileData);
    }
  }
}

/**
 * Add player to the 3D game world
 * @param {string} pubkey - Player's public key
 * @param {object} [playerData] - Player profile data
 */
function addPlayerToGame(pubkey, playerData) {
  if (!window.RelayWorld3D || !window.RelayWorld3D.addPlayer) {
    console.log('RelayWorld3D not available or missing addPlayer method');
    return;
  }
  
  // Create default player data if not provided
  const defaultData = {
    name: `User ${pubkey.substring(0, 8)}`,
    picture: 'assets/icons/default-avatar.png'
  };
  
  const data = playerData || defaultData;
  
  try {
    // Add player to game
    window.RelayWorld3D.addPlayer(pubkey, data);
    console.log(`Added player to game: ${data.name}`);
    
    // Spawn collectibles if none exist
    if (window.RelayWorld3D.collectibles && window.RelayWorld3D.collectibles.length === 0) {
      window.RelayWorld3D.spawnRandomCollectibles(30);
    }
  } catch (error) {
    console.error('Failed to add player to game:', error);
    
    // If there was a CapsuleGeometry error, patch the 3D engine
    if (error.message && error.message.includes('CapsuleGeometry')) {
      patchThreeJsGeometry();
      
      // Try again after patching
      setTimeout(() => {
        try {
          window.RelayWorld3D.addPlayer(pubkey, data);
        } catch (e) {
          console.error('Failed to add player after geometry patch:', e);
        }
      }, 500);
    }
  }
}

/**
 * Patch THREE.js to fix CapsuleGeometry issue
 */
function patchThreeJsGeometry() {
  if (typeof THREE !== 'undefined' && !THREE.CapsuleGeometry) {
    // Implement a basic CapsuleGeometry fallback
    THREE.CapsuleGeometry = function(radius, length, capSegments, radialSegments) {
      const geometry = new THREE.CylinderGeometry(
        radius, radius, length, radialSegments, 1, false
      );
      
      // Add spheres at the ends
      const sphereGeom = new THREE.SphereGeometry(
        radius, radialSegments, capSegments, 0, Math.PI * 2, 0, Math.PI / 2
      );
      
      const topSphere = new THREE.Mesh(sphereGeom);
      topSphere.position.y = length / 2;
      
      const bottomSphere = new THREE.Mesh(sphereGeom);
      bottomSphere.position.y = -length / 2;
      bottomSphere.rotation.x = Math.PI;
      
      // Create a single geometry
      const capsule = new THREE.Mesh(geometry);
      
      // Apply transformations
      capsule.updateMatrix();
      topSphere.updateMatrix();
      bottomSphere.updateMatrix();
      
      // Combine geometries
      const result = geometry.clone();
      result.merge(topSphere.geometry, topSphere.matrix);
      result.merge(bottomSphere.geometry, bottomSphere.matrix);
      
      return result;
    };
    
    console.log('Patched THREE.CapsuleGeometry');
  }
}

/**
 * Ensure THREE.js is loaded
 */
function ensureThreeJsLoaded() {
  if (typeof THREE === 'undefined') {
    // Check if the script is already in the page
    const existingScript = document.querySelector('script[src*="three.min.js"]');
    if (!existingScript) {
      console.log('Loading THREE.js library...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
      script.onload = () => {
        console.log('THREE.js loaded');
        // Once loaded, fix CapsuleGeometry
        patchThreeJsGeometry();
      };
      document.head.appendChild(script);
    }
  } else {
    // THREE is available but might be missing CapsuleGeometry
    patchThreeJsGeometry();
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} [type] - Notification type (info, success, error)
 */
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
