/**
 * login-fix.js - Critical fixes for Relay World login
 */

// Execute immediately to avoid any delays
(function() {
  console.log('[LoginFix] Applying critical login fixes...');
  
  // Fix login styling immediately
  fixLoginStyling();
  
  // Handle login button clicks directly
  setupLoginButtons();
  
  // Create toast container
  createToastContainer();
  
  // Make sure we run after DOM is fully loaded too
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[LoginFix] DOM loaded, ensuring fixes are applied...');
    fixLoginStyling();
    setupLoginButtons();
  });
  
  /**
   * Fix login styling issues
   */
  function fixLoginStyling() {
    // Login screen fixes
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.style.position = 'fixed';
      loginScreen.style.top = '0';
      loginScreen.style.left = '0';
      loginScreen.style.width = '100%';
      loginScreen.style.height = '100%';
      loginScreen.style.display = 'flex';
      loginScreen.style.flexDirection = 'column';
      loginScreen.style.justifyContent = 'center';
      loginScreen.style.alignItems = 'center';
      loginScreen.style.zIndex = '9999';
      console.log('[LoginFix] Fixed login screen styling');
    }
    
    // Login panel fixes
    const loginPanel = document.getElementById('login-panel');
    if (loginPanel) {
      loginPanel.style.animation = 'float 3s ease-in-out infinite';
      loginPanel.style.display = 'flex';
      loginPanel.style.flexDirection = 'column';
      loginPanel.style.alignItems = 'center'; 
      loginPanel.style.maxWidth = '90%';
      loginPanel.style.width = '500px';

      // Add animation keyframes if they don't exist
      if (!document.getElementById('login-animations')) {
        const style = document.createElement('style');
        style.id = 'login-animations';
        style.textContent = `
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
        document.head.appendChild(style);
        console.log('[LoginFix] Added login animation keyframes');
      }
    }
    
    // Triforce container fixes
    const triforceContainer = document.querySelector('.triforce-container');
    if (triforceContainer) {
      triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
    }
    
    // Triforce elements fixes
    const triforces = document.querySelectorAll('.triforce');
    triforces.forEach(t => {
      t.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
    });
    
    // Login options fixes
    const loginOptions = document.getElementById('login-options');
    if (loginOptions) {
      loginOptions.style.width = '100%';
      loginOptions.style.margin = '20px 0';
      loginOptions.style.display = 'flex';
      loginOptions.style.flexDirection = 'column';
      loginOptions.style.gap = '15px';
    }
    
    // Button styling fixes
    const buttons = document.querySelectorAll('#login-options button');
    buttons.forEach(button => {
      button.style.cursor = 'pointer';
      button.style.width = '100%';
      button.style.fontFamily = "'Press Start 2P', system-ui, sans-serif";
    });
    
    console.log('[LoginFix] Login styling fixed');
  }
  
  /**
   * Set up login buttons to be clickable
   */
  function setupLoginButtons() {
    // Fix Nostr login button
    const loginButton = document.getElementById('login-button');
    if (loginButton && !loginButton._hasClickHandler) {
      loginButton._hasClickHandler = true;
      loginButton.addEventListener('click', function handleNostrLogin() {
        console.log('[LoginFix] Nostr login button clicked');
        if (loginButton.disabled) return;
        
        loginButton.disabled = true;
        const loginLoader = document.getElementById('login-loader');
        const loginStatus = document.getElementById('login-status');
        
        if (loginLoader) loginLoader.classList.remove('hide');
        if (loginStatus) loginStatus.textContent = 'Looking for Nostr extension...';
        
        // Check for nostr extension
        if (!window.nostr) {
          showToast('Nostr extension not found. Please install a NIP-07 extension like Alby or nos2x.', 'error');
          if (loginStatus) loginStatus.textContent = 'Nostr extension not found';
          if (loginLoader) loginLoader.classList.add('hide');
          loginButton.disabled = false;
          return;
        }
        
        // Try to get public key
        if (loginStatus) loginStatus.textContent = 'Requesting pubkey...';
        
        try {
          window.nostr.getPublicKey().then(pubkey => {
            if (!pubkey) {
              if (loginStatus) loginStatus.textContent = 'No pubkey returned';
              if (loginLoader) loginLoader.classList.add('hide');
              loginButton.disabled = false;
              return;
            }
            
            if (loginStatus) loginStatus.textContent = 'Got pubkey, logging in...';
            
            // Animate sound wave
            const soundWave = document.getElementById('sound-wave');
            if (soundWave) {
              soundWave.style.animation = 'sound-wave 4s ease-out infinite';
            }
            
            // Hide login screen after a delay
            setTimeout(() => {
              // Hide login screen
              const loginScreen = document.getElementById('login-screen');
              if (loginScreen) {
                loginScreen.style.opacity = '0';
                loginScreen.style.transition = 'opacity 0.5s ease';
                
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
              
              showToast('Login successful!', 'success');
            }, 1500);
            
          }).catch(error => {
            console.error('Nostr login failed:', error);
            if (loginStatus) loginStatus.textContent = 'Login failed: ' + error.message;
            if (loginLoader) loginLoader.classList.add('hide');
            loginButton.disabled = false;
          });
        } catch (error) {
          console.error('Nostr login error:', error);
          if (loginStatus) loginStatus.textContent = 'Login error: ' + error.message;
          if (loginLoader) loginLoader.classList.add('hide');
          loginButton.disabled = false;
        }
      });
      console.log('[LoginFix] Added Nostr login button handler');
    }
    
    // Fix Guest login button
    const guestLoginButton = document.getElementById('guest-login-button');
    if (guestLoginButton && !guestLoginButton._hasClickHandler) {
      guestLoginButton._hasClickHandler = true;
      guestLoginButton.addEventListener('click', function handleGuestLogin() {
        console.log('[LoginFix] Guest login button clicked');
        if (guestLoginButton.disabled) return;
        
        showUsernameDialog(username => {
          if (!username) return; // User canceled
          
          guestLoginButton.disabled = true;
          const loginLoader = document.getElementById('login-loader');
          const loginStatus = document.getElementById('login-status');
          
          if (loginLoader) loginLoader.classList.remove('hide');
          if (loginStatus) loginStatus.textContent = 'Setting up guest account...';
          
          // Animate sound wave
          const soundWave = document.getElementById('sound-wave');
          if (soundWave) {
            soundWave.style.animation = 'sound-wave 4s ease-out infinite';
          }
          
          // Generate a guest ID
          const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
          
          // Hide login screen after delay
          setTimeout(() => {
            // Hide login screen
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) {
              loginScreen.style.opacity = '0';
              loginScreen.style.transition = 'opacity 0.5s ease';
              
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
            
            showToast(`Welcome, ${username}!`, 'success');
            
            guestLoginButton.disabled = false;
            if (loginLoader) loginLoader.classList.add('hide');
          }, 1500);
        });
      });
      console.log('[LoginFix] Added guest login button handler');
    }
  }
  
  /**
   * Create a toast notification container
   */
  function createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.top = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '10000';
      document.body.appendChild(toastContainer);
      
      // Add toast styles
      const style = document.createElement('style');
      style.textContent = `
        #toast-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          pointer-events: none;
        }
        .toast {
          background-color: var(--color-light, #8bac0f);
          color: var(--color-dark, #0f380f);
          padding: 12px 16px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          max-width: 300px;
          animation: toast-in 0.3s, toast-out 0.5s 2.5s forwards;
        }
        .toast.success {
          background-color: var(--color-very-light, #e0f8d0);
          border-left: 4px solid var(--color-success, #10B981);
        }
        .toast.error {
          background-color: #fdd;
          border-left: 4px solid var(--color-danger, #cf6679);
        }
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-out {
          from { opacity: 1; }
          to { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
      console.log('[LoginFix] Created toast container');
    }
  }
  
  /**
   * Show username dialog for guest login
   * @param {Function} callback - Called with username when submitted
   */
  function showUsernameDialog(callback) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'var(--color-light, #8bac0f)';
    dialog.style.border = '8px solid var(--color-medium, #306230)';
    dialog.style.padding = '24px';
    dialog.style.maxWidth = '90%';
    dialog.style.width = '400px';
    dialog.style.boxShadow = '0 0 0 4px var(--color-dark, #0f380f), 8px 8px 0 rgba(0,0,0,0.5)';
    
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
        <button id="username-submit" style="flex: 1; padding: 10px; background-color: var(--color-primary, #8bac0f); 
                color: var(--color-dark, #0f380f); border: 3px solid var(--color-dark, #0f380f); 
                cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Continue</button>
        
        <button id="username-cancel" style="flex: 1; padding: 10px; background-color: var(--color-medium, #306230);
                color: white; border: 3px solid var(--color-dark, #0f380f); 
                cursor: pointer; font-family: 'Press Start 2P', system-ui, sans-serif;">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus the input
    const input = document.getElementById('guest-username-input');
    setTimeout(() => input?.focus(), 100);
    
    // Set up handlers
    const submitButton = document.getElementById('username-submit');
    const cancelButton = document.getElementById('username-cancel');
    const errorMsg = document.getElementById('username-error');
    
    const validateInput = () => {
      if (!input) return false;
      
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
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - 'info', 'success', or 'error'
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove after animation completes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }
  
  // Export functions for use by other scripts
  window.LoginFix = {
    showToast,
    showUsernameDialog
  };
  
  console.log('[LoginFix] Login fixes applied');
})();
