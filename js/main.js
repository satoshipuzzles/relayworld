/**
 * main.js - Entry point for Relay World
 * Handles initialization and coordinates between modules
 * Fixed version addressing export issues and connectivity
 */

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
            
            // Log system details
            this.logSystemInfo();
            
            // Initialize modules in dependency order
            if (!window.Utils) throw new Error("Utils module not loaded");
            if (!window.Player) throw new Error("Player module not loaded");
            if (!window.Items) throw new Error("Items module not loaded");
            if (!window.UI) throw new Error("UI module not loaded");

            window.Utils.init();
            window.Player.init();
            window.Items.init();
            window.UI.init();
            
            if (typeof window.UI.loadSoundsSimple === 'function') {
                window.UI.loadSoundsSimple();
            }
            
            // Assign module references
            this.game = window.Game || null;
            this.nostr = window.Nostr || null;
            this.ui = window.UI || null;
            this.zaps = window.Zaps || null;
            this.audio = window.Audio || null; // Fixed typo
            this.player = window.Player || null;
            
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
            
            // Initialize debug system if available
            if (window.Debug) {
                window.Debug.init();
                window.Debug.runDiagnostics();
                window.Debug.addGlobalDebugMethods();
            }
            
            this.initialized = true;
            console.log("[Relay World] Initialization complete. Ready for login.");
            
        } catch (error) {
            console.error("[Relay World] Initialization failed:", error);
            this.showTempToast("Failed to initialize game. Please refresh the page.", "error");
        }
    },
    
    // Log system information
    logSystemInfo: function() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const isSecure = window.isSecureContext;
        const hasCrypto = !!window.crypto;
        const hasWebSocket = !!window.WebSocket;
        const hasNostrExtension = !!window.nostr;
        
        console.log(`[Relay World] User Agent: ${userAgent}`);
        console.log(`[Relay World] Platform: ${platform}`);
        console.log(`[Relay World] Secure Context: ${isSecure}`);
        console.log(`[Relay World] Has Crypto API: ${hasCrypto}`);
        console.log(`[Relay World] Has WebSocket: ${hasWebSocket}`);
        console.log(`[Relay World] Has Nostr Extension: ${hasNostrExtension}`);
    },
    
    // Create a temporary UI for showing toasts before UI module is loaded
    createTemporaryUI: function() {
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
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },
    
    // Set login status text
    setLoginStatus: function(message) {
        const statusElement = document.getElementById('login-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },
    
    // Show NWC login option after successful Nostr login
    showNWCOption: function() {
        const loginExtras = document.querySelector('.login-extras');
        if (loginExtras) {
            loginExtras.classList.remove('hide');
        }
        
        const nwcButton = document.getElementById('login-nwc');
        if (nwcButton) {
            nwcButton.disabled = false;
        }
        
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
        
        const loginButton = document.getElementById('login-button');
        const loginLoader = document.getElementById('login-loader');
        
        if (loginButton) loginButton.disabled = true;
        if (loginLoader) loginLoader.style.display = 'block';
        
        try {
            if (!this.nostr) {
                throw new Error("Nostr module not found or not initialized");
            }
            
            const isExtensionAvailable = await this.nostr.isExtensionAvailable();
            if (!isExtensionAvailable) {
                throw new Error("No Nostr extension found. Please install one first.");
            }
            
            this.setLoginStatus("Extension found! Requesting public key...");
            
            const pubkey = await this.nostr.getPublicKey();
            if (!pubkey) {
                throw new Error("Could not get public key from extension.");
            }
            
            this.setLoginStatus("Got public key, connecting to relays...");
            
            if (this.ui && typeof this.ui.playSound === 'function') {
                this.ui.playSound("login");
            }
            
            if (this.player) {
                this.player.setPubkey(pubkey);
            } else {
                throw new Error("Player module not initialized");
            }
            
            await this.connectToRelays();
            this.showNWCOption();
            await this.startGame();
            
            localStorage.setItem('relayworld_pubkey', pubkey);
            localStorage.setItem('relayworld_relays', JSON.stringify([...this.nostr.relays]));
            
        } catch (error) {
            console.error("[Relay World] Login failed:", error);
            if (this.ui && typeof this.ui.showToast === 'function') {
                this.ui.showToast("Login failed: " + error.message, "error");
            } else {
                this.showTempToast("Login failed: " + error.message, "error");
            }
            this.setLoginStatus("Login failed: " + error.message);
            
            if (loginButton) loginButton.disabled = false;
            if (loginLoader) loginLoader.style.display = 'none';
        }
    },
    
    // Handle login via NWC (Nostr Wallet Connect)
    handleNWCLogin: async function() {
        if (!this.player || !this.player.pubkey) {
            if (this.ui && typeof this.ui.showToast === 'function') {
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
            const bcModal = document.getElementById('bitcoin-connect-modal');
            if (bcModal) {
                bcModal.classList.remove('hide');
            } else {
                throw new Error("Bitcoin Connect modal not found");
            }
            
        } catch (error) {
            console.error("[Relay World] NWC connection failed:", error);
            if (this.ui && typeof this.ui.showToast === 'function') {
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
            
            for (const relayUrl of this.config.DEFAULT_RELAYS) {
                try {
                    await this.nostr.connectRelay(relayUrl);
                } catch (error) {
                    console.warn(`[Relay World] Failed to connect to relay ${relayUrl}: ${error.message}`);
                }
            }
            
            if (this.nostr.relays.size === 0) {
                throw new Error("Failed to connect to any relays. Please check your internet connection and try again.");
            }
            
            const firstRelay = Array.from(this.nostr.relays)[0];
            this.nostr.setActiveRelay(firstRelay);
            
            this.setLoginStatus(`Connected to ${this.nostr.relays.size} relays successfully!`);
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
            
            await this.nostr.loadPlayerProfile();
            this.game.init();
            
            if (this.audio) {
                this.audio.init();
            }
            
            if (this.zaps) {
                this.zaps.initAfterLogin();
            }
            
            this.nostr.subscribeToProfiles();
            this.nostr.subscribeToEvents();
            this.game.generateWorldItems();
            
            if (this.ui) {
                this.ui.updatePlayerProfile();
                this.ui.updateRelaySelector();
                this.ui.hideLoginScreen();
            } else {
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'none';
                }
            }
            
            this.game.start();
            
            if (this.ui && typeof this.ui.showToast === 'function') {
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

// Handle window beforeunload to clean up resources
window.addEventListener('beforeunload', () => {
    if (RelayWorld.audio) {
        RelayWorld.audio.cleanupVoiceChat();
    }
    
    if (RelayWorld.nostr) {
        RelayWorld.nostr.closeAllRelays();
    }
});

// Export RelayWorld as the default export
export default RelayWorld;
