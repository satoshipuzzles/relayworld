/**
 * zap-system.js - Enhanced Zap functionality for Relay World
 * Fixes zap functionality and adds Bitcoin Connect integration
 */

const ZapSystem = {
  // Lightning wallet connection state
  isConnected: false,
  connectionType: null,
  webln: null,
  
  // Initialize the zap system
  init: function() {
    console.log("[ZapSystem] Initializing...");
    
    // Make sure global Zaps object exists and add our functions to it
    this.patchGlobalZaps();
    
    // Set up the zap interface
    this.setupZapInterface();
    
    // Add Bitcoin wallet connection handling
    this.setupBitcoinConnect();
    
    // Add wallet button to player profile
    this.addWalletButton();
    
// Try to auto-connect to WebLN provider if available
  this.checkWebLNProvider().then(connected => {
    if (connected) {
      console.log("[ZapSystem] Auto-connected to WebLN provider");
    }
  });
  
  console.log("[ZapSystem] Initialized");
},
  
  // Send a regular lightning payment (non-zap)
  sendRegularPayment: async function(lightningAddress, amount, message) {
    try {
      if (!this.webln) {
        throw new Error("No WebLN provider available");
      }
      
      // Parse lightning address
      const [name, domain] = lightningAddress.split('@');
      
      // Fetch LNURL info
      const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lightning address info: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Amount in millisats
      const millisats = amount * 1000;
      
      // Check against min/max
      if (millisats < data.minSendable) {
        throw new Error(`Amount too small. Minimum is ${data.minSendable / 1000} sats.`);
      }
      
      if (millisats > data.maxSendable) {
        throw new Error(`Amount too large. Maximum is ${data.maxSendable / 1000} sats.`);
      }
      
      // Create callback URL
      let callbackUrl = `${data.callback}?amount=${millisats}`;
      
      // Add comment if provided
      if (message && data.commentAllowed && message.length <= data.commentAllowed) {
        callbackUrl += `&comment=${encodeURIComponent(message)}`;
      }
      
      // Fetch invoice
      const invoiceResponse = await fetch(callbackUrl);
      if (!invoiceResponse.ok) {
        throw new Error(`Failed to get invoice: ${invoiceResponse.status}`);
      }
      
      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error("No invoice received from lightning provider");
      }
      
      // Pay invoice
      const result = await this.webln.sendPayment(invoiceData.pr);
      
      console.log("[ZapSystem] Lightning payment sent:", result);
      return result;
      
    } catch (error) {
      console.error("[ZapSystem] Failed to send lightning payment:", error);
      throw error;
    }
  },
  
  // Create visual zap effect in the game
  createZapEffect: function(x, y) {
    if (!Game || !Game.camera || !Game.canvas) return;
    
    // Create visual effect element
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    const effect = document.createElement('div');
    effect.className = 'zap-effect';
    
    // Position at target coordinates
    const screenX = x - (Game.camera.x - Game.canvas.width / 2);
    const screenY = y - (Game.camera.y - Game.canvas.height / 2);
    
    effect.style.position = 'absolute';
    effect.style.left = `${screenX - 50}px`;
    effect.style.top = `${screenY - 50}px`;
    effect.style.width = '100px';
    effect.style.height = '100px';
    effect.style.background = 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 70%)';
    effect.style.borderRadius = '50%';
    effect.style.animation = 'zapFlash 0.5s ease-out forwards';
    effect.style.zIndex = '1000';
    
    // Add lightning bolt inside
    const bolt = document.createElement('div');
    bolt.innerHTML = '⚡';
    bolt.style.fontSize = '40px';
    bolt.style.position = 'absolute';
    bolt.style.top = '50%';
    bolt.style.left = '50%';
    bolt.style.transform = 'translate(-50%, -50%)';
    effect.appendChild(bolt);
    
    // Add to game container
    gameContainer.appendChild(effect);
    
    // Play sound
    if (UI && UI.playSound) {
      UI.playSound('zap');
    }
    
    // Remove after animation completes
    setTimeout(() => {
      effect.remove();
    }, 500);
  }
};

// Export the ZapSystem
export default ZapSystem; Auto-connected to WebLN provider");
      }
    });
    
    console.log("[ZapSystem] Initialized");
  },
  
  // Patch the global Zaps object to use our functions
  patchGlobalZaps: function() {
    if (!window.Zaps) {
      window.Zaps = {};
    }
    
    // Add our showZapInterface method to the global Zaps object
    window.Zaps.showZapInterface = this.showZapInterface.bind(this);
    
    // Store connection state in the global Zaps object
    window.Zaps.isConnected = this.isConnected;
    window.Zaps.connectionType = this.connectionType;
    window.Zaps.webln = this.webln;
    
    // Monitor changes to our local properties
    Object.defineProperty(this, "isConnected", {
      get: function() { return window.Zaps.isConnected; },
      set: function(val) { window.Zaps.isConnected = val; }
    });
    
    Object.defineProperty(this, "connectionType", {
      get: function() { return window.Zaps.connectionType; },
      set: function(val) { window.Zaps.connectionType = val; }
    });
    
    Object.defineProperty(this, "webln", {
      get: function() { return window.Zaps.webln; },
      set: function(val) { window.Zaps.webln = val; }
    });
  },
  
  // Set up zap interface event listeners
  setupZapInterface: function() {
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) {
      console.warn("[ZapSystem] Zap interface not found in DOM");
      return;
    }
    
    // Close button
    const closeButton = document.getElementById('zap-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        zapInterface.classList.add('hide');
      });
    }
    
    // Zap amount preset buttons
    const presets = document.querySelectorAll('.zap-preset');
    presets.forEach(preset => {
      preset.addEventListener('click', () => {
        const amount = preset.dataset.amount;
        const amountInput = document.getElementById('zap-amount');
        if (amountInput) {
          amountInput.value = amount;
        }
        
        // Clear active class from all presets
        presets.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked preset
        preset.classList.add('active');
      });
    });
    
    // Send button
    const sendButton = document.getElementById('zap-send-button');
    if (sendButton) {
      sendButton.addEventListener('click', this.sendZap.bind(this));
    }
  },
  
  // Set up the Bitcoin Connect modal
  setupBitcoinConnect: function() {
    const modal = document.getElementById('bitcoin-connect-modal');
    const closeBtn = document.getElementById('bc-modal-close');
    
    if (!modal || !closeBtn) {
      console.warn("[ZapSystem] Bitcoin Connect modal elements not found");
      return;
    }
    
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hide');
    });
    
    // Set up connector click handlers
    const connectors = document.querySelectorAll('.bc-connector');
    if (connectors.length === 0) {
      console.warn("[ZapSystem] No Bitcoin Connect connectors found");
    }
    
    connectors.forEach(connector => {
      connector.addEventListener('click', async () => {
        const type = connector.dataset.connector;
        
        try {
          switch (type) {
            case 'nwc':
              await this.connectWithNWC();
              break;
            case 'alby':
              await this.connectWithAlby();
              break;
            case 'webln':
              await this.connectWithWebLN();
              break;
          }
          
          // Hide modal if connection successful
          modal.classList.add('hide');
          
        } catch (error) {
          console.error(`[ZapSystem] Failed to connect with ${type}:`, error);
          if (UI && UI.showToast) {
            UI.showToast(`Failed to connect: ${error.message}`, "error");
          }
        }
      });
    });
  },
  
  // Add wallet connection button to player profile
  addWalletButton: function() {
    const playerActions = document.getElementById('player-actions');
    if (!playerActions) {
      console.warn("[ZapSystem] Player actions container not found");
      return;
    }
    
    // Check if button already exists
    if (document.getElementById('wallet-button')) return;
    
    const walletButton = document.createElement('button');
    walletButton.id = 'wallet-button';
    walletButton.className = 'action-button';
    walletButton.innerHTML = '⚡ Connect Wallet';
    walletButton.addEventListener('click', () => {
      const modal = document.getElementById('bitcoin-connect-modal');
      if (modal) {
        modal.classList.remove('hide');
      }
    });
    
    playerActions.appendChild(walletButton);
    console.log("[ZapSystem] Added wallet button to player profile");
  },
  
  // Connect with Nostr Wallet Connect
  connectWithNWC: async function() {
    try {
      // Show input prompt for NWC URI
      const nwcUri = prompt("Enter your NWC URI (nostr+walletconnect://...)");
      
      if (!nwcUri || !nwcUri.startsWith('nostr+walletconnect://')) {
        throw new Error("Invalid NWC URI");
      }
      
      // Store connection state
      this.isConnected = true;
      this.connectionType = 'nwc';
      
      if (UI && UI.showToast) {
        UI.showToast("Connected to wallet via NWC", "success");
      }
      
      // Update wallet button
      this.updateWalletButton(true);
      
      return true;
    } catch (error) {
      console.error("[ZapSystem] Failed to connect with NWC:", error);
      if (UI && UI.showToast) {
        UI.showToast(`NWC connection failed: ${error.message}`, "error");
      }
      return false;
    }
  },
  
  // Connect with Alby extension
  connectWithAlby: async function() {
    try {
      if (!window.alby) {
        throw new Error("Alby extension not found");
      }
      
      // Enable Alby
      await window.alby.enable();
      
      // Store connection state
      this.isConnected = true;
      this.connectionType = 'alby';
      this.webln = window.alby;
      
      if (UI && UI.showToast) {
        UI.showToast("Connected to Alby wallet", "success");
      }
      
      // Update wallet button
      this.updateWalletButton(true);
      
      return true;
    } catch (error) {
      console.error("[ZapSystem] Failed to connect with Alby:", error);
      if (UI && UI.showToast) {
        UI.showToast(`Alby connection failed: ${error.message}`, "error");
      }
      return false;
    }
  },
  
  // Connect with any WebLN provider
  connectWithWebLN: async function() {
    try {
      // Check if WebLN is available
      if (!window.webln) {
        throw new Error("No WebLN provider found");
      }
      
      // Enable WebLN
      await window.webln.enable();
      
      // Store connection state
      this.isConnected = true;
      this.connectionType = 'webln';
      this.webln = window.webln;
      
      if (UI && UI.showToast) {
        UI.showToast("Connected to Lightning wallet", "success");
      }
      
      // Update wallet button
      this.updateWalletButton(true);
      
      return true;
    } catch (error) {
      console.error("[ZapSystem] Failed to connect with WebLN:", error);
      if (UI && UI.showToast) {
        UI.showToast(`WebLN connection failed: ${error.message}`, "error");
      }
      return false;
    }
  },
  
  // Update wallet button state
  updateWalletButton: function(connected) {
    const walletButton = document.getElementById('wallet-button');
    if (!walletButton) return;
    
    if (connected) {
      walletButton.innerHTML = '⚡ Wallet Connected';
      walletButton.style.backgroundColor = 'var(--color-success)';
    } else {
      walletButton.innerHTML = '⚡ Connect Wallet';
      walletButton.style.backgroundColor = '';
    }
  },
  
  // Check if a WebLN provider is available
  checkWebLNProvider: async function() {
    try {
      // First check for window.webln
      if (window.webln) {
        await window.webln.enable();
        this.webln = window.webln;
        this.isConnected = true;
        this.connectionType = 'webln';
        this.updateWalletButton(true);
        return true;
      }
      
      // Then check for window.alby
      if (window.alby) {
        await window.alby.enable();
        this.webln = window.alby;
        this.isConnected = true;
        this.connectionType = 'alby';
        this.updateWalletButton(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("[ZapSystem] Failed to check WebLN provider:", error);
      return false;
    }
  },
  
  // Show zap interface for a user
  showZapInterface: function(pubkey) {
    if (!Nostr || !Nostr.getUser) {
      console.error("[ZapSystem] Nostr module not initialized");
      return;
    }
    
    const user = Nostr.getUser(pubkey);
    if (!user) {
      if (UI && UI.showToast) {
        UI.showToast("User not found", "error");
      }
      return;
    }
    
    // Check if we have a lightning wallet connected
    if (!this.isConnected) {
      // First try to check for an existing WebLN provider
      this.checkWebLNProvider().then(hasProvider => {
        if (!hasProvider) {
          if (UI && UI.showToast) {
            UI.showToast("Please connect a lightning wallet first", "info");
          }
          
          // Show Bitcoin Connect modal
          const modal = document.getElementById('bitcoin-connect-modal');
          if (modal) {
            modal.classList.remove('hide');
            
            // Update modal title to make it clearer
            const modalTitle = document.getElementById('bc-modal-title');
            if (modalTitle) {
              modalTitle.textContent = "Connect Lightning Wallet to Send Zaps";
            }
          }
          return;
        } else {
          // Continue with showing the zap interface since wallet is connected
          this.displayZapInterface(pubkey, user);
        }
      });
    } else {
      // Wallet is already connected, show the interface
      this.displayZapInterface(pubkey, user);
    }
  },
  
  // Display the zap interface for a user
  displayZapInterface: function(pubkey, user) {
    // Update zap interface with user info
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) {
      console.error("[ZapSystem] Zap interface not found");
      return;
    }
    
    const userImage = document.getElementById('zap-target-image');
    const userName = document.getElementById('zap-target-name');
    
    if (userImage) {
      userImage.src = user.profile?.picture || "assets/icons/default-avatar.png";
    }
    
    if (userName) {
      userName.textContent = user.profile?.name || user.pubkey.slice(0, 8);
    }
    
    // Set default amount
    const zapAmount = document.getElementById('zap-amount');
    if (zapAmount) {
      zapAmount.value = "21";
    }
    
    const zapMessage = document.getElementById('zap-message');
    if (zapMessage) {
      zapMessage.value = "";
    }
    
    // Reset preset buttons
    document.querySelectorAll('.zap-preset').forEach(preset => {
      preset.classList.remove('active');
    });
    
    const defaultPreset = document.querySelector('.zap-preset[data-amount="21"]');
    if (defaultPreset) {
      defaultPreset.classList.add('active');
    }
    
    // Store target pubkey
    zapInterface.dataset.targetPubkey = pubkey;
    
    // Show interface
    zapInterface.classList.remove('hide');
  },
  
  // Send a zap
  sendZap: async function() {
    const zapInterface = document.getElementById('zap-interface');
    if (!zapInterface) return;
    
    const targetPubkey = zapInterface.dataset.targetPubkey;
    
    if (!targetPubkey) {
      if (UI && UI.showToast) {
        UI.showToast("No zap target selected", "error");
      }
      return;
    }
    
    if (!Nostr || !Nostr.getUser) {
      console.error("[ZapSystem] Nostr module not initialized");
      return;
    }
    
    const user = Nostr.getUser(targetPubkey);
    if (!user) {
      if (UI && UI.showToast) {
        UI.showToast("User not found", "error");
      }
      return;
    }
    
    // Check for lightning address (lud16) or lnurl in user profile
    const lightningAddress = user.profile?.lud16;
    if (!lightningAddress) {
      if (UI && UI.showToast) {
        UI.showToast("User doesn't have a lightning address", "error");
      }
      return;
    }
    
    // Get zap amount and message
    const amountInput = document.getElementById('zap-amount');
    const messageInput = document.getElementById('zap-message');
    
    if (!amountInput) return;
    
    const amount = parseInt(amountInput.value);
    const message = messageInput ? messageInput.value : "";
    
    if (isNaN(amount) || amount <= 0) {
      if (UI && UI.showToast) {
        UI.showToast("Invalid zap amount", "error");
      }
      return;
    }
    
    try {
      // Show loading state
      const sendButton = document.getElementById('zap-send-button');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";
      }
      
      // Check if WebLN is available
      if (!this.isConnected) {
        const hasWebLN = await this.checkWebLNProvider();
        if (!hasWebLN) {
          if (UI && UI.showToast) {
            UI.showToast("Please connect a lightning wallet first", "error");
          }
          
          if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Send Zap";
          }
          return;
        }
      }
      
      // Get LNURL pay info from lightning address
      const lnurlInfo = await this.getLnurlInfo(lightningAddress);
      
      // Create a zap request
      const zapRequest = await this.createZapRequest(targetPubkey, amount, message);
      
      // Send the zap
      if (lnurlInfo.allowsNostr && lnurlInfo.nostrPubkey) {
        await this.sendZapPayment(lnurlInfo, zapRequest, amount);
      } else {
        await this.sendRegularPayment(lightningAddress, amount, message);
      }
      
      // Track zap in player stats
      if (Player) {
        Player.zapsSent = (Player.zapsSent || 0) + 1;
        Player.score += Math.floor(amount / 10); // 10% of zap amount as score
      }
      
      // Publish player stats if possible
      if (Nostr && Nostr.publishPlayerStats) {
        Nostr.publishPlayerStats();
      }
      
      // Update UI
      if (UI && UI.updatePlayerProfile) {
        UI.updatePlayerProfile();
      }
      
      // Create zap visual effect
      this.createZapEffect(user.x, user.y);
      
      // Show success message
      if (UI && UI.showToast) {
        UI.showToast(`Zapped ${user.profile?.name || targetPubkey.slice(0, 8)} ${amount} sats!`, "success");
      }
      
      // Hide zap interface
      zapInterface.classList.add('hide');
      
    } catch (error) {
      console.error("[ZapSystem] Failed to send zap:", error);
      if (UI && UI.showToast) {
        UI.showToast(`Zap failed: ${error.message}`, "error");
      }
    } finally {
      // Reset button state
      const sendButton = document.getElementById('zap-send-button');
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send Zap";
      }
    }
  },
  
  // Create a zap request (NIP-57)
  createZapRequest: async function(recipientPubkey, amount, comment) {
    try {
      // Create zap request event (kind 9734)
      const zapRequestEvent = {
        kind: 9734,
        content: comment || "",
        tags: [
          ["p", recipientPubkey],
          ["amount", (amount * 1000).toString()], // Convert to millisats
          ["relays", RelayWorld.config.EXPLORER_RELAYS ? RelayWorld.config.EXPLORER_RELAYS : [RelayWorld.config.LOGIN_RELAY]],
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: Player.pubkey
      };
      
      // Sign the event
      const signedEvent = await Nostr.signEvent(zapRequestEvent);
      return signedEvent;
      
    } catch (error) {
      console.error("[ZapSystem] Failed to create zap request:", error);
      throw error;
    }
  },
  
  // Get LNURL pay information from a lightning address
  getLnurlInfo: async function(lightningAddress) {
    try {
      // Parse lightning address
      const [name, domain] = lightningAddress.split('@');
      
      // Fetch LNURL info
      const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lightning address info: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        callback: data.callback,
        minSendable: data.minSendable,
        maxSendable: data.maxSendable,
        nostrPubkey: data.nostrPubkey,
        allowsNostr: data.allowsNostr || false
      };
    } catch (error) {
      console.error("[ZapSystem] Failed to get LNURL info:", error);
      throw new Error("Failed to get lightning address info");
    }
  },
  
  // Send a zap payment (for NIP-57 compliant receivers)
  sendZapPayment: async function(lnurlInfo, zapRequest, amount) {
    try {
      if (!this.webln) {
        throw new Error("No WebLN provider available");
      }
      
      // Amount in millisats
      const millisats = amount * 1000;
      
      // Check against min/max
      if (millisats < lnurlInfo.minSendable) {
        throw new Error(`Amount too small. Minimum is ${lnurlInfo.minSendable / 1000} sats.`);
      }
      
      if (millisats > lnurlInfo.maxSendable) {
        throw new Error(`Amount too large. Maximum is ${lnurlInfo.maxSendable / 1000} sats.`);
      }
      
      // Encode zap request as JSON and encode for URL
      const encodedZapRequest = encodeURIComponent(JSON.stringify(zapRequest));
      
      // Create callback URL with zap request
      const callbackUrl = `${lnurlInfo.callback}?amount=${millisats}&nostr=${encodedZapRequest}`;
      
      // Fetch invoice
      const response = await fetch(callbackUrl);
      if (!response.ok) {
        throw new Error(`Failed to get invoice: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.pr) {
        throw new Error("No invoice received from lightning provider");
      }
      
      // Pay invoice
      const result = await this.webln.sendPayment(data.pr);
      
      console.log("[ZapSystem]
