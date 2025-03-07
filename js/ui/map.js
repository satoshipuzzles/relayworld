/**
 * Map Interface Module for Relay World 2.0
 * Handles the world map visualization and navigation
 */

const map = (function() {
    // Private members
    let mapCanvas = null;
    let mapContext = null;
    let isInitialized = false;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Map view properties
    const view = {
        x: 0, // Center X position in world coordinates
        y: 0, // Center Y position in world coordinates
        scale: 0.1, // Scale (zoom level)
        minScale: 0.05,
        maxScale: 0.5
    };
    
    // Map markers
    const markers = new Map();
    
    /**
     * Initialize map
     */
    function initialize() {
        debug.log("Initializing map interface...");
        
        // Get map canvas
        mapCanvas = document.getElementById('map-canvas');
        if (!mapCanvas) {
            debug.error("Map canvas element not found");
            return false;
        }
        
        // Get 2D context
        mapContext = mapCanvas.getContext('2d');
        if (!mapContext) {
            debug.error("Failed to get map canvas context");
            return false;
        }
        
        // Set up event handlers
        setupEventHandlers();
        
        // Set initial view to center of world
        view.x = config.WORLD_WIDTH / 2;
        view.y = config.WORLD_HEIGHT / 2;
        
        isInitialized = true;
        return true;
    }
    
    /**
     * Setup map event handlers
     */
    function setupEventHandlers() {
        // Mouse events for panning
        mapCanvas.addEventListener('mousedown', handleMouseDown);
        mapCanvas.addEventListener('mousemove', handleMouseMove);
        mapCanvas.addEventListener('mouseup', handleMouseUp);
        mapCanvas.addEventListener('mouseleave', handleMouseUp);
        
        // Mouse wheel for zooming
        mapCanvas.addEventListener('wheel', handleMouseWheel, { passive: false });
        
        // Touch events for mobile
        mapCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        mapCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        mapCanvas.addEventListener('touchend', handleTouchEnd);
        
        // Map buttons
        const zoomInButton = document.getElementById('map-zoom-in');
        const zoomOutButton = document.getElementById('map-zoom-out');
        const centerButton = document.getElementById('map-center');
        
        if (zoomInButton) {
            zoomInButton.addEventListener('click', () => {
                zoomMap(1.2); // Zoom in by 20%
            });
        }
        
        if (zoomOutButton) {
            zoomOutButton.addEventListener('click', () => {
                zoomMap(0.8); // Zoom out by 20%
            });
        }
        
        if (centerButton) {
            centerButton.addEventListener('click', () => {
                // Center on player
                const playerPos = player.getPosition();
                view.x = playerPos.x;
                view.y = playerPos.y;
                renderMap();
            });
        }
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    function handleMouseDown(event) {
        event.preventDefault();
        
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     */
    function handleMouseMove(event) {
        if (!isDragging) return;
        
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Move view in opposite direction of mouse movement
        view.x -= deltaX / view.scale;
        view.y -= deltaY / view.scale;
        
        // Update last mouse position
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        // Re-render map
        renderMap();
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event - Mouse event
     */
    function handleMouseUp(event) {
        isDragging = false;
    }
    
    /**
     * Handle mouse wheel event
     * @param {WheelEvent} event - Wheel event
     */
    function handleMouseWheel(event) {
        event.preventDefault();
        
        // Determine zoom direction and factor
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        
        // Get mouse position relative to canvas
        const rect = mapCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Get world coordinates under mouse
        const worldX = view.x + (mouseX - mapCanvas.width / 2) / view.scale;
        const worldY = view.y + (mouseY - mapCanvas.height / 2) / view.scale;
        
        // Apply zoom
        const newScale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * zoomFactor));
        
        // Adjust view position to zoom toward mouse cursor
        if (newScale !== view.scale) {
            view.x = worldX - (mouseX - mapCanvas.width / 2) / newScale;
            view.y = worldY - (mouseY - mapCanvas.height / 2) / newScale;
            view.scale = newScale;
            
            // Re-render map
            renderMap();
        }
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            isDragging = true;
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchMove(event) {
        event.preventDefault();
        
        if (isDragging && event.touches.length === 1) {
            const deltaX = event.touches[0].clientX - lastMouseX;
            const deltaY = event.touches[0].clientY - lastMouseY;
            
            // Move view in opposite direction of touch movement
            view.x -= deltaX / view.scale;
            view.y -= deltaY / view.scale;
            
            // Update last touch position
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
            
            // Re-render map
            renderMap();
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchEnd(event) {
        isDragging = false;
    }
    
    /**
     * Zoom the map
     * @param {number} factor - Zoom factor (>1 to zoom in, <1 to zoom out)
     */
    function zoomMap(factor) {
        // Calculate new scale
        const newScale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * factor));
        
        // Apply zoom
        view.scale = newScale;
        
        // Re-render map
        renderMap();
    }
    
    /**
     * Render the map
     */
    function renderMap() {
        if (!isInitialized || !mapCanvas || !mapContext) return;
        
        // Resize canvas to match container size
        const container = mapCanvas.parentElement;
        mapCanvas.width = container.clientWidth;
        mapCanvas.height = container.clientHeight;
        
        // Clear canvas
        mapContext.fillStyle = '#1a1a1a';
        mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
        
        // Calculate visible area
        const visibleWidth = mapCanvas.width / view.scale;
        const visibleHeight = mapCanvas.height / view.scale;
        const minX = view.x - visibleWidth / 2;
        const minY = view.y - visibleHeight / 2;
        const maxX = view.x + visibleWidth / 2;
        const maxY = view.y + visibleHeight / 2;
        
        // Convert world coordinates to screen coordinates
        function worldToScreen(worldX, worldY) {
            const screenX = (worldX - minX) * view.scale;
            const screenY = (worldY - minY) * view.scale;
            return { x: screenX, y: screenY };
        }
        
        // Draw world boundaries
        const worldBounds = {
            minX: 0,
            minY: 0,
            maxX: config.WORLD_WIDTH,
            maxY: config.WORLD_HEIGHT
        };
        
        mapContext.strokeStyle = '#ff0000';
        mapContext.lineWidth = 2;
        
        const boundsTopLeft = worldToScreen(worldBounds.minX, worldBounds.minY);
        const boundsBottomRight = worldToScreen(worldBounds.maxX, worldBounds.maxY);
        
        mapContext.strokeRect(
            boundsTopLeft.x,
            boundsTopLeft.y,
            boundsBottomRight.x - boundsTopLeft.x,
            boundsBottomRight.y - boundsTopLeft.y
        );
        
        // Draw region grid
        mapContext.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        mapContext.lineWidth = 1;
        
        const regionSize = config.REGION_SIZE;
        const startX = Math.floor(minX / regionSize) * regionSize;
        const startY = Math.floor(minY / regionSize) * regionSize;
        const endX = Math.ceil(maxX / regionSize) * regionSize;
        const endY = Math.ceil(maxY / regionSize) * regionSize;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += regionSize) {
            const { x: screenX1, y: screenY1 } = worldToScreen(x, startY);
            const { x: screenX2, y: screenY2 } = worldToScreen(x, endY);
            
            mapContext.beginPath();
            mapContext.moveTo(screenX1, screenY1);
            mapContext.lineTo(screenX2, screenY2);
            mapContext.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += regionSize) {
            const { x: screenX1, y: screenY1 } = worldToScreen(startX, y);
            const { x: screenX2, y: screenY2 } = worldToScreen(endX, y);
            
            mapContext.beginPath();
            mapContext.moveTo(screenX1, screenY1);
            mapContext.lineTo(screenX2, screenY2);
            mapContext.stroke();
        }
        
        // Draw region numbers if zoomed in enough
        if (view.scale > 0.15) {
            mapContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
            mapContext.font = '10px sans-serif';
            mapContext.textAlign = 'center';
            mapContext.textBaseline = 'middle';
            
            for (let x = startX; x <= endX; x += regionSize) {
                for (let y = startY; y <= endY; y += regionSize) {
                    const regionX = Math.floor(x / regionSize);
                    const regionY = Math.floor(y / regionSize);
                    const regionId = `${regionX}:${regionY}`;
                    
                    const centerX = x + regionSize / 2;
                    const centerY = y + regionSize / 2;
                    
                    const { x: screenX, y: screenY } = worldToScreen(centerX, centerY);
                    
                    // Only draw if the region center is within bounds
                    if (screenX >= 0 && screenX <= mapCanvas.width &&
                        screenY >= 0 && screenY <= mapCanvas.height) {
                        mapContext.fillText(regionId, screenX, screenY);
                    }
                }
            }
        }
        
        // Draw land claims
        const regions = world.getAllRegions();
        
        for (const region of regions) {
            if (region.landClaim) {
                const boundaries = world.getRegionBoundaries(region.id);
                
                const { x: screenX1, y: screenY1 } = worldToScreen(boundaries.minX, boundaries.minY);
                const { x: screenX2, y: screenY2 } = worldToScreen(boundaries.maxX, boundaries.maxY);
                
                // Draw claim background
                mapContext.fillStyle = 'rgba(76, 175, 80, 0.2)';
                mapContext.fillRect(
                    screenX1,
                    screenY1,
                    screenX2 - screenX1,
                    screenY2 - screenY1
                );
                
                // Draw claim border
                mapContext.strokeStyle = 'rgba(76, 175, 80, 0.5)';
                mapContext.lineWidth = 2;
                mapContext.strokeRect(
                    screenX1,
                    screenY1,
                    screenX2 - screenX1,
                    screenY2 - screenY1
                );
            }
        }
        
        // Draw guild territories
        const currentGuild = guild.getCurrentGuild();
        
        if (currentGuild) {
            for (const regionId of currentGuild.territories) {
                const region = world.getRegion(regionId);
                
                if (region) {
                    const boundaries = world.getRegionBoundaries(regionId);
                    
                    const { x: screenX1, y: screenY1 } = worldToScreen(boundaries.minX, boundaries.minY);
                    const { x: screenX2, y: screenY2 } = worldToScreen(boundaries.maxX, boundaries.maxY);
                    
                    // Draw territory background
                    mapContext.fillStyle = 'rgba(33, 150, 243, 0.3)';
                    mapContext.fillRect(
                        screenX1,
                        screenY1,
                        screenX2 - screenX1,
                        screenY2 - screenY1
                    );
                    
                    // Draw territory border
                    mapContext.strokeStyle = 'rgba(33, 150, 243, 0.7)';
                    mapContext.lineWidth = 2;
                    mapContext.strokeRect(
                        screenX1,
                        screenY1,
                        screenX2 - screenX1,
                        screenY2 - screenY1
                    );
                }
            }
        }
        
        // Draw resource nodes
        const resourceNodes = resources.getResourceNodesOfType();
        
        if (view.scale > 0.2) {
            for (const resourceType in resourceNodes) {
                const nodes = resourceNodes[resourceType];
                
                for (const node of nodes) {
                    if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
                        const { x: screenX, y: screenY } = worldToScreen(node.x, node.y);
                        
                        // Choose color based on resource type
                        let color;
                        switch (resourceType) {
                            case resources.RESOURCE_TYPES.WOOD:
                                color = '#8B4513'; // Brown
                                break;
                            case resources.RESOURCE_TYPES.STONE:
                                color = '#A9A9A9'; // Gray
                                break;
                            case resources.RESOURCE_TYPES.METAL:
                                color = '#B87333'; // Copper
                                break;
                            default:
                                color = '#FFFFFF'; // White
                        }
                        
                        // Draw resource node
                        mapContext.fillStyle = node.depleted ? 'rgba(100, 100, 100, 0.5)' : color;
                        mapContext.beginPath();
                        mapContext.arc(screenX, screenY, 3, 0, Math.PI * 2);
                        mapContext.fill();
                    }
                }
            }
        }
        
        // Draw players
        const allPlayers = player.getAllPlayers();
        const localPlayerPubkey = nostrClient.getPubkey();
        
        for (const p of allPlayers) {
            if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
                const { x: screenX, y: screenY } = worldToScreen(p.x, p.y);
                
                // Draw player dot
                mapContext.fillStyle = p.pubkey === localPlayerPubkey ? '#FFD700' : '#2196F3';
                mapContext.beginPath();
                mapContext.arc(screenX, screenY, p.pubkey === localPlayerPubkey ? 5 : 3, 0, Math.PI * 2);
                mapContext.fill();
                
                // Draw player name if zoomed in enough
                if (view.scale > 0.2) {
                    mapContext.fillStyle = '#FFFFFF';
                    mapContext.font = '10px sans-serif';
                    mapContext.textAlign = 'center';
                    mapContext.textBaseline = 'bottom';
                    mapContext.fillText(p.name || p.pubkey.substring(0, 8) + '...', screenX, screenY - 8);
                }
            }
        }
        
        // Draw custom markers
        for (const [id, marker] of markers.entries()) {
            if (marker.x >= minX && marker.x <= maxX && marker.y >= minY && marker.y <= maxY) {
                const { x: screenX, y: screenY } = worldToScreen(marker.x, marker.y);
                
                // Draw marker
                mapContext.fillStyle = marker.color || '#FFFFFF';
                
                if (marker.type === 'circle') {
                    mapContext.beginPath();
                    mapContext.arc(screenX, screenY, marker.size || 5, 0, Math.PI * 2);
                    mapContext.fill();
                } else if (marker.type === 'square') {
                    const size = marker.size || 5;
                    mapContext.fillRect(screenX - size, screenY - size, size * 2, size * 2);
                }
                
                // Draw label
                if (marker.label && view.scale > 0.1) {
                    mapContext.fillStyle = '#FFFFFF';
                    mapContext.font = '10px sans-serif';
                    mapContext.textAlign = 'center';
                    mapContext.textBaseline = 'bottom';
                    mapContext.fillText(marker.label, screenX, screenY - 8);
                }
            }
        }
        
        // Draw current position indicator
        const playerPos = player.getPosition();
        mapContext.fillStyle = '#FF0000';
        mapContext.font = '12px sans-serif';
        mapContext.textAlign = 'left';
        mapContext.textBaseline = 'top';
        mapContext.fillText(`Position: ${Math.floor(playerPos.x)}, ${Math.floor(playerPos.y)}`, 10, 10);
        
        // Draw current region
        const regionId = nostrClient.getRegionForPosition(playerPos.x, playerPos.y);
        mapContext.fillText(`Region: ${regionId}`, 10, 30);
        
        // Draw current scale
        mapContext.fillText(`Scale: ${view.scale.toFixed(2)}`, 10, 50);
    }
    
    /**
     * Show the map interface
     */
    function showMap() {
        // Center map on player
        const playerPos = player.getPosition();
        view.x = playerPos.x;
        view.y = playerPos.y;
        
        // Render map
        renderMap();
    }
    
    /**
     * Add a marker to the map
     * @param {string} id - Marker ID
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} options - Marker options
     * @returns {Object} - Marker object
     */
    function addMarker(id, x, y, options = {}) {
        const marker = {
            id,
            x,
            y,
            type: options.type || 'circle',
            color: options.color || '#FFFFFF',
            size: options.size || 5,
            label: options.label || null
        };
        
        markers.set(id, marker);
        
        // Re-render map if visible
        if (mapCanvas && mapCanvas.parentElement && !mapCanvas.parentElement.classList.contains('hidden')) {
            renderMap();
        }
        
        return marker;
    }
    
    /**
     * Remove a marker from the map
     * @param {string} id - Marker ID
     * @returns {boolean} - Success status
     */
    function removeMarker(id) {
        const result = markers.delete(id);
        
        // Re-render map if visible
        if (result && mapCanvas && mapCanvas.parentElement && !mapCanvas.parentElement.classList.contains('hidden')) {
            renderMap();
        }
        
        return result;
    }
    
    /**
     * Update a marker on the map
     * @param {string} id - Marker ID
     * @param {Object} options - Marker options to update
     * @returns {boolean} - Success status
     */
    function updateMarker(id, options) {
        const marker = markers.get(id);
        
        if (!marker) return false;
        
        // Update properties
        if (options.x !== undefined) marker.x = options.x;
        if (options.y !== undefined) marker.y = options.y;
        if (options.type !== undefined) marker.type = options.type;
        if (options.color !== undefined) marker.color = options.color;
        if (options.size !== undefined) marker.size = options.size;
        if (options.label !== undefined) marker.label = options.label;
        
        // Re-render map if visible
        if (mapCanvas && mapCanvas.parentElement && !mapCanvas.parentElement.classList.contains('hidden')) {
            renderMap();
        }
        
        return true;
    }
    
    /**
     * Center the map on coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    function centerOn(x, y) {
        view.x = x;
        view.y = y;
        
        // Re-render map
        renderMap();
    }
    
    /**
     * Get current view properties
     * @returns {Object} - View properties
     */
    function getView() {
        return { ...view };
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - World coordinates
     */
    function screenToWorld(screenX, screenY) {
        if (!mapCanvas) return { x: 0, y: 0 };
        
        const visibleWidth = mapCanvas.width / view.scale;
        const visibleHeight = mapCanvas.height / view.scale;
        const minX = view.x - visibleWidth / 2;
        const minY = view.y - visibleHeight / 2;
        
        const worldX = minX + (screenX / view.scale);
        const worldY = minY + (screenY / view.scale);
        
        return { x: worldX, y: worldY };
    }
    
    // Public API
    return {
        initialize,
        renderMap,
        showMap,
        addMarker,
        removeMarker,
        updateMarker,
        centerOn,
        zoomMap,
        getView,
        screenToWorld
    };
})();
