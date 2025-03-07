/**
 * World Module for Relay World 2.0
 * Handles world generation, management, and spatial partitioning
 */

const world = (function() {
    // Private members
    const regions = new Map(); // Map of region IDs to region objects
    
    // Region class for spatial partitioning
    class Region {
        constructor(id, x, y) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.structures = new Map(); // Map of structure IDs to structure objects
            this.resources = new Map(); // Map of resource IDs to resource objects
            this.players = new Set(); // Set of player pubkeys in this region
            this.landClaim = null; // Land claim object if region is claimed
        }
    }
    
    /**
     * Initialize world
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing world...");
        
        try {
            // Create grid of regions
            createRegionGrid();
            
            return true;
        } catch (error) {
            debug.error("Failed to initialize world:", error);
            return false;
        }
    }
    
    /**
     * Create grid of regions for spatial partitioning
     */
    function createRegionGrid() {
        const regionSize = config.REGION_SIZE;
        const regionsX = Math.ceil(config.WORLD_WIDTH / regionSize);
        const regionsY = Math.ceil(config.WORLD_HEIGHT / regionSize);
        
        debug.log(`Creating region grid ${regionsX}x${regionsY}...`);
        
        for (let x = 0; x < regionsX; x++) {
            for (let y = 0; y < regionsY; y++) {
                const regionId = `${x}:${y}`;
                regions.set(regionId, new Region(regionId, x, y));
            }
        }
        
        debug.log(`Created ${regions.size} regions`);
    }
    
    /**
     * Get region for a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - Region object
     */
    function getRegionForPosition(x, y) {
        const regionSize = config.REGION_SIZE;
        const regionX = Math.floor(x / regionSize);
        const regionY = Math.floor(y / regionSize);
        const regionId = `${regionX}:${regionY}`;
        
        return regions.get(regionId);
    }
    
    /**
     * Get region by ID
     * @param {string} regionId - Region identifier
     * @returns {Object} - Region object
     */
    function getRegion(regionId) {
        return regions.get(regionId);
    }
    
    /**
     * Get all regions
     * @returns {Array} - Array of all region objects
     */
    function getAllRegions() {
        return Array.from(regions.values());
    }
    
    /**
     * Add an entity to its corresponding region
     * @param {string} entityType - Type of entity: 'structure', 'resource', 'player'
     * @param {string} entityId - ID of the entity
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} entityData - Entity data object
     */
    function addEntityToRegion(entityType, entityId, x, y, entityData) {
        const region = getRegionForPosition(x, y);
        
        if (!region) {
            debug.warn(`No region found for position (${x}, ${y})`);
            return;
        }
        
        switch (entityType) {
            case 'structure':
                region.structures.set(entityId, entityData);
                break;
            case 'resource':
                region.resources.set(entityId, entityData);
                break;
            case 'player':
                region.players.add(entityId);
                break;
            default:
                debug.warn(`Unknown entity type: ${entityType}`);
        }
    }
    
    /**
     * Remove an entity from its region
     * @param {string} entityType - Type of entity: 'structure', 'resource', 'player'
     * @param {string} entityId - ID of the entity
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    function removeEntityFromRegion(entityType, entityId, x, y) {
        const region = getRegionForPosition(x, y);
        
        if (!region) {
            debug.warn(`No region found for position (${x}, ${y})`);
            return;
        }
        
        switch (entityType) {
            case 'structure':
                region.structures.delete(entityId);
                break;
            case 'resource':
                region.resources.delete(entityId);
                break;
            case 'player':
                region.players.delete(entityId);
                break;
            default:
                debug.warn(`Unknown entity type: ${entityType}`);
        }
    }
    
    /**
     * Update player region when moving
     * @param {string} pubkey - Player's public key
     * @param {number} oldX - Old X coordinate
     * @param {number} oldY - Old Y coordinate
     * @param {number} newX - New X coordinate
     * @param {number} newY - New Y coordinate
     */
    function updatePlayerRegion(pubkey, oldX, oldY, newX, newY) {
        const oldRegion = getRegionForPosition(oldX, oldY);
        const newRegion = getRegionForPosition(newX, newY);
        
        // If player stays in the same region, do nothing
        if (oldRegion && newRegion && oldRegion.id === newRegion.id) {
            return;
        }
        
        // Remove from old region
        if (oldRegion) {
            oldRegion.players.delete(pubkey);
        }
        
        // Add to new region
        if (newRegion) {
            newRegion.players.add(pubkey);
        }
    }
    
    /**
     * Set land claim for a region
     * @param {string} regionId - Region identifier
     * @param {Object} claimData - Land claim data
     * @returns {boolean} - Success status
     */
    function setLandClaim(regionId, claimData) {
        const region = regions.get(regionId);
        
        if (!region) {
            debug.warn(`No region found with ID: ${regionId}`);
            return false;
        }
        
        region.landClaim = claimData;
        return true;
    }
    
    /**
     * Check if a region is claimed
     * @param {string} regionId - Region identifier
     * @returns {boolean} - True if region is claimed
     */
    function isRegionClaimed(regionId) {
        const region = regions.get(regionId);
        
        if (!region) {
            debug.warn(`No region found with ID: ${regionId}`);
            return false;
        }
        
        return !!region.landClaim;
    }
    
    /**
     * Get visible regions around a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Visibility radius in pixels
     * @returns {Array} - Array of visible region objects
     */
    function getVisibleRegions(x, y, radius) {
        const visibleRegions = [];
        const regionSize = config.REGION_SIZE;
        
        // Calculate region bounds for the visibility circle
        const minRegionX = Math.floor((x - radius) / regionSize);
        const maxRegionX = Math.floor((x + radius) / regionSize);
        const minRegionY = Math.floor((y - radius) / regionSize);
        const maxRegionY = Math.floor((y + radius) / regionSize);
        
        // Collect all regions in the bounding rectangle
        for (let rx = minRegionX; rx <= maxRegionX; rx++) {
            for (let ry = minRegionY; ry <= maxRegionY; ry++) {
                const regionId = `${rx}:${ry}`;
                const region = regions.get(regionId);
                
                if (region) {
                    visibleRegions.push(region);
                }
            }
        }
        
        return visibleRegions;
    }
    
    /**
     * Get region boundaries
     * @param {string} regionId - Region identifier
     * @returns {Object} - {minX, minY, maxX, maxY} boundaries
     */
    function getRegionBoundaries(regionId) {
        const region = regions.get(regionId);
        
        if (!region) {
            debug.warn(`No region found with ID: ${regionId}`);
            return null;
        }
        
        const regionSize = config.REGION_SIZE;
        
        return {
            minX: region.x * regionSize,
            minY: region.y * regionSize,
            maxX: (region.x + 1) * regionSize,
            maxY: (region.y + 1) * regionSize
        };
    }
    
    /**
     * Update world
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Update land claim expirations
        updateLandClaimExpirations();
    }
    
    /**
     * Update land claim expirations
     */
    function updateLandClaimExpirations() {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        regions.forEach(region => {
            if (region.landClaim && region.landClaim.expiration < currentTimestamp) {
                // Land claim expired, remove it
                debug.log(`Land claim expired for region ${region.id}`);
                region.landClaim = null;
            }
        });
    }
    
    // Public API
    return {
        initialize,
        getRegionForPosition,
        getRegion,
        getAllRegions,
        addEntityToRegion,
        removeEntityFromRegion,
        updatePlayerRegion,
        setLandClaim,
        isRegionClaimed,
        getVisibleRegions,
        getRegionBoundaries,
        update
    };
})();
