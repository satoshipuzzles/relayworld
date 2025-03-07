/**
 * Nostr Events Module for Relay World 2.0
 * Handles creation, processing, and management of various
 * game-specific Nostr event types.
 */

const events = (function() {
    // Private members
    const eventHandlers = new Map(); // Map of event kinds to handler functions
    const pendingEvents = new Map(); // Map of event IDs to pending events
    
    /**
     * Initialize event handlers
     */
    function initialize() {
        debug.log("Initializing event handlers...");
        
        // Register handlers for each event kind
        registerEventHandler(config.EVENT_KINDS.PLAYER_POSITION, handlePlayerPosition);
        registerEventHandler(config.EVENT_KINDS.PLAYER_STATS, handlePlayerStats);
        registerEventHandler(config.EVENT_KINDS.PLAYER_INVENTORY, handlePlayerInventory);
        registerEventHandler(config.EVENT_KINDS.PLAYER_AVATAR, handlePlayerAvatar);
        registerEventHandler(config.EVENT_KINDS.STRUCTURE, handleStructure);
        registerEventHandler(config.EVENT_KINDS.RESOURCE_NODE, handleResourceNode);
        registerEventHandler(config.EVENT_KINDS.WEATHER, handleWeather);
        registerEventHandler(config.EVENT_KINDS.LAND_CLAIM, handleLandClaim);
        registerEventHandler(config.EVENT_KINDS.RESOURCE_COLLECTION, handleResourceCollection);
        registerEventHandler(config.EVENT_KINDS.BUILDING_ACTION, handleBuildingAction);
        registerEventHandler(config.EVENT_KINDS.GUILD_MANAGEMENT, handleGuildManagement);
        registerEventHandler(config.EVENT_KINDS.CHAT_MESSAGE, handleChatMessage);
        registerEventHandler(config.EVENT_KINDS.ZAP_EFFECT, handleZapEffect);
        
        // Standard Nostr events
        registerEventHandler(config.EVENT_KINDS.ZAP_REQUEST, handleZapRequest);
        registerEventHandler(config.EVENT_KINDS.ZAP_RECEIPT, handleZapReceipt);
    }
    
    /**
     * Register a handler for a specific event kind
     * @param {number} kind - Nostr event kind
     * @param {Function} handler - Handler function
     */
    function registerEventHandler(kind, handler) {
        eventHandlers.set(kind, handler);
    }
    
    /**
     * Process an incoming Nostr event
     * @param {Object} event - Nostr event
     */
    function processEvent(event) {
        // Check if we have a handler for this event kind
        if (!eventHandlers.has(event.kind)) {
            debug.warn(`No handler registered for event kind: ${event.kind}`);
            return;
        }
        
        try {
            // Call the appropriate handler
            eventHandlers.get(event.kind)(event);
        } catch (error) {
            debug.error(`Error processing event (kind: ${event.kind}):`, error);
        }
    }
    
    /**
     * Create and publish a player position update event
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Promise<boolean>} - Success status
     */
    async function updatePlayerPosition(x, y) {
        try {
            const position = {
                x: parseFloat(x.toFixed(2)),
                y: parseFloat(y.toFixed(2)),
                timestamp: Date.now()
            };
            
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.PLAYER_POSITION,
                JSON.stringify(position),
                [
                    ["t", "position"],
                    ["r", nostrClient.getRegionForPosition(x, y)],
                    ["g", config.GAME_ID]
                ]
            );
            
            // Sign and publish the event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error("Failed to update player position:", error);
            return false;
        }
    }
    
    /**
     * Create and publish a resource collection event
     * @param {string} resourceId - ID of the resource
     * @param {string} resourceType - Type of resource (wood, stone, metal)
     * @param {number} amount - Amount collected
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Promise<boolean>} - Success status
     */
    async function collectResource(resourceId, resourceType, amount, x, y) {
        try {
            const resourceData = {
                resourceId,
                resourceType,
                amount,
                position: { x, y },
                timestamp: Date.now()
            };
            
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.RESOURCE_COLLECTION,
                JSON.stringify(resourceData),
                [
                    ["t", "gather"],
                    ["r", nostrClient.getRegionForPosition(x, y)],
                    ["g", config.GAME_ID],
                    ["resource", resourceId]
                ]
            );
            
            // Sign and publish the event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error("Failed to publish resource collection:", error);
            return false;
        }
    }
    
    /**
     * Create and publish a structure placement event
     * @param {Object} blueprint - Blueprint object
     * @param {Object} position - {x, y, z} coordinates
     * @param {number} rotation - Rotation in radians
     * @returns {Promise<boolean>} - Success status
     */
    async function placeStructure(blueprint, position, rotation) {
        try {
            // Generate unique structure ID
            const structureId = `${blueprint.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const structureData = {
                type: blueprint.type,
                position: position,
                rotation: rotation,
                size: blueprint.size,
                materials: blueprint.materials,
                health: 100,
                permissions: {
                    owner: nostrClient.getPubkey(),
                    public: false,
                    whitelist: []
                },
                properties: blueprint.properties || {}
            };
            
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.STRUCTURE,
                JSON.stringify(structureData),
                [
                    ["t", "structure"],
                    ["r", nostrClient.getRegionForPosition(position.x, position.y)],
                    ["g", config.GAME_ID],
                    ["id", structureId]
                ]
            );
            
            // Sign and publish the event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error("Failed to publish structure placement:", error);
            return false;
        }
    }
    
    /**
     * Create and publish a chat message
     * @param {string} message - Message content
     * @param {string} channelType - Channel type: "local", "global", or "guild"
     * @param {string} channel - Channel identifier (region for local, guild ID for guild)
     * @returns {Promise<boolean>} - Success status
     */
    async function sendChatMessage(message, channelType = "local", channel = null) {
        try {
            // For local chat, use current player position
            if (channelType === "local" && !channel) {
                const playerPosition = player.getPosition();
                channel = nostrClient.getRegionForPosition(playerPosition.x, playerPosition.y);
            }
            
            const tags = [
                ["t", "chat"],
                ["g", config.GAME_ID],
                ["channel", channelType]
            ];
            
            if (channel) {
                tags.push([channelType, channel]);
            }
            
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.CHAT_MESSAGE,
                message,
                tags
            );
            
            // Sign and publish
            const signedEvent = await nostrClient.signEvent(event);
            
            // Local chat goes to game relay, global chat goes to both
            await relays.publishToGameRelay(signedEvent);
            
            if (channelType === "global") {
                await relays.publishToExplorerRelay(signedEvent);
            }
            
            return true;
        } catch (error) {
            debug.error("Failed to send chat message:", error);
            return false;
        }
    }
    
    /**
     * Create and publish a land claim event
     * @param {string} regionId - Region identifier
     * @param {string} name - Custom name for the region
     * @param {Object} boundaries - Region boundaries
     * @returns {Promise<boolean>} - Success status
     */
    async function claimLand(regionId, name, boundaries) {
        try {
            const claimData = {
                region: {
                    id: regionId,
                    name: name,
                    boundaries: boundaries
                },
                claimType: "personal",
                expiration: Math.floor(Date.now() / 1000) + (config.LAND_CLAIM_EXPIRY * 86400)
            };
            
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.LAND_CLAIM,
                JSON.stringify(claimData),
                [
                    ["t", "claim"],
                    ["g", config.GAME_ID],
                    ["r", regionId]
                ]
            );
            
            // Sign and publish the event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error("Failed to publish land claim:", error);
            return false;
        }
    }
    
    /**
     * Update player inventory
     * @param {Object} inventory - Inventory object
     * @returns {Promise<boolean>} - Success status
     */
    async function updateInventory(inventory) {
        try {
            // Create the event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.PLAYER_INVENTORY,
                JSON.stringify(inventory),
                [
                    ["t", "inventory"],
                    ["g", config.GAME_ID]
                ]
            );
            
            // Sign and publish the event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error("Failed to update inventory:", error);
            return false;
        }
    }
    
    // Event Handlers (these would be called when events are received)
    
    function handlePlayerPosition(event) {
        try {
            const position = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Update player position in the game world
            if (player.exists(pubkey)) {
                player.updatePosition(pubkey, position.x, position.y);
            } else {
                // Create a new player if they don't exist yet
                player.createRemotePlayer(pubkey, position.x, position.y);
            }
        } catch (error) {
            debug.error("Error handling player position:", error);
        }
    }
    
    function handlePlayerStats(event) {
        // Implementation for player stats events
    }
    
    function handlePlayerInventory(event) {
        // Implementation for player inventory events
    }
    
    function handlePlayerAvatar(event) {
        // Implementation for player avatar events
    }
    
    function handleStructure(event) {
        try {
            const structure = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Find structure ID from tags
            const idTag = event.tags.find(tag => tag[0] === 'id');
            if (!idTag) {
                debug.warn("Structure event missing ID tag");
                return;
            }
            
            const structureId = idTag[1];
            
            // Add structure to the game world
            building.addStructure(structureId, pubkey, structure);
        } catch (error) {
            debug.error("Error handling structure event:", error);
        }
    }
    
    function handleResourceNode(event) {
        try {
            const nodeData = JSON.parse(event.content);
            
            // Update resource node in the game world
            resources.updateResourceNode(nodeData.resourceId, nodeData);
        } catch (error) {
            debug.error("Error handling resource node event:", error);
        }
    }
    
    function handleWeather(event) {
        // Implementation for weather events
    }
    
    function handleLandClaim(event) {
        try {
            const claimData = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Add land claim to the game world
            building.addLandClaim(
                claimData.region.id,
                pubkey,
                claimData.region.name,
                claimData.region.boundaries,
                claimData.expiration
            );
        } catch (error) {
            debug.error("Error handling land claim event:", error);
        }
    }
    
    function handleResourceCollection(event) {
        try {
            const collectionData = JSON.parse(event.content);
            const pubkey = event.pubkey;
            
            // Update resource node state
            resources.depleteResourceNode(
                collectionData.resourceId,
                collectionData.resourceType,
                collectionData.amount
            );
            
            // Show visual effects if nearby
            const playerPos = player.getPosition();
            const resourcePos = collectionData.position;
            
            const distance = Math.sqrt(
                Math.pow(playerPos.x - resourcePos.x, 2) +
                Math.pow(playerPos.y - resourcePos.y, 2)
            );
            
            if (distance < 500) { // Only show effects if within visible range
                resources.showCollectionEffect(
                    resourcePos.x,
                    resourcePos.y,
                    collectionData.resourceType,
                    collectionData.amount
                );
            }
        } catch (error) {
            debug.error("Error handling resource collection event:", error);
        }
    }
    
    function handleBuildingAction(event) {
        // Implementation for building action events
    }
    
    function handleGuildManagement(event) {
        // Implementation for guild management events
    }
    
    function handleChatMessage(event) {
        try {
            const message = event.content;
            const pubkey = event.pubkey;
            
            // Determine channel type from tags
            const channelTag = event.tags.find(tag => tag[0] === 'channel');
            if (!channelTag) {
                debug.warn("Chat message missing channel tag");
                return;
            }
            
            const channelType = channelTag[1];
            
            // Get channel-specific identifier
            let channel = null;
            if (channelType === "local") {
                const regionTag = event.tags.find(tag => tag[0] === 'local');
                channel = regionTag ? regionTag[1] : null;
            } else if (channelType === "guild") {
                const guildTag = event.tags.find(tag => tag[0] === 'guild');
                channel = guildTag ? guildTag[1] : null;
            }
            
            // Update chat UI
            ui.addChatMessage(pubkey, message, channelType, channel);
        } catch (error) {
            debug.error("Error handling chat message:", error);
        }
    }
    
    function handleZapEffect(event) {
        // Implementation for zap effect events
    }
    
    function handleZapRequest(event) {
        // Implementation for zap request events
    }
    
    function handleZapReceipt(event) {
        // Implementation for zap receipt events
    }
    
    // Public API
    return {
        initialize,
        processEvent,
        updatePlayerPosition,
        collectResource,
        placeStructure,
        sendChatMessage,
        claimLand,
        updateInventory
    };
})();
