/**
 * Inventory Interface Module for Relay World 2.0
 * Handles the player inventory UI and interactions
 */

const inventory = (function() {
    // Private members
    const MAX_INVENTORY_SLOTS = 24;
    let isInitialized = false;
    
    /**
     * Initialize inventory interface
     */
    function initialize() {
        debug.log("Initializing inventory interface...");
        
        // Setup event handlers
        setupEventHandlers();
        
        isInitialized = true;
        return true;
    }
    
    /**
     * Setup event handlers
     */
    function setupEventHandlers() {
        // Inventory button
        const inventoryButton = document.getElementById('inventory-button');
        if (inventoryButton) {
            inventoryButton.addEventListener('click', toggleInventory);
        }
        
        // Close inventory button
        const closeInventoryButton = document.getElementById('close-inventory');
        if (closeInventoryButton) {
            closeInventoryButton.addEventListener('click', hideInventory);
        }
        
        // Tab key to toggle inventory
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                // Prevent default tab behavior
                event.preventDefault();
                toggleInventory();
            }
        });
        
        // Click handlers for inventory items
        document.addEventListener('click', (event) => {
            if (event.target.closest('.inventory-item')) {
                const itemElement = event.target.closest('.inventory-item');
                const itemType = itemElement.dataset.type;
                const itemData = JSON.parse(itemElement.dataset.item || '{}');
                
                handleItemClick(itemType, itemData, event);
            }
        });
    }
    
    /**
     * Toggle inventory visibility
     */
    function toggleInventory() {
        const inventoryInterface = document.getElementById('inventory-interface');
        
        if (inventoryInterface.classList.contains('hidden')) {
            showInventory();
        } else {
            hideInventory();
        }
    }
    
    /**
     * Show inventory interface
     */
    function showInventory() {
        const inventoryInterface = document.getElementById('inventory-interface');
        
        // Update inventory contents
        updateInventoryContent();
        
        // Show interface
        inventoryInterface.classList.remove('hidden');
    }
    
    /**
     * Hide inventory interface
     */
    function hideInventory() {
        const inventoryInterface = document.getElementById('inventory-interface');
        inventoryInterface.classList.add('hidden');
    }
    
    /**
     * Update inventory content
     */
    function updateInventoryContent() {
        const inventoryItems = document.getElementById('inventory-items');
        if (!inventoryItems) return;
        
        // Clear current items
        inventoryItems.innerHTML = '';
        
        // Get resources from player
        const resourceTypes = Object.values(resources.RESOURCE_TYPES);
        
        for (const type of resourceTypes) {
            const count = player.getInventoryItemCount(type);
            
            if (count > 0) {
                addItemToUI(inventoryItems, 'resource', type, count);
            }
        }
        
        // Add empty slots to fill up to MAX_INVENTORY_SLOTS
        const currentSlots = inventoryItems.children.length;
        for (let i = currentSlots; i < MAX_INVENTORY_SLOTS; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'inventory-item empty';
            inventoryItems.appendChild(emptySlot);
        }
    }
    
    /**
     * Add an item to the inventory UI
     * @param {HTMLElement} container - Container element
     * @param {string} itemType - Item type (resource, tool, blueprint, etc.)
     * @param {string} itemId - Item identifier
     * @param {number} count - Item count
     * @param {Object} itemData - Additional item data
     */
    function addItemToUI(container, itemType, itemId, count, itemData = {}) {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.dataset.type = itemType;
        itemElement.dataset.id = itemId;
        
        // Store item data as JSON
        itemElement.dataset.item = JSON.stringify({
            id: itemId,
            count: count,
            ...itemData
        });
        
        // Create item content
        let icon, name;
        
        switch (itemType) {
            case 'resource':
                icon = getResourceIcon(itemId);
                name = capitalizeFirstLetter(itemId);
                break;
            case 'tool':
                icon = getToolIcon(itemId);
                name = getToolName(itemId);
                break;
            case 'blueprint':
                icon = '📝';
                name = itemData.name || 'Blueprint';
                break;
            default:
                icon = '📦';
                name = itemId;
        }
        
        // Set content
        itemElement.innerHTML = `
            <div class="item-icon">${icon}</div>
            <div class="item-name">${name}</div>
            <div class="item-count">${count}</div>
        `;
        
        // Add to container
        container.appendChild(itemElement);
    }
    
    /**
     * Handle inventory item click
     * @param {string} itemType - Item type
     * @param {Object} itemData - Item data
     * @param {MouseEvent} event - Mouse event
     */
    function handleItemClick(itemType, itemData, event) {
        // Right click for context menu
        if (event.button === 2) {
            event.preventDefault();
            showItemContextMenu(itemType, itemData, event.clientX, event.clientY);
            return;
        }
        
        // Left click for use/equip
        switch (itemType) {
            case 'resource':
                // Show resource info
                showResourceInfo(itemData.id, itemData.count);
                break;
            case 'tool':
                // Equip tool
                equipTool(itemData.id);
                break;
            case 'blueprint':
                // Select blueprint for building
                if (building.isInBuildingMode()) {
                    building.selectBlueprint(itemData.id);
                } else {
                    building.toggleBuildingMode();
                    setTimeout(() => building.selectBlueprint(itemData.id), 10);
                }
                hideInventory();
                break;
        }
    }
    
    /**
     * Show context menu for inventory item
     * @param {string} itemType - Item type
     * @param {Object} itemData - Item data
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     */
    function showItemContextMenu(itemType, itemData, x, y) {
        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        
        // Add menu items based on item type
        switch (itemType) {
            case 'resource':
                contextMenu.innerHTML = `
                    <div class="context-menu-item" data-action="drop">Drop</div>
                    <div class="context-menu-item" data-action="drop-all">Drop All</div>
                    <div class="context-menu-item" data-action="deposit">Deposit to Guild</div>
                `;
                break;
            case 'tool':
                contextMenu.innerHTML = `
                    <div class="context-menu-item" data-action="equip">Equip</div>
                    <div class="context-menu-item" data-action="drop">Drop</div>
                `;
                break;
            case 'blueprint':
                contextMenu.innerHTML = `
                    <div class="context-menu-item" data-action="use">Use</div>
                    <div class="context-menu-item" data-action="drop">Drop</div>
                `;
                break;
        }
        
        // Add to document
        document.body.appendChild(contextMenu);
        
        // Handle menu item clicks
        contextMenu.addEventListener('click', (event) => {
            const menuItem = event.target.closest('.context-menu-item');
            if (!menuItem) return;
            
            const action = menuItem.dataset.action;
            
            switch (action) {
                case 'drop':
                    dropItem(itemType, itemData.id, 1);
                    break;
                case 'drop-all':
                    dropItem(itemType, itemData.id, itemData.count);
                    break;
                case 'deposit':
                    depositToGuild(itemData.id, itemData.count);
                    break;
                case 'equip':
                    equipTool(itemData.id);
                    break;
                case 'use':
                    useItem(itemType, itemData.id);
                    break;
            }
            
            // Remove context menu
            contextMenu.remove();
        });
        
        // Remove menu when clicking elsewhere
        const removeMenu = (event) => {
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        // Delay adding the event listener to prevent immediate removal
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 10);
    }
    
    /**
     * Show resource information
     * @param {string} resourceType - Resource type
     * @param {number} count - Resource count
     */
    function showResourceInfo(resourceType, count) {
        ui.showConfirmDialog(
            capitalizeFirstLetter(resourceType),
            `
            <div class="resource-info">
                <div class="resource-icon">${getResourceIcon(resourceType)}</div>
                <div class="resource-details">
                    <p>You have <strong>${count}</strong> ${resourceType}.</p>
                    <p>${getResourceDescription(resourceType)}</p>
                </div>
            </div>
            `,
            "Close",
            null
        );
    }
    
    /**
     * Equip a tool
     * @param {string} toolId - Tool ID
     */
    function equipTool(toolId) {
        // TODO: Implement tool equipping
        ui.showToast(`Equipped ${getToolName(toolId)}`, "success");
    }
    
    /**
     * Drop an item
     * @param {string} itemType - Item type
     * @param {string} itemId - Item ID
     * @param {number} count - Amount to drop
     */
    function dropItem(itemType, itemId, count) {
        if (itemType === 'resource') {
            // Check if player has enough
            const available = player.getInventoryItemCount(itemId);
            
            if (available < count) {
                ui.showToast(`You only have ${available} ${itemId}`, "error");
                return;
            }
            
            // Remove from inventory
            player.removeFromInventory(itemId, count);
            
            // Update UI
            updateInventoryContent();
            ui.updateResourceCount(itemId, player.getInventoryItemCount(itemId));
            
            ui.showToast(`Dropped ${count} ${itemId}`, "info");
        } else {
            // TODO: Implement dropping other item types
            ui.showToast(`Dropped ${getItemName(itemType, itemId)}`, "info");
        }
    }
    
    /**
     * Deposit resources to guild
     * @param {string} resourceType - Resource type
     * @param {number} count - Resource count
     */
    function depositToGuild(resourceType, count) {
        // Check if player is in a guild
        const currentGuild = guild.getCurrentGuild();
        
        if (!currentGuild) {
            ui.showToast("You are not in a guild", "error");
            return;
        }
        
        // Show deposit dialog
        ui.showConfirmDialog(
            "Deposit to Guild",
            `
            <div class="dialog-form">
                <div class="form-group">
                    <label for="deposit-amount">Amount (max ${count}):</label>
                    <input type="number" id="deposit-amount" min="1" max="${count}" value="${count}">
                </div>
            </div>
            `,
            "Deposit",
            "Cancel"
        ).then((confirmed) => {
            if (confirmed) {
                const amount = parseInt(document.getElementById('deposit-amount').value);
                
                if (isNaN(amount) || amount < 1 || amount > count) {
                    ui.showToast("Please enter a valid amount", "error");
                    return;
                }
                
                guild.addResourcesToGuild(resourceType, amount);
                
                // Update inventory
                updateInventoryContent();
            }
        });
    }
    
    /**
     * Use an item
     * @param {string} itemType - Item type
     * @param {string} itemId - Item ID
     */
    function useItem(itemType, itemId) {
        if (itemType === 'blueprint') {
            // Select blueprint for building
            if (building.isInBuildingMode()) {
                building.selectBlueprint(itemId);
            } else {
                building.toggleBuildingMode();
                setTimeout(() => building.selectBlueprint(itemId), 10);
            }
            hideInventory();
        } else {
            // TODO: Implement using other item types
            ui.showToast(`Used ${getItemName(itemType, itemId)}`, "info");
        }
    }
    
    /**
     * Get resource icon
     * @param {string} resourceType - Resource type
     * @returns {string} - Icon HTML
     */
    function getResourceIcon(resourceType) {
        switch (resourceType) {
            case resources.RESOURCE_TYPES.WOOD:
                return '🪵';
            case resources.RESOURCE_TYPES.STONE:
                return '🪨';
            case resources.RESOURCE_TYPES.METAL:
                return '⛏️';
            default:
                return '📦';
        }
    }
    
    /**
     * Get resource description
     * @param {string} resourceType - Resource type
     * @returns {string} - Resource description
     */
    function getResourceDescription(resourceType) {
        switch (resourceType) {
            case resources.RESOURCE_TYPES.WOOD:
                return 'Used for basic construction and crafting. Can be gathered from trees.';
            case resources.RESOURCE_TYPES.STONE:
                return 'Stronger than wood, used for durable construction. Can be mined from rocks.';
            case resources.RESOURCE_TYPES.METAL:
                return 'Used for advanced construction and tools. Can be mined from ore deposits.';
            default:
                return 'A resource used for crafting and building.';
        }
    }
    
    /**
     * Get tool icon
     * @param {string} toolId - Tool ID
     * @returns {string} - Icon HTML
     */
    function getToolIcon(toolId) {
        switch (toolId) {
            case 'axe':
                return '🪓';
            case 'pickaxe':
                return '⛏️';
            case 'hammer':
                return '🔨';
            default:
                return '🔧';
        }
    }
    
    /**
     * Get tool name
     * @param {string} toolId - Tool ID
     * @returns {string} - Tool name
     */
    function getToolName(toolId) {
        switch (toolId) {
            case 'axe':
                return 'Axe';
            case 'pickaxe':
                return 'Pickaxe';
            case 'hammer':
                return 'Hammer';
            default:
                return capitalizeFirstLetter(toolId);
        }
    }
    
    /**
     * Get generic item name
     * @param {string} itemType - Item type
     * @param {string} itemId - Item ID
     * @returns {string} - Item name
     */
    function getItemName(itemType, itemId) {
        switch (itemType) {
            case 'resource':
                return capitalizeFirstLetter(itemId);
            case 'tool':
                return getToolName(itemId);
            case 'blueprint':
                return `${capitalizeFirstLetter(itemId)} Blueprint`;
            default:
                return capitalizeFirstLetter(itemId);
        }
    }
    
    /**
     * Capitalize first letter of a string
     * @param {string} string - Input string
     * @returns {string} - Capitalized string
     */
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Public API
    return {
        initialize,
        showInventory,
        hideInventory,
        toggleInventory,
        updateInventoryContent
    };
})();
