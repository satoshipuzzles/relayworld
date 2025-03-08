/**
 * login-fix.js
 * Fix for Relay World login screen styling and functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Fix the login screen styling
  const loginScreen = document.getElementById('login-screen');
  const loginPanel = document.getElementById('login-panel');
  
  if (loginScreen) {
    // Ensure proper styling for login screen
    loginScreen.style.display = 'flex';
    loginScreen.style.justifyContent = 'center';
    loginScreen.style.alignItems = 'center';
    loginScreen.style.height = '100vh';
    loginScreen.style.width = '100vw';
    loginScreen.style.position = 'fixed';
    loginScreen.style.top = '0';
    loginScreen.style.left = '0';
    loginScreen.style.zIndex = '1000';
    
    // Add animation class if not already present
    if (!loginPanel.classList.contains('animated')) {
      loginPanel.classList.add('animated');
    }
  }
  
  // Activate the sound wave animation
  const soundWave = document.getElementById('sound-wave');
  if (soundWave) {
    soundWave.style.animation = 'sound-wave 4s ease-out infinite';
  }
  
  // Add triforce animation if not already working
  const triforceContainer = document.querySelector('.triforce-container');
  if (triforceContainer) {
    triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
  }
  
  // Make triforce elements animate
  const triforceElements = document.querySelectorAll('.triforce');
  triforceElements.forEach(element => {
    element.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
  });
  
  // Fix login button functionality
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', function() {
      // Show loader
      const loader = document.getElementById('login-loader');
      if (loader) {
        loader.classList.remove('hide');
      }
      
      // Show status message
      const loginStatus = document.getElementById('login-status');
      if (loginStatus) {
        loginStatus.textContent = 'Connecting to Nostr...';
      }
      
      // Check if window.nostr is available (NIP-07 extension)
      if (!window.nostr) {
        if (loginStatus) {
          loginStatus.textContent = 'Nostr extension not found. Please install a Nostr extension like nos2x or Alby.';
        }
        if (loader) {
          loader.classList.add('hide');
        }
        return;
      }
      
      // Try to get public key
      try {
        window.nostr.getPublicKey().then(function(pubkey) {
          if (loginStatus) {
            loginStatus.textContent = 'Successfully connected: ' + pubkey.substring(0, 10) + '...';
          }
          
          // Show login extras
          const loginExtras = document.querySelector('.login-extras');
          if (loginExtras) {
            loginExtras.classList.remove('hide');
          }
          
          // Hide loader
          if (loader) {
            loader.classList.add('hide');
          }
          
          // Trigger the login event (for other modules to handle)
          const loginEvent = new CustomEvent('relay-world:login', { 
            detail: { pubkey: pubkey }
          });
          document.dispatchEvent(loginEvent);

          // If the main app has an auth module, try to use it
          if (window.RelayWorld && window.RelayWorld.initialized) {
            const authModule = window.RelayWorldCore && window.RelayWorldCore.getModule('auth');
            if (authModule && typeof authModule.loginWithNostr === 'function') {
              authModule.loginWithNostr(pubkey);
            }
          }
          
        }).catch(function(error) {
          if (loginStatus) {
            loginStatus.textContent = 'Login failed: ' + error.message;
          }
          if (loader) {
            loader.classList.add('hide');
          }
        });
      } catch (error) {
        if (loginStatus) {
          loginStatus.textContent = 'Login error: ' + error.message;
        }
        if (loader) {
          loader.classList.add('hide');
        }
      }
    });
  }
  
  // Add NWC button handling
  const nwcButton = document.getElementById('login-nwc');
  if (nwcButton) {
    nwcButton.addEventListener('click', function() {
      // Show Bitcoin Connect modal
      const bcModal = document.getElementById('bitcoin-connect-modal');
      if (bcModal) {
        bcModal.classList.remove('hide');
      } else {
        // If modal doesn't exist, show a message
        alert('Lightning wallet connection feature is not available yet.');
      }
    });
  }
  
  // Fix Bitcoin Connect modal close button
  const bcCloseButton = document.getElementById('bc-modal-close');
  if (bcCloseButton) {
    bcCloseButton.addEventListener('click', function() {
      const bcModal = document.getElementById('bitcoin-connect-modal');
      if (bcModal) {
        bcModal.classList.add('hide');
      }
    });
  }
  
  // Add CSS fixes
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Login animation fixes */
    #login-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: float 3s ease-in-out infinite;
      max-width: 90%;
      width: 500px;
      background-color: var(--color-light);
      border: 8px solid var(--color-medium);
      padding: 24px;
      box-shadow: 0 0 0 4px var(--color-dark), 8px 8px 0 0 rgba(0,0,0,0.5);
      position: relative;
    }
    
    #login-screen {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      background-color: var(--color-dark);
      background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23306230' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E");
      z-index: 9999;
    }
    
    .sound-wave {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: transparent;
      border: 2px solid var(--color-gold);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      pointer-events: none;
      animation: sound-wave 4s ease-out infinite;
    }
    
    .triforce-container {
      margin: 0 auto 20px;
      width: 120px;
      height: 120px;
      position: relative;
      animation: triforce-spin 10s linear infinite;
      transform-style: preserve-3d;
    }
    
    .triforce {
      width: 0;
      height: 0;
      border-left: 30px solid transparent;
      border-right: 30px solid transparent;
      border-bottom: 52px solid var(--color-gold);
      position: absolute;
      filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.7));
      animation: triforce-pulse 2s ease-in-out infinite alternate;
    }
    
    .triforce.top { top: 0; left: 30px; }
    .triforce.left { top: 52px; left: 0; }
    .triforce.right { top: 52px; left: 60px; }
    
    @keyframes sound-wave {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    }
    
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
    
    /* Additional fixes for login panel elements */
    #login-panel h1 {
      color: var(--color-dark);
      text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
      margin-bottom: 1rem;
      text-align: center;
    }
    
    #login-panel p {
      color: var(--color-dark);
      text-align: center;
      margin-bottom: 0.5rem;
    }
    
    #login-options {
      margin: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 15px;
      width: 100%;
    }
    
    .login-extras {
      width: 100%;
    }
    
    #login-status {
      font-size: 12px;
      color: var(--color-dark);
      text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
      text-align: center;
      min-height: 20px;
      margin: 10px 0;
    }
    
    .loader {
      border: 4px solid var(--color-medium);
      border-radius: 50%;
      border-top: 4px solid var(--color-gold);
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .separator {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 15px 0;
      font-size: 0.75rem;
      color: var(--color-dark);
    }
    
    .separator::before,
    .separator::after {
      content: '';
      flex: 1;
      border-bottom: 2px solid var(--color-dark);
    }
    
    .separator::before {
      margin-right: 10px;
    }
    
    .separator::after {
      margin-left: 10px;
    }
  `;
  document.head.appendChild(styleElement);
  
  console.log('Relay World login fixes applied');
});
