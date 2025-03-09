/**
 * proper-login.js
 * Enhanced login script with guest support and profile data handling
 */

document.addEventListener('DOMContentLoaded', function() {
  // Apply styling fixes
  fixLoginStyles();
  
  // Fix the CryptoUtils error by preloading CryptoJS if it's not already available
  if (typeof CryptoJS === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
    document.head.appendChild(script);
  }
  
  // Check and ensure there's only one guest login button
  const existingGuestButton = document.getElementById('guest-login-button');
  const loginButton = document.getElementById('login-button');
  
  if (!existingGuestButton && loginButton && loginButton.parentNode) {
    // Create guest login button only if it doesn't exist
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
  
  // Set default explorer relay
  setDefaultExplorerRelay();
});

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
        throw new Error('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.');
      }
      
      if (loginStatus) loginStatus.textContent = 'Extension found! Requesting pubkey...';
      const pubkey = await window.nostr.getPublicKey();
      
      if (!pubkey) {
        throw new Error('No pubkey returned from extension');
      }
      
      if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
      
      // Play sound and animation
      playLoginAnimation();
      
      // Try to login with RelayWorld's auth module
      if (window.RelayWorldCore) {
        const authModule = window.RelayWorldCore.getModule('auth');
        if (authModule && typeof authModule.loginWithNostr === 'function') {
          await authModule.loginWithNostr(pubkey);
          
          // Ensure profile data is loaded
          const nostrModule = window.RelayWorldCore.getModule('nostr');
          if (nostrModule) {
            // Wait a moment for profile to load
            await new Promise(r => setTimeout(r, 1000));
            
            // If profile doesn't exist yet, fetch it explicitly
            if (!nostrModule.currentUser || !nostrModule.currentUser.profile) {
              await nostrModule.fetchProfile(pubkey);
            }
          }
          
          if (loginStatus) loginStatus.textContent = 'Login successful!';
          
          // Hide login screen after a delay
          setTimeout(() => {
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) loginScreen.classList.add('hide');
            
            // Ensure 3D engine has player data
            updatePlayerProfileIn3D(pubkey);
          }, 1500);
        } else {
          // Fallback to manual login
          manualLogin(pubkey);
        }
      } else {
        // No RelayWorldCore, do manual login
        manualLogin(pubkey);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
    } finally {
      if (loginLoader) loginLoader.classList.add('hide');
      loginButton.disabled = false;
    }
  });
}

// Set up guest login
function setupGuestLogin(guestLoginButton) {
  const loginLoader = document.getElementById('login-loader');
  const loginStatus = document.getElementById('login-status');
  
  guestLoginButton.addEventListener('click', async function() {
    guestLoginButton.disabled = true;
    if (loginLoader) loginLoader.classList.remove('hide');
    if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
    
    try {
      // Prompt for username
      const guestName = promptForGuestName();
      
      // Generate a random pubkey for the guest
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
      const pubkey = guestId;
      
      if (loginStatus) loginStatus.textContent = 'Guest account created!';
      
      // Play sound and animation
      playLoginAnimation();
      
      // Create a guest profile
      const guestProfile = {
        name: guestName,
        picture: 'assets/icons/default-avatar.png',
        about: 'Guest user'
      };
      
      // Try to login with RelayWorld's auth module
      if (window.RelayWorldCore) {
        const authModule = window.RelayWorldCore.getModule('auth');
        const nostrModule = window.RelayWorldCore.getModule('nostr');
        
        if (authModule) {
          // Set current user in auth module
          authModule.currentUser = { pubkey };
          
          // Set current user and profile in nostr module
          if (nostrModule) {
            nostrModule.currentUser = { 
              pubkey, 
              profile: guestProfile
            };
            
            // Add to users map
            nostrModule.users.set(pubkey, {
              pubkey,
              profile: guestProfile,
              notes: [],
              createdAt: Math.floor(Date.now() / 1000)
            });
          }
          
          // Notify about login
          if (window.RelayWorldCore.eventBus) {
            window.RelayWorldCore.eventBus.emit('auth:login', { pubkey });
          }
          
          const uiModule = window.RelayWorldCore.getModule('ui');
          if (uiModule) {
            // Show game UI
            uiModule.hideLoginScreen();
            uiModule.showGameUI();
            uiModule.updatePlayerProfile();
          }
        } else {
          // Fallback to manual login
          manualGuestLogin(pubkey, guestProfile);
        }
      } else {
        // No RelayWorldCore, do manual login
        manualGuestLogin(pubkey, guestProfile);
      }
      
      // Ensure 3D mode is activated
      if (window.RelayWorld3D) {
        setTimeout(() => {
          if (!window.RelayWorld3D.players.has(pubkey)) {
            window.RelayWorld3D.addPlayer(pubkey, {
              name: guestName,
              picture: 'assets/icons/default-avatar.png'
            });
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('Guest login error:', error);
      if (loginStatus) loginStatus.textContent = 'Guest login failed: ' + error.message;
    } finally {
      if (loginLoader) loginLoader.classList.add('hide');
      guestLoginButton.disabled = false;
    }
  });
}

// Prompt for guest name with validation
function promptForGuestName() {
  let guestName = '';
  
  while (!guestName || guestName.length < 3 || guestName.length > 20) {
    guestName = prompt('Enter your guest username (3-20 characters):', 'Guest' + Math.floor(Math.random() * 1000));
    
    if (guestName === null) {
      // User clicked cancel, provide a default name
      guestName = 'Guest' + Math.floor(Math.random() * 1000);
      break;
    }
    
    if (guestName.length < 3) {
      alert('Username must be at least 3 characters long.');
    } else if (guestName.length > 20) {
      alert('Username must be at most 20 characters long.');
    }
  }
  
  return guestName;
}

// Fallback manual login for Nostr users
function manualLogin(pubkey) {
  // Hide login screen
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.style.opacity = "0";
    setTimeout(() => loginScreen.classList.add('hide'), 1000);
  }
  
  // Show game UI
  document.getElementById('top-bar')?.classList.remove('hide');
  document.getElementById('chat-container')?.classList.remove('hide');
  document.getElementById('player-profile')?.classList.remove('hide');
  
  // Add the player's pubkey to the profile
  const npubEl = document.getElementById('player-profile-npub');
  const nameEl = document.getElementById('player-profile-name');
  
  if (npubEl) npubEl.textContent = pubkey.substring(0, 8);
  if (nameEl) nameEl.textContent = `User ${pubkey.substring(0, 8)}`;
  
  // Call getProfile to try to fetch profile data
  getProfileData(pubkey).then(profile => {
    if (profile && nameEl) {
      nameEl.textContent = profile.name || `User ${pubkey.substring(0, 8)}`;
      
      // Update profile image
      const profileImg = document.getElementById('player-profile-image');
      if (profileImg && profile.picture) {
        profileImg.src = profile.picture;
      }
      
      // Update 3D model
      updatePlayerProfileIn3D(pubkey, profile);
    }
  });
}

// Fallback manual login for guests
function manualGuestLogin(pubkey, profile) {
  // Hide login screen
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.style.opacity = "0";
    setTimeout(() => loginScreen.classList.add('hide'), 1000);
  }
  
  // Show game UI
  document.getElementById('top-bar')?.classList.remove('hide');
  document.getElementById('chat-container')?.classList.remove('hide');
  document.getElementById('player-profile')?.classList.remove('hide');
  
  // Update profile display
  const npubEl = document.getElementById('player-profile-npub');
  const nameEl = document.getElementById('player-profile-name');
  const profileImg = document.getElementById('player-profile-image');
  
  if (npubEl) npubEl.textContent = 'Guest';
  if (nameEl) nameEl.textContent = profile.name;
  if (profileImg) profileImg.src = profile.picture;
  
  // Update 3D model
  updatePlayerProfileIn3D(pubkey, profile);
}

// Get profile data from nostr or local storage
async function getProfileData(pubkey) {
  // Try to fetch from nostr
  if (window.nostr) {
    try {
      // Create a basic relay connection
      const relayUrl = "wss://relay.damus.io";
      const ws = new WebSocket(relayUrl);
      
      // Set up a promise to wait for connection
      const connectPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
      
      // Wait for connection
      await connectPromise;
      
      // Create a subscription ID
      const subId = "profile-" + Math.random().toString(36).substring(2, 10);
      
      // Subscribe to profile events
      ws.send(JSON.stringify([
        "REQ",
        subId,
        {
          authors: [pubkey],
          kinds: [0],
          limit: 1
        }
      ]));
      
      // Wait for response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(null); // Return null if timeout
        }, 5000);
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message[0] === "EVENT" && message[1] === subId && message[2].kind === 0) {
              const profile = JSON.parse(message[2].content);
              clearTimeout(timeout);
              ws.close();
              resolve(profile);
            }
          } catch (error) {
            console.error("Error parsing profile:", error);
          }
        };
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }
  
  return null;
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

// Update player profile in 3D engine
function updatePlayerProfileIn3D(pubkey, profileData = null) {
  if (!window.RelayWorld3D) return;
  
  // Wait a moment to ensure 3D engine is initialized
  setTimeout(() => {
    if (!window.RelayWorld3D.initialized) {
      window.RelayWorld3D.init();
    }
    
    // Get profile data from RelayWorld if possible
    if (!profileData && window.RelayWorldCore) {
      const nostrModule = window.RelayWorldCore.getModule('nostr');
      if (nostrModule && nostrModule.currentUser && nostrModule.currentUser.profile) {
        profileData = nostrModule.currentUser.profile;
      }
    }
    
    // Set up player data
    const playerData = {
      name: profileData?.name || document.getElementById('player-profile-name')?.textContent || pubkey.substring(0, 8),
      picture: profileData?.picture || document.getElementById('player-profile-image')?.src || 'assets/icons/default-avatar.png'
    };
    
    // Remove existing player if any
    if (window.RelayWorld3D.players.has(pubkey)) {
      window.RelayWorld3D.removePlayer(pubkey);
    }
    
    // Add player with updated profile
    window.RelayWorld3D.addPlayer(pubkey, playerData);
  }, 1000);
}

// Set default explorer relay to damus.io
function setDefaultExplorerRelay() {
  // Wait for RelayWorld to initialize
  const checkRelayWorld = setInterval(() => {
    if (window.RelayWorldCore) {
      clearInterval(checkRelayWorld);
      
      // Set default explorer relay
      window.RelayWorldCore.setConfig('EXPLORER_RELAYS', ["wss://relay.damus.io"]);
      
      // Set active explorer relay
      const nostrModule = window.RelayWorldCore.getModule('nostr');
      if (nostrModule) {
        nostrModule.activeExplorerRelay = "wss://relay.damus.io";
        
        // Connect to explorer relay if not already connected
        if (!nostrModule.relayConnections.explorers.has("wss://relay.damus.io")) {
          setTimeout(() => {
            nostrModule.connectToExplorerRelay("wss://relay.damus.io");
          }, 2000);
        }
      }
      
      // Update UI selector
      const relaySelector = document.getElementById('relay-selector');
      if (relaySelector) {
        // Clear existing options
        relaySelector.innerHTML = '';
        
        // Add default option
        const option = document.createElement('option');
        option.value = "wss://relay.damus.io";
        option.textContent = "relay.damus.io";
        option.selected = true;
        relaySelector.appendChild(option);
        
        // Enable add relay button
        const addRelayButton = document.getElementById('add-relay-button');
        const customRelayInput = document.getElementById('custom-relay-input');
        
        if (addRelayButton && customRelayInput) {
          addRelayButton.addEventListener('click', () => {
            const relayUrl = customRelayInput.value.trim();
            if (relayUrl) {
              // Ensure protocol
              let url = relayUrl;
              if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
                url = 'wss://' + url;
              }
              
              // Add to explorer relays
              if (nostrModule && typeof nostrModule.connectToExplorerRelay === 'function') {
                nostrModule.connectToExplorerRelay(url).then(() => {
                  // Add to dropdown
                  const option = document.createElement('option');
                  option.value = url;
                  option.textContent = url.replace('wss://', '');
                  relaySelector.appendChild(option);
                  
                  // Clear input
                  customRelayInput.value = '';
                  
                  // Show toast
                  showToast(`Added explorer relay: ${url}`, 'success');
                }).catch(error => {
                  showToast(`Failed to connect to relay: ${error.message}`, 'error');
                });
              }
            }
          });
        }
      }
    }
  }, 500);
  
  // Clear interval after 10 seconds
  setTimeout(() => clearInterval(checkRelayWorld), 10000);
}

// Show a toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
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
