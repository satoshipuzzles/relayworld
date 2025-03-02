function drawGrid() {
    const ctx = game.ctx;
    const gridSize = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const startX = Math.floor(game.camera.x / gridSize) * gridSize;
    const startY = Math.floor(game.camera.y / gridSize) * gridSize;
    const endX = startX + game.camera.width + gridSize;
    const endY = startY + game.camera.height + gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - game.camera.x, 0);
        ctx.lineTo(x - game.camera.x, game.canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - game.camera.y);
        ctx.lineTo(game.canvas.width, y - game.camera.y);
        ctx.stroke();
    }
}

function drawWorldBounds() {
    const ctx = game.ctx;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0 - game.camera.x, 0 - game.camera.y, CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
}

function drawItems() {
    const ctx = game.ctx;
    game.items.forEach(item => {
        const screenX = item.x - game.camera.x;
        const screenY = item.y - game.camera.y;
        if (screenX >= -20 && screenX <= game.camera.width + 20 && screenY >= -20 && screenY <= game.camera.height + 20) {
            ctx.font = '20px sans-serif';
            ctx.fillText(item.emoji, screenX, screenY);
        }
    });
}

function drawSocialSpaces() {
    const ctx = game.ctx;
    const spaces = [
        { name: "Corny Chat", ...CONFIG.SOCIAL_SPACES.CORNY_CHAT, icon: "💬" },
        { name: "Hive Talk", ...CONFIG.SOCIAL_SPACES.HIVE_TALK, icon: "🐝" }
    ];
    spaces.forEach(space => {
        const screenX = space.x - game.camera.x;
        const screenY = space.y - game.camera.y;
        if (screenX >= -50 && screenX <= game.camera.width + 50 && screenY >= -50 && screenY <= game.camera.height + 50) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, space.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(space.name, screenX - 30, screenY - 60);
            ctx.font = '30px sans-serif';
            ctx.fillText(space.icon, screenX, screenY);
        }
    });
}

function checkItemCollection() {
    for (const [itemId, item] of game.items.entries()) {
        const distance = Math.sqrt(
            Math.pow(item.x - game.player.x, 2) + Math.pow(item.y - game.player.y, 2)
        );
        if (distance < 30) {
            game.player.inventory.push({ id: itemId, ...item });
            game.items.delete(itemId);
            game.player.score += item.value;
            game.player.stats.itemsCollected += 1;
            nostrClient.publishEvent(game.gameRelay, {
                kind: CONFIG.EVENT_KINDS.ITEM_COLLECT,
                tags: [["p", game.player.pubkey]],
                content: JSON.stringify({ id: itemId, ...item })
            });
            game.audio.collect.play(); // Audio feedback
            updateStats();
            updateInventoryUI();
            showToast(`Found ${item.name}! +${item.value} points`, "success");
            if (game.currentQuest?.type === "treasure_hunt" && itemId === game.currentQuest.treasureId) {
                game.currentQuest.progress = 1;
                nostrClient.publishEvent(game.gameRelay, {
                    kind: 420014,
                    tags: [["p", game.player.pubkey]],
                    content: JSON.stringify({ questId: game.currentQuest.title, itemId })
                });
                completeQuest();
            }
            break;
        }
    }
}

function checkSocialSpaces() {
    const spaces = {
        "corny-chat": CONFIG.SOCIAL_SPACES.CORNY_CHAT,
        "hive-talk": CONFIG.SOCIAL_SPACES.HIVE_TALK
    };
    Object.entries(spaces).forEach(([id, space]) => {
        const distance = Math.sqrt(
            Math.pow(space.x - game.player.x, 2) + Math.pow(space.y - game.player.y, 2)
        );
        if (distance < space.radius) document.getElementById(id).style.display = 'block';
    });
}

CONFIG.CHESTS = new Map();

function spawnChests() {
    for (let i = 0; i < 5; i++) {
        const chest = {
            id: `chest-${Date.now()}-${i}`,
            x: Math.random() * CONFIG.WORLD_SIZE,
            y: Math.random() * CONFIG.WORLD_SIZE,
            opened: false,
            item: {
                id: `item-${Date.now()}-${i}`,
                name: "Mystery Prize",
                emoji: "🎁",
                rarity: getRandomRarity(),
                value: Math.floor(Math.random() * 100) + 50
            }
        };
        CONFIG.CHESTS.set(chest.id, chest);
    }
}

function drawChests() {
    const ctx = game.ctx;
    ctx.fillStyle = 'rgba(218, 165, 32, 0.8)';
    CONFIG.CHESTS.forEach(chest => {
        if (!chest.opened) {
            const screenX = chest.x - game.camera.x;
            const screenY = chest.y - game.camera.y;
            ctx.fillRect(screenX - 15, screenY - 15, 30, 30);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText('📦', screenX - 10, screenY + 5);
        }
    });
}

function syncChestState() {
    nostrClient.subscribeToEvents(
        game.gameRelay,
        [{ kinds: [CONFIG.EVENT_KINDS.ITEM_COLLECT] }],
        (event) => {
            const data = JSON.parse(event.content);
            const chest = CONFIG.CHESTS.get(data.chestId);
            if (chest) chest.opened = true;
        }
    );
}

function spawnRandomItem() {
    const itemTemplate = CONFIG.ITEMS[Math.floor(Math.random() * CONFIG.ITEMS.length)];
    const item = {
        id: `${itemTemplate.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        x: Math.random() * CONFIG.WORLD_SIZE,
        y: Math.random() * CONFIG.WORLD_SIZE,
        ...itemTemplate,
        rarity: getRandomRarity()
    };
    game.items.set(item.id, item);
}

const WEATHER_TYPES = [
    {
        type: "rain",
        description: "Rain: Visibility reduced, items spawn faster.",
        effect: () => {
            game.weather.opacity = 0.3;
            game.weather.color = 'rgba(0, 0, 255, 0.3)';
            game.weather.spawnRate = 1.5;
            game.audio.rain.play();
        }
    },
    {
        type: "fog",
        description: "Fog: Players harder to see.",
        effect: () => {
            game.weather.opacity = 0.5;
            game.weather.color = 'rgba(128, 128, 128, 0.5)';
            game.weather.visibilityRange = 200;
        }
    }
];

function triggerWeather() {
    if (Math.random() >= 0.05) return;
    const weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    const duration = 10 * 60 * 1000;
    game.weather = { ...weather, endTime: Date.now() + duration };
    weather.effect();
    const event = {
        kind: CONFIG.EVENT_KINDS.WEATHER_EVENT,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["gm", CONFIG.GAME_MASTER_PUBKEY]],
        content: JSON.stringify({ type: weather.type, endTime: game.weather.endTime })
    };
    nostrClient.publishEvent(game.gameRelay, event);
    showToast(weather.description, "info");
    if (weather.type === "rain") {
        clearInterval(game.itemSpawnInterval);
        game.itemSpawnInterval = setInterval(spawnRandomItem, 30 * 1000 / game.weather.spawnRate);
    }
}

function updateWeather(deltaTime) {
    if (game.weather.endTime && Date.now() > game.weather.endTime) {
        game.weather = { type: null, opacity: 0, color: 'transparent', spawnRate: 1, visibilityRange: Infinity };
        game.audio.rain.pause();
        clearInterval(game.itemSpawnInterval);
        game.itemSpawnInterval = setInterval(spawnRandomItem, 30 * 1000);
        showToast("Weather cleared!", "info");
    }
}

function drawWeather() {
    if (!game.weather.type) return;
    const ctx = game.ctx;
    ctx.fillStyle = game.weather.color;
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
    if (game.weather.type === "rain") {
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * game.canvas.width;
            const y = Math.random() * game.canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 10);
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.stroke();
        }
    }
}

const WORLD_EVENTS = [
    {
        type: "item_rain",
        description: "Item Rain! Collect falling items for 5 minutes.",
        duration: 5 * 60 * 1000,
        action: () => {
            for (let i = 0; i < 20; i++) {
                const item = {
                    id: `rain-${Date.now()}-${i}`,
                    x: Math.random() * CONFIG.WORLD_SIZE,
                    y: Math.random() * CONFIG.WORLD_SIZE,
                    emoji: "🌟",
                    name: "Star Shard",
                    rarity: "SUPER RARE",
                    value: 100
                };
                game.items.set(item.id, item);
            }
            game.audio.rain.play();
        }
    },
    {
        type: "npc_invasion",
        description: "NPC Invasion! Avoid aggressive NPCs for 3 minutes.",
        duration: 3 * 60 * 1000,
        action: () => {
            for (let i = 0; i < 10; i++) {
                const npc = {
                    pubkey: `npc-${Date.now()}-${i}`,
                    x: Math.random() * CONFIG.WORLD_SIZE,
                    y: Math.random() * CONFIG.WORLD_SIZE,
                    spawnX: Math.random() * CONFIG.WORLD_SIZE,
                    spawnY: Math.random() * CONFIG.WORLD_SIZE,
                    isActive: true,
                    lastUpdate: Date.now(),
                    aggressive: true,
                    profile: { name: "Invader" },
                    isVisible: true
                };
                game.players.set(npc.pubkey, npc);
            }
            game.audio.alarm.play();
        }
    }
];

function triggerWorldEvent() {
    if (Math.random() >= 0.1) return;
    const event = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)];
    const endTime = Date.now() + event.duration;
    game.currentEvent = { ...event, endTime };
    const nostrEvent = {
        kind: CONFIG.EVENT_KINDS.WORLD_EVENT,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["gm", CONFIG.GAME_MASTER_PUBKEY]],
        content: JSON.stringify({ type: event.type, endTime })
    };
    nostrClient.publishEvent(game.gameRelay, nostrEvent);
    event.action();
    showToast(event.description, "info");
}

function handleWorldEvent(event) {
    const data = JSON.parse(event.content);
    const worldEvent = WORLD_EVENTS.find(e => e.type === data.type);
    if (worldEvent) {
        game.currentEvent = { ...worldEvent, endTime: data.endTime };
        worldEvent.action();
        showToast(worldEvent.description, "info");
    }
}

function updateWorldEvents(deltaTime) {
    if (game.currentEvent) {
        if (game.currentEvent.type === "npc_invasion") {
            game.players.forEach((player, pubkey) => {
                if (player.aggressive) {
                    const closestPlayer = Array.from(game.players.entries())
                        .filter(([_, p]) => p.isActive && !p.aggressive)
                        .reduce((closest, [pk, p]) => {
                            const dist = Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2));
                            return dist < closest.dist ? { pubkey: pk, dist } : closest;
                        }, { dist: Infinity });

                    if (closestPlayer.dist < 100) {
                        const angle = Math.atan2(closestPlayer.dist.y - player.y, closestPlayer.dist.x - player.x);
                        player.x += Math.cos(angle) * CONFIG.PLAYER_SPEED * deltaTime;
                        player.y += Math.sin(angle) * CONFIG.PLAYER_SPEED * deltaTime;
                    }
                }
            });
        }

        if (Date.now() > game.currentEvent.endTime) {
            if (game.currentEvent.type === "npc_invasion") {
                game.players.forEach((_, pubkey) => {
                    if (pubkey.startsWith("npc-")) game.players.delete(pubkey);
                });
                game.audio.alarm.pause();
            } else if (game.currentEvent.type === "item_rain") {
                game.audio.rain.pause();
            }
            game.currentEvent = null;
            showToast("World event ended!", "info");
        }
    }
}
