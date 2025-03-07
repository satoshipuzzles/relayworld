/**
 * UI Interface Module for Relay World 2.0
 * Manages all user interface interactions and displays
 */

const ui = (function() {
    // Private members
    let toastTimeout = null;
    let gatheringProgressBar = null;
    
    /**
     * Initialize UI
     */
    function initialize() {
        debug.log("Initializing UI...");
        
        // Set up event handlers
        setupEventHandlers();
    }
    
    /**
     * Setup DOM event handlers
     */
    function setupEventHandlers() {
        // Login button
        document.getElementById('login-button').addEventListener('click', () => {
            engine.start();
        });
        
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        sendButton.addEventListener('click', () => {
            sendChatMessage();
        });
        
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendChatMessage();
            }
        });
        
        // Interface buttons
        document.getElementById('inventory-button').addEventListener('click', toggleInventory);
        document.getElementById('map-button').addEventListener('click', toggleMap);
        document.getElementById('guild-button').addEventListener('click', toggleGuild);
        
        // Close buttons
        document.getElementById('close-inventory').addEventListener('click', hideInventory);
        document.getElementById('close-map').addEventListener('click', hideMap);
        document.getElementById('close-guild').addEventListener('click', hideGuild);
        
        // Add relay button
        document.getElementById('add-relay-button').addEventListener('click', addCustomRelay);
    }
    
    /**
     * Show loading screen
     * @param {string} message - Loading message
     */
    function showLoadingScreen(message = "Loading...") {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingStatus = document.getElementById('loading-status');
        const loadingProgress = document.getElementById('loading-progress');
        
        loadingStatus.textContent = message;
        loadingProgress.style.width = '0%';
        loadingScreen.classList.remove('hidden');
    }
    
    /**
     * Hide loading screen
     */
    function hideLoadingScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
    }
    
    /**
     * Update loading progress
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} message - Status message
     */
    function updateLoadingProgress(percentage, message = null) {
        const loadingProgress = document.getElementById('loading-progress');
        const loadingStatus = document.getElementById('loading-status');
        
        loadingProgress.style.width = `${percentage}%`;
        
        if (message) {
            loadingStatus.textContent = message;
        }
    }
    
    /**
     * Show login screen
     */
    function showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
    }
    
    /**
     * Hide login screen
     */
    function hideLoginScreen() {
        document.getElementById('login-screen').classList.add('hidden');
    }
    
    /**
     * Show game UI
     */
    function showGameUI() {
        document.getElementById('game-ui').classList.remove('hidden');
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        const loginError = document.getElementById('login-error');
        loginError.textContent = message;
        loginError.classList.remove('hidden');
        
        // Show toast as well
        showToast(message, "error");
    }
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: "info", "success", "error"
     * @param {number} duration - Duration in milliseconds
     */
    function showToast(message, type = "info", duration = 3000) {
        // Clear previous toast if exists
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        const toastContainer = document.getElementById('toast-container');
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Clear container and add new toast
        toastContainer.innerHTML = '';
        toastContainer.appendChild(toast);
        
        // Remove after duration
        toastTimeout = setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }
    
    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {string} confirmText - Confirm button text
     * @param {string} cancelText - Cancel button text
     * @returns {Promise<boolean>} - True if confirmed, false if cancelled
     */
    function showConfirmDialog(title, message, confirmText = "Confirm", cancelText = "Cancel") {
        return new Promise((resolve) => {
            const dialogContainer = document.getElementById('dialog-container');
            const dialogContent = document.getElementById('dialog-content');
            
            // Create dialog content
            dialogContent.innerHTML = `
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button id="dialog-cancel" class="secondary-button">${cancelText}</button>
                    <button id="dialog-confirm" class="primary-button">${confirmText}</button>
                </div>
            `;
            
            // Show dialog
            dialogContainer.classList.remove('hidden');
            
            // Button handlers
            document.getElementById('dialog-confirm').addEventListener('click', () => {
                dialogContainer.classList.add('hidden');
                resolve(true);
            });
            
            document.getElementById('dialog-cancel').addEventListener('click', () => {
                dialogContainer.classList.add('hidden');
                resolve(false);
            });
        });
    }
    
    /**
     * Show gathering progress
     * @param {number} progress - Current progress (0-1)
     * @param {number} duration - Total duration in seconds
     */
    function showGatheringProgress(progress, duration) {
        // If progress bar already exists, update it
        if (gatheringProgressBar) {
            updateGatheringProgress(progress);
            return;
        }
        
        // Create progress bar container
        gatheringProgressBar = document.createElement('div');
        gatheringProgressBar.className = 'gathering-progress';
        gatheringProgressBar.innerHTML = `
            <div class="progress-label">Gathering...</div>
            <div class="progress-bar">
                <div class="progress" id="gathering-progress-bar"></div>
            </div>
        `;
        
        // Add to notifications area
        document.getElementById('notifications').appendChild(gatheringProgressBar);
        
        // Update progress
        updateGatheringProgress(progress);
    }
    
    /**
     * Update gathering progress
     * @param {number} progress - Current progress (0-1)
     */
    function updateGatheringProgress(progress) {
        if (!gatheringProgressBar) return;
        
        const progressBar = gatheringProgressBar.querySelector('#gathering-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
    }
    
    /**
     * Hide gathering progress
     */
    function hideGatheringProgress() {
        if (gatheringProgressBar) {
            gatheringProgressBar.remove();
            gatheringProgressBar = null;
        }
    }
    
    /**
     * Update player info in UI
     * @param {string} name - Player name
     * @param {string} avatar - Player avatar URL
     */
    function updatePlayerInfo(name, avatar) {
        const playerName = document.getElementById('player-name');
        const playerAvatar = document.getElementById('player-avatar');
        
        playerName.textContent = name;
        
        if (avatar) {
            playerAvatar.style.backgroundImage = `url('${avatar}')`;
        }
    }
    
    /**
     * Update resource count in UI
     * @param {string} type - Resource type
     * @param {number} count - Resource count
     */
    function updateResourceCount(type, count) {
        const resourceDisplay = document.getElementById(`${type}-display`);
        if (resourceDisplay) {
            const countElement = resourceDisplay.querySelector('.resource-count');
            if (countElement) {
                countElement.textContent = count;
            }
        }
    }
    
    /**
     * Add chat message to chat container
     * @param {string} sender - Sender's pubkey
     * @param {string} message - Message content
     * @param {string} channelType - Channel type: "local", "global", "guild"
     * @param {string} channel - Channel identifier
     */
    function addChatMessage(sender, message, channelType, channel) {
        const chatMessages = document.getElementById('chat-messages');
        
        // Truncate sender pubkey
        const shortSender = sender.substring(0, 8) + '...';
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${channelType}`;
        
        // Format message based on channel type
        let prefix = '';
        switch (channelType) {
            case 'global':
                prefix = '[Global] ';
                messageElement.style.color = '#ffcc00';
                break;
            case 'local':
                prefix = '[Local] ';
                break;
            case 'guild':
                prefix = '[Guild] ';
                messageElement.style.color = '#00ccff';
                break;
        }
        
        messageElement.innerHTML = `<span class="sender">${prefix}${shortSender}: </span>${message}`;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Send chat message
     */
    function sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (message === '') return;
        
        // Determine channel type based on first character
        let channelType = 'local';
        let processedMessage = message;
        
        if (message.startsWith('/g ')) {
            channelType = 'guild';
            processedMessage = message.substring(3);
        } else if (message.startsWith('/global ') || message.startsWith('/all ')) {
            channelType = 'global';
            processedMessage = message.substring(message.indexOf(' ') + 1);
        }
        
        // Send message
        events.sendChatMessage(processedMessage, channelType)
            .then((success) => {
                if (success) {
                    // Clear input
                    chatInput.value = '';
                } else {
                    showToast("Failed to send message", "error");
                }
            })
            .catch((error) => {
                debug.error("Error sending chat message:", error);
                showToast("Error sending message", "error");
            });
    }
    
    /**
     * Show building interface
     * @param {Array} blueprints - Array of blueprint objects
     */
    function showBuildingInterface(blueprints) {
        const buildingInterface = document.getElementById('building-interface');
        const blueprintList = document.getElementById('blueprint-list');
        
        // Clear existing blueprints
        blueprintList.innerHTML = '';
        
        // Add blueprints
        for (const blueprint of blueprints) {
            const blueprintElement = document.createElement('div');
            blueprintElement.className = 'blueprint';
            blueprintElement.dataset.blueprintId = blueprint.id;
            
            // Set content
            blueprintElement.innerHTML = `
                <div class="blueprint-name">${blueprint.name}</div>
                <div class="blueprint-resources">
                    ${Object.entries(blueprint.resources).map(([type, amount]) => 
                        `<div class="resource">${type}: ${amount}</div>`
                    ).join('')}
                </div>
            `;
            
            // Check if player has resources for this blueprint
            const hasResources = player.hasRequiredResources(blueprint.resources);
            if (!hasResources) {
                blueprintElement.classList.add('insufficient-resources');
            }
            
            // Click handler
            blueprintElement.addEventListener('click', () => {
                if (!hasResources) {
                    showToast("Not enough resources", "error");
                    return;
                }
                
                // Select blueprint
                building.selectBlueprint(blueprint.id);
                
                // Update UI
                document.querySelectorAll('.blueprint').forEach(el => {
                    el.classList.remove('selected');
                });
                blueprintElement.classList.add('selected');
            });
            
            blueprintList.appendChild(blueprintElement);
        }
        
        // Show interface
        buildingInterface.classList.remove('hidden');
    }
    
    /**
     * Hide building interface
     */
    function hideBuildingInterface() {
        document.getElementById('building-interface').classList.add('hidden');
    }
    
    /**
     * Update selected blueprint display
     * @param {Object} blueprint - Selected blueprint object
     * @param {boolean} hasResources - Whether player has required resources
     */
    function updateSelectedBlueprint(blueprint, hasResources) {
        // Reset selection
        document.querySelectorAll('.blueprint').forEach(el => {
            el.classList.remove('selected');
        });
        
        if (!blueprint) return;
        
        // Set selected state
        const blueprintElement = document.querySelector(`.blueprint[data-blueprint-id="${blueprint.id}"]`);
        if (blueprintElement) {
            blueprintElement.classList.add('selected');
            
            if (!hasResources) {
                blueprintElement.classList.add('insufficient-resources');
            } else {
                blueprintElement.classList.remove('insufficient-resources');
            }
        }
    }
    
    /**
     * Toggle inventory interface
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
        const inventoryItems = document.getElementById('inventory-items');
        
        // Clear existing items
        inventoryItems.innerHTML = '';
        
        // Add resources
        for (const type of Object.values(resources.RESOURCE_TYPES)) {
            const count = player.getInventoryItemCount(type);
            
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            
            // Set content
            itemElement.innerHTML = `
                <div class="item-icon">${getResourceIcon(type)}</div>
                <div class="item-name">${type}</div>
                <div class="item-count">${count}</div>
            `;
            
            inventoryItems.appendChild(itemElement);
        }
        
        // Show interface
        inventoryInterface.classList.remove('hidden');
    }
    
    /**
     * Hide inventory interface
     */
    function hideInventory() {
        document.getElementById('inventory-interface').classList.add('hidden');
    }
    
    /**
     * Toggle map interface
     */
    function toggleMap() {
        const mapInterface = document.getElementById('map-interface');
        
        if (mapInterface.classList.contains('hidden')) {
            showMap();
        } else {
            hideMap();
        }
    }
    
    /**
     * Show map interface
     */
    function showMap() {
        const mapInterface = document.getElementById('map-interface');
        
        // Update relay list
        updateRelayList(relays.getAllRelays());
        
        // Render map
        renderMap();
        
        // Show interface
        mapInterface.classList.remove('hidden');
    }
    
    /**
     * Hide map interface
     */
    function hideMap() {
        document.getElementById('map-interface').classList.add('hidden');
    }
    
    /**
     * Render world map
     */
    function renderMap() {
        const canvas = document.getElementById('map-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale
        const scaleX = canvas.width / config.WORLD_WIDTH;
        const scaleY = canvas.height / config.WORLD_HEIGHT;
        
        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw region grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const regionSize = config.REGION_SIZE;
        
        for (let x = 0; x < config.WORLD_WIDTH; x += regionSize) {
            ctx.beginPath();
            ctx.moveTo(x * scaleX, 0);
            ctx.lineTo(x * scaleX, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < config.WORLD_HEIGHT; y += regionSize) {
            ctx.beginPath();
            ctx.moveTo(0, y * scaleY);
            ctx.lineTo(canvas.width, y * scaleY);
            ctx.stroke();
        }
        
        // Draw land claims
        const allRegions = world.getAllRegions();
        
        for (const region of allRegions) {
            if (region.landClaim) {
                const boundaries = world.getRegionBoundaries(region.id);
                
                // Draw claim
                ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
                ctx.fillRect(
                    boundaries.minX * scaleX,
                    boundaries.minY * scaleY,
                    (boundaries.maxX - boundaries.minX) * scaleX,
                    (boundaries.maxY - boundaries.minY) * scaleY
                );
                
                // Draw border
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    boundaries.minX * scaleX,
                    boundaries.minY * scaleY,
                    (boundaries.maxX - boundaries.minX) * scaleX,
                    (boundaries.maxY - boundaries.minY) * scaleY
                );
            }
        }
        
        // Draw current player position
        const playerPos = player.getPosition();
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(playerPos.x * scaleX, playerPos.y * scaleY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw other players
        const allPlayers = player.getAllPlayers();
        
        for (const p of allPlayers) {
            if (p.pubkey === nostrClient.getPubkey()) continue; // Skip local player
            
            ctx.fillStyle = '#2196F3';
            ctx.beginPath();
            ctx.arc(p.x * scaleX, p.y * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Update relay list in map interface
     * @param {Array} relayUrls - Array of relay URLs
     */
    function updateRelayList(relayUrls) {
        const relayListItems = document.getElementById('relay-list-items');
        
        // Clear existing items
        relayListItems.innerHTML = '';
        
        // Add relays
        for (const url of relayUrls) {
            const listItem = document.createElement('li');
            
            // Check if this is the active relay
            const isActive = url === relays.getActiveExplorerRelay();
            
            // Set content
            listItem.innerHTML = `
                <span class="relay-url">${url}</span>
                <button class="set-active-relay" data-relay="${url}" ${isActive ? 'disabled' : ''}>
                    ${isActive ? 'Active' : 'Set Active'}
                </button>
            `;
            
            // Click handler for set active button
            const setActiveButton = listItem.querySelector('.set-active-relay');
            setActiveButton.addEventListener('click', () => {
                const relayUrl = setActiveButton.dataset.relay;
                relays.setActiveExplorerRelay(relayUrl);
                updateRelayList(relayUrls);
            });
            
            relayListItems.appendChild(listItem);
        }
    }
    
    /**
     * Update active relay display
     * @param {string} relayUrl - Active relay URL
     */
    function updateActiveRelay(relayUrl) {
        const currentRelay = document.getElementById('current-relay');
        currentRelay.textContent = `Active relay: ${relayUrl}`;
    }
    
    /**
     * Add custom relay
     */
    function addCustomRelay() {
        const relayInput = document.getElementById('new-relay-url');
        const relayUrl = relayInput.value.trim();
        
        if (relayUrl === '') {
            showToast("Please enter a relay URL", "error");
            return;
        }
        
        // Show loading
        showToast(`Connecting to ${relayUrl}...`, "info");
        
        // Add relay
        relays.addCustomRelay(relayUrl)
            .then((success) => {
                if (success) {
                    showToast(`Connected to ${relayUrl}`, "success");
                    
                    // Clear input
                    relayInput.value = '';
                    
                    // Update relay list
                    updateRelayList(relays.getAllRelays());
                } else {
                    showToast(`Failed to connect to ${relayUrl}`, "error");
                }
            })
            .catch((error) => {
                debug.error(`Error connecting to relay ${relayUrl}:`, error);
                showToast(`Error: ${error.message}`, "error");
            });
    }
    
    /**
     * Toggle guild interface
     */
    function toggleGuild() {
        const guildInterface = document.getElementById('guild-interface');
        
        if (guildInterface.classList.contains('hidden')) {
            showGuild();
        } else {
            hideGuild();
        }
    }
    
    /**
     * Show guild interface
     */
    function showGuild() {
        const guildInterface = document.getElementById('guild-interface');
        
        // TODO: Implement guild interface
        
        // Show interface
        guildInterface.classList.remove('hidden');
    }
    
    /**
     * Hide guild interface
     */
    function hideGuild() {
        document.getElementById('guild-interface').classList.add('hidden');
    }
    
    /**
     * Show storage interface
     * @param {Object} storage - Storage structure object
     */
    function showStorageInterface(storage) {
        // TODO: Implement storage interface
        showToast("Storage interface not implemented yet", "info");
    }
    
    /**
     * Show land claim details
     * @param {Object} landClaim - Land claim object
     */
    function showLandClaimDetails(landClaim) {
        // TODO: Implement land claim details
        showToast(`Land: ${landClaim.name} - Owner: ${landClaim.owner.substring(0, 8)}...`, "info");
    }
    
    /**
     * Get icon for resource type
     * @param {string} type - Resource type
     * @returns {string} - Icon HTML
     */
    function getResourceIcon(type) {
        switch (type) {
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
     * Update UI elements
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Nothing to update regularly at the moment
    }
    
    // Public API
    return {
        initialize,
        showLoadingScreen,
        hideLoadingScreen,
        updateLoadingProgress,
        showLoginScreen,
        hideLoginScreen,
        showGameUI,
        showError,
        showToast,
        showConfirmDialog,
        showGatheringProgress,
        updateGatheringProgress,
        hideGatheringProgress,
        updatePlayerInfo,
        updateResourceCount,
        addChatMessage,
        showBuildingInterface,
        hideBuildingInterface,
        updateSelectedBlueprint,
        showInventory,
        hideInventory,
        showMap,
        hideMap,
        updateRelayList,
        updateActiveRelay,
        showGuild,
        hideGuild,
        showStorageInterface,
        showLandClaimDetails,
        update
    };
})();
