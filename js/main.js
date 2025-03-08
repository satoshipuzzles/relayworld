/**
 * main.js - Entry point for Relay World
 * Initializes the core system and loads modules
 */

// Import core modules
import { RelayWorldCore } from './core/relay-world-core.js';
import { ConfigManager } from './core/config.js';

// Import game modules
import { AuthModule } from './modules/auth-module.js';
import { NostrModule } from './modules/nostr-module.js';
import { DMModule } from './modules/dm-module.js';
import { GameModule } from './modules/game-module.js';
import { PlayerModule } from './modules/player-module.js';
import { ItemsModule } from './modules/items-module.js';
import { UIModule } from './modules/ui-module.js';
import { AudioModule } from './modules/audio-module.js';
import { ZapsModule } from './modules/zaps-module.js';
import { MarketplaceModule } from './modules/marketplace-module.js';
import { AchievementsModule } from './modules/achievements-module.js';
import { GuildModule } from './modules/guild-module.js';

// Import utilities
import { Utils } from './utils/utils.js';
import { DebugUtils } from './utils/debug.js';

// Main application setup
const RelayWorld = {
    version: '1.0.0',
    debug: true,
    initialized: false,
    
    // Initialize the application
    init: async function() {
        console.log("[Relay World] Initializing application...");
        
        try {
            // Show temporary loading UI
            this._showLoadingScreen();
            
            // Initialize core module system
            await this._initCore();
            
            // Register all modules
            this._registerModules();
            
            // Load configuration
            await this._loadConfig();
            
            // Initialize all modules
            await RelayWorldCore.init();
            
            // Set up global event handlers
            this._setupGlobalEvents();
            
            // Setup is complete
            this.initialized = true;
            this._hideLoadingScreen();
            
            console.log("[Relay World] Initialization complete");
            
            // Initialize debug tools
            if (this.debug) {
                DebugUtils.addGlobalDebugMethods();
            }
            
        } catch (error) {
            console.error("[Relay World] Initialization failed:", error);
            this._showErrorScreen(error);
            throw error;
        }
    },
    
    // Initialize core system
    _initCore: async function() {
        console.log("[Relay World] Initializing core system...");
        
        // Log system information
        this._logSystemInfo();
        
        // Initialize event bus
        RelayWorldCore.eventBus.init();
        
        // Initialize config manager
        await ConfigManager.init();
        
        return true;
    },
    
    // Register all modules
    _registerModules: function() {
        console.log("[Relay World] Registering modules...");
        
        // Register utility modules first
        RelayWorldCore.registerModule('utils', Utils);
        RelayWorldCore.registerModule('debug', DebugUtils);
        
        // Register core gameplay modules
        RelayWorldCore.registerModule('auth', AuthModule);
        RelayWorldCore.registerModule('nostr', NostrModule);
        RelayWorldCore.registerModule('dm', DMModule);
        RelayWorldCore.registerModule('player', PlayerModule);
        RelayWorldCore.registerModule('items', ItemsModule);
        RelayWorldCore.registerModule('game', GameModule);
        RelayWorldCore.registerModule('ui', UIModule);
        RelayWorldCore.registerModule('audio', AudioModule);
        RelayWorldCore.registerModule('zaps', ZapsModule);
        
        // Register optional modules
        RelayWorldCore.registerModule('marketplace', MarketplaceModule);
        RelayWorldCore.registerModule('achievements', AchievementsModule);
        RelayWorldCore.registerModule('guild', GuildModule);
        
        console.log("[Relay World] All modules registered");
    },
    
    // Load configuration
    _loadConfig: async function() {
        console.log("[Relay World] Loading configuration...");
        
        // Load default configuration
        const defaultConfig = {
            // Game configuration
            WORLD_SIZE: 3000,
            
            // Relay configuration
            GAME_RELAY: "wss://relay.nostrfreaks.com", // Dedicated game relay
            LOGIN_RELAY: "wss://relay.damus.io",       // Default login relay
            EXPLORER_RELAYS: [
                "wss://relay.damus.io",
                "wss://relay.nostr.band",
                "wss://nos.lol",
                "wss://nostr.wine"
            ],
            
            // Game mechanics
            VOICE_CHAT_RANGE: 300,
            INTERACTION_RANGE: 100,
            NPC_LIMIT: 150,
            
            // Feature flags
            ENABLE_VOICE_CHAT: true,
            ENABLE_ZAPS: true,
            ENABLE_MARKETPLACE: true,
            ENABLE_GUILDS: false,
            ENABLE_ACHIEVEMENTS: true,
            
            // Debug settings
            DEBUG_MODE: this.debug
        };
        
        // Apply default configuration
        for (const [key, value] of Object.entries(defaultConfig)) {
            RelayWorldCore.setConfig(key, value);
        }
        
        // Load saved configuration from localStorage
        try {
            const savedConfig = localStorage.getItem('relayworld_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                for (const [key, value] of Object.entries(config)) {
                    RelayWorldCore.setConfig(key, value);
                }
                console.log("[Relay World] Loaded saved configuration");
            }
        } catch (error) {
            console.warn("[Relay World] Failed to load saved configuration:", error);
        }
        
        console.log("[Relay World] Configuration loaded");
    },
    
    // Set up global event handlers
    _setupGlobalEvents: function() {
        // Handle authentication events
        RelayWorldCore.eventBus.on('auth:login', this._handleLogin.bind(this));
        RelayWorldCore.eventBus.on('auth:logout', this._handleLogout.bind(this));
        
        // Handle error events
        RelayWorldCore.eventBus.on('error', this._handleError.bind(this));
        
        // Handle beforeunload event
        window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
    },
    
    // Handle login event
    _handleLogin: function(data) {
        console.log("[Relay World] User logged in:", data.pubkey.substring(0, 8));
    },
    
    // Handle logout event
    _handleLogout: function() {
        console.log("[Relay World] User logged out");
    },
    
    // Handle error event
    _handleError: function(error) {
        console.error("[Relay World] Error:", error);
    },
    
    // Handle beforeunload event
    _handleBeforeUnload: function(event) {
        // Clean up resources
        const audioModule = RelayWorldCore.getModule('audio');
        if (audioModule && audioModule.cleanupVoiceChat) {
            audioModule.cleanupVoiceChat();
        }
        
        // Close Nostr connections
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (nostrModule && nostrModule.closeAllRelays) {
            nostrModule.closeAllRelays();
        }
        
        // Save configuration
        ConfigManager.saveConfig();
    },
    
    // Log system information
    _logSystemInfo: function() {
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
    
    // Show temporary loading screen
    _showLoadingScreen: function() {
        const loadingScreen = document.getElementById('loading-indicator');
        if (loadingScreen) {
            loadingScreen.classList.remove('hide');
        }
    },
    
    // Hide loading screen
    _hideLoadingScreen: function() {
        const loadingScreen = document.getElementById('loading-indicator');
        if (loadingScreen) {
            loadingScreen.classList.add('hide');
        }
    },
    
    // Show error screen
    _showErrorScreen: function(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-screen';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h1>Initialization Error</h1>
                <p>${error.message || 'Unknown error occurred during initialization'}</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    RelayWorld.init().catch(error => {
        console.error("Failed to initialize Relay World:", error);
    });
});

// Export RelayWorld object for global access
window.RelayWorld = RelayWorld;
