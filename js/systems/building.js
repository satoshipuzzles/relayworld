/**
 * Building System Module for Relay World 2.0
 * Handles structure creation, manipulation, and land claims
 */

const building = (function() {
    // Private members
    const structures = new Map(); // Map of structure IDs to structure objects
    const landClaims = new Map(); // Map of region IDs to land claim objects
    const blueprints = new Map(); // Map of blueprint IDs to blueprint objects
    
    // Building state
    let isBuildingMode = false;
    let currentBlueprint = null;
    let buildingPreview = null;
    let currentRotation = 0;
    
    /**
     * Initialize building system
     */
    function initialize() {
        debug.log("Initializing building system...");
        
        // Define blueprints
        defineBlueprints();
        
        // Set up event handlers
        setupEventHandlers();
    }
    
    /**
     * Setup DOM event handlers
     */
    function setupEventHandlers() {
        // Building mode toggle (B key)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'b' || event.key === 'B') {
                toggleBuildingMode();
            }
        });
        
        // Rotation (R key in building mode)
        document.addEventListener('keydown', (event) => {
            if ((event.key === 'r' || event.key === 'R') && isBuildingMode) {
                rotateBuildingPreview();
            }
        });
        
        // Place building on click when in building mode
        document.addEventListener('click', (event) => {
            if (isBuildingMode && currentBlueprint) {
                const worldPos = renderer.screenToWorldPosition(event.clientX, event.clientY);
                placeBuilding(worldPos.x, worldPos.y);
            }
        });
        
        // Update building preview on mouse move
        document.addEventListener('mousemove', (event) => {
            if (isBuildingMode && currentBlueprint) {
                const worldPos = renderer.screenToWorldPosition(event.clientX, event.clientY);
                updateBuildingPreview(worldPos.x, worldPos.y);
            }
        });
        
        // UI button handlers
        document.getElementById('build-button').addEventListener('click', toggleBuildingMode);
        document.getElementById('cancel-building').addEventListener('click', cancelBuildingMode);
        document.getElementById('rotate-button').addEventListener('click', rotateBuildingPreview);
    }
    
    /**
     * Define available blueprints
     */
    function defineBlueprints() {
        // Basic wall
        blueprints.set('wall', {
            id: 'wall',
            name: 'Wall',
            type: 'wall',
            size: { width: 10, height: 40 },
            resources: {
                [resources.RESOURCE_TYPES.WOOD]: 5
            },
            materials: resources.RESOURCE_TYPES.WOOD,
            properties: {
                health: 100,
                collides: true
            }
        });
        
        // Floor
        blueprints.set('floor', {
            id: 'floor',
            name: 'Floor',
            type: 'floor',
            size: { width: 40, height: 40 },
            resources: {
                [resources.RESOURCE_TYPES.WOOD]: 3
            },
            materials: resources.RESOURCE_TYPES.WOOD,
            properties: {
                health: 80,
                collides: false
            }
        });
        
        // Door
        blueprints.set('door', {
            id: 'door',
            name: 'Door',
            type: 'door',
            size: { width: 10, height: 40 },
            resources: {
                [resources.RESOURCE_TYPES.WOOD]: 7,
                [resources.RESOURCE_TYPES.METAL]: 1
            },
            materials: resources.RESOURCE_TYPES.WOOD,
            properties: {
                health: 90,
                collides: true,
                interactive: true,
                state: 'closed'
            }
        });
        
        // Stone wall
        blueprints.set('stone-wall', {
            id: 'stone-wall',
            name: 'Stone Wall',
            type: 'wall',
            size: { width: 10, height: 40 },
            resources: {
                [resources.RESOURCE_TYPES.STONE]: 5
            },
            materials: resources.RESOURCE_TYPES.STONE,
            properties: {
                health: 150,
                collides: true
            }
        });
        
        // Storage box
        blueprints.set('storage', {
            id: 'storage',
            name: 'Storage Box',
            type: 'storage',
            size: { width: 20, height: 20 },
            resources: {
                [resources.RESOURCE_TYPES.WOOD]: 10
            },
            materials: resources.RESOURCE_TYPES.WOOD,
            properties: {
                health: 70,
                collides: true,
                interactive: true,
                capacity: 100
            }
        });
        
        debug.log(`Defined ${blueprints.size} blueprints`);
    }
    
    /**
     * Toggle building mode on/off
     */
    function toggleBuildingMode() {
        isBuildingMode = !isBuildingMode;
        
        if (isBuildingMode) {
            // Show building interface
            ui.showBuildingInterface(Array.from(blueprints.values()));
            
            // Create building grid overlay
            createBuildingGrid();
        } else {
            // Hide building interface
            ui.hideBuildingInterface();
            
            // Remove building preview
            removeBuildingPreview();
            
            // Remove building grid
            removeBuildingGrid();
            
            // Reset building state
            currentBlueprint = null;
            currentRotation = 0;
        }
    }
    
    /**
     * Cancel building mode
     */
    function cancelBuildingMode() {
        if (!isBuildingMode) return;
        
        toggleBuildingMode();
    }
    
    /**
     * Create building grid overlay
     */
    function createBuildingGrid() {
        const gridElement = document.createElement('div');
        gridElement.id = 'building-grid';
        gridElement.className = 'building-grid';
        
        // Set grid dimensions to cover the visible area
        const viewportSize = renderer.getViewportSize();
        gridElement.style.width = `${viewportSize.width}px`;
        gridElement.style.height = `${viewportSize.height}px`;
        
        // Position grid at camera center
        const cameraPosition = renderer.getCameraPosition();
        gridElement.style.left = `${cameraPosition.x - viewportSize.width / 2}px`;
        gridElement.style.top = `${cameraPosition.y - viewportSize.height / 2}px`;
        
        document.getElementById('game-container').appendChild(gridElement);
    }
    
    /**
     * Remove building grid overlay
     */
    function removeBuildingGrid() {
        const gridElement = document.getElementById('building-grid');
        if (gridElement) {
            gridElement.remove();
        }
    }
    
    /**
     * Select a blueprint for building
     * @param {string} blueprintId - ID of the blueprint
     * @returns {boolean} - Success status
     */
    function selectBlueprint(blueprintId) {
        const blueprint = blueprints.get(blueprintId);
        
        if (!blueprint) {
            debug.warn(`Blueprint not found: ${blueprintId}`);
            return false;
        }
        
        currentBlueprint = blueprint;
        
        // Check if player has resources for this blueprint
        const hasResources = player.hasRequiredResources(blueprint.resources);
        
        // Update UI to show selected blueprint
        ui.updateSelectedBlueprint(blueprint, hasResources);
        
        // Create building preview
        createBuildingPreview();
        
        return true;
    }
    
    /**
     * Create building preview element
     */
    function createBuildingPreview() {
        if (!currentBlueprint) return;
        
        // Remove existing preview
        removeBuildingPreview();
        
        // Create new preview element
        buildingPreview = document.createElement('div');
        buildingPreview.id = 'building-preview';
        buildingPreview.className = `structure structure-preview ${currentBlueprint.materials}`;
        
        // Set size based on blueprint
        buildingPreview.style.width = `${currentBlueprint.size.width}px`;
        buildingPreview.style.height = `${currentBlueprint.size.height}px`;
        
        // Apply rotation
        buildingPreview.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
        
        // Add to game container
        document.getElementById('game-container').appendChild(buildingPreview);
    }
    
    /**
     * Remove building preview element
     */
    function removeBuildingPreview() {
        if (buildingPreview) {
            buildingPreview.remove();
            buildingPreview = null;
        }
    }
    
    /**
     * Update building preview position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    function updateBuildingPreview(x, y) {
        if (!buildingPreview) return;
        
        // Snap position to grid
        const gridSize = 20;
        const snappedX = Math.floor(x / gridSize) * gridSize + gridSize / 2;
        const snappedY = Math.floor(y / gridSize) * gridSize + gridSize / 2;
        
        // Update position
        buildingPreview.style.left = `${snappedX}px`;
        buildingPreview.style.top = `${snappedY}px`;
        
        // Check if placement is valid
        const canPlace = canPlaceBuilding(snappedX, snappedY);
        
        // Update preview style based on validity
        if (canPlace) {
            buildingPreview.classList.add('structure-valid');
            buildingPreview.classList.remove('structure-invalid');
        } else {
            buildingPreview.classList.add('structure-invalid');
            buildingPreview.classList.remove('structure-valid');
        }
    }
    
    /**
     * Rotate building preview
     */
    function rotateBuildingPreview() {
        if (!isBuildingMode || !currentBlueprint) return;
        
        // Increment rotation by 90 degrees
        currentRotation = (currentRotation + 90) % 360;
        
        // Update preview rotation
        if (buildingPreview) {
            buildingPreview.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
        }
    }
    
    /**
     * Check if a building can be placed at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if placement is valid
     */
    function canPlaceBuilding(x, y) {
        if (!currentBlueprint) return false;
        
        // Check world boundaries
        if (x < 0 || x > config.WORLD_WIDTH || y < 0 || y > config.WORLD_HEIGHT) {
            return false;
        }
        
        // Check if player has required resources
        if (!player.hasRequiredResources(currentBlueprint.resources)) {
            return false;
        }
        
        // Check land claim permissions
        const region = world.getRegionForPosition(x, y);
        if (region && region.landClaim) {
            // Can only build on land claimed by self or with permission
            const pubkey = nostrClient.getPubkey();
            if (region.landClaim.owner !== pubkey && !hasPermissionToBuild(pubkey, region.landClaim)) {
                return false;
            }
        }
        
        // Check for collisions with existing structures
        return !checkBuildingCollision(x, y);
    }
    
    /**
     * Check if there would be a collision with existing structures
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if there is a collision
     */
    function checkBuildingCollision(x, y) {
        if (!currentBlueprint) return false;
        
        // Get blueprint bounds taking rotation into account
        let width = currentBlueprint.size.width;
        let height = currentBlueprint.size.height;
        
        // Swap dimensions for 90 or 270 degree rotations
        if (currentRotation === 90 || currentRotation === 270) {
            [width, height] = [height, width];
        }
        
        // Get bounds
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Calculate bounding box
        const minX = x - halfWidth;
        const maxX = x + halfWidth;
        const minY = y - halfHeight;
        const maxY = y + halfHeight;
        
        // Check collision with each structure
        for (const structure of structures.values()) {
            // Skip structures that don't collide
            if (!structure.properties.collides) continue;
            
            // Get structure bounds
            let structWidth = structure.size.width;
            let structHeight = structure.size.height;
            
            // Account for structure rotation
            if (structure.rotation === 90 || structure.rotation === 270) {
                [structWidth, structHeight] = [structHeight, structWidth];
            }
            
            // Calculate structure bounding box
            const structHalfWidth = structWidth / 2;
            const structHalfHeight = structHeight / 2;
            
            const structMinX = structure.position.x - structHalfWidth;
            const structMaxX = structure.position.x + structHalfWidth;
            const structMinY = structure.position.y - structHalfHeight;
            const structMaxY = structure.position.y + structHalfHeight;
            
            // Check for overlap
            if (!(maxX < structMinX || minX > structMaxX || maxY < structMinY || minY > structMaxY)) {
                return true; // Collision found
            }
        }
        
        return false; // No collisions
    }
    
    /**
     * Place a building at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Promise<boolean>} - Success status
     */
    async function placeBuilding(x, y) {
        if (!isBuildingMode || !currentBlueprint) return false;
        
        // Snap position to grid
        const gridSize = 20;
        const snappedX = Math.floor(x / gridSize) * gridSize + gridSize / 2;
        const snappedY = Math.floor(y / gridSize) * gridSize + gridSize / 2;
        
        // Check if placement is valid
        if (!canPlaceBuilding(snappedX, snappedY)) {
            ui.showToast("Cannot place building here", "error");
            return false;
        }
        
        try {
            // Prepare position object
            const position = {
                x: snappedX,
                y: snappedY,
                z: 0
            };
            
            // Publish structure placement event
            const result = await events.placeStructure(currentBlueprint, position, currentRotation);
            
            if (!result) {
                throw new Error("Failed to publish structure placement");
            }
            
            // Consume resources
            for (const [type, amount] of Object.entries(currentBlueprint.resources)) {
                player.removeFromInventory(type, amount);
                ui.updateResourceCount(type, player.getInventoryItemCount(type));
            }
            
            ui.showToast(`${currentBlueprint.name} placed`, "success");
            
            // Reset blueprint selection for next placement
            currentBlueprint = null;
            ui.updateSelectedBlueprint(null, false);
            removeBuildingPreview();
            
            return true;
        } catch (error) {
            debug.error("Failed to place building:", error);
            ui.showToast("Failed to place building", "error");
            return false;
        }
    }
    
    /**
     * Add a structure to the world
     * @param {string} structureId - Structure identifier
     * @param {string} ownerPubkey - Owner's public key
     * @param {Object} structureData - Structure data object
     */
    function addStructure(structureId, ownerPubkey, structureData) {
        // Create structure object
        const structure = {
            id: structureId,
            owner: ownerPubkey,
            type: structureData.type,
            position: structureData.position,
            rotation: structureData.rotation,
            size: structureData.size,
            materials: structureData.materials,
            health: structureData.health,
            permissions: structureData.permissions,
            properties: structureData.properties
        };
        
        // Add to structures map
        structures.set(structureId, structure);
        
        // Add to world region
        world.addEntityToRegion(
            'structure',
            structureId,
            structure.position.x,
            structure.position.y,
            structure
        );
        
        // Create structure DOM element
        createStructureElement(structure);
        
        debug.log(`Added structure ${structureId} at (${structure.position.x}, ${structure.position.y})`);
    }
    
    /**
     * Create DOM element for a structure
     * @param {Object} structure - Structure object
     */
    function createStructureElement(structure) {
        const structureElement = document.createElement('div');
        structureElement.id = `structure-${structure.id}`;
        structureElement.className = `structure ${structure.materials}`;
        
        // Set position
        structureElement.style.left = `${structure.position.x}px`;
        structureElement.style.top = `${structure.position.y}px`;
        
        // Set size
        structureElement.style.width = `${structure.size.width}px`;
        structureElement.style.height = `${structure.size.height}px`;
        
        // Apply rotation
        structureElement.style.transform = `translate(-50%, -50%) rotate(${structure.rotation}deg)`;
        
        // Add click handler for interactive structures
        if (structure.properties.interactive) {
            structureElement.addEventListener('click', () => {
                interactWithStructure(structure.id);
            });
        }
        
        // Add to game container
        document.getElementById('game-container').appendChild(structureElement);
    }
    
    /**
     * Interact with a structure
     * @param {string} structureId - Structure identifier
     */
    function interactWithStructure(structureId) {
        const structure = structures.get(structureId);
        
        if (!structure) {
            debug.warn(`Structure not found: ${structureId}`);
            return;
        }
        
        // Handle interaction based on structure type
        switch (structure.type) {
            case 'door':
                toggleDoor(structureId);
                break;
            case 'storage':
                openStorage(structureId);
                break;
            default:
                debug.log(`No interaction for structure type: ${structure.type}`);
        }
    }
    
    /**
     * Toggle door state (open/closed)
     * @param {string} doorId - Door structure identifier
     */
    function toggleDoor(doorId) {
        const door = structures.get(doorId);
        
        if (!door || door.type !== 'door') {
            debug.warn(`Not a door: ${doorId}`);
            return;
        }
        
        // Toggle state
        const newState = door.properties.state === 'closed' ? 'open' : 'closed';
        door.properties.state = newState;
        
        // Update collision property
        door.properties.collides = newState === 'closed';
        
        // Update visual appearance
        const doorElement = document.getElementById(`structure-${doorId}`);
        if (doorElement) {
            if (newState === 'open') {
                doorElement.style.opacity = '0.5';
            } else {
                doorElement.style.opacity = '1';
            }
        }
        
        debug.log(`Door ${doorId} is now ${newState}`);
        
        // Publish door state update event
        // This would be implemented in a real application
    }
    
    /**
     * Open storage interface
     * @param {string} storageId - Storage structure identifier
     */
    function openStorage(storageId) {
        const storage = structures.get(storageId);
        
        if (!storage || storage.type !== 'storage') {
            debug.warn(`Not a storage: ${storageId}`);
            return;
        }
        
        // Check permissions
        const pubkey = nostrClient.getPubkey();
        if (storage.owner !== pubkey && !hasPermissionToAccess(pubkey, storage.permissions)) {
            ui.showToast("You don't have permission to access this storage", "error");
            return;
        }
        
        // Show storage interface
        ui.showStorageInterface(storage);
        
        debug.log(`Opened storage ${storageId}`);
    }
    
    /**
     * Add a land claim
     * @param {string} regionId - Region identifier
     * @param {string} ownerPubkey - Owner's public key
     * @param {string} name - Custom name for the region
     * @param {Object} boundaries - Region boundaries
     * @param {number} expiration - Expiration timestamp
     */
    function addLandClaim(regionId, ownerPubkey, name, boundaries, expiration) {
        // Create land claim object
        const landClaim = {
            regionId,
            owner: ownerPubkey,
            name,
            boundaries,
            expiration,
            whitelist: []
        };
        
        // Add to land claims map
        landClaims.set(regionId, landClaim);
        
        // Set claim in world
        world.setLandClaim(regionId, landClaim);
        
        // Create visual representation of land claim
        createLandClaimVisual(landClaim);
        
        debug.log(`Added land claim for region ${regionId} by ${ownerPubkey}`);
    }
    
    /**
     * Create visual representation of a land claim
     * @param {Object} landClaim - Land claim object
     */
    function createLandClaimVisual(landClaim) {
        // Create border element
        const claimElement = document.createElement('div');
        claimElement.id = `claim-${landClaim.regionId}`;
        claimElement.className = 'land-claim';
        
        // Set position and size
        claimElement.style.left = `${landClaim.boundaries.minX}px`;
        claimElement.style.top = `${landClaim.boundaries.minY}px`;
        claimElement.style.width = `${landClaim.boundaries.maxX - landClaim.boundaries.minX}px`;
        claimElement.style.height = `${landClaim.boundaries.maxY - landClaim.boundaries.minY}px`;
        
        // Add to game container
        document.getElementById('game-container').appendChild(claimElement);
        
        // Create marker in center
        const markerElement = document.createElement('div');
        markerElement.id = `claim-marker-${landClaim.regionId}`;
        markerElement.className = 'claim-marker';
        
        // Center position
        const centerX = (landClaim.boundaries.minX + landClaim.boundaries.maxX) / 2;
        const centerY = (landClaim.boundaries.minY + landClaim.boundaries.maxY) / 2;
        
        markerElement.style.left = `${centerX}px`;
        markerElement.style.top = `${centerY}px`;
        
        // Add tooltip with claim info
        markerElement.title = `${landClaim.name} - Owner: ${landClaim.owner.substring(0, 8)}...`;
        
        // Add click handler to show claim details
        markerElement.addEventListener('click', () => {
            showLandClaimDetails(landClaim.regionId);
        });
        
        // Add to game container
        document.getElementById('game-container').appendChild(markerElement);
    }
    
    /**
     * Show land claim details
     * @param {string} regionId - Region identifier
     */
    function showLandClaimDetails(regionId) {
        const landClaim = landClaims.get(regionId);
        
        if (!landClaim) {
            debug.warn(`Land claim not found: ${regionId}`);
            return;
        }
        
        // Show claim details dialog
        ui.showLandClaimDetails(landClaim);
    }
    
    /**
     * Check if a player has permission to build on a land claim
     * @param {string} pubkey - Player's public key
     * @param {Object} landClaim - Land claim object
     * @returns {boolean} - True if player has permission
     */
    function hasPermissionToBuild(pubkey, landClaim) {
        // Owner always has permission
        if (landClaim.owner === pubkey) return true;
        
        // Check whitelist
        if (landClaim.whitelist && landClaim.whitelist.includes(pubkey)) return true;
        
        return false;
    }
    
    /**
     * Check if a player has permission to access a structure
     * @param {string} pubkey - Player's public key
     * @param {Object} permissions - Structure permissions object
     * @returns {boolean} - True if player has permission
     */
    function hasPermissionToAccess(pubkey, permissions) {
        // Owner always has permission
        if (permissions.owner === pubkey) return true;
        
        // Check whitelist
        if (permissions.whitelist && permissions.whitelist.includes(pubkey)) return true;
        
        // Check if public access is allowed
        if (permissions.public) return true;
        
        return false;
    }
    
    /**
     * Update building system
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Update structures
        updateStructures(deltaTime);
        
        // Update building preview
        updateBuildingGrid();
    }
    
    /**
     * Update structures
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function updateStructures(deltaTime) {
        // Apply decay to structures based on time
        const decayPerSecond = config.STRUCTURE_DECAY_RATE / (24 * 60 * 60); // Convert daily rate to per-second
        const decayAmount = decayPerSecond * deltaTime;
        
        structures.forEach((structure, id) => {
            structure.health -= decayAmount;
            
            // Check for structure collapse
            if (structure.health <= 0) {
                destroyStructure(id);
            }
        });
    }
    
    /**
     * Update building grid position when camera moves
     */
    function updateBuildingGrid() {
        if (!isBuildingMode) return;
        
        const gridElement = document.getElementById('building-grid');
        if (!gridElement) return;
        
        // Get viewport size and camera position
        const viewportSize = renderer.getViewportSize();
        const cameraPosition = renderer.getCameraPosition();
        
        // Update grid position
        gridElement.style.left = `${cameraPosition.x - viewportSize.width / 2}px`;
        gridElement.style.top = `${cameraPosition.y - viewportSize.height / 2}px`;
    }
    
    /**
     * Destroy a structure
     * @param {string} structureId - Structure identifier
     */
    function destroyStructure(structureId) {
        const structure = structures.get(structureId);
        
        if (!structure) {
            debug.warn(`Structure not found: ${structureId}`);
            return;
        }
        
        // Remove from structures map
        structures.delete(structureId);
        
        // Remove from world region
        world.removeEntityFromRegion(
            'structure',
            structureId,
            structure.position.x,
            structure.position.y
        );
        
        // Remove DOM element
        const structureElement = document.getElementById(`structure-${structureId}`);
        if (structureElement) {
            structureElement.remove();
        }
        
        debug.log(`Destroyed structure ${structureId}`);
    }
    
    // Public API
    return {
        initialize,
        toggleBuildingMode,
        selectBlueprint,
        placeBuilding,
        addStructure,
        interactWithStructure,
        addLandClaim,
        hasPermissionToBuild,
        update,
        
        // Getters
        getBlueprints: () => Array.from(blueprints.values()),
        getAllStructures: () => Array.from(structures.values()),
        getLandClaim: (regionId) => landClaims.get(regionId),
        isInBuildingMode: () => isBuildingMode
    };
})();
