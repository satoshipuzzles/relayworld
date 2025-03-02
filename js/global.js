// Global configuration and game state
window.CONFIG = {
    WORLD_SIZE: 1000,
    PLAYER_SPEED: 200,
    CAMERA_FOLLOW_SPEED: 0.1,
    GAME_RELAY: "wss://relay.nostrfreaks.com",
    DEFAULT_RELAYS: [
        "wss://relay.damus.io", 
        "wss://nostr-pub.wellorder.net", 
        "wss://relay.snort.social"
    ],
    GAME_MASTER_PUBKEY: '',
    GAME_MASTER_NSEC: '',
    EVENT_KINDS: {
        PLAYER_POSITION: 420001,
        GLOBAL_CHAT: 420002,
        DIRECT_CHAT: 420003,
        TRADE_ACTION: 420004,
        GAME_QUEST: 420005,
        ITEM_COLLECT: 420006,
        BADGE_AWARD: 420007,
        GAME_SCORE: 420008,
        BADGE_DEFINITION: 420009,
        GUILD_CREATION: 420019,
        GUILD_INVITE: 420020,
        GUILD_JOIN: 420021,
        MESSAGE_PASS: 420022,
        POSITION_CORRECTION: 420023,
        SCORE_CORRECTION: 420024,
        MARKETPLACE_LISTING: 420025,
        GUILD_RANK_UPDATE: 420026,
        GUILD_CHAT: 420027,
        CRAFTED_ITEM: 420028,
        TAG_TEAM: 420029,
        WORLD_EVENT: 420030,
        ALLIANCE_PROPOSAL: 420031,
        ALLIANCE_ACCEPTED: 420032,
        PLAYER_STATS: 420033,
        ITEM_USED: 420034,
        WEATHER_EVENT: 420035,
        SCAVENGER_HUNT_PROGRESS: 420036
    },
    QUEST_INTERVAL: 5 * 60 * 1000,
    LEADERBOARD_UPDATE_INTERVAL: 30 * 1000
};

// Global game state
window.game = {
    running: false,
    canvas: null,
    ctx: null,
    lastFrameTime: 0,
    keys: { up: false, down: false, left: false, right: false },
    player: {
        pubkey: null,
        profile: null,
        x: window.CONFIG.WORLD_SIZE / 2,
        y: window.CONFIG.WORLD_SIZE / 2,
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
            lastX: window.CONFIG.WORLD_SIZE / 2,
            lastY: window.CONFIG.WORLD_SIZE / 2
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

// Debug utility
window.debug = {
    log: (message) => console.log(`[GAME] ${message}`),
    error: (message) => console.error(`[GAME ERROR] ${message}`),
    warn: (message) => console.warn(`[GAME WARNING] ${message}`),
    success: (message) => console.log(`[GAME SUCCESS] ${message}`)
};
