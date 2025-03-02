// Global game state management
let game = {
    running: false,
    canvas: null,
    ctx: null,
    lastFrameTime: 0,
    keys: { up: false, down: false, left: false, right: false },
    player: {
        pubkey: null,
        profile: null,
        x: 500,  // Half of WORLD_SIZE
        y: 500,
        score: 0,
        level: 1,
        inventory: [],
        following: new Set(),
        dx: 0,
        dy: 0,
        guildId: null,
        reputation: 0,
        stats: {
            itemsCollected: 0,
            questsCompleted: 0,
            zapsSent: 0,
            zapsReceived: 0,
            tradesCompleted: 0,
            distanceTraveled: 0,
            lastX: 500,
            lastY: 500
        },
        isVisible: true,
        lastPublish: 0,
        lastUpdate: 0
    },
    camera: { x: 0, y: 0, width: 0, height: 0 },
    players: new Map(),
    items: new Map(),
    gameRelay: null,
    surfingRelays: new Map(),
    activeRelay: null
};

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
                loginStatus.textContent = "Nostr extension not found!";
                loginLoader.style.display = 'none';
                return;
            }

            // Get public key
            const pubkey = await window.nostr.getPublicKey();
            
            if (!pubkey) {
                loginStatus.textContent = "Failed to get Nostr public key";
                loginLoader.style.display = 'none';
                return;
            }

            // Set game player pubkey
            game.player.pubkey = pubkey;

            // Connect to relay
            try {
                game.gameRelay = await nostrClient.connectRelay(CONFIG.GAME_RELAY);
                
                // Switch screens
                loginScreen.style.display = 'none';
                gameContainer.style.display = 'block';

                // Optional: further game initialization
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
    // Initialize game state, spawn players, etc.
    console.log('Initializing game state for player:', game.player.pubkey);
    
    // Example initialization steps
    spawnNPCsFromSurfingRelay();
    subscribeToGameEvents();
    loadPlayerStats();
    
    // Start game loop
    game.running = true;
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (!game.running) return;
    
    const deltaTime = (timestamp - game.lastFrameTime) / 1000;
    game.lastFrameTime = timestamp;
    
    updateGameState(deltaTime);
    renderGame();
    
    requestAnimationFrame(gameLoop);
}

function updateGameState(deltaTime) {
    // Update player movement, positions, etc.
    updatePlayerMovement(deltaTime);
    updateCamera();
}

function renderGame() {
    const ctx = game.ctx;
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    
    // Render game elements
    drawGrid();
    drawPlayers();
}

// Call this when the page loads
function initGame() {
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        game.canvas = canvas;
        game.ctx = canvas.getContext('2d');
        
        // Set up canvas
        game.canvas.width = window.innerWidth;
        game.canvas.height = window.innerHeight;
        
        // Set up login handler
        setupLoginHandler();
    } else {
        console.error('Game canvas not found');
    }
}

// Initialize when script loads
document.addEventListener('DOMContentLoaded', initGame);
