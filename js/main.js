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
    init: async function() {
        console.log("[Relay World] Initializing application...");
        
        try {
            // Initialize modules in dependency order
            Utils.init();
            Player.init();
            Items.init();
            UI.init();
            
            this.game = Game;
            this.nostr = Nostr;
            this.ui = UI;
            this.zaps = Zaps;
            this.audio = Audio;
            this.player = Player;
            
            // Setup event listeners for login buttons
            document.getElementById('login-button').addEventListener('click', this.handleLogin.bind(this));
            document.getElementById('login-nwc').addEventListener('click', this.handleNWCLogin.bind(this));
            
            // Check if user has previously logged in
            const savedPubkey = localStorage.getItem('relayworld_pubkey');
            const savedRelays = localStorage.getItem('relayworld_relays');
            
            if (savedPubkey && savedRelays) {
                this.ui.showToast("Previous session found. Click login to reconnect.", "info");
            }
            
            this.initialized = true;
            console.log("[Relay World] Initialization complete. Ready for login.");
            
        } catch (error) {
            console.error("[Relay World] Initialization failed:", error);
            this.ui.showToast("Failed to initialize game. Please refresh the page.", "error");
        }
    },
    
    // Handle regular Nostr login via NIP-07
    handleLogin: async function() {
        console.log("[Relay World] Attempting login via NIP-07...");
        this.ui.setLoginStatus("Looking for Nostr extension...");
        document.getElementById('login-button').disabled = true;
        document.getElementById('login-loader').style.display = 'block';
        
        try {
            // Check for Nostr extension
            const isExtensionAvailable = await Nostr.isExtensionAvailable();
            if (!isExtensionAvailable) {
                throw new Error("No Nostr extension found. Please install one first.");
            }
            
            this.ui.setLoginStatus("Extension found! Requesting public key...");
            
            // Get public key from extension
            const pubkey = await Nostr.getPublicKey();
            if (!pubkey) {
                throw new Error("Could not get public key from extension.");
            }
            
            this.ui.setLoginStatus("Got public key, connecting to relays...");
            this.ui.playLoginSound();
            
            // Set player public key
            Player.setPubkey(pubkey);
            
            // Connect to relays
            await this.connectToRelays();
            
            // Start game
            await this.startGame();
            
            // Save login info for next time
            localStorage.setItem('relayworld_pubkey', pubkey);
            localStorage.setItem('relayworld_relays', JSON.stringify([...Nostr.relays]));
            
        } catch (error) {
            console.error("[Relay World] Login failed:", error);
            this.ui.showToast("Login failed: " + error.message, "error");
            this.ui.setLoginStatus("Login failed: " + error.message);
            document.getElementById('login-button').disabled = false;
            document.getElementById('login-loader').style.display = 'none';
        }
    },
    
    // Handle login via NWC (Nostr Wallet Connect)
    handleNWCLogin: async function() {
        console.log("[Relay World] Attempting login via NWC...");
        this.ui.setLoginStatus("Setting up NWC connection...");
        document.getElementById('login-nwc').disabled = true;
        document.getElementById('login-loader').style.display = 'block';
        
        try {
            // Show Bitcoin Connect modal
            document.getElementById('bitcoin-connect-modal').classList.remove('hide');
            
            // NWC connection is handled by the modal components
            // The zaps.js module will set up event listeners for these components
            
        } catch (error) {
            console.error("[Relay World] NWC login failed:", error);
            this.ui.showToast("NWC login failed: " + error.message, "error");
            this.ui.setLoginStatus("NWC login failed: " + error.message);
            document.getElementById('login-nwc').disabled = false;
            document.getElementById('login-loader').style.display = 'none';
        }
    },
    
    // Connect to Nostr relays
    connectToRelays: async function() {
        this.ui.setLoginStatus("Connecting to relays...");
        
        try {
            // Connect to default relays
            for (const relayUrl of this.config.DEFAULT_RELAYS) {
                await Nostr.connectRelay(relayUrl);
            }
            
            // Set active relay
            Nostr.setActiveRelay(this.config.DEFAULT_RELAYS[0]);
            
            this.ui.setLoginStatus("Connected to relays successfully!");
            return true;
            
        } catch (error) {
            console.error("[Relay World] Failed to connect to relays:", error);
            throw new Error("Failed to connect to relays: " + error.message);
        }
    },
    
    // Start the game after successful login
    startGame: async function() {
        this.ui.setLoginStatus("Starting game...");
        
        try {
            // Load player profile
            await Nostr.loadPlayerProfile();
            
            // Initialize game systems
            Game.init();
            
            // Initialize zaps system if NWC is available
            Zaps.init();
            
            // Initialize voice chat
            Audio.init();
            
            // Request user data from relays
            Nostr.subscribeToProfiles();
            Nostr.subscribeToEvents();
            
            // Generate initial world items
            Game.generateWorldItems();
            
            // Update UI
            this.ui.updatePlayerProfile();
            this.ui.updateRelaySelector();
            this.ui.hideLoginScreen();
            
            // Start game loop
            Game.start();
            
            this.ui.showToast("Welcome to Relay World!", "success");
            
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
