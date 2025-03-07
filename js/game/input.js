/**
 * Input Module for Relay World 2.0
 * Handles keyboard, mouse, and touch input
 */

const input = (function() {
    // Private members
    const keys = new Set(); // Currently pressed keys
    const mouse = {
        x: 0,
        y: 0,
        isDown: false,
        button: 0
    };
    
    // Movement direction
    const moveDirection = {
        x: 0,
        y: 0
    };
    
    /**
     * Initialize input handlers
     */
    function initialize() {
        debug.log("Initializing input handlers...");
        
        setupKeyboardHandlers();
        setupMouseHandlers();
        setupTouchHandlers();
    }
    
    /**
     * Setup keyboard event handlers
     */
    function setupKeyboardHandlers() {
        // Key down handler
        document.addEventListener('keydown', (event) => {
            // Skip if typing in an input field
            if (isInputField(event.target)) return;
            
            // Add key to pressed keys set
            keys.add(event.key.toLowerCase());
            
            // Handle common game actions
            if (event.key === 'Escape') {
                handleEscapeKey();
            }
        });
        
        // Key up handler
        document.addEventListener('keyup', (event) => {
            // Remove key from pressed keys set
            keys.delete(event.key.toLowerCase());
        });
    }
    
    /**
     * Setup mouse event handlers
     */
    function setupMouseHandlers() {
        const gameCanvas = document.getElementById('game-canvas');
        
        // Mouse move handler
        document.addEventListener('mousemove', (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        });
        
        // Mouse down handler
        document.addEventListener('mousedown', (event) => {
            mouse.isDown = true;
            mouse.button = event.button;
        });
        
        // Mouse up handler
        document.addEventListener('mouseup', (event) => {
            mouse.isDown = false;
        });
        
        // Prevent context menu
        document.addEventListener('contextmenu', (event) => {
            // Only prevent on game canvas
            if (event.target === gameCanvas) {
                event.preventDefault();
            }
        });
        
        // Handle mouse wheel for zooming
        document.addEventListener('wheel', (event) => {
            // Skip if not on game canvas
            if (event.target !== gameCanvas) return;
            
            // Prevent default scroll
            event.preventDefault();
            
            // Get current zoom
            const currentZoom = renderer.getCameraPosition().scale || 1.0;
            
            // Calculate new zoom
            const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.5, Math.min(2.0, currentZoom + zoomDelta));
            
            // Apply zoom
            renderer.setZoom(newZoom);
        }, { passive: false });
    }
    
    /**
     * Setup touch event handlers for mobile
     */
    function setupTouchHandlers() {
        const gameCanvas = document.getElementById('game-canvas');
        
        // Touch start
        gameCanvas.addEventListener('touchstart', (event) => {
            // Prevent default to avoid scrolling/zooming
            event.preventDefault();
            
            // Update mouse state
            if (event.touches.length > 0) {
                mouse.x = event.touches[0].clientX;
                mouse.y = event.touches[0].clientY;
                mouse.isDown = true;
            }
        }, { passive: false });
        
        // Touch move
        gameCanvas.addEventListener('touchmove', (event) => {
            // Prevent default to avoid scrolling
            event.preventDefault();
            
            // Update mouse state
            if (event.touches.length > 0) {
                mouse.x = event.touches[0].clientX;
                mouse.y = event.touches[0].clientY;
            }
        }, { passive: false });
        
        // Touch end
        gameCanvas.addEventListener('touchend', (event) => {
            // Prevent default
            event.preventDefault();
            
            // Update mouse state
            mouse.isDown = false;
        }, { passive: false });
        
        // Handle pinch to zoom
        let initialPinchDistance = 0;
        let initialZoom = 1.0;
        
        gameCanvas.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                // Calculate initial pinch distance
                initialPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                
                initialZoom = renderer.getCameraPosition().scale || 1.0;
            }
        }, { passive: false });
        
        gameCanvas.addEventListener('touchmove', (event) => {
            if (event.touches.length === 2 && initialPinchDistance > 0) {
                // Calculate current pinch distance
                const currentPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                
                // Calculate zoom factor
                const zoomFactor = currentPinchDistance / initialPinchDistance;
                const newZoom = Math.max(0.5, Math.min(2.0, initialZoom * zoomFactor));
                
                // Apply zoom
                renderer.setZoom(newZoom);
            }
        }, { passive: false });
    }
    
    /**
     * Check if an element is an input field
     * @param {Element} element - DOM element
     * @returns {boolean} - True if element is an input field
     */
    function isInputField(element) {
        const tagName = element.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || element.isContentEditable;
    }
    
    /**
     * Handle escape key press
     */
    function handleEscapeKey() {
        // Close any open interfaces
        if (building.isInBuildingMode()) {
            building.toggleBuildingMode();
            return;
        }
        
        // Check for other open interfaces
        const interfaces = [
            { id: 'inventory-interface', closeFunc: ui.hideInventory },
            { id: 'map-interface', closeFunc: ui.hideMap },
            { id: 'guild-interface', closeFunc: ui.hideGuild }
        ];
        
        for (const { id, closeFunc } of interfaces) {
            const element = document.getElementById(id);
            if (element && !element.classList.contains('hidden')) {
                closeFunc();
                return;
            }
        }
    }
    
    /**
     * Check if a key is pressed
     * @param {string} key - Key to check
     * @returns {boolean} - True if key is pressed
     */
    function isKeyPressed(key) {
        return keys.has(key.toLowerCase());
    }
    
    /**
     * Get current mouse position
     * @returns {Object} - {x, y} mouse coordinates
     */
    function getMousePosition() {
        return { x: mouse.x, y: mouse.y };
    }
    
    /**
     * Check if mouse button is down
     * @param {number} button - Button number (0 = left, 1 = middle, 2 = right)
     * @returns {boolean} - True if button is down
     */
    function isMouseDown(button = 0) {
        return mouse.isDown && mouse.button === button;
    }
    
    /**
     * Update movement direction based on input
     */
    function updateMovementDirection() {
        // Reset direction
        moveDirection.x = 0;
        moveDirection.y = 0;
        
        // Check WASD keys
        if (isKeyPressed('w') || isKeyPressed('arrowup')) {
            moveDirection.y = -1;
        }
        if (isKeyPressed('s') || isKeyPressed('arrowdown')) {
            moveDirection.y = 1;
        }
        if (isKeyPressed('a') || isKeyPressed('arrowleft')) {
            moveDirection.x = -1;
        }
        if (isKeyPressed('d') || isKeyPressed('arrowright')) {
            moveDirection.x = 1;
        }
        
        // Normalize diagonal movement
        if (moveDirection.x !== 0 && moveDirection.y !== 0) {
            const length = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.y * moveDirection.y);
            moveDirection.x /= length;
            moveDirection.y /= length;
        }
    }
    
    /**
     * Update input state
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Update movement direction based on input
        updateMovementDirection();
    }
    
    /**
     * Get movement direction
     * @returns {Object} - {x, y} normalized direction vector
     */
    function getMovementDirection() {
        return { x: moveDirection.x, y: moveDirection.y };
    }
    
    // Public API
    return {
        initialize,
        isKeyPressed,
        getMousePosition,
        isMouseDown,
        update,
        getMovementDirection
    };
})();
