/**
 * Configuration settings for Relay World 2.0
 * This module manages all configurable parameters for the game
 * and allows for easy adjustment through environment variables or defaults.
 */

const config = (function() {
    // Helper to get configuration from environment variables with fallback
    function getConfig(key, defaultValue) {
        // In a browser environment, we'll look for data attributes on the script tag
        const scriptTag = document.querySelector('script[data-config]');
        if (scriptTag && scriptTag.dataset[key.toLowerCase()]) {
            return scriptTag.dataset[key.toLowerCase()];
        }
        
        // Otherwise, use the default value
        return defaultValue;
    }
    
    // Parse comma-separated string into array
    function parseArray(str) {
        if (!str) return [];
        return str.split(',').map(item => item.trim());
    }
    
    // Convert string to proper type
    function parseValue(value, defaultValue) {
        if (value === undefined) return defaultValue;
        
        // If default is a number, parse as number
        if (typeof defaultValue === 'number') {
            return parseFloat(value);
        }
        
        // If default is a boolean, parse as boolean
        if (typeof defaultValue === 'boolean') {
            // Make sure value is a string before calling toLowerCase
            return typeof value === 'string' && value.toLowerCase() === 'true';
        }
        
        // Otherwise treat as string
        return value;
    }
    
    // Game Identification
    const GAME_ID = 'relay-world-2.0';
    const GAME_VERSION = '0.1.0';
    
    // World Settings
    const WORLD_WIDTH = parseValue(getConfig('WORLD_WIDTH', 3000), 3000);
    const WORLD_HEIGHT = parseValue(getConfig('WORLD_HEIGHT', 3000), 3000);
    const MAX_PLAYERS = parseValue(getConfig('MAX_PLAYERS', 1000), 1000);
    const NPC_LIMIT = parseValue(getConfig('NPC_LIMIT', 500), 500);
    
    // Relay Configuration
    const GAME_RELAY_URL = getConfig('GAME_RELAY_URL', 'wss://relay.damus.io');
    const DEFAULT_RELAYS = parseArray(getConfig('DEFAULT_RELAYS', 'wss://relay.damus.io,wss://relay.snort.social'));
    
    // Resource Settings
    const RESOURCE_DENSITY = parseValue(getConfig('RESOURCE_DENSITY', 0.05), 0.05);
    const RESOURCE_RESPAWN_TIME = parseValue(getConfig('RESOURCE_RESPAWN_TIME', 300), 300); // in seconds
    const WOOD_GATHER_TIME = parseValue(getConfig('WOOD_GATHER_TIME', 5), 5); // in seconds
    const STONE_GATHER_TIME = parseValue(getConfig('STONE_GATHER_TIME', 10), 10); // in seconds
    const METAL_GATHER_TIME = parseValue(getConfig('METAL_GATHER_TIME', 20), 20); // in seconds
    
    // Building Settings
    const MAX_STRUCTURE_HEIGHT = parseValue(getConfig('MAX_STRUCTURE_HEIGHT', 10), 10);
    const STRUCTURE_DECAY_RATE = parseValue(getConfig('STRUCTURE_DECAY_RATE', 0.01), 0.01); // daily decay rate
    const MAX_STRUCTURES_PER_REGION = parseValue(getConfig('MAX_STRUCTURES_PER_REGION', 50), 50);
    
    // Land System
    const LAND_CLAIM_SIZE = parseValue(getConfig('LAND_CLAIM_SIZE', 100), 100); // size in units
    const LAND_CLAIM_COST = parseValue(getConfig('LAND_CLAIM_COST', 1000), 1000); // cost in sats
    const LAND_CLAIM_EXPIRY = parseValue(getConfig('LAND_CLAIM_EXPIRY', 30), 30); // days until expiry
    
    // Lightning Integration
    const LNBITS_URL = getConfig('LNBITS_URL', '');
    const LNBITS_API_KEY = getConfig('LNBITS_API_KEY', '');
    const LNBITS_WEBHOOK_URL = getConfig('LNBITS_WEBHOOK_URL', '');
    
    // Voice Chat Settings
    const VOICE_CHAT_RANGE = parseValue(getConfig('VOICE_CHAT_RANGE', 300), 300); // range in world units
    const VOICE_QUALITY = getConfig('VOICE_QUALITY', 'medium'); // low, medium, high
    
    // Nostr Event Kinds
    const EVENT_KINDS = {
        PLAYER_POSITION: 420001,
        PLAYER_STATS: 420002,
        PLAYER_INVENTORY: 420003,
        PLAYER_AVATAR: 420005,
        STRUCTURE: 420101,
        RESOURCE_NODE: 420102,
        WEATHER: 420103,
        LAND_CLAIM: 420104,
        RESOURCE_COLLECTION: 420201,
        BUILDING_ACTION: 420202,
        GUILD_MANAGEMENT: 420301,
        CHAT_MESSAGE: 420304,
        ZAP_EFFECT: 420401,
        // Standard Nostr event kinds
        ZAP_REQUEST: 9734,
        ZAP_RECEIPT: 9735
    };
    
    // Region size for spatial partitioning
    const REGION_SIZE = 100; // Size of each region in world units
    
    // Debug mode
    const DEBUG_MODE = parseValue(getConfig('DEBUG_MODE', true), true);
    
    // Export all configuration parameters
    return {
        GAME_ID,
        GAME_VERSION,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        MAX_PLAYERS,
        NPC_LIMIT,
        GAME_RELAY_URL,
        DEFAULT_RELAYS,
        RESOURCE_DENSITY,
        RESOURCE_RESPAWN_TIME,
        WOOD_GATHER_TIME,
        STONE_GATHER_TIME,
        METAL_GATHER_TIME,
        MAX_STRUCTURE_HEIGHT,
        STRUCTURE_DECAY_RATE,
        MAX_STRUCTURES_PER_REGION,
        LAND_CLAIM_SIZE,
        LAND_CLAIM_COST,
        LAND_CLAIM_EXPIRY,
        LNBITS_URL,
        LNBITS_API_KEY,
        LNBITS_WEBHOOK_URL,
        VOICE_CHAT_RANGE,
        VOICE_QUALITY,
        EVENT_KINDS,
        REGION_SIZE,
        DEBUG_MODE
    };
})();

// Make sure config is available globally
window.config = config;
