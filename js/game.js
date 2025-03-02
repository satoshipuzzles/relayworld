function setupLoginHandler() {
    const loginButton = document.getElementById('login-button');
    const loginScreen = document.getElementById('login-screen');
    const gameContainer = document.getElementById('game-container');
    const loginLoader = document.getElementById('login-loader');
    const loginStatus = document.getElementById('login-status');

    if (!loginButton) {
        console.error('Login button not found');
        return;
    }

    loginButton.addEventListener('click', async () => {
        try {
            // Show loader
            loginLoader.style.display = 'block';
            loginStatus.textContent = '';

            // Check for Nostr extension
            if (typeof window.nostr === 'undefined') {
                loginStatus.textContent = "Nostr extension (NIP-07) not found. Please install a compatible browser extension.";
                loginLoader.style.display = 'none';
                return;
            }

            // Get public key
            const pubkey = await window.nostr.getPublicKey();
            
            if (!pubkey) {
                loginStatus.textContent = "Failed to get Nostr public key. Please approve the request.";
                loginLoader.style.display = 'none';
                return;
            }

            // Set game player pubkey
            window.game.player.pubkey = pubkey;

            // Connect to relays
            try {
                // Connect to game relay
                window.game.gameRelay = await nostrClient.connectRelay(window.CONFIG.GAME_RELAY);
                
                // Connect to default relays
                window.game.surfingRelays = new Map();
                for (const url of window.CONFIG.DEFAULT_RELAYS) {
                    const relay = await nostrClient.connectRelay(url);
                    if (relay) {
                        window.game.surfingRelays.set(url, relay);
                    }
                }
                
                window.game.activeRelay = window.CONFIG.DEFAULT_RELAYS[0];

                // Switch screens
                loginScreen.style.display = 'none';
                gameContainer.style.display = 'block';

                // Game initialization
                initializeGameState();

            } catch (relayError) {
                loginStatus.textContent = `Relay connection failed: ${relayError.message}`;
                loginLoader.style.display = 'none';
            }
        } catch (error) {
            console.error('Login process failed:', error);
            loginStatus.textContent = `Login failed: ${error.message}`;
            loginLoader.style.display = 'none';
        }
    });
}

function initializeGameState() {
    console.log('Initializing game state for player:', window.game.player.pubkey);
    
    // Set up canvas
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game.canvas = canvas;
        window.game.ctx = canvas.getContext('2d');
        
        // Set canvas to full window size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Set up camera
        window.game.camera = {
            x: window.game.player.x - canvas.width / 2,
            y: window.game.player.y - canvas.height / 2,
            width: canvas.width,
            height: canvas.height
        };
    }

    // Initialize game systems
    setupInputHandlers();
    setupCanvasEventListeners();
    
    // Initialize world elements
    initializeWorldItems();
    
    // Initial game state setup
    spawnNPCsFromSurfingRelay();
    subscribeToGameEvents();
    loadPlayerStats();
    syncGuilds();
    
    // Start game loop
    window.game.running = true;
    requestAnimationFrame(gameLoop);
}

function setupInputHandlers() {
    // Reset movement keys
    window.game.keys = { 
        up: false, 
        down: false, 
        left: false, 
        right: false 
    };
}

function setupCanvasEventListeners() {
    // Keyboard movement
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                window.game.keys.up = true;
                break;
            case 'arrowdown':
            case 's':
                window.game.keys.down = true;
                break;
            case 'arrowleft':
            case 'a':
                window.game.keys.left = true;
                break;
            case 'arrowright':
            case 'd':
                window.game.keys.right = true;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                window.game.keys.up = false;
                break;
            case 'arrowdown':
            case 's':
                window.game.keys.down = false;
                break;
            case 'arrowleft':
            case 'a':
                window.game.keys.left = false;
                break;
            case 'arrowright':
            case 'd':
                window.game.keys.right = false;
                break;
        }
    });
}

function updatePlayerMovement(deltaTime) {
    const playerSpeed = window.CONFIG.PLAYER_SPEED || 200;
    
    // Calculate movement
    window.game.player.dx = 0;
    window.game.player.dy = 0;
    
    if (window.game.keys.up) window.game.player.dy -= 1;
    if (window.game.keys.down) window.game.player.dy += 1;
    if (window.game.keys.left) window.game.player.dx -= 1;
    if (window.game.keys.right) window.game.player.dx += 1;

    // Normalize diagonal movement
    if (window.game.player.dx !== 0 && window.game.player.dy !== 0) {
        const length = Math.sqrt(
            window.game.player.dx * window.game.player.dx + 
            window.game.player.dy * window.game.player.dy
        );
        window.game.player.dx /= length;
        window.game.player.dy /= length;
    }

    // Apply speed and delta time
    window.game.player.dx *= playerSpeed * deltaTime;
    window.game.player.dy *= playerSpeed * deltaTime;

    // Update player position
    const worldSize = window.CONFIG.WORLD_SIZE || 1000;
    window.game.player.x = Math.max(0, Math.min(
        window.game.player.x + window.game.player.dx, 
        worldSize
    ));
    window.game.player.y = Math.max(0, Math.min(
        window.game.player.y + window.game.player.dy, 
        worldSize
    ));
}

function updateCamera() {
    if (!window.game.canvas) return;

    // Center camera on player
    window.game.camera.x = window.game.player.x - window.game.canvas.width / 2;
    window.game.camera.y = window.game.player.y - window.game.canvas.height / 2;

    // Prevent camera from going out of world bounds
    const worldSize = window.CONFIG.WORLD_SIZE || 1000;
    window.game.camera.x = Math.max(0, Math.min(
        window.game.camera.x, 
        worldSize - window.game.canvas.width
    ));
    window.game.camera.y = Math.max(0, Math.min(
        window.game.camera.y, 
        worldSize - window.game.canvas.height
    ));
}

function gameLoop(timestamp) {
    if (!window.game.running) return;
    
    const deltaTime = (timestamp - window.game.lastFrameTime) / 1000;
    window.game.lastFrameTime = timestamp;
    
    updateGameState(deltaTime);
    renderGame();
    
    requestAnimationFrame(gameLoop);
}

function updateGameState(deltaTime) {
    updatePlayerMovement(deltaTime);
    updateCamera();
    
    // Periodic item spawning
    if (Math.random() < 0.01) {  // 1% chance each frame
        spawnRandomItem();
    }

    // Publish player position periodically
    publishPlayerPosition();
}

function renderGame() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, window.game.canvas.width, window.game.canvas.height);

    // Render background (optional, can be a solid color or gradient)
    ctx.fillStyle = 'rgba(10, 23, 42, 1)';  // Dark blue background
    ctx.fillRect(0, 0, window.game.canvas.width, window.game.canvas.height);

    // Render game elements
    drawGrid();
    drawWorldBounds();
    drawSocialSpaces();
    drawItems();
    drawPlayers();
    drawPlayer();
}

function publishPlayerPosition() {
    const now = Date.now();
    
    // Throttle position updates
    if (now - (window.game.player.lastPublish || 0) < 2000) return;
    
    window.game.player.lastPublish = now;
    window.game.player.lastUpdate = now;
    
    const event = nostrClient.createPositionEvent(
        window.game.player.x, 
        window.game.player.y
    );
    
    nostrClient.publishEvent(window.game.gameRelay, event);
}

function spawnNPCsFromSurfingRelay() {
    const relay = window.game.surfingRelays.get(window.game.activeRelay);
    if (!relay) return;

    const timeRange = 86400;  // 24 hours
    const since = Math.floor(Date.now() / 1000) - timeRange;

    nostrClient.subscribeToEvents(
        relay,
        [{ kinds: [1], since }],
        (event) => {
            if (!window.game.players.has(event.pubkey)) {
                const x = Math.random() * window.CONFIG.WORLD_SIZE;
                const y = Math.random() * window.CONFIG.WORLD_SIZE;
                
                window.game.players.set(event.pubkey, {
                    pubkey: event.pubkey,
                    x,
                    y,
                    spawnX: x,
                    spawnY: y,
                    profile: null,
                    lastUpdate: 0,
                    isActive: false,
                    guildId: null,
                    reputation: 0,
                    isVisible: true
                });

                // Fetch player profile
                fetchPlayerProfile(event.pubkey);
            }
        }
    );
}

function fetchPlayerProfile(pubkey) {
    const relay = window.game.surfingRelays.get(window.game.activeRelay);
    if (!relay) return;

    nostrClient.subscribeToEvents(
        relay,
        [{ kinds: [0], authors: [pubkey] }],
        (event) => {
            try {
                const profile = JSON.parse(event.content);
                const player = window.game.players.get(pubkey);
                
                if (player) {
                    player.profile = {
                        name: profile.name || pubkey.slice(0,8),
                        color: profile.color || 'rgba(212, 160, 23, 1)',
                        picture: profile.picture
                    };
                }
            } catch (error) {
                console.error(`Failed to parse profile for ${pubkey}:`, error);
            }
        }
    );
}

// Initialize login handler when page loads
document.addEventListener('DOMContentLoaded', setupLoginHandler);
