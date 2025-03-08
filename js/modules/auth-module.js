/**
 * auth-module.js
 * Authentication handling for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const AuthModule = {
    // Module metadata
    name: "auth",
    description: "Authentication handling for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["utils"],
    priority: 5, // High priority, initialize early
    critical: true, // Critical module, fail if initialization fails
    
    // Module state
    initialized: false,
    authenticated: false,
    pubkey: null,
    authMethod: null, // 'extension', 'key', etc.
    
    // Login status callbacks
    loginStatusCallbacks: [],
    
    // Initialize authentication module
    init: function() {
        console.log("[Auth] Initializing authentication module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Check for saved authentication
        this._checkSavedAuth();
        
        this.initialized = true;
        console.log("[Auth] Authentication module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for login button click
        document.getElementById('login-button').addEventListener('click', this.startLogin.bind(this));
        
        // Listen for Nostr extension events
        window.addEventListener('message', this._handleExtensionMessage.bind(this));
    },
    
    // Check for saved authentication
    _checkSavedAuth: function() {
        try {
            const savedPubkey = localStorage.getItem('relayworld_pubkey');
            
            if (savedPubkey) {
                console.log("[Auth] Found saved authentication");
                this.setLoginStatus("Found saved session. Click login to reconnect.");
            }
        } catch (error) {
            console.warn("[Auth] Failed to check saved authentication:", error);
        }
    },
    
    // Handle messages from Nostr extension
    _handleExtensionMessage: function(event) {
        // Check for Nostr extension messages if needed
        // Most of the NIP-07 logic is handled via direct calls rather than messages
    },
    
    // Start login process
    startLogin: async function() {
        this.setLoginStatus("Starting login process...");
        
        const loginButton = document.getElementById('login-button');
        const loginLoader = document.getElementById('login-loader');
        
        if (loginButton) loginButton.disabled = true;
        if (loginLoader) loginLoader.style.display = 'block';
        
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            
            if (!nostrModule) {
                throw new Error("Nostr module not initialized");
            }
            
            this.setLoginStatus("Looking for Nostr extension...");
            
            // Check if extension is available
            const isExtensionAvailable = await nostrModule.isExtensionAvailable();
            
            if (!isExtensionAvailable) {
                throw new Error("No Nostr extension found. Please install one first.");
            }
            
            this.setLoginStatus("Extension found! Requesting public key...");
            
            // Get public key
            const pubkey = await nostrModule.getPublicKey();
            
            if (!pubkey) {
                throw new Error("Could not get public key from extension.");
            }
            
            // Set auth state
            this.authenticated = true;
            this.pubkey = pubkey;
            this.authMethod = 'extension';
            
            // Save to localStorage
            localStorage.setItem('relayworld_pubkey', pubkey);
            
            this.setLoginStatus("Authenticated! Connecting to relays...");
            
            // Emit login event
            RelayWorldCore.eventBus.emit('auth:login', { 
                pubkey,
                method: this.authMethod
            });
            
            // Update UI
            this.showLoginSuccess();
            
            return true;
        } catch (error) {
            console.error("[Auth] Login failed:", error);
            this.setLoginStatus("Login failed: " + error.message);
            
            if (loginButton) loginButton.disabled = false;
            if (loginLoader) loginLoader.style.display = 'none';
            
            // Emit error event
            RelayWorldCore.eventBus.emit('auth:error', { error });
            
            throw error;
        }
    },
    
    // Logout
    logout: function() {
        // Clear auth state
        this.authenticated = false;
        this.pubkey = null;
        this.authMethod = null;
        
        // Clear localStorage
        localStorage.removeItem('relayworld_pubkey');
        
        // Emit logout event
        RelayWorldCore.eventBus.emit('auth:logout', null);
        
        // Redirect to login screen
        window.location.reload();
        
        return true;
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        return this.authenticated && this.pubkey !== null;
    },
    
    // Get current user pubkey
    getCurrentUserPubkey: function() {
        return this.pubkey;
    },
    
    // Set login status message
    setLoginStatus: function(message) {
        const statusElement = document.getElementById('login-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        // Call registered callbacks
        for (const callback of this.loginStatusCallbacks) {
            try {
                callback(message);
            } catch (error) {
                console.error("[Auth] Error in login status callback:", error);
            }
        }
    },
    
    // Register login status callback
    onLoginStatus: function(callback) {
        if (typeof callback === 'function') {
            this.loginStatusCallbacks.push(callback);
        }
        return this;
    },
    
    // Show login success UI
    showLoginSuccess: function() {
        const loginButton = document.getElementById('login-button');
        const loginLoader = document.getElementById('login-loader');
        const loginExtras = document.querySelector('.login-extras');
        
        if (loginButton) {
            loginButton.textContent = 'CONNECTED';
            loginButton.classList.add('success');
            loginButton.disabled = true;
        }
        
        if (loginLoader) {
            loginLoader.style.display = 'none';
        }
        
        if (loginExtras) {
            loginExtras.classList.remove('hide');
        }
        
        this.setLoginStatus("Login successful! Loading game...");
        
        // Play login sound
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule && uiModule.playLoginSound) {
            uiModule.playLoginSound();
        }
        
        // Hide login screen after a delay
        setTimeout(() => {
            const uiModule = RelayWorldCore.getModule('ui');
            if (uiModule && uiModule.hideLoginScreen) {
                uiModule.hideLoginScreen();
            }
        }, 2000);
    }
};
