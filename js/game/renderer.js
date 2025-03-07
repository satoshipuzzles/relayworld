/**
 * Renderer Module for Relay World 2.0
 * Handles camera positioning and rendering of the game world
 */

const renderer = (function() {
    // Private members
    let isInitialized = false;
    let gameCanvas = null;
    let gameContext = null;
    
    // Camera position and scale
    const camera = {
        x: 0,
        y: 0,
        scale: 1.0
    };
    
    // Viewport size
    const viewport = {
        width: 0,
        height: 0
    };
    
    /**
     * Initialize renderer
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing renderer...");
        
        if (isInitialized) {
            debug.warn("Renderer already initialized");
            return true;
        }
        
        try {
            // Get canvas element
            gameCanvas = document.getElementById('game-canvas');
            
            if (!gameCanvas) {
                throw new Error("Game canvas not found");
            }
            
            // Get canvas context
            gameContext = gameCanvas.getContext('2d');
            
            if (!gameContext) {
                throw new Error("Failed to get canvas context");
            }
            
            // Set initial canvas size
            resizeCanvas();
            
            // Set up resize handler
            window.addEventListener('resize', resizeCanvas);
            
            // Center camera initially
            camera.x = config.WORLD_WIDTH / 2;
            camera.y = config.WORLD_HEIGHT / 2;
            
            isInitialized = true;
            return true;
        } catch (error) {
            debug.error("Failed to initialize renderer:", error);
            return false;
        }
    }
    
    /**
     * Resize canvas to match window size
     */
    function resizeCanvas() {
        if (!gameCanvas) return;
        
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        
        viewport.width = gameCanvas.width;
        viewport.height = gameCanvas.height;
        
        debug.log(`Canvas resized to ${gameCanvas.width}x${gameCanvas.height}`);
    }
    
    /**
     * Render the current frame
     */
    function render() {
        if (!isInitialized || !gameContext) return;
        
        // Clear canvas
        gameContext.fillStyle = '#121212';
        gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // Save context state
        gameContext.save();
        
        // Translate to camera center
        gameContext.translate(
            gameCanvas.width / 2 - camera.x * camera.scale,
            gameCanvas.height / 2 - camera.y * camera.scale
        );
        
        // Apply zoom scale
        gameContext.scale(camera.scale, camera.scale);
        
        // Render world grid
        renderGrid();
        
        // Render world bounds
        renderWorldBounds();
        
        // Restore context state
        gameContext.restore();
    }
    
    /**
     * Render world grid
     */
    function renderGrid() {
        const gridSize = 100;
        const minX = Math.floor((camera.x - viewport.width / (2 * camera.scale)) / gridSize) * gridSize;
        const maxX = Math.ceil((camera.x + viewport.width / (2 * camera.scale)) / gridSize) * gridSize;
        const minY = Math.floor((camera.y - viewport.height / (2 * camera.scale)) / gridSize) * gridSize;
        const maxY = Math.ceil((camera.y + viewport.height / (2 * camera.scale)) / gridSize) * gridSize;
        
        gameContext.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        gameContext.lineWidth = 1;
        
        // Vertical lines
        for (let x = minX; x <= maxX; x += gridSize) {
            gameContext.beginPath();
            gameContext.moveTo(x, minY);
            gameContext.lineTo(x, maxY);
            gameContext.stroke();
        }
        
        // Horizontal lines
        for (let y = minY; y <= maxY; y += gridSize) {
            gameContext.beginPath();
            gameContext.moveTo(minX, y);
            gameContext.lineTo(maxX, y);
            gameContext.stroke();
        }
    }
    
    /**
     * Render world boundaries
     */
    function renderWorldBounds() {
        gameContext.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        gameContext.lineWidth = 2;
        
        gameContext.strokeRect(0, 0, config.WORLD_WIDTH, config.WORLD_HEIGHT);
    }
    
    /**
     * Center camera on a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    function centerCameraOn(x, y) {
        // Apply world boundaries
        camera.x = Math.max(viewport.width / (2 * camera.scale), Math.min(config.WORLD_WIDTH - viewport.width / (2 * camera.scale), x));
        camera.y = Math.max(viewport.height / (2 * camera.scale), Math.min(config.WORLD_HEIGHT - viewport.height / (2 * camera.scale), y));
        
        // Update DOM-based elements to follow camera
        updateDomElementsPosition();
    }
    
    /**
     * Update position of DOM-based game elements
     */
    function updateDomElementsPosition() {
        const gameContainer = document.getElementById('game-container');
        
        if (!gameContainer) return;
        
        // Calculate transform for game container
        const translateX = (viewport.width / 2) - (camera.x * camera.scale);
        const translateY = (viewport.height / 2) - (camera.y * camera.scale);
        
        // Apply transform to container
        gameContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${camera.scale})`;
    }
    
    /**
     * Convert screen position to world position
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - {x, y} world coordinates
     */
    function screenToWorldPosition(screenX, screenY) {
        const worldX = camera.x + (screenX - viewport.width / 2) / camera.scale;
        const worldY = camera.y + (screenY - viewport.height / 2) / camera.scale;
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Convert world position to screen position
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - {x, y} screen coordinates
     */
    function worldToScreenPosition(worldX, worldY) {
        const screenX = viewport.width / 2 + (worldX - camera.x) * camera.scale;
        const screenY = viewport.height / 2 + (worldY - camera.y) * camera.scale;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * Get camera position
     * @returns {Object} - {x, y} camera coordinates
     */
    function getCameraPosition() {
        return { x: camera.x, y: camera.y };
    }
    
    /**
     * Get viewport size
     * @returns {Object} - {width, height} viewport dimensions
     */
    function getViewportSize() {
        return { width: viewport.width, height: viewport.height };
    }
    
    /**
     * Set camera zoom
     * @param {number} scale - Zoom scale (1.0 = 100%)
     */
    function setZoom(scale) {
        // Clamp zoom level
        camera.scale = Math.max(0.5, Math.min(2.0, scale));
        
        // Update DOM elements
        updateDomElementsPosition();
    }
    
    /**
     * Check if a world position is visible on screen
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean} - True if position is visible
     */
    function isPositionVisible(worldX, worldY) {
        const screenPos = worldToScreenPosition(worldX, worldY);
        
        return (
            screenPos.x >= 0 &&
            screenPos.x <= viewport.width &&
            screenPos.y >= 0 &&
            screenPos.y <= viewport.height
        );
    }
    
    // Public API
    return {
        initialize,
        render,
        centerCameraOn,
        screenToWorldPosition,
        worldToScreenPosition,
        getCameraPosition,
        getViewportSize,
        setZoom,
        isPositionVisible
    };
})();
