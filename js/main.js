/**
 * main.js - Entry point for Relay World
 * Handles initialization and coordinates between modules
 */

// Main application namespace
const RelayWorld = {
    initialized: false,
    debug: true,
    
    // Configuration
    config: {
        WORLD_SIZE: 3000,
        DEFAULT_RELAYS: [
            "wss://relay.damus.io",
            "wss://relay.nostr.band",
            "wss://nos.lol",
            "wss://nostr.wine"
        ],
        VOICE_CHAT_RANGE: 300, // Distance for voice proximity chat in game units
        INTERACTION_RANGE: 100, // Distance for interacting with other players
        DEFAULT_KINDS: [0, 1, 3, 9, 30023], // Default Nostr event kinds to subscribe to
        ZAP_AMOUNTS: [21, 210, 2100, 21000]
    },
    
    // Module references
    game: null,
    nostr: null,
    ui: null,
    zaps: null,
    audio: null,
    player: null,
    
    // Initialize the application
    init: function() {
        console.log("[Relay World] Initializing application...");
        
        try {
            // Create simple UI for showing toasts before UI module is loaded
            this.createTemporaryUI();
            
            // Initialize modules in dependency order
            if (typeof Utils !== 'undefined') {
                Utils.init();
            } else {
                console.error("[Relay World] Utils module not found");
                this.showTempToast("Error loading utilities module", "error");
                return;
            }
            
            if (typeof Player !== 'undefined') {
                Player.init();
            } else {
                console.error("[Relay World] Player module not found");
                this.showTempToast("Error loading player module", "error");
                return;
            }
            
            if (typeof Items !== 'undefined') {
                Items.init();
            } else {
                console.error("[Relay World] Items module not found");
                this.showTempToast("Error loading items module", "error");
                return;
            }
            
            if (typeof UI !== 'undefined') {
                UI.init();
            } else {
                console.error("[Relay World] UI module not found");
                this.showTempToast("Error loading UI module", "error");
                return;
            }
            
            this.game = typeof Game !== 'undefined' ? Game : null;
            this.nostr = typeof Nostr !== 'undefined' ? Nostr : null;
            this.ui = typeof UI !== 'undefined' ? UI : null;
            this.zaps = typeof Zaps !== 'undefined' ? Zaps : null;
            this.audio = typeof Audio !== 'undefined' ? Audio : null;
            this.player = typeof Player !== 'undefined' ? Player : null;
            
            // Setup event listeners for login buttons
            const loginButton = document.getElementById('login-button');
            if (loginButton) {
                loginButton.addEventListener('click', this.handleLogin.bind(this));
            }
            
            const nwcButton = document.getElementById('login-nwc');
            if (nwcButton) {
                nwcButton.addEventListener('click', this.handleNWCLogin.bind(this));
            }
            
            // Initialize login screen - hide NWC option initially
            const loginExtras = document.querySelector('.login-extras');
            if (loginExtras) {
                loginExtras.classList.add('hide');
            }
            
            // Check if user has previously logged in
            const savedPubkey = localStorage.getItem('relayworld_pubkey');
            const savedRelays = localStorage.getItem('relayworld_relays');
            
            if (savedPubkey && savedRelays) {
                this.showTempToast("Previous session found. Click login to reconnect.", "info");
                this.setLoginStatus("Previous session found. Click the button to reconnect.");
            }
            
            this.initialized = true;
            console.log("[Relay World] Initialization complete. Ready for login.");
            
        } catch (error) {
            console.error("[Relay World] Initialization failed:", error);
            this.showTempToast("Failed to initialize game. Please refresh the page.", "error");
        }
    },
    
    // Create a temporary UI for showing toasts before UI module is loaded
    createTemporaryUI: function() {
        // Create toast container if needed
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'absolute';
            toastContainer.style.top = '20px';
            toastContainer.style.left = '50%';
            toastContainer.style.transform = 'translateX(-50%)';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
    },
    
    // Show a temporary toast notification before UI module is loaded
    showTempToast: function(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toast.style.backgroundColor = type === 'error' ? '#EF4444' : 
                                      type === 'success' ? '#10B981' : 
                                      type === 'warning' ? '#F59E0B' : '#8B5CF6';
        toast.style.color = '#FFFFFF';
        toast.style.padding = '10px 15px';
        toast.style.borderRadius = '4px';
        toast.style.marginBottom = '10px';
        toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
        toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        toast.style.fontSize = '14px';
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 3000);
    },
    
    // Set login status text
    setLoginStatus: function(message) {
        const statusElement = document.getElementById('login-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },
    
    /**
     * Show NWC login option after successful Nostr login
     */
    showNWCOption: function() {
        // Show the NWC connection option
        const loginExtras = document.querySelector('.login-extras');
        if (loginExtras) {
            loginExtras.classList.remove('hide');
        }
        
        // Enable the NWC button
        const nwcButton = document.getElementById('login-nwc');
        if (nwcButton) {
            nwcButton.disabled = false;
        }
        
        // Show a hint toast
        if (this.ui) {
            this.ui.showToast("Login successful! You can now connect your Lightning wallet", "success");
        } else {
            this.showTempToast("Login successful! You can now connect your Lightning wallet", "success");
        }
    },
    
    // Handle regular Nostr login via NIP-07
    handleLogin: async function() {
        console.log("[Relay World] Attempting login via NIP-07...");
        this.setLoginStatus("Looking for Nostr extension...");
        
        // Disable login button during the login process
        const loginButton = document.getElementById('login-button');
        const loginLoader = document.getElementById('login-loader');
        
        if (loginButton) loginButton.disabled = true;
        if (loginLoader) loginLoader.style.display = 'block';
        
        try {
            // Make sure Nostr module is available
            if (!this.nostr) {
                throw new Error("Nostr module not found or not initialized");
            }
            
            // Check for Nostr extension
            const isExtensionAvailable = await this.nostr.isExtensionAvailable();
            if (!isExtensionAvailable) {
                throw new Error("No Nostr extension found. Please install one first.");
            }
            
            this.setLoginStatus("Extension found! Requesting public key...");
            
            // Get public key from extension
            const pubkey = await this.nostr.getPublicKey();
            if (!pubkey) {
                throw new Error("Could not get public key from extension.");
            }
            
            this.setLoginStatus("Got public key, connecting to relays...");
            
            // Play login sound if UI is available
            if (this.ui) {
                this.ui.playLoginSound();
            }
            
            // Set player public key
            if (this.player) {
                this.player.setPubkey(pubkey);
            } else {
                throw new Error("Player module not initialized");
            }
            
            // Connect to relays
            await this.connectToRelays();
            
            // Show NWC option
            this.showNWCOption();
            
            // Start game
            await this.startGame();
            
            // Save login info for next time
            localStorage.setItem('relayworld_pubkey', pubkey);
            localStorage.setItem('relayworld_relays', JSON.stringify([...this.nostr.relays]));
            
        } catch (error) {
            console.error("[Relay World] Login failed:", error);
            if (this.ui) {
                this.ui.showToast("Login failed: " + error.message, "error");
            } else {
                this.showTempToast("Login failed: " + error.message, "error");
            }
            this.setLoginStatus("Login failed: " + error.message);
            
            // Re-enable login button if login fails
            if (loginButton) loginButton.disabled = false;
            if (loginLoader) loginLoader.style.display = 'none';
        }
    },
    
    // Handle login via NWC (Nostr Wallet Connect)
    handleNWCLogin: async function() {
        // Check if player module is initialized and pubkey is set
        if (!this.player || !this.player.pubkey) {
            if (this.ui) {
                this.ui.showToast("Please log in with Nostr first before connecting your wallet", "error");
            } else {
                this.showTempToast("Please log in with Nostr first before connecting your wallet", "error");
            }
            return;
        }
        
        console.log("[Relay World] Attempting NWC connection...");
        this.setLoginStatus("Setting up NWC connection...");
        
        const nwcButton = document.getElementById('login-nwc');
        const loginLoader = document.getElementById('login-loader');
        
        if (nwcButton) nwcButton.disabled = true;
        if (loginLoader) loginLoader.style.display = 'block';
        
        try {
            // Show Bitcoin Connect modal
            const bcModal = document.getElementById('bitcoin-connect-modal');
            if (bcModal) {
                bcModal.classList.remove('hide');
            } else {
                throw new Error("Bitcoin Connect modal not found");
            }
            
            // NWC connection is handled by the modal components
            // The zaps.js module will set up event listeners for these components
            
        } catch (error) {
            console.error("[Relay World] NWC connection failed:", error);
            if (this.ui) {
                this.ui.showToast("NWC connection failed: " + error.message, "error");
            } else {
                this.showTempToast("NWC connection failed: " + error.message, "error");
            }
            this.setLoginStatus("NWC connection failed: " + error.message);
            
            if (nwcButton) nwcButton.disabled = false;
            if (loginLoader) loginLoader.style.display = 'none';
        }
    },
    
    // Connect to Nostr relays
    connectToRelays: async function() {
        this.setLoginStatus("Connecting to relays...");
        
        try {
            if (!this.nostr) {
                throw new Error("Nostr module not initialized");
            }
            
            // Connect to default relays
            for (const relayUrl of this.config.DEFAULT_RELAYS) {
                await this.nostr.connectRelay(relayUrl);
            }
            
            // Set active relay
            this.nostr.setActiveRelay(this.config.DEFAULT_RELAYS[0]);
            
            this.setLoginStatus("Connected to relays successfully!");
            return true;
            
        } catch (error) {
            console.error("[Relay World] Failed to connect to relays:", error);
            throw new Error("Failed to connect to relays: " + error.message);
        }
    },
    
    // Start the game after successful login
    startGame: async function() {
        this.setLoginStatus("Starting game...");
        
        try {
            if (!this.nostr || !this.game) {
                throw new Error("Required modules not initialized");
            }
            
            // Load player profile
            await this.nostr.loadPlayerProfile();
            
            // Initialize game systems in the correct order
            this.game.init();
            
            // Initialize audio system first (needed for voice chat)
            if (this.audio) {
                this.audio.init();
            }
            
            // Now initialize zaps system (depends on Player.pubkey being set)
            if (this.zaps) {
                this.zaps.initAfterLogin();
            }
            
            // Request user data from relays
            this.nostr.subscribeToProfiles();
            this.nostr.subscribeToEvents();
            
            // Generate initial world items
            this.game.generateWorldItems();
            
            // Update UI
            if (this.ui) {
                this.ui.updatePlayerProfile();
                this.ui.updateRelaySelector();
                this.ui.hideLoginScreen();
            } else {
                // Simple hide login screen if UI module not available
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'none';
                }
            }
            
            // Start game loop
            this.game.start();
            
            if (this.ui) {
                this.ui.showToast("Welcome to Relay World!", "success");
            } else {
                this.showTempToast("Welcome to Relay World!", "success");
            }
            
            return true;
            
        } catch (error) {
            console.error("[Relay World] Failed to start game:", error);
            throw new Error("Failed to start game: " + error.message);
        }
    },
    
    // Log debug messages
    log: function(message, type = 'info') {
        if (!this.debug) return;
        
        switch (type) {
            case 'error':
                console.error(`[Relay World] ${message}`);
                break;
            case 'warn':
                console.warn(`[Relay World] ${message}`);
                break;
            case 'success':
                console.log(`[Relay World] %c${message}`, 'color: green');
                break;
            default:
                console.log(`[Relay World] ${message}`);
        }
    }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    RelayWorld.init();
});

// Handle window beforeunload to clean up resources
window.addEventListener('beforeunload', () => {
    if (RelayWorld.audio) {
        RelayWorld.audio.cleanupVoiceChat();
    }
    
    if (RelayWorld.nostr) {
        // Close relay connections gracefully
        RelayWorld.nostr.closeAllRelays();
    }
});
