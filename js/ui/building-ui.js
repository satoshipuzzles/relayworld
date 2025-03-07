/**
 * Building UI Module for Relay World 2.0
 * Handles the building interface and blueprint selection
 */

const buildingUI = (function() {
    // Private members
    let isInitialized = false;
    let selectedBlueprint = null;
    
    /**
     * Initialize building UI
     */
    function initialize() {
        debug.log("Initializing building UI...");
        
        // Setup event handlers
        setupEventHandlers();
        
        isInitialized = true;
        return true;
    }
    
    /**
     * Setup event handlers
     */
    function setupEventHandlers() {
        // Build button
        const buildButton = document.getElementById('build-button');
        if (buildButton) {
            buildButton.addEventListener('click', () => {
                building.toggleBuildingMode();
            });
        }
        
        // Cancel building button
        const cancelButton = document.getElementById('cancel-building');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                building.toggleBuildingMode();
            });
        }
        
        // Rotate button
        const rotateButton = document.getElementById('rotate-button');
        if (rotateButton) {
            rotateButton.addEventListener('click', () => {
                // Trigger building rotation
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
            });
        }
        
        // B key to toggle building mode
        document.addEventListener('keydown', (event) => {
            if (event.key === 'b' || event.key === 'B') {
                // Building.toggleBuildingMode will be called directly by the input handler
                // This is just for reference
            }
        });
    }
    
    /**
     * Show building interface with available blueprints
     * @param {Array} blueprints - Array of blueprint objects
     */
    function showBuildingInterface(blueprints) {
        const buildingInterface = document.getElementById('building-interface');
        if (!buildingInterface) return;
        
        // Update blueprint list
        updateBlueprintList(blueprints);
        
        // Show building interface
        buildingInterface.classList.remove('hidden');
    }
    
    /**
     * Hide building interface
     */
    function hideBuildingInterface() {
        const buildingInterface = document.getElementById('building-interface');
        if (!buildingInterface) return;
        
        buildingInterface.classList.add('hidden');
        
        // Reset selected blueprint
        selectedBlueprint = null;
    }
    
    /**
     * Update blueprint list in building interface
     * @param {Array} blueprints - Array of blueprint objects
     */
    function updateBlueprintList(blueprints) {
        const blueprintList = document.getElementById('blueprint-list');
        if (!blueprintList) return;
        
        // Clear existing blueprints
        blueprintList.innerHTML = '';
        
        // Add each blueprint to the list
        blueprints.forEach(blueprint => {
            addBlueprintToList(blueprintList, blueprint);
        });
    }
    
    /**
     * Add a blueprint to the blueprint list
     * @param {HTMLElement} container - Blueprint list container
     * @param {Object} blueprint - Blueprint object
     */
    function addBlueprintToList(container, blueprint) {
        // Create blueprint element
        const blueprintElement = document.createElement('div');
        blueprintElement.className = 'blueprint';
        blueprintElement.dataset.blueprintId = blueprint.id;
        
        // Check if player has required resources
        const hasResources = player.hasRequiredResources(blueprint.resources);
        
        if (!hasResources) {
            blueprintElement.classList.add('insufficient-resources');
        }
        
        // Determine structure icon based on type
        let icon, color;
        switch (blueprint.type) {
            case 'wall':
                icon = '▬';
                color = getMaterialColor(blueprint.materials);
                break;
            case 'floor':
                icon = '■';
                color = getMaterialColor(blueprint.materials);
                break;
            case 'door':
                icon = '🚪';
                color = 'inherit';
                break;
            case 'storage':
                icon = '📦';
                color = 'inherit';
                break;
            default:
                icon = '◼';
                color = getMaterialColor(blueprint.materials);
        }
        
        // Format resource requirements
        const resourceList = Object.entries(blueprint.resources)
            .map(([type, amount]) => `${type}: ${amount}`)
            .join('<br>');
        
        // Set content
        blueprintElement.innerHTML = `
            <div class="blueprint-icon" style="color: ${color}">${icon}</div>
            <div class="blueprint-details">
                <div class="blueprint-name">${blueprint.name}</div>
                <div class="blueprint-resources">${resourceList}</div>
            </div>
        `;
        
        // Add click handler
        blueprintElement.addEventListener('click', () => {
            if (!hasResources) {
                ui.showToast("Not enough resources for this blueprint", "error");
                return;
            }
            
            selectBlueprint(blueprint.id);
        });
        
        // Add to container
        container.appendChild(blueprintElement);
    }
    
    /**
     * Select a blueprint for building
     * @param {string} blueprintId - Blueprint ID
     */
    function selectBlueprint(blueprintId) {
        // Call building system's selectBlueprint method
        const success = building.selectBlueprint(blueprintId);
        
        if (success) {
            selectedBlueprint = blueprintId;
            updateSelectedBlueprintUI(blueprintId);
        }
    }
    
    /**
     * Update UI to show selected blueprint
     * @param {string} blueprintId - Selected blueprint ID
     */
    function updateSelectedBlueprintUI(blueprintId) {
        const blueprintElements = document.querySelectorAll('.blueprint');
        
        // Remove selected class from all blueprints
        blueprintElements.forEach(element => {
            element.classList.remove('selected');
        });
        
        // Add selected class to the chosen blueprint
        const selectedElement = document.querySelector(`.blueprint[data-blueprint-id="${blueprintId}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }
    
    /**
     * Get color for material type
     * @param {string} material - Material type
     * @returns {string} - CSS color string
     */
    function getMaterialColor(material) {
        switch (material) {
            case resources.RESOURCE_TYPES.WOOD:
                return '#8B4513'; // Brown
            case resources.RESOURCE_TYPES.STONE:
                return '#A9A9A9'; // Gray
            case resources.RESOURCE_TYPES.METAL:
                return '#B87333'; // Copper
            default:
                return '#FFFFFF'; // White
        }
    }
    
    /**
     * Show confirm dialog for building placement
     * @param {Object} blueprint - Blueprint object
     * @param {Object} position - Position object {x, y, z}
     * @returns {Promise<boolean>} - Promise resolving to confirmation result
     */
    function showBuildingConfirmDialog(blueprint, position) {
        return ui.showConfirmDialog(
            `Place ${blueprint.name}?`,
            `
            <div class="building-confirm">
                <p>Place a ${blueprint.name} at position (${Math.floor(position.x)}, ${Math.floor(position.y)})?</p>
                <p>This will use:</p>
                <ul>
                    ${Object.entries(blueprint.resources).map(([type, amount]) => 
                        `<li>${amount} ${type}</li>`
                    ).join('')}
                </ul>
            </div>
            `,
            "Place",
            "Cancel"
        );
    }
    
    /**
     * Show building information dialog
     * @param {Object} structure - Structure object
     */
    function showBuildingInfoDialog(structure) {
        ui.showConfirmDialog(
            `${structure.type.charAt(0).toUpperCase() + structure.type.slice(1)}`,
            `
            <div class="building-info">
                <p>Owner: ${structure.owner.substring(0, 8)}...</p>
                <p>Health: ${structure.health}%</p>
                <p>Material: ${structure.materials}</p>
                ${structure.properties && structure.properties.interactive ? 
                  '<p><em>This structure is interactive</em></p>' : ''}
            </div>
            `,
            "Close",
            null
        );
    }
    
    /**
     * Show structure action dialog with available actions
     * @param {Object} structure - Structure object
     * @returns {Promise<string|null>} - Promise resolving to selected action or null if cancelled
     */
    function showStructureActionDialog(structure) {
        return new Promise((resolve) => {
            // Create actions based on structure type and properties
            let actions = [];
            
            // Basic actions
            actions.push({ id: 'info', label: 'Info', icon: 'ℹ️' });
            
            // Type-specific actions
            switch (structure.type) {
                case 'door':
                    actions.push({
                        id: 'toggle',
                        label: structure.properties.state === 'closed' ? 'Open Door' : 'Close Door',
                        icon: structure.properties.state === 'closed' ? '🔓' : '🔒'
                    });
                    break;
                case 'storage':
                    actions.push({ id: 'open', label: 'Open Storage', icon: '📂' });
                    break;
            }
            
            // Owner-only actions
            const isOwner = structure.owner === nostrClient.getPubkey();
            
            if (isOwner) {
                actions.push({ id: 'modify', label: 'Modify', icon: '🔧' });
                actions.push({ id: 'remove', label: 'Remove', icon: '🗑️' });
            }
            
            // Create dialog content
            let dialogContent = `
                <div class="structure-actions">
                    ${actions.map(action => `
                        <div class="structure-action" data-action="${action.id}">
                            <div class="action-icon">${action.icon}</div>
                            <div class="action-label">${action.label}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Show dialog
            ui.showCustomDialog(
                structure.type.charAt(0).toUpperCase() + structure.type.slice(1),
                dialogContent,
                () => resolve(null) // Cancel callback
            );
            
            // Add event listeners to action elements
            document.querySelectorAll('.structure-action').forEach(element => {
                element.addEventListener('click', () => {
                    ui.hideCustomDialog();
                    resolve(element.dataset.action);
                });
            });
        });
    }
    
    /**
     * Show modify structure dialog
     * @param {Object} structure - Structure object
     * @returns {Promise<Object|null>} - Promise resolving to modified data or null if cancelled
     */
    function showModifyStructureDialog(structure) {
        return ui.showConfirmDialog(
            "Modify Structure",
            `
            <div class="dialog-form">
                <div class="form-group">
                    <label for="structure-name">Name:</label>
                    <input type="text" id="structure-name" value="${structure.properties.name || ''}">
                </div>
                <div class="form-group">
                    <label for="structure-public">Public Access:</label>
                    <input type="checkbox" id="structure-public" ${structure.permissions.public ? 'checked' : ''}>
                </div>
            </div>
            `,
            "Save Changes",
            "Cancel"
        ).then((confirmed) => {
            if (!confirmed) return null;
            
            const name = document.getElementById('structure-name').value;
            const isPublic = document.getElementById('structure-public').checked;
            
            return {
                properties: {
                    ...structure.properties,
                    name: name
                },
                permissions: {
                    ...structure.permissions,
                    public: isPublic
                }
            };
        });
    }
    
    /**
     * Show confirmation dialog for removing a structure
     * @param {Object} structure - Structure object
     * @returns {Promise<boolean>} - Promise resolving to confirmation result
     */
    function showRemoveStructureDialog(structure) {
        return ui.showConfirmDialog(
            "Remove Structure",
            `
            <p>Are you sure you want to remove this ${structure.type}?</p>
            <p>You will recover some of the resources used to build it.</p>
            `,
            "Remove",
            "Cancel"
        );
    }
    
    // Public API
    return {
        initialize,
        showBuildingInterface,
        hideBuildingInterface,
        updateBlueprintList,
        selectBlueprint,
        updateSelectedBlueprintUI,
        showBuildingConfirmDialog,
        showBuildingInfoDialog,
        showStructureActionDialog,
        showModifyStructureDialog,
        showRemoveStructureDialog,
        
        // Getters
        getSelectedBlueprint: () => selectedBlueprint
    };
})();
