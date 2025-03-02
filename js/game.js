            game.activeRelay = CONFIG.DEFAULT_RELAYS[0];
            await initWebLN();
            spawnNPCsFromSurfingRelay();
            subscribeToGameEvents();
            loadPlayerStats();
            syncGuilds();
            syncMarketplace();
            syncChestState();
            updateNostrAnalytics();
            spawnChests(); // Initial chest spawn
            game.itemSpawnInterval = setInterval(spawnRandomItem, 30 * 1000);
            setInterval(triggerWorldEvent, 60 * 1000);
            setInterval(scheduleNextQuest, CONFIG.QUEST_INTERVAL);
            setInterval(updateLeaderboard, CONFIG.LEADERBOARD_UPDATE_INTERVAL);
            game.running = true;
            requestAnimationFrame(gameLoop);
            updateRelayList();
            showToast("Welcome to Relay World!", "success");
        } else {
            document.getElementById('login-status').textContent = "Nostr extension not found!";
            document.getElementById('login-loader').style.display = 'none';
        }
    });
}

function resizeCanvas() {
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
    game.camera.width = window.innerWidth;
    game.camera.height = window.innerHeight;
}

function gameLoop(timestamp) {
    if (!game.running) return;
    const deltaTime = (timestamp - game.lastFrameTime) / 1000;
    game.lastFrameTime = timestamp;
    update(deltaTime);
    render();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    updatePlayerMovement(deltaTime);
    updateCamera();
    checkItemCollection();
    checkSocialSpaces();
    checkRelayTagTeam();
    checkScavengerHunt();
    updateWorldEvents(deltaTime);
    updateWeather(deltaTime);
    publishPlayerPosition();

    const now = Date.now();
    game.players.forEach((player, pubkey) => {
        if (player.isActive && now - player.lastUpdate > 2 * 60 * 1000) {
            player.x = player.spawnX;
            player.y = player.spawnY;
            player.isActive = false;
            debug.log(`${pubkey.slice(0, 8)} disconnected, reverted to spawn`);
        }
    });

    updateMinimap();
}

function render() {
    game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    drawGrid();
    drawWorldBounds();
    drawItems();
    drawSocialSpaces();
    drawChests();
    drawTagTargets();
    drawPlayers();
    drawPlayer();
    drawWeather();
}

function subscribeToGameEvents() {
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.PLAYER_POSITION] }], handlePlayerPosition);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.GLOBAL_CHAT] }], handleGlobalChat);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.DIRECT_CHAT], "#p": [game.player.pubkey] }], handleDirectMessage);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.TRADE_ACTION], "#p": [game.player.pubkey] }], handleTradeAction);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.GAME_QUEST], authors: [CONFIG.GAME_MASTER_PUBKEY] }], handleQuestEvent);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.GAME_SCORE] }], handleScoreUpdate);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [9735], "#p": [game.player.pubkey] }], handleZapReceipt);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.WORLD_EVENT], authors: [CONFIG.GAME_MASTER_PUBKEY] }], handleWorldEvent);
    nostrClient.subscribeToEvents(game.gameRelay, [{ kinds: [CONFIG.EVENT_KINDS.GUILD_CHAT] }], (event) => {
        const guildId = event.tags.find(t => t[0] === "guild")?.[1];
        if (guildId === game.player.guildId) {
            game.globalChat.push({
                id: event.id,
                pubkey: event.pubkey,
                content: `[Guild] ${event.content}`,
                created_at: event.created_at
            });
            updateChatUI();
        }
    });
}

initGame();
