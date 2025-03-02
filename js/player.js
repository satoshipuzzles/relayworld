function updatePlayerMovement(deltaTime) {
    game.player.dx = 0;
    game.player.dy = 0;
    if (game.keys.up) game.player.dy -= 1;
    if (game.keys.down) game.player.dy += 1;
    if (game.keys.left) game.player.dx -= 1;
    if (game.keys.right) game.player.dx += 1;

    if (game.player.dx !== 0 && game.player.dy !== 0) {
        const length = Math.sqrt(game.player.dx * game.player.dx + game.player.dy * game.player.dy);
        game.player.dx /= length;
        game.player.dy /= length;
    }

    game.player.dx *= CONFIG.PLAYER_SPEED * deltaTime;
    game.player.dy *= CONFIG.PLAYER_SPEED * deltaTime;

    game.player.x = Math.max(0, Math.min(game.player.x + game.player.dx, CONFIG.WORLD_SIZE));
    game.player.y = Math.max(0, Math.min(game.player.y + game.player.dy, CONFIG.WORLD_SIZE));

    const moved = Math.sqrt(Math.pow(game.player.x - game.player.stats.lastX, 2) + Math.pow(game.player.y - game.player.stats.lastY, 2));
    game.player.stats.distanceTraveled += moved;
    game.player.stats.lastX = game.player.x;
    game.player.stats.lastY = game.player.y;
    if (moved > 0) updateStats();
}

function updateCamera() {
    const targetX = game.player.x - game.camera.width / 2;
    const targetY = game.player.y - game.camera.height / 2;
    game.camera.x += (targetX - game.camera.x) * CONFIG.CAMERA_FOLLOW_SPEED;
    game.camera.y += (targetY - game.camera.y) * CONFIG.CAMERA_FOLLOW_SPEED;
    game.camera.x = Math.max(0, Math.min(game.camera.x, CONFIG.WORLD_SIZE - game.camera.width));
    game.camera.y = Math.max(0, Math.min(game.camera.y, CONFIG.WORLD_SIZE - game.camera.height));
}

function publishPlayerPosition() {
    const now = Date.now();
    if (now - game.player.lastPublish < 2000) return;
    game.player.lastPublish = now;
    game.player.lastUpdate = now;
    const event = nostrClient.createPositionEvent(game.player.x, game.player.y);
    nostrClient.publishEvent(game.gameRelay, event);
}

function handlePlayerPosition(event) {
    const data = JSON.parse(event.content);
    const player = game.players.get(event.pubkey);
    if (player) {
        player.x = data.x;
        player.y = data.y;
        player.lastUpdate = Date.now();
        player.isActive = true;
    } else {
        game.players.set(event.pubkey, {
            pubkey: event.pubkey,
            x: data.x,
            y: data.y,
            spawnX: data.x,
            spawnY: data.y,
            profile: null,
            lastUpdate: Date.now(),
            isActive: true,
            guildId: null,
            reputation: 0,
            isVisible: true
        });
        fetchPlayerProfile(event.pubkey);
    }
}

function drawPlayer() {
    const ctx = game.ctx;
    const screenX = game.canvas.width / 2;
    const screenY = game.canvas.height / 2;

    if (game.player.reputation > 500) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = Math.min(game.player.reputation / 100, 20);
    }

    if (game.player.isVisible) {
        ctx.fillStyle = game.player.profile?.color || 'rgba(212, 160, 23, 1)';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 15, 12.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = game.player.profile?.color || 'rgba(212, 160, 23, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 5);
        ctx.lineTo(screenX, screenY + 10);
        ctx.moveTo(screenX - 10, screenY);
        ctx.lineTo(screenX + 10, screenY);
        ctx.moveTo(screenX, screenY + 10);
        ctx.lineTo(screenX - 7, screenY + 20);
        ctx.moveTo(screenX, screenY + 10);
        ctx.lineTo(screenX + 7, screenY + 20);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(game.player.profile?.name || game.player.pubkey?.slice(0, 8) || 'Player', screenX - 30, screenY - 30);
    if (game.player.reputation > 0) {
        ctx.fillStyle = 'gold';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`Rep: ${game.player.reputation}`, screenX - 20, screenY - 45);
    }
}

function drawPlayers() {
    const ctx = game.ctx;
    game.players.forEach((player, pubkey) => {
        if (pubkey === game.player.pubkey || !player.isVisible) return;
        const screenX = player.x - game.camera.x;
        const screenY = player.y - game.camera.y;
        const distance = Math.sqrt(
            Math.pow(player.x - game.player.x, 2) + Math.pow(player.y - game.player.y, 2)
        );

        if (distance > game.weather.visibilityRange) return;

        if (screenX >= -30 && screenX <= game.camera.width + 30 && screenY >= -30 && screenY <= game.camera.height + 30) {
            if (player.reputation > 500) {
                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = Math.min(player.reputation / 100, 20);
            }

            ctx.fillStyle = player.profile?.color || (player.isActive ? 'rgba(212, 160, 23, 1)' : 'white');
            ctx.beginPath();
            ctx.arc(screenX, screenY - 15, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = player.profile?.color || (player.isActive ? 'rgba(212, 160, 23, 1)' : 'white');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - 5);
            ctx.lineTo(screenX, screenY + 10);
            ctx.moveTo(screenX - 10, screenY);
            ctx.lineTo(screenX + 10, screenY);
            ctx.moveTo(screenX, screenY + 10);
            ctx.lineTo(screenX - 7, screenY + 20);
            ctx.moveTo(screenX, screenY + 10);
            ctx.lineTo(screenX + 7, screenY + 20);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(player.profile?.name || pubkey.slice(0, 8), screenX - 20, screenY - 30);
            if (player.guildId) {
                const guild = game.guilds.get(player.guildId);
                ctx.fillStyle = 'cyan';
                ctx.font = '8px "Press Start 2P"';
                ctx.fillText(`[${guild.name}]`, screenX - 15, screenY - 50);
            }
        }
    });
}

function updateStats() {
    const event = {
        kind: CONFIG.EVENT_KINDS.PLAYER_STATS,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", game.player.pubkey]],
        content: JSON.stringify(game.player.stats)
    };
    nostrClient.publishEvent(game.gameRelay, event);
}

function loadPlayerStats() {
    nostrClient.subscribeToEvents(
        game.gameRelay,
        [{ kinds: [CONFIG.EVENT_KINDS.PLAYER_STATS], authors: [game.player.pubkey], limit: 1 }],
        (event) => {
            game.player.stats = { ...game.player.stats, ...JSON.parse(event.content) };
            updateStatsUI();
        }
    );
}

function updateReputation() {
    game.player.reputation = 
        game.player.following.size * 10 +
        game.player.stats.zapsSent * 30 +
        game.player.stats.tradesCompleted * 50;
    updatePlayerUI();
}

function spawnNPCsFromSurfingRelay() {
    const relay = game.surfingRelays.get(game.activeRelay);
    const timeRange = parseInt(document.getElementById('time-range').value);
    const since = Math.floor(Date.now() / 1000) - timeRange;

    game.players.clear();
    nostrClient.subscribeToEvents(
        relay,
        [{ kinds: [1], since }],
        (event) => {
            if (!game.players.has(event.pubkey)) {
                const x = Math.random() * CONFIG.WORLD_SIZE;
                const y = Math.random() * CONFIG.WORLD_SIZE;
                game.players.set(event.pubkey, {
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
                fetchPlayerProfile(event.pubkey);
            }
        }
    );
}

function fetchPlayerProfile(pubkey) {
    const relay = game.surfingRelays.get(game.activeRelay);
    nostrClient.subscribeToEvents(
        relay,
        [{ kinds: [0], authors: [pubkey] }],
        (event) => {
            const profile = nostrClient.parseMetadata(event);
            const player = game.players.get(pubkey);
            if (player && profile) player.profile = profile;
            if (pubkey === game.player.pubkey) updatePlayerUI();
        }
    );
}

function updateProfile() {
    const color = prompt("Enter your favorite color (e.g., red, #FF0000):") || "white";
    const bio = prompt("Enter a short bio:") || "";
    game.player.profile = {
        name: game.player.profile?.name || game.player.pubkey.slice(0, 8),
        picture: game.player.profile?.picture || "https://via.placeholder.com/40",
        color,
        bio
    };
    const event = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(game.player.profile)
    };
    nostrClient.publishEvent(game.gameRelay, event);
    showToast("Profile updated!", "success");
    updatePlayerUI();
}
