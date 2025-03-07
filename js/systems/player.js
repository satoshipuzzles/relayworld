/**
 * Player System Module for Relay World 2.0
 * Handles player movement, inventory, and interaction with other players
 */

const player = (function() {
    // Private members
    const remotePlayers = new Map(); // Map of pubkeys to player objects
    let localPlayer = null;
    const inventory = new Map(); // Map of resource types to amounts
    let lastPositionUpdate = 0;
    const POSITION_UPDATE_INTERVAL = 1000; // milliseconds
    
    /**
     * Initialize player system
     */
    function initialize() {
        debug.log("Initializing player system...");
        
        // Initialize empty inventory
        inventory.set(resources.RESOURCE_TYPES.WOOD, 0);
        inventory.set(resources.RESOURCE_TYPES.STONE, 0);
        inventory.set(resources.RESOURCE_TYPES.METAL, 0);
    }
    
    /**
     * Create local player after authentication
     * @returns {Promise<boolean>} - Success status
     */
    async function createLocalPlayer() {
        try {
            const pubkey = nostrClient.getPubkey();
            
            if (!pubkey) {
                throw new Error("No pubkey available");
            }
            
            // Generate a deterministic position from pubkey
            const position = nostrClient.generatePositionFromPubkey(pubkey);
            
            localPlayer = {
                pubkey: pubkey,
                x: position.x,
                y: position.y,
                name: pubkey.substring(0, 8) + '...',
                avatar: null,
                inventory: new Map(),
                isMoving: false,
                moveDirection: { x: 0, y: 0 }
            };
            
            // Fetch profile metadata if available
            try {
                const metadata = await relays.fetchUserMetadata(pubkey);
                if (metadata) {
                    if (metadata.name) {
                        localPlayer.name = metadata.name;
                    }
                    if (metadata.picture) {
                        localPlayer.avatar = metadata.picture;
                    }
                }
            } catch (metadataError) {
                debug.warn("Could not fetch user metadata:", metadataError);
            }
            
            // Create player DOM element
            createPlayerElement(pubkey, position.x, position.y, true);
            
            // Update player info in UI
            ui.updatePlayerInfo(localPlayer.name, localPlayer.avatar);
            
            // Center camera on player
            renderer.centerCameraOn(position.x, position.y);
            
            // Publish initial position
            await events.updatePlayerPosition(position.x, position.y);
            lastPositionUpdate = Date.now();
            
            debug.log(`Created local player at position (${position.x}, ${position.y})`);
            return true;
        } catch (error) {
            debug.error("Failed to create local player:", error);
            return false;
        }
    }
    
    /**
     * Create remote player from Nostr events
     * @param {string} pubkey - Player's public key
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - Remote player object
     */
    function createRemotePlayer(pubkey, x, y) {
        // Skip if this is the local player
        if (localPlayer && localPlayer.pubkey === pubkey) {
            return null;
        }
        
        // Skip if player already exists
        if (remotePlayers.has(pubkey)) {
            return remotePlayers.get(pubkey);
        }
        
        // Create new remote player
        const remotePlayer = {
            pubkey: pubkey,
            x: x,
            y: y,
            name: pubkey.substring(0, 8) + '...',
            avatar: null,
            lastUpdate: Date.now()
        };
        
        // Add to remote players map
        remotePlayers.set(pubkey, remotePlayer);
        
        // Create player DOM element
        createPlayerElement(pubkey, x, y, false);
        
        // Fetch profile metadata if available
        relays.fetchUserMetadata(pubkey)
            .then(metadata => {
                if (metadata) {
                    if (metadata.name) {
                        remotePlayer.name = metadata.name;
                        
                        // Update player DOM element name
                        const nameElement = document.getElementById(`player-name-${pubkey}`);
                        if (nameElement) {
                            nameElement.textContent = metadata.name;
                        }
                    }
                    
                    if (metadata.picture) {
                        remotePlayer.avatar = metadata.picture;
                        
                        // Could update player DOM element with avatar
                        // implementation depends on rendering approach
                    }
                }
            })
            .catch(error => {
                debug.warn(`Could not fetch metadata for ${pubkey}:`, error);
            });
        
        debug.log(`Created remote player ${pubkey} at (${x}, ${y})`);
        return remotePlayer;
    }
    
    /**
     * Create DOM element for a player
     * @param {string} pubkey - Player's public key
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} isLocal - Whether this is the local player
     */
    function createPlayerElement(pubkey, x, y, isLocal) {
        const playerElement = document.createElement('div');
        playerElement.id = `player-${pubkey}`;
        playerElement.className = isLocal ? 'player self' : 'player';
        playerElement.style.left = `${x}px`;
        playerElement.style.top = `${y}px`;
        
        // Add name tag
        const nameTag = document.createElement('div');
        nameTag.id = `player-name-${pubkey}`;
        nameTag.className = 'name-tag';
        
        // Truncate pubkey for display
        nameTag.textContent = pubkey.substring(0, 8) + '...';
        
        playerElement.appendChild(nameTag);
        
        // Add to game container
        document.getElementById('game-container').appendChild(playerElement);
    }
    
    /**
     * Update player movement based on input
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function updateMovement(deltaTime) {
        if (!localPlayer) return;
        
        const inputDirection = input.getMovementDirection();
        
        // Update movement state
        localPlayer.isMoving = (inputDirection.x !== 0 || inputDirection.y !== 0);
        localPlayer.moveDirection = inputDirection;
        
        if (!localPlayer.isMoving) return;
        
        // Calculate movement distance
        const moveSpeed = 200; // pixels per second
        const moveDistance = moveSpeed * deltaTime;
        
        // Calculate new position
        let newX = localPlayer.x + inputDirection.x * moveDistance;
        let newY = localPlayer.y + inputDirection.y * moveDistance;
        
        // Apply world boundaries
        newX = Math.max(0, Math.min(config.WORLD_WIDTH, newX));
        newY = Math.max(0, Math.min(config.WORLD_HEIGHT, newY));
        
        // Check for collisions with world objects
        const collision = physics.checkCollision(newX, newY);
        if (collision) {
            // Handle collision response
            if (collision.blockX) newX = localPlayer.x;
            if (collision.blockY) newY = localPlayer.y;
        }
        
        // Update position
        if (newX !== localPlayer.x || newY !== localPlayer.y) {
            localPlayer.x = newX;
            localPlayer.y = newY;
            
            // Update DOM element
            const playerElement = document.getElementById(`player-${localPlayer.pubkey}`);
            if (playerElement) {
                playerElement.style.left = `${newX}px`;
                playerElement.style.top = `${newY}px`;
            }
            
            // Update camera position
            renderer.centerCameraOn(newX, newY);
            
            // Broadcast position update periodically
            const currentTime = Date.now();
            if (currentTime - lastPositionUpdate > POSITION_UPDATE_INTERVAL) {
                events.updatePlayerPosition(newX, newY)
                    .catch(error => debug.error("Failed to broadcast position:", error));
                lastPositionUpdate = currentTime;
            }
        }
    }
    
    /**
     * Update position of a remote player
     * @param {string} pubkey - Player's public key
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    function updatePosition(pubkey, x, y) {
        // Skip if this is the local player
        if (localPlayer && localPlayer.pubkey === pubkey) {
            return;
        }
        
        // Get remote player
        let remotePlayer = remotePlayers.get(pubkey);
        
        // Create player if they don't exist
        if (!remotePlayer) {
            remotePlayer = createRemotePlayer(pubkey, x, y);
            return;
        }
        
        // Update position
        remotePlayer.x = x;
        remotePlayer.y = y;
        remotePlayer.lastUpdate = Date.now();
        
        // Update DOM element
        const playerElement = document.getElementById(`player-${pubkey}`);
        if (playerElement) {
            playerElement.style.left = `${x}px`;
            playerElement.style.top = `${y}px`;
        }
    }
    
    /**
     * Add resources to player's inventory
     * @param {string} type - Resource type
     * @param {number} amount - Amount to add
     */
    function addToInventory(type, amount) {
        const currentAmount = inventory.get(type) || 0;
        inventory.set(type, currentAmount + amount);
        
        // Broadcast inventory update
        events.updateInventory(Object.fromEntries(inventory))
            .catch(error => debug.error("Failed to broadcast inventory update:", error));
        
        debug.log(`Added ${amount} ${type} to inventory, now have ${currentAmount + amount}`);
    }
    
    /**
     * Remove resources from player's inventory
     * @param {string} type - Resource type
     * @param {number} amount - Amount to remove
     * @returns {boolean} - Success status
     */
    function removeFromInventory(type, amount) {
        const currentAmount = inventory.get(type) || 0;
        
        if (currentAmount < amount) {
            debug.warn(`Cannot remove ${amount} ${type} from inventory, only have ${currentAmount}`);
            return false;
        }
        
        inventory.set(type, currentAmount - amount);
        
        // Broadcast inventory update
        events.updateInventory(Object.fromEntries(inventory))
            .catch(error => debug.error("Failed to broadcast inventory update:", error));
        
        debug.log(`Removed ${amount} ${type} from inventory, now have ${currentAmount - amount}`);
        return true;
    }
    
    /**
     * Get current inventory count for a resource type
     * @param {string} type - Resource type
     * @returns {number} - Current amount in inventory
     */
    function getInventoryItemCount(type) {
        return inventory.get(type) || 0;
    }
    
    /**
     * Check if player has required resources
     * @param {Object} requirements - Map of resource types to required amounts
     * @returns {boolean} - True if all requirements are met
     */
    function hasRequiredResources(requirements) {
        for (const [type, amount] of Object.entries(requirements)) {
            const available = inventory.get(type) || 0;
            if (available < amount) return false;
        }
        return true;
    }
    
    /**
     * Update player system
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Update local player movement
        updateMovement(deltaTime);
        
        // Clean up inactive remote players
        cleanupInactivePlayers();
    }
    
    /**
     * Remove remote players that haven't updated in a while
     */
    function cleanupInactivePlayers() {
        const currentTime = Date.now();
        const timeout = 30000; // 30 seconds
        
        remotePlayers.forEach((player, pubkey) => {
            if (currentTime - player.lastUpdate > timeout) {
                // Remove player from map
                remotePlayers.delete(pubkey);
                
                // Remove DOM element
                const playerElement = document.getElementById(`player-${pubkey}`);
                if (playerElement) {
                    playerElement.remove();
                }
                
                debug.log(`Removed inactive player ${pubkey}`);
            }
        });
    }
    
    /**
     * Check if a player exists
     * @param {string} pubkey - Player's public key
     * @returns {boolean} - True if player exists
     */
    function exists(pubkey) {
        if (localPlayer && localPlayer.pubkey === pubkey) return true;
        return remotePlayers.has(pubkey);
    }
    
    /**
     * Get player position
     * @returns {Object} - {x, y} coordinates
     */
    function getPosition() {
        if (!localPlayer) return { x: 0, y: 0 };
        return { x: localPlayer.x, y: localPlayer.y };
    }
    
    /**
     * Get all players
     * @returns {Array} - Array of all player objects
     */
    function getAllPlayers() {
        const allPlayers = Array.from(remotePlayers.values());
        if (localPlayer) allPlayers.push(localPlayer);
        return allPlayers;
    }
    
    // Public API
    return {
        initialize,
        createLocalPlayer,
        createRemotePlayer,
        updatePosition,
        addToInventory,
        removeFromInventory,
        getInventoryItemCount,
        hasRequiredResources,
        update,
        exists,
        getPosition,
        getAllPlayers
    };
})();
