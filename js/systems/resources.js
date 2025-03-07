/**
 * Resources System Module for Relay World 2.0
 * Handles resource nodes, gathering, and inventory management
 */

const resources = (function() {
    // Private members
    const resourceNodes = new Map(); // Map of resource node IDs to resource objects
    const pendingRespawns = []; // Queue of nodes pending respawn
    
    // Resource types
    const RESOURCE_TYPES = {
        WOOD: 'wood',
        STONE: 'stone',
        METAL: 'metal'
    };
    
    // Resource yields
    const RESOURCE_YIELDS = {
        [RESOURCE_TYPES.WOOD]: { min: 1, max: 3 },
        [RESOURCE_TYPES.STONE]: { min: 1, max: 2 },
        [RESOURCE_TYPES.METAL]: { min: 1, max: 1 }
    };
    
    // Gather times in seconds
    const GATHER_TIMES = {
        [RESOURCE_TYPES.WOOD]: config.WOOD_GATHER_TIME,
        [RESOURCE_TYPES.STONE]: config.STONE_GATHER_TIME,
        [RESOURCE_TYPES.METAL]: config.METAL_GATHER_TIME
    };
    
    // Resource node density per square unit
    const NODE_DENSITIES = {
        [RESOURCE_TYPES.WOOD]: config.RESOURCE_DENSITY * 0.5,
        [RESOURCE_TYPES.STONE]: config.RESOURCE_DENSITY * 0.3,
        [RESOURCE_TYPES.METAL]: config.RESOURCE_DENSITY * 0.2
    };
    
    // Current gathering state
    let currentGatheringNode = null;
    let gatheringProgress = 0;
    let isGathering = false;
    
    /**
     * Initialize resource system
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing resource system...");
        
        try {
            // Generate initial resource nodes
            generateResourceNodes();
            
            // Set up event handlers for gathering
            setupEventHandlers();
            
            return true;
        } catch (error) {
            debug.error("Failed to initialize resource system:", error);
            return false;
        }
    }
    
    /**
     * Setup DOM event handlers
     */
    function setupEventHandlers() {
        // Resource gathering hotkey (R)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'r' || event.key === 'R') {
                if (!isGathering) {
                    startGathering();
                }
            }
        });
    }
    
    /**
     * Generate resource nodes throughout the world
     */
    function generateResourceNodes() {
        debug.log("Generating resource nodes...");
        
        // Calculate number of nodes based on world size and density
        const worldArea = config.WORLD_WIDTH * config.WORLD_HEIGHT;
        const numWoodNodes = Math.floor(worldArea * NODE_DENSITIES[RESOURCE_TYPES.WOOD]);
        const numStoneNodes = Math.floor(worldArea * NODE_DENSITIES[RESOURCE_TYPES.STONE]);
        const numMetalNodes = Math.floor(worldArea * NODE_DENSITIES[RESOURCE_TYPES.METAL]);
        
        debug.log(`Generating ${numWoodNodes} wood, ${numStoneNodes} stone, and ${numMetalNodes} metal nodes`);
        
        // Generate nodes of each type
        generateNodesOfType(RESOURCE_TYPES.WOOD, numWoodNodes);
        generateNodesOfType(RESOURCE_TYPES.STONE, numStoneNodes);
        generateNodesOfType(RESOURCE_TYPES.METAL, numMetalNodes);
    }
    
    /**
     * Generate resource nodes of a specific type
     * @param {string} type - Resource type
     * @param {number} count - Number of nodes to generate
     */
    function generateNodesOfType(type, count) {
        for (let i = 0; i < count; i++) {
            // Generate random position within world bounds
            const x = Math.random() * config.WORLD_WIDTH;
            const y = Math.random() * config.WORLD_HEIGHT;
            
            // Generate unique ID for the node
            const nodeId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Calculate yield based on type
            const yieldRange = RESOURCE_YIELDS[type];
            const resourceYield = Math.floor(Math.random() * (yieldRange.max - yieldRange.min + 1)) + yieldRange.min;
            
            // Create resource node
            const node = {
                id: nodeId,
                type: type,
                x: x,
                y: y,
                yield: resourceYield,
                depleted: false,
                respawnTime: 0
            };
            
            // Add to resource nodes map
            resourceNodes.set(nodeId, node);
            
            // Create visual representation
            createResourceNodeElement(node);
        }
    }
    
    /**
     * Create DOM element for a resource node
     * @param {Object} node - Resource node object
     */
    function createResourceNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.id = `resource-${node.id}`;
        nodeElement.className = `resource-node ${node.type}`;
        nodeElement.style.left = `${node.x}px`;
        nodeElement.style.top = `${node.y}px`;
        
        if (node.depleted) {
            nodeElement.classList.add('depleted');
        }
        
        // Add click event for gathering
        nodeElement.addEventListener('click', () => {
            if (!isGathering && !node.depleted) {
                startGathering(node.id);
            }
        });
        
        // Add to game container
        document.getElementById('game-container').appendChild(nodeElement);
    }
    
    /**
     * Start gathering resources from the nearest node
     * @param {string} nodeId - Optional specific node ID to gather from
     */
    function startGathering(nodeId = null) {
        if (isGathering) return;
        
        // Get player position
        const playerPosition = player.getPosition();
        
        // Find the node to gather from
        let nodeToGather = null;
        
        if (nodeId) {
            // Use specified node if provided
            nodeToGather = resourceNodes.get(nodeId);
        } else {
            // Find nearest node within gather range
            const GATHER_RANGE = 100; // Maximum distance for gathering
            let nearestDistance = GATHER_RANGE;
            
            resourceNodes.forEach(node => {
                if (node.depleted) return;
                
                const distance = Math.sqrt(
                    Math.pow(node.x - playerPosition.x, 2) +
                    Math.pow(node.y - playerPosition.y, 2)
                );
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nodeToGather = node;
                }
            });
        }
        
        if (!nodeToGather) {
            ui.showToast("No resources nearby to gather", "error");
            return;
        }
        
        // Check if node is depleted
        if (nodeToGather.depleted) {
            ui.showToast("This resource has been depleted", "error");
            return;
        }
        
        // Check if player is close enough
        const distanceToNode = Math.sqrt(
            Math.pow(nodeToGather.x - playerPosition.x, 2) +
            Math.pow(nodeToGather.y - playerPosition.y, 2)
        );
        
        if (distanceToNode > 100) {
            ui.showToast("Move closer to gather this resource", "error");
            return;
        }
        
        // Start gathering process
        isGathering = true;
        currentGatheringNode = nodeToGather;
        gatheringProgress = 0;
        
        // Show gathering progress
        ui.showGatheringProgress(0, GATHER_TIMES[nodeToGather.type]);
        
        debug.log(`Started gathering ${nodeToGather.type} from node ${nodeToGather.id}`);
    }
    
    /**
     * Update gathering progress
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function updateGathering(deltaTime) {
        if (!isGathering || !currentGatheringNode) return;
        
        // Check if player moved too far from node
        const playerPosition = player.getPosition();
        const distanceToNode = Math.sqrt(
            Math.pow(currentGatheringNode.x - playerPosition.x, 2) +
            Math.pow(currentGatheringNode.y - playerPosition.y, 2)
        );
        
        if (distanceToNode > 100) {
            cancelGathering();
            ui.showToast("Moved too far from resource", "error");
            return;
        }
        
        // Update progress
        gatheringProgress += deltaTime;
        const gatherTime = GATHER_TIMES[currentGatheringNode.type];
        
        // Update UI
        ui.updateGatheringProgress(gatheringProgress / gatherTime);
        
        // Check if gathering is complete
        if (gatheringProgress >= gatherTime) {
            completeGathering();
        }
    }
    
    /**
     * Cancel the current gathering operation
     */
    function cancelGathering() {
        if (!isGathering) return;
        
        isGathering = false;
        currentGatheringNode = null;
        gatheringProgress = 0;
        
        // Hide gathering progress
        ui.hideGatheringProgress();
        
        debug.log("Gathering cancelled");
    }
    
    /**
     * Complete the gathering operation and collect resources
     */
    async function completeGathering() {
        if (!isGathering || !currentGatheringNode) return;
        
        try {
            // Get the node that was being gathered
            const node = currentGatheringNode;
            
            // Get amount to collect
            const amount = node.yield;
            
            // Add to player inventory
            player.addToInventory(node.type, amount);
            
            // Update UI
            ui.updateResourceCount(node.type, player.getInventoryItemCount(node.type));
            ui.showToast(`Gathered ${amount} ${node.type}`, "success");
            
            // Show collection effect
            showCollectionEffect(node.x, node.y, node.type, amount);
            
            // Publish collection event to Nostr
            await events.collectResource(node.id, node.type, amount, node.x, node.y);
            
            // Deplete the node
            depleteResourceNode(node.id, node.type, amount);
            
            // Reset gathering state
            isGathering = false;
            currentGatheringNode = null;
            gatheringProgress = 0;
            
            // Hide gathering progress
            ui.hideGatheringProgress();
            
            debug.log(`Gathered ${amount} ${node.type} from node ${node.id}`);
        } catch (error) {
            debug.error("Error completing gathering:", error);
            
            // Reset gathering state
            isGathering = false;
            currentGatheringNode = null;
            gatheringProgress = 0;
            
            // Hide gathering progress
            ui.hideGatheringProgress();
            
            ui.showToast("Failed to collect resource", "error");
        }
    }
    
    /**
     * Deplete a resource node after gathering
     * @param {string} nodeId - ID of the node
     * @param {string} type - Resource type
     * @param {number} amount - Amount collected
     */
    function depleteResourceNode(nodeId, type, amount) {
        // Get the node
        const node = resourceNodes.get(nodeId);
        
        if (!node) {
            debug.warn(`Tried to deplete non-existent node: ${nodeId}`);
            return;
        }
        
        // Mark as depleted
        node.depleted = true;
        node.respawnTime = Date.now() + (config.RESOURCE_RESPAWN_TIME * 1000);
        
        // Update DOM element
        const nodeElement = document.getElementById(`resource-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.add('depleted');
        }
        
        // Add to respawn queue
        pendingRespawns.push(nodeId);
        
        debug.log(`Depleted ${type} node ${nodeId}, will respawn in ${config.RESOURCE_RESPAWN_TIME} seconds`);
    }
    
    /**
     * Update a resource node from a Nostr event
     * @param {string} nodeId - ID of the node
     * @param {Object} data - Updated node data
     */
    function updateResourceNode(nodeId, data) {
        // Get the node
        const node = resourceNodes.get(nodeId);
        
        if (!node) {
            debug.warn(`Tried to update non-existent node: ${nodeId}`);
            return;
        }
        
        // Update properties
        if (data.depleted !== undefined) {
            node.depleted = data.depleted;
        }
        
        if (data.respawnTime !== undefined) {
            node.respawnTime = data.respawnTime;
        }
        
        if (data.yield !== undefined) {
            node.yield = data.yield;
        }
        
        // Update DOM element
        const nodeElement = document.getElementById(`resource-${nodeId}`);
        if (nodeElement) {
            if (node.depleted) {
                nodeElement.classList.add('depleted');
            } else {
                nodeElement.classList.remove('depleted');
            }
        }
        
        debug.log(`Updated resource node ${nodeId}`);
    }
    
    /**
     * Show visual effect for resource collection
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Resource type
     * @param {number} amount - Amount collected
     */
    function showCollectionEffect(x, y, type, amount) {
        // Create floating text element
        const effectElement = document.createElement('div');
        effectElement.className = 'resource-collect';
        effectElement.textContent = `+${amount} ${type}`;
        effectElement.style.left = `${x}px`;
        effectElement.style.top = `${y}px`;
        
        // Add to game container
        document.getElementById('game-container').appendChild(effectElement);
        
        // Remove after animation completes
        setTimeout(() => {
            if (effectElement.parentNode) {
                effectElement.parentNode.removeChild(effectElement);
            }
        }, 1500);
    }
    
    /**
     * Check and respawn depleted nodes
     */
    function checkRespawns() {
        const currentTime = Date.now();
        const nodesToRespawn = [];
        
        // Check pending respawns
        for (let i = pendingRespawns.length - 1; i >= 0; i--) {
            const nodeId = pendingRespawns[i];
            const node = resourceNodes.get(nodeId);
            
            if (!node) {
                pendingRespawns.splice(i, 1);
                continue;
            }
            
            if (currentTime >= node.respawnTime) {
                nodesToRespawn.push(nodeId);
                pendingRespawns.splice(i, 1);
            }
        }
        
        // Respawn nodes
        for (const nodeId of nodesToRespawn) {
            respawnNode(nodeId);
        }
    }
    
    /**
     * Respawn a depleted resource node
     * @param {string} nodeId - ID of the node to respawn
     */
    function respawnNode(nodeId) {
        // Get the node
        const node = resourceNodes.get(nodeId);
        
        if (!node) {
            debug.warn(`Tried to respawn non-existent node: ${nodeId}`);
            return;
        }
        
        // Mark as not depleted
        node.depleted = false;
        node.respawnTime = 0;
        
        // Regenerate yield based on type
        const yieldRange = RESOURCE_YIELDS[node.type];
        node.yield = Math.floor(Math.random() * (yieldRange.max - yieldRange.min + 1)) + yieldRange.min;
        
        // Update DOM element
        const nodeElement = document.getElementById(`resource-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.remove('depleted');
        }
        
        debug.log(`Respawned ${node.type} node ${nodeId} with yield ${node.yield}`);
    }
    
    /**
     * Update resource system
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Update gathering progress if active
        if (isGathering) {
            updateGathering(deltaTime);
        }
        
        // Check for nodes to respawn
        checkRespawns();
    }
    
    /**
     * Get nearest resource node to a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} maxDistance - Maximum search distance
     * @returns {Object|null} - Nearest resource node or null if none found
     */
    function getNearestResourceNode(x, y, maxDistance = Infinity) {
        let nearestNode = null;
        let nearestDistance = maxDistance;
        
        resourceNodes.forEach(node => {
            if (node.depleted) return;
            
            const distance = Math.sqrt(
                Math.pow(node.x - x, 2) +
                Math.pow(node.y - y, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestNode = node;
            }
        });
        
        return nearestNode;
    }
    
    /**
     * Get all resource nodes of a specific type
     * @param {string} type - Resource type
     * @returns {Array} - Array of resource nodes
     */
    function getResourceNodesOfType(type) {
        const nodes = [];
        
        resourceNodes.forEach(node => {
            if (node.type === type) {
                nodes.push(node);
            }
        });
        
        return nodes;
    }
    
    // Public API
    return {
        initialize,
        update,
        startGathering,
        cancelGathering,
        depleteResourceNode,
        updateResourceNode,
        showCollectionEffect,
        getNearestResourceNode,
        getResourceNodesOfType,
        
        // Constants
        RESOURCE_TYPES,
        GATHER_TIMES
    };
})();
