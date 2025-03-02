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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Initialize game systems
    setupInputHandlers();
    setupCanvasEventListeners();
    
    // Initial game state setup
    spawnNPCsFromSurfingRelay();
    subscribeToGameEvents();
    loadPlayerStats();
    syncGuilds();
    
    // Start game loop
    window.game.running = true;
    requestAnimationFrame(gameLoop);
}

function setupCanvasEventListeners() {
    const canvas = window.game.canvas;
    if (!canvas) return;

    // Basic input handling for movement
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                window.game.keys.up = true;
                break;
            case 'ArrowDown':
            case 's':
                window.game.keys.down = true;
                break;
            case 'ArrowLeft':
            case 'a':
                window.game.keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                window.game.keys.right = true;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                window.game.keys.up = false;
                break;
            case 'ArrowDown':
            case 's':
                window.game.keys.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
                window.game.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                window.game.keys.right = false;
                break;
        }
    });
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
    checkItemCollection();
    checkSocialSpaces();
    publishPlayerPosition();
}

function renderGame() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, window.game.canvas.width, window.game.canvas.height);
    
    // Render game elements
    drawGrid();
    drawWorldBounds();
    drawItems();
    drawSocialSpaces();
    drawPlayers();
    drawPlayer();
}

function setupInputHandlers() {
    // Placeholder for any additional input setup
    console.log('Input handlers set up');
}

// Initialize login handler when script loads
document.addEventListener('DOMContentLoaded', setupLoginHandler);
