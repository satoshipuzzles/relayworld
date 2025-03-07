/**
 * Guild System Module for Relay World 2.0
 * Handles player guilds, guild territories, and shared resources
 */

const guild = (function() {
    // Private members
    const guilds = new Map(); // Map of guild IDs to guild objects
    let currentGuild = null; // Current player's guild
    
    /**
     * Guild class
     */
    class Guild {
        /**
         * Create a new guild
         * @param {string} id - Guild ID
         * @param {string} name - Guild name
         * @param {string} founderPubkey - Founder's public key
         */
        constructor(id, name, founderPubkey) {
            this.id = id;
            this.name = name;
            this.founder = founderPubkey;
            this.description = '';
            this.members = new Set([founderPubkey]);
            this.admins = new Set([founderPubkey]);
            this.territories = new Set(); // Set of region IDs
            this.storage = new Map(); // Resource storage
            this.createdAt = Math.floor(Date.now() / 1000);
            this.lastActive = this.createdAt;
        }
        
        /**
         * Add a member to the guild
         * @param {string} pubkey - Member's public key
         * @returns {boolean} - Success status
         */
        addMember(pubkey) {
            if (this.members.has(pubkey)) return false;
            this.members.add(pubkey);
            return true;
        }
        
        /**
         * Remove a member from the guild
         * @param {string} pubkey - Member's public key
         * @returns {boolean} - Success status
         */
        removeMember(pubkey) {
            if (!this.members.has(pubkey)) return false;
            if (pubkey === this.founder) return false; // Can't remove founder
            
            this.members.delete(pubkey);
            this.admins.delete(pubkey); // Also remove from admins
            return true;
        }
        
        /**
         * Promote a member to admin
         * @param {string} pubkey - Member's public key
         * @returns {boolean} - Success status
         */
        promoteToAdmin(pubkey) {
            if (!this.members.has(pubkey)) return false;
            if (this.admins.has(pubkey)) return false;
            
            this.admins.add(pubkey);
            return true;
        }
        
        /**
         * Demote an admin to regular member
         * @param {string} pubkey - Admin's public key
         * @returns {boolean} - Success status
         */
        demoteFromAdmin(pubkey) {
            if (!this.admins.has(pubkey)) return false;
            if (pubkey === this.founder) return false; // Can't demote founder
            
            this.admins.delete(pubkey);
            return true;
        }
        
        /**
         * Add a territory to the guild
         * @param {string} regionId - Region ID
         * @returns {boolean} - Success status
         */
        addTerritory(regionId) {
            if (this.territories.has(regionId)) return false;
            this.territories.add(regionId);
            return true;
        }
        
        /**
         * Remove a territory from the guild
         * @param {string} regionId - Region ID
         * @returns {boolean} - Success status
         */
        removeTerritory(regionId) {
            if (!this.territories.has(regionId)) return false;
            this.territories.delete(regionId);
            return true;
        }
        
        /**
         * Add resources to guild storage
         * @param {string} resourceType - Resource type
         * @param {number} amount - Amount to add
         */
        addResource(resourceType, amount) {
            const currentAmount = this.storage.get(resourceType) || 0;
            this.storage.set(resourceType, currentAmount + amount);
            this.lastActive = Math.floor(Date.now() / 1000);
        }
        
        /**
         * Remove resources from guild storage
         * @param {string} resourceType - Resource type
         * @param {number} amount - Amount to remove
         * @returns {boolean} - Success status
         */
        removeResource(resourceType, amount) {
            const currentAmount = this.storage.get(resourceType) || 0;
            
            if (currentAmount < amount) return false;
            
            this.storage.set(resourceType, currentAmount - amount);
            this.lastActive = Math.floor(Date.now() / 1000);
            return true;
        }
        
        /**
         * Check if a player is a member
         * @param {string} pubkey - Player's public key
         * @returns {boolean} - True if player is a member
         */
        isMember(pubkey) {
            return this.members.has(pubkey);
        }
        
        /**
         * Check if a player is an admin
         * @param {string} pubkey - Player's public key
         * @returns {boolean} - True if player is an admin
         */
        isAdmin(pubkey) {
            return this.admins.has(pubkey);
        }
        
        /**
         * Check if a player is the founder
         * @param {string} pubkey - Player's public key
         * @returns {boolean} - True if player is the founder
         */
        isFounder(pubkey) {
            return this.founder === pubkey;
        }
        
        /**
         * Get resource amount in storage
         * @param {string} resourceType - Resource type
         * @returns {number} - Resource amount
         */
        getResourceAmount(resourceType) {
            return this.storage.get(resourceType) || 0;
        }
        
        /**
         * Update guild activity timestamp
         */
        updateActivity() {
            this.lastActive = Math.floor(Date.now() / 1000);
        }
        
        /**
         * Export guild data for serialization
         * @returns {Object} - Guild data
         */
        toJSON() {
            return {
                id: this.id,
                name: this.name,
                founder: this.founder,
                description: this.description,
                members: Array.from(this.members),
                admins: Array.from(this.admins),
                territories: Array.from(this.territories),
                storage: Object.fromEntries(this.storage),
                createdAt: this.createdAt,
                lastActive: this.lastActive
            };
        }
        
        /**
         * Create guild from JSON data
         * @param {Object} data - Guild data
         * @returns {Guild} - New guild instance
         */
        static fromJSON(data) {
            const guild = new Guild(data.id, data.name, data.founder);
            
            guild.description = data.description || '';
            guild.createdAt = data.createdAt || Math.floor(Date.now() / 1000);
            guild.lastActive = data.lastActive || guild.createdAt;
            
            // Clear default sets/maps and add from data
            guild.members.clear();
            guild.admins.clear();
            guild.territories.clear();
            guild.storage.clear();
            
            if (Array.isArray(data.members)) {
                data.members.forEach(pubkey => guild.members.add(pubkey));
            }
            
            if (Array.isArray(data.admins)) {
                data.admins.forEach(pubkey => guild.admins.add(pubkey));
            }
            
            if (Array.isArray(data.territories)) {
                data.territories.forEach(regionId => guild.territories.add(regionId));
            }
            
            if (data.storage && typeof data.storage === 'object') {
                Object.entries(data.storage).forEach(([resourceType, amount]) => {
                    guild.storage.set(resourceType, amount);
                });
            }
            
            return guild;
        }
    }
    
    /**
     * Initialize guild system
     */
    function initialize() {
        debug.log("Initializing guild system...");
        
        // Setup event handlers
        setupEventHandlers();
    }
    
    /**
     * Setup event handlers
     */
    function setupEventHandlers() {
        // Register for guild management events
        document.addEventListener('guildCreate', handleGuildCreate);
        document.addEventListener('guildJoin', handleGuildJoin);
        document.addEventListener('guildLeave', handleGuildLeave);
        
        // Setup UI event handlers
        setupUIEventHandlers();
    }
    
    /**
     * Setup UI event handlers
     */
    function setupUIEventHandlers() {
        // Guild interface elements
        const createGuildButton = document.getElementById('create-guild-button');
        if (createGuildButton) {
            createGuildButton.addEventListener('click', showCreateGuildDialog);
        }
        
        // Guild management buttons
        document.addEventListener('click', (event) => {
            // Join guild button
            if (event.target.classList.contains('join-guild-button')) {
                const guildId = event.target.dataset.guildId;
                if (guildId) {
                    joinGuild(guildId);
                }
            }
            
            // Leave guild button
            if (event.target.classList.contains('leave-guild-button')) {
                leaveGuild();
            }
            
            // Add territory button
            if (event.target.classList.contains('add-territory-button')) {
                const regionId = event.target.dataset.regionId;
                if (regionId) {
                    addTerritoryToGuild(regionId);
                }
            }
        });
    }
    
    /**
     * Show create guild dialog
     */
    function showCreateGuildDialog() {
        // Check if player is already in a guild
        if (currentGuild) {
            ui.showToast("You are already in a guild", "error");
            return;
        }
        
        ui.showConfirmDialog(
            "Create Guild",
            `
            <div class="dialog-form">
                <div class="form-group">
                    <label for="guild-name">Guild Name:</label>
                    <input type="text" id="guild-name" placeholder="Enter guild name">
                </div>
                <div class="form-group">
                    <label for="guild-description">Description:</label>
                    <textarea id="guild-description" placeholder="Describe your guild"></textarea>
                </div>
            </div>
            `,
            "Create",
            "Cancel"
        ).then((confirmed) => {
            if (confirmed) {
                const name = document.getElementById('guild-name').value.trim();
                const description = document.getElementById('guild-description').value.trim();
                
                if (name.length < 3) {
                    ui.showToast("Guild name must be at least 3 characters", "error");
                    return;
                }
                
                createGuild(name, description);
            }
        });
    }
    
    /**
     * Create a new guild
     * @param {string} name - Guild name
     * @param {string} description - Guild description
     * @returns {Promise<boolean>} - Success status
     */
    async function createGuild(name, description) {
        try {
            // Check if player is already in a guild
            if (currentGuild) {
                ui.showToast("You are already in a guild", "error");
                return false;
            }
            
            // Generate unique guild ID
            const guildId = `guild-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Create new guild instance
            const newGuild = new Guild(guildId, name, nostrClient.getPubkey());
            newGuild.description = description;
            
            // Publish guild creation event
            const success = await publishGuildEvent('create', newGuild);
            
            if (!success) {
                throw new Error("Failed to publish guild creation event");
            }
            
            // Add to guilds map
            guilds.set(guildId, newGuild);
            
            // Set as current guild
            currentGuild = newGuild;
            
            // Update UI
            updateGuildUI();
            
            ui.showToast(`Guild "${name}" created!`, "success");
            return true;
        } catch (error) {
            debug.error("Failed to create guild:", error);
            ui.showToast("Failed to create guild", "error");
            return false;
        }
    }
    
    /**
     * Join an existing guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<boolean>} - Success status
     */
    async function joinGuild(guildId) {
        try {
            // Check if player is already in a guild
            if (currentGuild) {
                ui.showToast("You are already in a guild", "error");
                return false;
            }
            
            // Check if guild exists
            const guild = guilds.get(guildId);
            if (!guild) {
                ui.showToast("Guild not found", "error");
                return false;
            }
            
            // Add player to guild
            guild.addMember(nostrClient.getPubkey());
            
            // Publish guild join event
            const success = await publishGuildEvent('join', guild);
            
            if (!success) {
                // Revert changes
                guild.removeMember(nostrClient.getPubkey());
                throw new Error("Failed to publish guild join event");
            }
            
            // Set as current guild
            currentGuild = guild;
            
            // Update UI
            updateGuildUI();
            
            ui.showToast(`Joined guild "${guild.name}"!`, "success");
            return true;
        } catch (error) {
            debug.error("Failed to join guild:", error);
            ui.showToast("Failed to join guild", "error");
            return false;
        }
    }
    
    /**
     * Leave current guild
     * @returns {Promise<boolean>} - Success status
     */
    async function leaveGuild() {
        try {
            // Check if player is in a guild
            if (!currentGuild) {
                ui.showToast("You are not in a guild", "error");
                return false;
            }
            
            // Check if player is the founder
            if (currentGuild.isFounder(nostrClient.getPubkey())) {
                const confirmDisband = await ui.showConfirmDialog(
                    "Disband Guild?",
                    "You are the founder of this guild. Leaving will disband the guild for all members. Are you sure?",
                    "Disband Guild",
                    "Cancel"
                );
                
                if (confirmDisband) {
                    return disbandGuild();
                }
                
                return false;
            }
            
            // Remove player from guild
            currentGuild.removeMember(nostrClient.getPubkey());
            
            // Publish guild leave event
            const success = await publishGuildEvent('leave', currentGuild);
            
            if (!success) {
                // Revert changes
                currentGuild.addMember(nostrClient.getPubkey());
                throw new Error("Failed to publish guild leave event");
            }
            
            // Clear current guild
            currentGuild = null;
            
            // Update UI
            updateGuildUI();
            
            ui.showToast("Left guild successfully", "success");
            return true;
        } catch (error) {
            debug.error("Failed to leave guild:", error);
            ui.showToast("Failed to leave guild", "error");
            return false;
        }
    }
    
    /**
     * Disband guild (founder only)
     * @returns {Promise<boolean>} - Success status
     */
    async function disbandGuild() {
        try {
            // Check if player is in a guild
            if (!currentGuild) {
                ui.showToast("You are not in a guild", "error");
                return false;
            }
            
            // Check if player is the founder
            if (!currentGuild.isFounder(nostrClient.getPubkey())) {
                ui.showToast("Only the founder can disband the guild", "error");
                return false;
            }
            
            // Publish guild disband event
            const success = await publishGuildEvent('disband', currentGuild);
            
            if (!success) {
                throw new Error("Failed to publish guild disband event");
            }
            
            // Remove guild from map
            guilds.delete(currentGuild.id);
            
            // Clear current guild
            currentGuild = null;
            
            // Update UI
            updateGuildUI();
            
            ui.showToast("Guild disbanded", "success");
            return true;
        } catch (error) {
            debug.error("Failed to disband guild:", error);
            ui.showToast("Failed to disband guild", "error");
            return false;
        }
    }
    
    /**
     * Add a territory (region) to the guild
     * @param {string} regionId - Region ID
     * @returns {Promise<boolean>} - Success status
     */
    async function addTerritoryToGuild(regionId) {
        try {
            // Check if player is in a guild
            if (!currentGuild) {
                ui.showToast("You are not in a guild", "error");
                return false;
            }
            
            // Check if player is an admin
            if (!currentGuild.isAdmin(nostrClient.getPubkey())) {
                ui.showToast("Only guild admins can claim territories", "error");
                return false;
            }
            
            // Check if region is claimed by the player
            const region = world.getRegion(regionId);
            if (!region || !region.landClaim) {
                ui.showToast("You need to claim this land first", "error");
                return false;
            }
            
            if (region.landClaim.owner !== nostrClient.getPubkey()) {
                ui.showToast("You don't own this land", "error");
                return false;
            }
            
            // Add territory to guild
            currentGuild.addTerritory(regionId);
            
            // Publish territory claim event
            const success = await publishGuildEvent('claim-territory', currentGuild, { regionId });
            
            if (!success) {
                // Revert changes
                currentGuild.removeTerritory(regionId);
                throw new Error("Failed to publish territory claim event");
            }
            
            // Update UI
            updateGuildUI();
            
            ui.showToast("Territory added to guild", "success");
            return true;
        } catch (error) {
            debug.error("Failed to add territory to guild:", error);
            ui.showToast("Failed to add territory", "error");
            return false;
        }
    }
    
    /**
     * Add resources to guild storage
     * @param {string} resourceType - Resource type
     * @param {number} amount - Amount to add
     * @returns {Promise<boolean>} - Success status
     */
    async function addResourcesToGuild(resourceType, amount) {
        try {
            // Check if player is in a guild
            if (!currentGuild) {
                ui.showToast("You are not in a guild", "error");
                return false;
            }
            
            // Check if player has enough resources
            if (!player.hasRequiredResources({ [resourceType]: amount })) {
                ui.showToast("You don't have enough resources", "error");
                return false;
            }
            
            // Add resources to guild storage
            currentGuild.addResource(resourceType, amount);
            
            // Remove from player inventory
            player.removeFromInventory(resourceType, amount);
            
            // Publish resource add event
            const success = await publishGuildEvent('add-resources', currentGuild, { 
                resourceType, 
                amount 
            });
            
            if (!success) {
                // Revert changes
                currentGuild.removeResource(resourceType, amount);
                player.addToInventory(resourceType, amount);
                throw new Error("Failed to publish resource add event");
            }
            
            // Update UI
            updateGuildUI();
            ui.updateResourceCount(resourceType, player.getInventoryItemCount(resourceType));
            
            ui.showToast(`Added ${amount} ${resourceType} to guild storage`, "success");
            return true;
        } catch (error) {
            debug.error("Failed to add resources to guild:", error);
            ui.showToast("Failed to add resources", "error");
            return false;
        }
    }
    
    /**
     * Take resources from guild storage
     * @param {string} resourceType - Resource type
     * @param {number} amount - Amount to take
     * @returns {Promise<boolean>} - Success status
     */
    async function takeResourcesFromGuild(resourceType, amount) {
        try {
            // Check if player is in a guild
            if (!currentGuild) {
                ui.showToast("You are not in a guild", "error");
                return false;
            }
            
            // Check if guild has enough resources
            if (currentGuild.getResourceAmount(resourceType) < amount) {
                ui.showToast("Not enough resources in guild storage", "error");
                return false;
            }
            
            // Remove resources from guild storage
            currentGuild.removeResource(resourceType, amount);
            
            // Add to player inventory
            player.addToInventory(resourceType, amount);
            
            // Publish resource take event
            const success = await publishGuildEvent('take-resources', currentGuild, {
                resourceType,
                amount
            });
            
            if (!success) {
                // Revert changes
                currentGuild.addResource(resourceType, amount);
                player.removeFromInventory(resourceType, amount);
                throw new Error("Failed to publish resource take event");
            }
            
            // Update UI
            updateGuildUI();
            ui.updateResourceCount(resourceType, player.getInventoryItemCount(resourceType));
            
            ui.showToast(`Took ${amount} ${resourceType} from guild storage`, "success");
            return true;
        } catch (error) {
            debug.error("Failed to take resources from guild:", error);
            ui.showToast("Failed to take resources", "error");
            return false;
        }
    }
    
    /**
     * Publish guild event to Nostr
     * @param {string} action - Event action
     * @param {Guild} guild - Guild instance
     * @param {Object} extraData - Extra data to include
     * @returns {Promise<boolean>} - Success status
     */
    async function publishGuildEvent(action, guild, extraData = {}) {
        try {
            // Prepare event data
            const eventData = {
                action,
                guildId: guild.id,
                timestamp: Math.floor(Date.now() / 1000),
                ...extraData
            };
            
            // For some actions, include guild data
            if (action === 'create' || action === 'update') {
                eventData.guild = guild.toJSON();
            }
            
            // Create event
            const event = nostrClient.createEvent(
                config.EVENT_KINDS.GUILD_MANAGEMENT,
                JSON.stringify(eventData),
                [
                    ["t", "guild"],
                    ["g", config.GAME_ID],
                    ["action", action],
                    ["guild", guild.id]
                ]
            );
            
            // Sign and publish event
            const signedEvent = await nostrClient.signEvent(event);
            await relays.publishToGameRelay(signedEvent);
            
            return true;
        } catch (error) {
            debug.error(`Failed to publish guild ${action} event:`, error);
            return false;
        }
    }
    
    /**
     * Handle guild create event
     * @param {Object} event - Nostr event
     */
    function handleGuildCreate(event) {
        try {
            const eventData = JSON.parse(event.content);
            
            if (!eventData.guild || !eventData.guild.id || !eventData.guild.name) {
                debug.warn("Invalid guild create event");
                return;
            }
            
            // Create guild from data
            const newGuild = Guild.fromJSON(eventData.guild);
            
            // Add to guilds map
            guilds.set(newGuild.id, newGuild);
            
            // If this player is a member, set as current guild
            if (newGuild.isMember(nostrClient.getPubkey())) {
                currentGuild = newGuild;
                updateGuildUI();
            }
            
            debug.log(`Guild "${newGuild.name}" created`);
        } catch (error) {
            debug.error("Error handling guild create event:", error);
        }
    }
    
    /**
     * Handle guild join event
     * @param {Object} event - Nostr event
     */
    function handleGuildJoin(event) {
        try {
            const eventData = JSON.parse(event.content);
            
            if (!eventData.guildId) {
                debug.warn("Invalid guild join event");
                return;
            }
            
            const guild = guilds.get(eventData.guildId);
            
            if (!guild) {
                debug.warn(`Guild not found: ${eventData.guildId}`);
                return;
            }
            
            // Add member to guild
            guild.addMember(event.pubkey);
            
            // If this is the local player, set as current guild
            if (event.pubkey === nostrClient.getPubkey()) {
                currentGuild = guild;
                updateGuildUI();
            }
            
            debug.log(`Player ${event.pubkey} joined guild "${guild.name}"`);
        } catch (error) {
            debug.error("Error handling guild join event:", error);
        }
    }
    
    /**
     * Handle guild leave event
     * @param {Object} event - Nostr event
     */
    function handleGuildLeave(event) {
        try {
            const eventData = JSON.parse(event.content);
            
            if (!eventData.guildId) {
                debug.warn("Invalid guild leave event");
                return;
            }
            
            const guild = guilds.get(eventData.guildId);
            
            if (!guild) {
                debug.warn(`Guild not found: ${eventData.guildId}`);
                return;
            }
            
            // Remove member from guild
            guild.removeMember(event.pubkey);
            
            // If this is the local player, clear current guild
            if (event.pubkey === nostrClient.getPubkey()) {
                currentGuild = null;
                updateGuildUI();
            }
            
            debug.log(`Player ${event.pubkey} left guild "${guild.name}"`);
        } catch (error) {
            debug.error("Error handling guild leave event:", error);
        }
    }
    
    /**
     * Update guild UI components
     */
    function updateGuildUI() {
        // Get guild interface elements
        const guildName = document.getElementById('guild-name');
        const guildMembers = document.getElementById('guild-members');
        const guildTerritory = document.getElementById('guild-territory');
        const guildStorage = document.getElementById('guild-storage');
        
        if (!guildName || !guildMembers || !guildTerritory || !guildStorage) {
            debug.warn("Guild UI elements not found");
            return;
        }
        
        if (currentGuild) {
            // Update guild name
            guildName.textContent = currentGuild.name;
            
            // Update members list
            guildMembers.innerHTML = '';
            const membersList = document.createElement('ul');
            
            currentGuild.members.forEach(pubkey => {
                const memberItem = document.createElement('li');
                let displayName = pubkey.substring(0, 8) + '...';
                
                // Add role indicators
                if (currentGuild.isFounder(pubkey)) {
                    displayName += ' (Founder)';
                } else if (currentGuild.isAdmin(pubkey)) {
                    displayName += ' (Admin)';
                }
                
                memberItem.textContent = displayName;
                membersList.appendChild(memberItem);
            });
            
            guildMembers.appendChild(membersList);
            
            // Update territories list
            guildTerritory.innerHTML = '';
            
            if (currentGuild.territories.size === 0) {
                guildTerritory.textContent = 'No territories claimed';
            } else {
                const territoriesList = document.createElement('ul');
                
                currentGuild.territories.forEach(regionId => {
                    const territoryItem = document.createElement('li');
                    territoryItem.textContent = `Region ${regionId}`;
                    territoriesList.appendChild(territoryItem);
                });
                
                guildTerritory.appendChild(territoriesList);
            }
            
            // Update storage display
            guildStorage.innerHTML = '';
            
            if (currentGuild.storage.size === 0) {
                guildStorage.textContent = 'Storage empty';
            } else {
                const resourcesList = document.createElement('ul');
                
                currentGuild.storage.forEach((amount, resourceType) => {
                    const resourceItem = document.createElement('li');
                    resourceItem.textContent = `${resourceType}: ${amount}`;
                    
                    // Add take button
                    const takeButton = document.createElement('button');
                    takeButton.textContent = 'Take';
                    takeButton.className = 'small-button take-resource-button';
                    takeButton.dataset.resourceType = resourceType;
                    
                    takeButton.addEventListener('click', () => {
                        showTakeResourceDialog(resourceType, amount);
                    });
                    
                    resourceItem.appendChild(takeButton);
                    resourcesList.appendChild(resourceItem);
                });
                
                guildStorage.appendChild(resourcesList);
                
                // Add deposit button
                const depositButton = document.createElement('button');
                depositButton.textContent = 'Deposit Resources';
                depositButton.className = 'deposit-resources-button';
                
                depositButton.addEventListener('click', showDepositResourceDialog);
                
                guildStorage.appendChild(depositButton);
            }
        } else {
            // No guild
            guildName.textContent = 'No Guild';
            guildMembers.textContent = 'Join or create a guild to see members';
            guildTerritory.textContent = 'No territories';
            guildStorage.textContent = 'No guild storage';
            
            // Add create guild button
            const createButton = document.createElement('button');
            createButton.textContent = 'Create Guild';
            createButton.id = 'create-guild-button';
            createButton.className = 'primary-button';
            
            createButton.addEventListener('click', showCreateGuildDialog);
            
            guildStorage.appendChild(document.createElement('br'));
            guildStorage.appendChild(createButton);
        }
    }
    
    /**
     * Show dialog to deposit resources to guild storage
     */
    function showDepositResourceDialog() {
        // Get player's resources
        const resources = {};
        
        Object.values(resources.RESOURCE_TYPES).forEach(type => {
            resources[type] = player.getInventoryItemCount(type);
        });
        
        // Build resource selector
        let resourceOptions = '';
        
        Object.entries(resources).forEach(([type, amount]) => {
            if (amount > 0) {
                resourceOptions += `<option value="${type}">${type} (${amount} available)</option>`;
            }
        });
        
        if (resourceOptions === '') {
            ui.showToast("You don't have any resources to deposit", "error");
            return;
        }
        
        ui.showConfirmDialog(
            "Deposit Resources",
            `
            <div class="dialog-form">
                <div class="form-group">
                    <label for="resource-type">Resource:</label>
                    <select id="resource-type">
                        ${resourceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="resource-amount">Amount:</label>
                    <input type="number" id="resource-amount" min="1" value="1">
                </div>
            </div>
            `,
            "Deposit",
            "Cancel"
        ).then((confirmed) => {
            if (confirmed) {
                const resourceType = document.getElementById('resource-type').value;
                const amount = parseInt(document.getElementById('resource-amount').value);
                
                if (isNaN(amount) || amount < 1) {
                    ui.showToast("Please enter a valid amount", "error");
                    return;
                }
                
                const availableAmount = player.getInventoryItemCount(resourceType);
                
                if (amount > availableAmount) {
                    ui.showToast(`You only have ${availableAmount} ${resourceType}`, "error");
                    return;
                }
                
                addResourcesToGuild(resourceType, amount);
            }
        });
    }
    
    /**
     * Show dialog to take resources from guild storage
     * @param {string} resourceType - Resource type
     * @param {number} availableAmount - Available amount in guild storage
     */
    function showTakeResourceDialog(resourceType, availableAmount) {
        ui.showConfirmDialog(
            "Take Resources",
            `
            <div class="dialog-form">
                <div class="form-group">
                    <label for="resource-amount">Amount (max ${availableAmount}):</label>
                    <input type="number" id="resource-amount" min="1" max="${availableAmount}" value="1">
                </div>
            </div>
            `,
            "Take",
            "Cancel"
        ).then((confirmed) => {
            if (confirmed) {
                const amount = parseInt(document.getElementById('resource-amount').value);
                
                if (isNaN(amount) || amount < 1 || amount > availableAmount) {
                    ui.showToast("Please enter a valid amount", "error");
                    return;
                }
                
                takeResourcesFromGuild(resourceType, amount);
            }
        });
    }
    
    /**
     * Process guild event from Nostr
     * @param {Object} event - Nostr event
     */
    function processGuildEvent(event) {
        try {
            // Find action tag
            const actionTag = event.tags.find(tag => tag[0] === 'action');
            
            if (!actionTag) {
                debug.warn("Guild event missing action tag");
                return;
            }
            
            const action = actionTag[1];
            
            // Handle based on action
            switch (action) {
                case 'create':
                    handleGuildCreate(event);
                    break;
                case 'join':
                    handleGuildJoin(event);
                    break;
                case 'leave':
                    handleGuildLeave(event);
                    break;
                case 'disband':
                    handleGuildDisband(event);
                    break;
                case 'claim-territory':
                    handleGuildClaimTerritory(event);
                    break;
                case 'add-resources':
                    handleGuildAddResources(event);
                    break;
                case 'take-resources':
                    handleGuildTakeResources(event);
                    break;
                default:
                    debug.warn(`Unknown guild action: ${action}`);
            }
        } catch (error) {
            debug.error("Error processing guild event:", error);
        }
    }
    
    /**
     * Check if a player has permission to build on guild territory
     * @param {string} pubkey - Player's public key
     * @param {string} regionId - Region ID
     * @returns {boolean} - True if player has permission
     */
    function hasPermissionToBuild(pubkey, regionId) {
        // Check all guilds that have this territory
        for (const guild of guilds.values()) {
            if (guild.territories.has(regionId) && guild.isMember(pubkey)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Public API
    return {
        initialize,
        createGuild,
        joinGuild,
        leaveGuild,
        disbandGuild,
        addTerritoryToGuild,
        addResourcesToGuild,
        takeResourcesFromGuild,
        processGuildEvent,
        hasPermissionToBuild,
        updateGuildUI,
        
        // Getters
        getCurrentGuild: () => currentGuild,
        getAllGuilds: () => Array.from(guilds.values()),
        getGuild: (guildId) => guilds.get(guildId)
    };
})();
