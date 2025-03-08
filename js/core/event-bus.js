/**
 * event-bus.js
 * Event bus for inter-module communication
 */

export const EventBus = {
    // Storage for event listeners
    listeners: new Map(),
    
    // Initialize the event bus
    init: function() {
        console.log("[EventBus] Initializing event bus");
        return this;
    },
    
    // Subscribe to an event
    on: function(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return this; // For chaining
    },
    
    // Publish an event
    emit: function(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in listener for "${event}":`, error);
                }
            });
        }
        return this; // For chaining
    },
    
    // Remove a specific listener
    off: function(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
        return this; // For chaining
    },
    
    // Remove all listeners for an event
    offAll: function(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);
        }
        return this; // For chaining
    },
    
    // Listen for an event once
    once: function(event, callback) {
        // Create a wrapper that will call the callback and remove itself
        const onceCallback = (data) => {
            this.off(event, onceCallback);
            callback(data);
        };
        
        return this.on(event, onceCallback);
    },
    
    // Check if an event has listeners
    hasListeners: function(event) {
        return this.listeners.has(event) && this.listeners.get(event).length > 0;
    },
    
    // Get number of listeners for an event
    listenerCount: function(event) {
        if (!this.listeners.has(event)) {
            return 0;
        }
        return this.listeners.get(event).length;
    },
    
    // Clear all event listeners
    clear: function() {
        this.listeners.clear();
        return this;
    }
};
