/**
 * direct-fix.js
 * Direct fixes for Relay World login and wallet connections
 */

console.log("Direct fix loading...");

document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit to ensure page is fully loaded
  setTimeout(applyFixes, 500);
});

function applyFixes() {
  console.log("Applying direct fixes to Relay World...");
  
  // Fix login screen styling
  fixLoginScreen();
  
  // Fix login button
  fixLoginButton();
  
  // Fix wallet connection button
  fixWalletButton();
  
  console.log("Direct fixes applied");
}

function fixLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const loginPanel = document.getElementById('login-panel');
  
  if (loginScreen) {
    // Force proper styling
    loginScreen.style.display = 'flex';
    loginScreen.style.justifyContent = 'center';
    loginScreen.style.alignItems = 'center';
    loginScreen.style.height = '100vh';
    loginScreen.style.width = '100vw';
    loginScreen.style.position = 'fixed';
    loginScreen.style.top = '0';
    loginScreen.style.left = '0';
    loginScreen.style.zIndex = '9999';
    
    // Force panel styling
    if (loginPanel) {
      loginPanel.style.animation = 'float 3s ease-in-out infinite';
      loginPanel.style.display = 'flex';
      loginPanel.style.flexDirection = 'column';
      loginPanel.style.alignItems = 'center';
    }
  }
  
  // Activate sound wave and triforce animations
  const soundWave = document.getElementById('sound-wave');
  if (soundWave) {
    soundWave.style.animation = 'sound-wave 4s ease-out infinite';
  }
  
  const triforceElements = document.querySelectorAll('.triforce');
  triforceElements.forEach(element => {
    element.style.animation = 'triforce-pulse 2s ease-in-out infinite alternate';
  });
  
  const triforceContainer = document.querySelector('.triforce-container');
  if (triforceContainer) {
    triforceContainer.style.animation = 'triforce-spin 10s linear infinite';
  }
}

function fixLoginButton() {
  const loginButton = document.getElementById('login-button');
  
  if (loginButton) {
    // Remove existing event listeners by cloning and replacing
    const newLoginButton = loginButton.cloneNode(true);
    loginButton.parentNode.replaceChild(newLoginButton, loginButton);
    
    // Add our custom listener
    newLoginButton.addEventListener('click', async function() {
      console.log("Login button clicked");
      
      // Show loader
      const loader = document.getElementById('login-loader');
      if (loader) {
        loader.classList.remove('hide');
      }
      
      // Show status
      updateLoginStatus('Connecting to Nostr...');
      
      // Check for Nostr extension
      if (!window.nostr) {
        updateLoginStatus('Nostr extension not found. Please install a Nostr extension like nos2x or Alby.');
        if (loader) loader.classList.add('hide');
        return;
      }
      
      try {
        // Get public key from Nostr extension
        const pubkey = await window.nostr.getPublicKey();
        console.log("Got pubkey:", pubkey);
        
        // Show success message
        updateLoginStatus(`Successfully connected with pubkey: ${pubkey.substring(0, 8)}...`);
        
        // Show login extras
        const loginExtras = document.querySelector('.login-extras');
        if (loginExtras) {
          loginExtras.classList.remove('hide');
        }
        
        // Hide loader
        if (loader) {
          loader.classList.add('hide');
        }
        
        // Try to directly call into Relay World's auth system
        triggerLogin(pubkey);
      } catch (error) {
        console.error("Login error:", error);
        updateLoginStatus('Login failed: ' + (error.message || 'Unknown error'));
        if (loader) loader.classList.add('hide');
      }
    });
  }
}

function fixWalletButton() {
  const nwcButton = document.getElementById('login-nwc');
  
  if (nwcButton) {
    // Remove existing event listeners by cloning and replacing
    const newNwcButton = nwcButton.cloneNode(true);
    nwcButton.parentNode.replaceChild(newNwcButton, nwcButton);
    
    // Add our custom listener
    newNwcButton.addEventListener('click', function() {
      console.log("Wallet button clicked");
      
      // Try to load Bitcoin Connect if not already available
      if (typeof window.BitcoinConnect === 'undefined') {
        loadBitcoinConnect(() => {
          launchWalletConnect();
        });
      } else {
        launchWalletConnect();
      }
    });
  }
}

function loadBitcoinConnect(callback) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@getalby/bitcoin-connect@3.5.3/dist/index.browser.js';
  script.onload = callback;
  document.head.appendChild(script);
  console.log("Loading Bitcoin Connect script...");
}

function launchWalletConnect() {
  // Show status during wallet connection
  updateLoginStatus('Connecting to Lightning wallet...');
  
  // First check if we have Bitcoin Connect
  if (window.BitcoinConnect && window.BitcoinConnect.launchModal) {
    console.log("Using Bitcoin Connect modal");
    
    window.BitcoinConnect.launchModal({
      onSuccess: (result) => {
        console.log("Bitcoin Connect success:", result);
        
        // Store client globally
        window.nwcClient = result.client;
        
        updateLoginStatus('Lightning wallet connected successfully!');
        
        // Try to get balance
        getWalletBalance(result.client);
        
        // Try to notify Relay World
        triggerWalletConnected(result.client);
      },
      onError: (error) => {
        console.error("Bitcoin Connect error:", error);
        updateLoginStatus('Wallet connection failed: ' + (error.message || 'Unknown error'));
      }
    });
  } 
  // Fallback to WebLN if available
  else if (window.webln) {
    console.log("Using WebLN directly");
    
    window.webln.enable()
      .then(() => {
        window.nwcClient = window.webln;
        updateLoginStatus('Lightning wallet connected via WebLN!');
        getWalletBalance(window.webln);
        triggerWalletConnected(window.webln);
      })
      .catch(error => {
        console.error("WebLN error:", error);
        updateLoginStatus('WebLN connection failed: ' + (error.message || 'Unknown error'));
      });
  }
  // Show built-in modal as last resort
  else {
    console.log("Using built-in modal");
    const bcModal = document.getElementById('bitcoin-connect-modal');
    if (bcModal) {
      // Make sure the modal is visible
      bcModal.style.position = 'fixed';
      bcModal.style.top = '0';
      bcModal.style.left = '0';
      bcModal.style.width = '100%';
      bcModal.style.height = '100%';
      bcModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      bcModal.style.display = 'flex';
      bcModal.style.justifyContent = 'center';
      bcModal.style.alignItems = 'center';
      bcModal.style.zIndex = '10000';
      
      bcModal.classList.remove('hide');
      
      // Make sure modal content is visible
      const modalContent = document.getElementById('bc-modal-content');
      if (modalContent) {
        modalContent.style.maxWidth = '90%';
        modalContent.style.width = '400px';
        modalContent.style.backgroundColor = 'var(--color-light)';
        modalContent.style.border = '8px solid var(--color-medium)';
        modalContent.style.padding = '20px';
        modalContent.style.boxShadow = '0 0 0 4px var(--color-dark), 8px 8px 0 0 rgba(0,0,0,0.5)';
      }
      
      // Setup modal close button
      const closeButton = document.getElementById('bc-modal-close');
      if (closeButton) {
        closeButton.onclick = function() {
          bcModal.classList.add('hide');
          updateLoginStatus('Wallet connection cancelled');
        };
      }
      
      // Setup connector clicking
      const connectors = document.querySelectorAll('.bc-connector');
      connectors.forEach(connector => {
        connector.onclick = function() {
          const connectorType = this.getAttribute('data-connector');
          console.log("Connector clicked:", connectorType);
          
          bcModal.classList.add('hide'); // Hide modal
          
          // Handle different connector types
          if (connectorType === 'nwc') {
            loadBitcoinConnect(() => {
              if (window.BitcoinConnect && window.BitcoinConnect.launchModal) {
                launchWalletConnect(); // Try again with Bitcoin Connect loaded
              } else {
                updateLoginStatus('NWC connection not available');
              }
            });
          } else if (connectorType === 'alby' || connectorType === 'webln') {
            if (window.webln) {
              window.webln.enable()
                .then(() => {
                  window.nwcClient = window.webln;
                  updateLoginStatus('Lightning wallet connected via ' + connectorType);
                  getWalletBalance(window.webln);
                  triggerWalletConnected(window.webln);
                })
                .catch(error => {
                  console.error(connectorType + " error:", error);
                  updateLoginStatus(connectorType + ' connection failed: ' + (error.message || 'Unknown error'));
                });
            } else {
              updateLoginStatus('No WebLN provider found. Please install a compatible wallet.');
            }
          }
        };
      });
    } else {
      // No modal available, show error
      updateLoginStatus('No wallet connection method available');
    }
  }
}

async function getWalletBalance(client) {
  if (!client) return;
  
  try {
    console.log("Fetching wallet balance...");
    
    const balanceRequest = {
      method: "get_balance",
      params: {}
    };
    
    const response = await client.request(balanceRequest);
    console.log("Balance response:", response);
    
    if (response && response.result) {
      // Convert to sats if needed (some clients return msats)
      const balance = response.result.balance / 1000;
      updateLoginStatus(`Wallet connected! Balance: ${balance} sats`);
    }
  } catch (error) {
    console.error("Error getting balance:", error);
  }
}

function updateLoginStatus(message) {
  console.log("Status:", message);
  
  const statusElement = document.getElementById('login-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  
  // Also add a toast notification
  showToast(message);
}

function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '10000';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast
  const toast = document.createElement('div');
  toast.style.backgroundColor = (type === 'error') ? '#ffcccc' : 
                              (type === 'success') ? '#ccffcc' : 
                              '#f0f0f0';
  toast.style.color = '#333';
  toast.style.padding = '10px';
  toast.style.margin = '5px';
  toast.style.borderRadius = '5px';
  toast.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  toast.style.maxWidth = '300px';
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Try to directly trigger Relay World's login system
function triggerLogin(pubkey) {
  console.log("Attempting to trigger Relay World login with pubkey:", pubkey);
  
  // Method 1: Try to access the auth module and call its login function
  if (window.RelayWorldCore && typeof window.RelayWorldCore.getModule === 'function') {
    try {
      const authModule = window.RelayWorldCore.getModule('auth');
      if (authModule && typeof authModule.loginWithNostr === 'function') {
        console.log("Using RelayWorldCore.getModule('auth').loginWithNostr");
        authModule.loginWithNostr(pubkey);
        return true;
      } else if (authModule && typeof authModule.login === 'function') {
        console.log("Using RelayWorldCore.getModule('auth').login");
        authModule.login(pubkey);
        return true;
      }
    } catch (error) {
      console.error("Error accessing auth module:", error);
    }
  }
  
  // Method 2: Try to access RelayWorld object directly
  if (window.RelayWorld) {
    try {
      if (typeof window.RelayWorld.login === 'function') {
        console.log("Using RelayWorld.login");
        window.RelayWorld.login(pubkey);
        return true;
      }
    } catch (error) {
      console.error("Error accessing RelayWorld.login:", error);
    }
  }
  
  // Method 3: Dispatch a custom event
  try {
    console.log("Dispatching custom login event");
    const loginEvent = new CustomEvent('relay-world:login', { 
      detail: { pubkey: pubkey }
    });
    document.dispatchEvent(loginEvent);
    return true;
  } catch (error) {
    console.error("Error dispatching event:", error);
  }
  
  return false;
}

function triggerWalletConnected(client) {
  console.log("Attempting to trigger wallet connected in Relay World");
  
  // Method 1: Try to access the zaps module
  if (window.RelayWorldCore && typeof window.RelayWorldCore.getModule === 'function') {
    try {
      const zapsModule = window.RelayWorldCore.getModule('zaps');
      if (zapsModule) {
        if (typeof zapsModule.setWalletClient === 'function') {
          console.log("Using RelayWorldCore.getModule('zaps').setWalletClient");
          zapsModule.setWalletClient(client);
          return true;
        } else if (typeof zapsModule.connectWallet === 'function') {
          console.log("Using RelayWorldCore.getModule('zaps').connectWallet");
          zapsModule.connectWallet(client);
          return true;
        }
      }
    } catch (error) {
      console.error("Error accessing zaps module:", error);
    }
  }
  
  // Method 2: Dispatch a custom event
  try {
    console.log("Dispatching custom wallet connected event");
    const walletEvent = new CustomEvent('wallet-connected', { 
      detail: { client: client }
    });
    document.dispatchEvent(walletEvent);
    return true;
  } catch (error) {
    console.error("Error dispatching wallet event:", error);
  }
  
  // Store client globally so the game can access it
  window.nwcClient = client;
  
  return false;
}

// Set up keyframe animations if not already defined
function ensureAnimationsExist() {
  let styleSheet = document.createElement('style');
  styleSheet.textContent = `
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
  document.head.appendChild(styleSheet);
}

ensureAnimationsExist();
console.log("Direct fix loaded");
