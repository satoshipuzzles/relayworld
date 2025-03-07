/**
 * Game Engine Module for Relay World 2.0
 * Core game loop and initialization functionality
 */

const engine = (function() {
    // Private members
    let gameLoopId = null;
    let lastFrameTime = 0;
    let isRunning = false;
    let isInitialized = false;
    
    // Game state tracking
    const gameState = {
        loading: true,
        authenticated: false,
        resourcesLoaded: false,
        worldGenerated: false,
        relaysConnected: false
    };
    
    /**
     * Initialize the game engine
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing game engine...");
        
        if (isInitialized) {
            debug.warn("Game engine already initialized");
            return true;
        }
        
        try {
            // Show loading screen
            ui.showLoadingScreen("Initializing game...");
            
            // Initialize Nostr client
            ui.updateLoadingProgress(10, "Checking for Nostr extension...");
            const nostrAvailable = await nostrClient.initialize();
            
            if (!nostrAvailable) {
                ui.showError("No Nostr extension found. Please install a NIP-07 compatible extension.");
                return false;
            }
            
            // Initialize renderer
            ui.updateLoadingProgress(20, "Setting up game renderer...");
            await renderer.initialize();
            
            // Initialize input handlers
            ui.updateLoadingProgress(30, "Setting up input handlers...");
            input.initialize();
            
            // Initialize Nostr relays
            ui.updateLoadingProgress(40, "Connecting to Nostr relays...");
            const relaysConnected = await relays.initialize();
            gameState.relaysConnected = relaysConnected;
            
            if (!relaysConnected) {
                ui.showError("Failed to connect to Nostr relays. Please try again later.");
                return false;
            }
            
            // Initialize event handlers
            ui.updateLoadingProgress(50, "Setting up event handlers...");
            events.initialize();
            
            // Initialize world
            ui.updateLoadingProgress(60, "Generating world...");
            await world.initialize();
            gameState.worldGenerated = true;
            
            // Initialize player
            ui.updateLoadingProgress(70, "Setting up player...");
            player.initialize();
            
            // Initialize resources
            ui.updateLoadingProgress(80, "Generating resources...");
            await resources.initialize();
            gameState.resourcesLoaded = true;
            
            // Initialize building system
            ui.updateLoadingProgress(90, "Setting up building system...");
            building.initialize();
            
            // Initialize UI
            ui.updateLoadingProgress(95, "Setting up user interface...");
            ui.initialize();
            
            // Complete loading
            ui.updateLoadingProgress(100, "Ready!");
            setTimeout(() => {
                ui.hideLoadingScreen();
                ui.showLoginScreen();
            }, 500);
            
            isInitialized = true;
            gameState.loading = false;
            
            return true;
        } catch (error) {
            debug.error("Failed to initialize game engine:", error);
            ui.showError(`Initialization failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Start the game after user authentication
     * @returns {Promise<boolean>} - Success status
     */
    async function start() {
        if (!isInitialized) {
            debug.error("Cannot start game: engine not initialized");
            return false;
        }
        
        if (isRunning) {
            debug.warn("Game already running");
            return true;
        }
        
        try {
            // Authenticate player
            const authenticated = await nostrClient.login();
            
            if (!authenticated) {
                ui.showError("Failed to authenticate with Nostr extension");
                return false;
            }
            
            gameState.authenticated = true;
            
            // Create player in the world or load existing position
            await player.createLocalPlayer();
            
            // Connect to game relay
            ui.showLoading("Joining game world...");
            
            // Subscribe to game events
            subscribeToGameEvents();
            
            // Start game loop
            isRunning = true;
            lastFrameTime = performance.now();
            gameLoopId = requestAnimationFrame(gameLoop);
            
            // Show game UI
            ui.hideLoginScreen();
            ui.showGameUI();
            
            debug.log("Game started successfully");
            return true;
        } catch (error) {
            debug.error("Failed to start game:", error);
            ui.showError(`Game start failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Stop the game loop and cleanup
     */
    function stop() {
        if (!isRunning) return;
        
        // Stop game loop
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        
        isRunning = false;
        debug.log("Game stopped");
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current time in milliseconds
     */
    function gameLoop(timestamp) {
        // Calculate delta time in seconds
        const deltaTime = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;
        
        // Cap delta time to prevent large jumps after tab switch, etc.
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Update game systems
        update(cappedDeltaTime);
        
        // Render the current frame
        renderer.render();
        
        // Schedule next frame
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    /**
     * Update all game systems
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    function update(deltaTime) {
        // Process inputs first
        input.update(deltaTime);
        
        // Update player
        player.update(deltaTime);
        
        // Update resources
        resources.update(deltaTime);
        
        // Update buildings
        building.update(deltaTime);
        
        // Update physics/collisions
        physics.update(deltaTime);
        
        // Update world
        world.update(deltaTime);
        
        // Update UI elements
        ui.update(deltaTime);
    }
    
    /**
     * Subscribe to game events from relays
     */
    function subscribeToGameEvents() {
        try {
            // Subscribe to events in the player's region
            const playerPos = player.getPosition();
            const region = nostrClient.getRegionForPosition(playerPos.x, playerPos.y);
            
            // Player positions
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.PLAYER_POSITION],
                        '#r': [region],
                        '#g': [config.GAME_ID],
                        since: Math.floor(Date.now() / 1000) - 60 // Last minute only
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            // Structures
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.STRUCTURE],
                        '#r': [region],
                        '#g': [config.GAME_ID]
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            // Resources
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.RESOURCE_NODE],
                        '#r': [region],
                        '#g': [config.GAME_ID]
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            // Land claims
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.LAND_CLAIM],
                        '#r': [region],
                        '#g': [config.GAME_ID]
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            // Chat messages - local
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.CHAT_MESSAGE],
                        '#channel': ['local'],
                        '#local': [region],
                        '#g': [config.GAME_ID],
                        since: Math.floor(Date.now() / 1000) - 300 // Last 5 minutes
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            // Chat messages - global
            relays.subscribeToGameRelay(
                [
                    {
                        kinds: [config.EVENT_KINDS.CHAT_MESSAGE],
                        '#channel': ['global'],
                        '#g': [config.GAME_ID],
                        limit: 20,
                        since: Math.floor(Date.now() / 1000) - 3600 // Last hour
                    }
                ],
                (event) => {
                    events.processEvent(event);
                }
            );
            
            debug.log("Subscribed to game events");
        } catch (error) {
            debug.error("Failed to subscribe to game events:", error);
        }
    }
    
    // Public API
    return {
        initialize,
        start,
        stop,
        
        // Getters
        isRunning: () => isRunning,
        isInitialized: () => isInitialized,
        getGameState: () => ({...gameState})
    };
})();
