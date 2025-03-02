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

            // Verify Nostr extension
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

            // Connect to relay
            try {
                window.game.gameRelay = await nostrClient.connectRelay(CONFIG.GAME_RELAY);
                
                // Add default relays
                for (const url of CONFIG.DEFAULT_RELAYS) {
                    window.game.surfingRelays.set(url, await nostrClient.connectRelay(url));
                }
                
                window.game.activeRelay = CONFIG.DEFAULT_RELAYS[0];

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
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Game canvas not found');
        return;
    }

    window.game.canvas = canvas;
    window.game.ctx = canvas.getContext('2d');
    
    // Set up canvas
    window.game.canvas.width = window.innerWidth;
    window.game.canvas.height = window.innerHeight;

    // Initialize game systems
    setupInputHandlers();
    spawnNPCsFromSurfingRelay();
    subscribeToGameEvents();
    loadPlayerStats();
    
    // Start game loop
    window.game.running = true;
    requestAnimationFrame(gameLoop);
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
    ctx.clearRect(0, 0, window.game.canvas.width, window.game.canvas.height);
    
    drawGrid();
    drawWorldBounds();
    drawItems();
    drawSocialSpaces();
    drawPlayers();
    drawPlayer();
}

// Initialize login handler when page loads
document.addEventListener('DOMContentLoaded', setupLoginHandler);
