/**
 * Physics Module for Relay World 2.0
 * Handles collision detection and physics interactions
 */

const physics = (function() {
    // Private members
    const colliders = new Map(); // Map of collider IDs to collider objects
    
    /**
     * Initialize physics system
     */
    function initialize() {
        debug.log("Initializing physics system...");
    }
    
    /**
     * Collider class
     */
    class Collider {
        /**
         * Create a new collider
         * @param {string} id - Unique identifier
         * @param {string} type - Collider type: 'box', 'circle'
         * @param {Object} params - Collider parameters
         * @param {Object} owner - Owner object reference
         */
        constructor(id, type, params, owner) {
            this.id = id;
            this.type = type;
            this.params = { ...params };
            this.owner = owner;
            this.active = true;
        }
        
        /**
         * Check if this collider intersects with another
         * @param {Collider} other - Other collider
         * @returns {boolean} - True if colliders intersect
         */
        intersects(other) {
            if (!this.active || !other.active) return false;
            
            // Box vs Box
            if (this.type === 'box' && other.type === 'box') {
                return physics.boxVsBox(
                    this.params.x, this.params.y, this.params.width, this.params.height,
                    other.params.x, other.params.y, other.params.width, other.params.height
                );
            }
            
            // Circle vs Circle
            if (this.type === 'circle' && other.type === 'circle') {
                return physics.circleVsCircle(
                    this.params.x, this.params.y, this.params.radius,
                    other.params.x, other.params.y, other.params.radius
                );
            }
            
            // Box vs Circle
            if (this.type === 'box' && other.type === 'circle') {
                return physics.boxVsCircle(
                    this.params.x, this.params.y, this.params.width, this.params.height,
                    other.params.x, other.params.y, other.params.radius
                );
            }
            
            // Circle vs Box
            if (this.type === 'circle' && other.type === 'box') {
                return physics.boxVsCircle(
                    other.params.x, other.params.y, other.params.width, other.params.height,
                    this.params.x, this.params.y, this.params.radius
                );
            }
            
            return false;
        }
        
        /**
         * Update collider position
         * @param {number} x - New X coordinate
         * @param {number} y - New Y coordinate
         */
        updatePosition(x, y) {
            this.params.x = x;
            this.params.y = y;
        }
    }
    
    /**
     * Create a new box collider
     * @param {string} id - Collider identifier
     * @param {number} x - X coordinate (center)
     * @param {number} y - Y coordinate (center)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {Object} owner - Owner object reference
     * @returns {Collider} - New box collider
     */
    function createBoxCollider(id, x, y, width, height, owner) {
        const collider = new Collider(id, 'box', { x, y, width, height }, owner);
        colliders.set(id, collider);
        return collider;
    }
    
    /**
     * Create a new circle collider
     * @param {string} id - Collider identifier
     * @param {number} x - X coordinate (center)
     * @param {number} y - Y coordinate (center)
     * @param {number} radius - Radius
     * @param {Object} owner - Owner object reference
     * @returns {Collider} - New circle collider
     */
    function createCircleCollider(id, x, y, radius, owner) {
        const collider = new Collider(id, 'circle', { x, y, radius }, owner);
        colliders.set(id, collider);
        return collider;
    }
    
    /**
     * Remove a collider
     * @param {string} id - Collider identifier
     */
    function removeCollider(id) {
        colliders.delete(id);
    }
    
    /**
     * Check collision between a point and a position
     * @param {number} x - Point X coordinate
     * @param {number} y - Point Y coordinate
     * @returns {Object|null} - Collision result or null if no collision
     */
    function checkCollision(x, y) {
        // Create a temporary point collider
        const pointCollider = new Collider('temp', 'circle', { x, y, radius: 1 }, null);
        
        // Check against all active colliders
        for (const collider of colliders.values()) {
            if (!collider.active) continue;
            
            if (pointCollider.intersects(collider)) {
                return {
                    collider: collider,
                    owner: collider.owner,
                    blockX: true,
                    blockY: true
                };
            }
        }
        
        return null;
    }
    
    /**
     * Check if a point is inside a box
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} bx - Box center X
     * @param {number} by - Box center Y
     * @param {number} bw - Box width
     * @param {number} bh - Box height
     * @returns {boolean} - True if point is inside box
     */
    function pointInBox(px, py, bx, by, bw, bh) {
        const halfWidth = bw / 2;
        const halfHeight = bh / 2;
        
        return (
            px >= bx - halfWidth &&
            px <= bx + halfWidth &&
            py >= by - halfHeight &&
            py <= by + halfHeight
        );
    }
    
    /**
     * Check if a point is inside a circle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} r - Circle radius
     * @returns {boolean} - True if point is inside circle
     */
    function pointInCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return (dx * dx + dy * dy) <= (r * r);
    }
    
    /**
     * Check collision between two boxes
     * @param {number} x1 - First box center X
     * @param {number} y1 - First box center Y
     * @param {number} w1 - First box width
     * @param {number} h1 - First box height
     * @param {number} x2 - Second box center X
     * @param {number} y2 - Second box center Y
     * @param {number} w2 - Second box width
     * @param {number} h2 - Second box height
     * @returns {boolean} - True if boxes intersect
     */
    function boxVsBox(x1, y1, w1, h1, x2, y2, w2, h2) {
        const halfWidth1 = w1 / 2;
        const halfHeight1 = h1 / 2;
        const halfWidth2 = w2 / 2;
        const halfHeight2 = h2 / 2;
        
        return !(
            x1 + halfWidth1 < x2 - halfWidth2 ||
            x1 - halfWidth1 > x2 + halfWidth2 ||
            y1 + halfHeight1 < y2 - halfHeight2 ||
            y1 - halfHeight1 > y2 + halfHeight2
        );
    }
    
    /**
     * Check collision between two circles
     * @param {number} x1 - First circle center X
     * @param {number} y1 - First circle center Y
     * @param {number} r1 - First circle radius
     * @param {number} x2 - Second circle center X
     * @param {number} y2 - Second circle center Y
     * @param {number} r2 - Second circle radius
     * @returns {boolean} - True if circles intersect
     */
    function circleVsCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        
        return distSq <= (radiusSum * radiusSum);
    }
    
    /**
     * Check collision between a box and a circle
     * @param {number} bx - Box center X
     * @param {number} by - Box center Y
     * @param {number} bw - Box width
     * @param {number} bh - Box height
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} r - Circle radius
     * @returns {boolean} - True if box and circle intersect
     */
    function boxVsCircle(bx, by, bw, bh, cx, cy, r) {
        const halfWidth = bw / 2;
        const halfHeight = bh / 2;
        
        // Find closest point on box to circle center
        const closestX = Math.max(bx - halfWidth, Math.min(cx, bx + halfWidth));
        const closestY = Math.max(by - halfHeight, Math.min(cy, by + halfHeight));
        
        // Calculate distance between closest point and circle center
        const dx = closestX - cx;
        const dy = closestY - cy;
        const distSq = dx * dx + dy * dy;
        
        return distSq <= (r * r);
    }
    
    /**
     * Get all colliders at a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Search radius
     * @returns {Array} - Array of colliders at position
     */
    function getCollidersAt(x, y, radius = 1) {
        const result = [];
        const tempCollider = new Collider('temp', 'circle', { x, y, radius }, null);
        
        for (const collider of colliders.values()) {
            if (!collider.active) continue;
            
            if (tempCollider.intersects(collider)) {
                result.push(collider);
            }
        }
        
        return result;
    }
    
    /**
     * Update physics system
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Nothing to update in the base physics system
        // Collisions are checked on demand
    }
    
    // Public API
    return {
        initialize,
        createBoxCollider,
        createCircleCollider,
        removeCollider,
        checkCollision,
        pointInBox,
        pointInCircle,
        boxVsBox,
        circleVsCircle,
        boxVsCircle,
        getCollidersAt,
        update
    };
})();
