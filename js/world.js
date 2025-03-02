function drawGrid() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    const gridSize = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const startX = Math.floor(window.game.camera.x / gridSize) * gridSize;
    const startY = Math.floor(window.game.camera.y / gridSize) * gridSize;
    const endX = startX + window.game.camera.width + gridSize;
    const endY = startY + window.game.camera.height + gridSize;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - window.game.camera.x, 0);
        ctx.lineTo(x - window.game.camera.x, window.game.canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - window.game.camera.y);
        ctx.lineTo(window.game.canvas.width, y - window.game.camera.y);
        ctx.stroke();
    }
}

function drawWorldBounds() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    const worldSize = window.CONFIG.WORLD_SIZE || 1000;
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    
    // Draw world boundary rectangle
    ctx.strokeRect(
        0 - window.game.camera.x, 
        0 - window.game.camera.y, 
        worldSize, 
        worldSize
    );
}

function drawItems() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    window.game.items.forEach(item => {
        const screenX = item.x - window.game.camera.x;
        const screenY = item.y - window.game.camera.y;
        
        // Only draw items visible on screen
        if (screenX >= -20 && screenX <= window.game.camera.width + 20 && 
            screenY >= -20 && screenY <= window.game.camera.height + 20) {
            ctx.font = '20px sans-serif';
            ctx.fillText(item.emoji || '🌟', screenX, screenY);
        }
    });
}

function drawSocialSpaces() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    const spaces = [
        { name: "Corny Chat", ...window.CONFIG.SOCIAL_SPACES.CORNY_CHAT, icon: "💬" },
        { name: "Hive Talk", ...window.CONFIG.SOCIAL_SPACES.HIVE_TALK, icon: "🐝" }
    ];

    spaces.forEach(space => {
        const screenX = space.x - window.game.camera.x;
        const screenY = space.y - window.game.camera.y;
        
        // Only draw spaces visible on screen
        if (screenX >= -50 && screenX <= window.game.camera.width + 50 && 
            screenY >= -50 && screenY <= window.game.camera.height + 50) {
            
            // Draw space circle
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, space.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw space name
            ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(space.name, screenX - 30, screenY - 60);

            // Draw space icon
            ctx.font = '30px sans-serif';
            ctx.fillText(space.icon, screenX, screenY);
        }
    });
}

function drawPlayers() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    window.game.players.forEach((player, pubkey) => {
        // Skip drawing the current player
        if (pubkey === window.game.player.pubkey || !player.isVisible) return;

        const screenX = player.x - window.game.camera.x;
        const screenY = player.y - window.game.camera.y;
        
        // Check if player is on screen
        if (screenX >= -30 && screenX <= window.game.camera.width + 30 && 
            screenY >= -30 && screenY <= window.game.camera.height + 30) {
            
            // Draw player as a circle
            ctx.fillStyle = player.profile?.color || 'rgba(212, 160, 23, 1)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
            ctx.fill();

            // Draw player name
            ctx.fillStyle = 'white';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(
                player.profile?.name || pubkey.slice(0, 8), 
                screenX - 20, 
                screenY - 15
            );
        }
    });
}

function drawPlayer() {
    const ctx = window.game.ctx;
    if (!ctx) return;

    // Player is always at the center of the screen
    const screenX = window.game.canvas.width / 2;
    const screenY = window.game.canvas.height / 2;

    // Draw player as a slightly larger circle
    ctx.fillStyle = window.game.player.profile?.color || 'rgba(212, 160, 23, 1)';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw player name
    ctx.fillStyle = 'white';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(
        window.game.player.profile?.name || window.game.player.pubkey.slice(0, 8), 
        screenX - 30, 
        screenY - 20
    );
}

function spawnRandomItem() {
    // Ensure we have a valid game state
    if (!window.game || !window.CONFIG || !window.CONFIG.WORLD_SIZE) return;

    // Create a new item
    const itemTemplate = window.CONFIG.ITEMS[Math.floor(Math.random() * window.CONFIG.ITEMS.length)];
    const item = {
        id: `${itemTemplate.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        x: Math.random() * window.CONFIG.WORLD_SIZE,
        y: Math.random() * window.CONFIG.WORLD_SIZE,
        ...itemTemplate,
        rarity: getRandomRarity()
    };

    // Add to game items
    window.game.items.set(item.id, item);
}

function getRandomRarity() {
    const rarityOptions = window.CONFIG.RARITY;
    const rand = Math.random();
    let cumulative = 0;

    for (const rarity in rarityOptions) {
        cumulative += rarityOptions[rarity].chance;
        if (rand < cumulative) return rarity;
    }

    return "COMMON";
}

// Initial item spawn
function initializeWorldItems() {
    // Spawn some initial items
    for (let i = 0; i < 10; i++) {
        spawnRandomItem();
    }
}
