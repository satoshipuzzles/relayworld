/**
 * config.js
 * Configuration management for Relay World
 */

import { EventBus } from './event-bus.js';

export const ConfigManager = {
    // Configuration storage
    configs: new Map(),
    
    // Storage key for persisting configuration
    storageKey: 'relayworld_config',
    
    // Initialize the configuration manager
    init: async function() {
        console.log("[ConfigManager] Initializing configuration manager");
        
        // Load saved configuration
        await this.loadSavedConfig();
        
        return this;
    },
    
    // Set a configuration value
    setConfig: function(key, value) {
        const oldValue = this.configs.get(key);
        this.configs.set(key, value);
        
        // Notify about config change
        EventBus.emit('config:change', { key, value, oldValue });
        
        return this;
    },
    
    // Get a configuration value
    getConfig: function(key, defaultValue = null) {
        return this.configs.has(key) ? this.configs.get(key) : defaultValue;
    },
    
    // Check if a configuration key exists
    hasConfig: function(key) {
        return this.configs.has(key);
    },
    
    // Remove a configuration value
    removeConfig: function(key) {
        const hadKey = this.configs.has(key);
        const oldValue = this.configs.get(key);
        this.configs.delete(key);
        
        if (hadKey) {
            // Notify about config removal
            EventBus.emit('config:remove', { key, oldValue });
        }
        
        return this;
    },
    
    // Get all configuration as an object
    getAllConfig: function() {
        const configObj = {};
        for (const [key, value] of this.configs.entries()) {
            configObj[key] = value;
        }
        return configObj;
    },
    
    // Load configuration from localStorage
    loadSavedConfig: async function() {
        try {
            const savedConfig = localStorage.getItem(this.storageKey);
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                
                // Apply saved configuration
                for (const [key, value] of Object.entries(config)) {
                    this.configs.set(key, value);
                }
                
                console.log("[ConfigManager] Loaded saved configuration");
            }
        } catch (error) {
            console.warn("[ConfigManager] Failed to load saved configuration:", error);
        }
        
        return this;
    },
    
    // Save configuration to localStorage
    saveConfig: function() {
        try {
            const configObj = this.getAllConfig();
            localStorage.setItem(this.storageKey, JSON.stringify(configObj));
            console.log("[ConfigManager] Configuration saved");
            return true;
        } catch (error) {
            console.error("[ConfigManager] Failed to save configuration:", error);
            return false;
        }
    },
    
    // Reset configuration to defaults
    resetConfig: function() {
        this.configs.clear();
        localStorage.removeItem(this.storageKey);
        
        // Notify about config reset
        EventBus.emit('config:reset', null);
        
        return this;
    }
};
