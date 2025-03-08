/**
 * login-bypass.js
 * Directly helps login to Relay World by bypassing the login screen
 */

console.log("Login bypass loading...");

// Run immediately
(function() {
  // Wait a moment for the page to load
  setTimeout(tryBypass, 1000);
})();

function tryBypass() {
  console.log("Attempting to bypass login screen...");
  
  // First, try to directly access Relay World's auth module
  tryDirectLogin();
  
  // If that fails, try to hide the login screen and show the game
  setTimeout(hideLoginScreen, 500);
}

async function tryDirectLogin() {
  try {
    // Check if nostr is available
    if (!window.nostr) {
      console.error("Nostr extension not found. Please install a NIP-07 compatible extension.");
      return false;
    }
    
    // Get the user's pubkey
    const pubkey = await window.nostr.getPublicKey();
    console.log("Got pubkey:", pubkey);
    
    // Try to log in through the AuthModule
    let authModule = null;
    
    // Method 1: Through RelayWorldCore
    if (window.RelayWorldCore && typeof window.RelayWorldCore.getModule === 'function') {
      try {
        authModule = window.RelayWorldCore.getModule('auth');
        if (authModule) {
          if (typeof authModule.loginWithNostr === 'function') {
            console.log("Calling authModule.loginWithNostr()");
            authModule.loginWithNostr(pubkey);
            return true;
          } else if (typeof authModule.login === 'function') {
            console.log("Calling authModule.login()");
            authModule.login(pubkey);
            return true;
          }
        }
      } catch (error) {
        console.error("Error with auth module:", error);
      }
    }
    
    // Method 2: Fire a custom event that the game might be listening for
    console.log("Dispatching custom login event");
    document.dispatchEvent(new CustomEvent('relay-world:login', { 
      detail: { pubkey: pubkey }
    }));
    
    // Let the user know we attempted login
    const statusEl = document.getElementById('login-status');
    if (statusEl) {
      statusEl.textContent = "Login attempted with pubkey: " + pubkey.substring(0, 8) + "...";
    }
    
    return true;
  } catch (error) {
    console.error("Error in tryDirectLogin:", error);
    return false;
  }
}

function hideLoginScreen() {
  // Find the login screen
  const loginScreen = document.getElementById('login-screen');
  
  // If found, hide it
  if (loginScreen) {
    console.log("Hiding login screen");
    loginScreen.classList.add('hide');
    // Or use style.display
    loginScreen.style.display = 'none';
  }
  
  // Try to show game content
  const gameElements = [
    document.getElementById('top-bar'),
    document.getElementById('player-profile'),
    document.getElementById('content')
  ];
  
  gameElements.forEach(el => {
    if (el) {
      console.log("Showing game element:", el.id);
      el.classList.remove('hide');
      el.style.display = '';
    }
  });
  
  // Attempt to trigger game start
  if (window.RelayWorld && typeof window.RelayWorld.init === 'function') {
    console.log("Calling RelayWorld.init()");
    window.RelayWorld.init();
  }
  
  if (window.RelayWorld && typeof window.RelayWorld.start === 'function') {
    console.log("Calling RelayWorld.start()");
    window.RelayWorld.start();
  }
  
  // Add a button to try again if nothing happens
  addRetryButton();
}

function addRetryButton() {
  // Check if our button already exists
  if (document.getElementById('bypass-retry')) {
    return;
  }
  
  // Create a button to retry the bypass
  const retryButton = document.createElement('button');
  retryButton.id = 'bypass-retry';
  retryButton.textContent = 'Retry Login';
  retryButton.style.position = 'fixed';
  retryButton.style.top = '10px';
  retryButton.style.right = '10px';
  retryButton.style.zIndex = '9999';
  retryButton.style.padding = '10px';
  retryButton.style.backgroundColor = '#8bac0f';
  retryButton.style.color = '#0f380f';
  retryButton.style.border = '4px solid #0f380f';
  retryButton.style.fontFamily = '"Press Start 2P", system-ui, sans-serif';
  retryButton.style.cursor = 'pointer';
  
  retryButton.addEventListener('click', () => {
    location.reload();
  });
  
  document.body.appendChild(retryButton);
}

console.log("Login bypass loaded and executed");
