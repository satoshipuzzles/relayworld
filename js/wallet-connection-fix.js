/**
 * wallet-connection-fix.js
 * Fix for Relay World wallet connection using Bitcoin Connect
 */

document.addEventListener('DOMContentLoaded', function() {
  // Add Bitcoin Connect support
  loadBitcoinConnectScript();
  
  // Wait for login-fix.js to be applied first
  setTimeout(setupWalletConnection, 500);
});

function loadBitcoinConnectScript() {
  // Load the Bitcoin Connect script if it's not already loaded
  if (!window.BitcoinConnect) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@getalby/bitcoin-connect@3.5.3/dist/index.browser.js';
    script.async = true;
    document.head.appendChild(script);
  }
}

function setupWalletConnection() {
  // Find NWC button and Bitcoin Connect modal elements
  const nwcButton = document.getElementById('login-nwc');
  const bcModal = document.getElementById('bitcoin-connect-modal');
  const connectors = document.querySelectorAll('.bc-connector');
  
  if (nwcButton) {
    // Replace the existing click handler with our new one
    nwcButton.addEventListener('click', function(event) {
      event.stopPropagation(); // Prevent other click handlers
      
      if (window.BitcoinConnect && window.BitcoinConnect.launchModal) {
        // Use BitcoinConnect directly if available
        connectWithBitcoinConnect();
      } else if (bcModal) {
        // Show the modal manually if Bitcoin Connect isn't loaded yet
        bcModal.classList.remove('hide');
      } else {
        // Fallback if neither is available
        alert('Bitcoin Connect is not available. Please try again later.');
      }
    }, true);
  }
  
  // Add click handlers to connectors in the modal
  if (connectors) {
    connectors.forEach(connector => {
      connector.addEventListener('click', function() {
        const connectorType = this.getAttribute('data-connector');
        connectWallet(connectorType);
        if (bcModal) {
          bcModal.classList.add('hide');
        }
      });
    });
  }
  
  // Fix the close button on the modal
  const closeButton = document.getElementById('bc-modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      if (bcModal) {
        bcModal.classList.add('hide');
      }
    });
  }
  
  console.log('Wallet connection fix applied');
}

function connectWithBitcoinConnect() {
  // Use Bitcoin Connect to launch the wallet selection modal
  try {
    window.BitcoinConnect.launchModal({
      onSuccess: (result) => {
        // Store the client for later use
        window.nwcClient = result.client;
        
        // Show success message
        showToast('Wallet connected successfully!', 'success');
        
        // Trigger a custom event that Relay World can listen to
        const walletEvent = new CustomEvent('wallet-connected', { 
          detail: { client: result.client }
        });
        document.dispatchEvent(walletEvent);
        
        // Try to get balance if possible
        displayWalletBalance(result.client);
      },
      onError: (error) => {
        console.error('Bitcoin Connect error:', error);
        showToast('Failed to connect wallet: ' + error.message, 'error');
      }
    });
  } catch (error) {
    console.error('Error launching Bitcoin Connect:', error);
    showToast('Error launching Bitcoin Connect. Please try again.', 'error');
  }
}

function connectWallet(connectorType) {
  // Manual handling for different connector types
  try {
    switch(connectorType) {
      case 'nwc':
        // Fallback to Bitcoin Connect if possible
        if (window.BitcoinConnect && window.BitcoinConnect.launchModal) {
          connectWithBitcoinConnect();
        } else {
          showToast('NWC connection method not available.', 'error');
        }
        break;
      case 'alby':
        // Try to use Alby extension directly
        if (window.webln) {
          window.webln.enable()
            .then(() => {
              window.nwcClient = window.webln;
              showToast('Alby extension connected!', 'success');
              
              // Trigger event
              const walletEvent = new CustomEvent('wallet-connected', { 
                detail: { client: window.webln }
              });
              document.dispatchEvent(walletEvent);
            })
            .catch(err => {
              console.error('Alby connection error:', err);
              showToast('Failed to connect Alby: ' + err.message, 'error');
            });
        } else {
          showToast('Alby extension not found. Please install Alby first.', 'error');
        }
        break;
      case 'webln':
        // Generic WebLN support
        if (window.webln) {
          window.webln.enable()
            .then(() => {
              window.nwcClient = window.webln;
              showToast('WebLN wallet connected!', 'success');
              
              // Trigger event
              const walletEvent = new CustomEvent('wallet-connected', { 
                detail: { client: window.webln }
              });
              document.dispatchEvent(walletEvent);
            })
            .catch(err => {
              console.error('WebLN connection error:', err);
              showToast('Failed to connect WebLN wallet: ' + err.message, 'error');
            });
        } else {
          showToast('No WebLN provider found. Please install a compatible wallet.', 'error');
        }
        break;
      default:
        showToast('Unknown connector type: ' + connectorType, 'error');
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    showToast('Failed to connect wallet: ' + error.message, 'error');
  }
}

async function displayWalletBalance(client) {
  if (!client) {
    client = window.nwcClient;
  }
  
  if (!client) {
    return;
  }
  
  try {
    // Get balance using NWC client
    const balanceRequest = {
      method: "get_balance",
      params: {}
    };
    
    client.request(balanceRequest)
      .then(response => {
        console.log('Balance response:', response);
        if (response && response.result) {
          const balanceText = `Balance: ${response.result.balance / 1000} sats`;
          showToast(balanceText, 'success');
          
          // Try to find and update a balance display element if it exists
          const balanceElement = document.getElementById('wallet-balance');
          if (balanceElement) {
            balanceElement.textContent = balanceText;
            balanceElement.classList.remove('hide');
          }
        }
      })
      .catch(error => {
        console.error('Error fetching wallet balance:', error);
      });
  } catch (error) {
    console.error('Error in displayWalletBalance:', error);
  }
}

function showToast(message, type = 'info') {
  // Check if toast container exists, create if not
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
