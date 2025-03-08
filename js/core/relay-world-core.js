/**
 * relay-world-core.js
 * Core module system for Relay World with enhanced Nostr integration
 */

import { EventBus } from './event-bus.js';
import { ConfigManager } from './config.js';

export const RelayWorldCore = {
    // Module registry
    modules: new Map(),
    
    // Reference to the event bus
    eventBus: EventBus,
    
    // Reference to the config manager
    config: ConfigManager,
    
    // Register a module
    registerModule: function(name, module) {
        if (this.modules.has(name)) {
            console.warn(`[Core] Module "${name}" is being replaced`);
        }
        
        this.modules.set(name, module);
        console.log(`[Core] Registered module: ${name}`);
        
        // If module has an init method, it will be called during initialization
        return this; // For chaining
    },
    
    // Get a registered module
    getModule: function(name) {
        if (!this.modules.has(name)) {
            console.warn(`[Core] Module "${name}" not found`);
            return null;
        }
        return this.modules.get(name);
    },
    
    // Set configuration
    setConfig: function(key, value) {
        ConfigManager.setConfig(key, value);
        return this; // For chaining
    },
    
    // Get configuration
    getConfig: function(key, defaultValue = null) {
        return ConfigManager.getConfig(key, defaultValue);
    },
    
    // Initialize all modules
    init: async function() {
        console.log("[Core] Initializing Relay World core...");
        
        // Initialize modules in order of dependencies
        const initOrder = this._calculateInitOrder();
        
        for (const moduleName of initOrder) {
            const module = this.modules.get(moduleName);
            
            if (typeof module.init === 'function') {
                try {
                    console.log(`[Core] Initializing module: ${moduleName}`);
                    await module.init();
                } catch (error) {
                    console.error(`[Core] Failed to initialize module "${moduleName}":`, error);
                    // Don't halt initialization for non-critical modules
                    if (module.critical) {
                        throw error;
                    }
                }
            }
        }
        
        console.log("[Core] Relay World core initialized");
        this.eventBus.emit('core:ready', null);
        return this;
    },
    
    // Calculate initialization order based on dependencies
    _calculateInitOrder: function() {
        const visited = new Set();
        const order = [];
        
        // Find modules with the lowest priority first
        const prioritizedModules = Array.from(this.modules.entries())
            .sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));
        
        const visit = (moduleName) => {
            if (visited.has(moduleName)) return;
            
            visited.add(moduleName);
            
            const module = this.modules.get(moduleName);
            if (module && module.dependencies) {
                for (const dep of module.dependencies) {
                    if (this.modules.has(dep)) {
                        visit(dep);
                    } else {
                        console.warn(`[Core] Module "${moduleName}" depends on "${dep}" which is not registered`);
                    }
                }
            }
            
            order.push(moduleName);
        };
        
        for (const [moduleName] of prioritizedModules) {
            visit(moduleName);
        }
        
        return order;
    }
};
