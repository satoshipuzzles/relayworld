const game = {
    running: false,
    canvas: null,
    ctx: null,
    lastFrameTime: 0,
    keys: { up: false, down: false, left: false, right: false },
    player: {
        pubkey: null,
        profile: null,
        x: CONFIG.WORLD_SIZE / 2,
        y: CONFIG.WORLD_SIZE / 2,
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
            lastX: CONFIG.WORLD_SIZE / 2,
            lastY: CONFIG.WORLD_SIZE / 2
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
    activeRelay: null,
    currentQuest: null,
    currentEvent: null,
    leaderboard: [],
    historicalLeaderboard: new Map(),
    globalChat: [],
    directChats: new Map(),
    tradeOffers: new Map(),
    guilds: new Map(),
    guildAlliances: new Map(),
    marketplace: new Map(),
    selectedPlayer: null,
    inventoryOpen: false,
    webln: null,
    weather: { type: null, opacity: 0, color: 'transparent', spawnRate: 1, visibilityRange: Infinity },
    analytics: { activeAuthors: new Set(), notes: [], mostActive: { pubkey: null, count: 0 } },
    scavengerHuntActive: false,
    audio: {
        rain: new Audio('audio/rain.mp3'),
        alarm: new Audio('audio/alarm.mp3'),
        collect: new Audio('audio/collect.mp3'),
        trade: new Audio('audio/trade.mp3'),
        quest: new Audio('audio/quest.mp3')
    }
};

const debug = {
    log: (message) => console.log(`[GAME] ${message}`),
    error: (message) => console.error(`[GAME ERROR] ${message}`),
    warn: (message) => console.warn(`[GAME WARNING] ${message}`),
    success: (message) => console.log(`[GAME SUCCESS] ${message}`)
};

async function initGame() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupInputHandlers();

    document.getElementById('login-button').addEventListener('click', async () => {
        document.getElementById('login-loader').style.display = 'block';
        if (await nostrClient.isExtensionAvailable()) {
            game.player.pubkey = await nostrClient.getPublicKey();
            document.getElementById('login-screen').style.display = 'none';
            game.gameRelay = await nostrClient.connectRelay(CONFIG.GAME_RELAY);
            for (const url of CONFIG.DEFAULT_RELAYS) {
                game.surfingRelays.set(url, await nostrClient.connectRelay(url));
            }
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
