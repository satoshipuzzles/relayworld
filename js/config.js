const CONFIG = {
    WORLD_SIZE: 1000,
    PLAYER_SPEED: 200,
    CAMERA_FOLLOW_SPEED: 0.1,
    GAME_RELAY: "wss://relay.nostrfreaks.com",
    DEFAULT_RELAYS: [
        "wss://relay.damus.io",
        "wss://nostr-pub.wellorder.net",
      "wss://bevo.nostr1.com",
        "wss://relay.snort.social"
    ],
    GAME_MASTER_PUBKEY: process.env.GAME_MASTER_PUBKEY || "your_game_master_npub_here",
    GAME_MASTER_NSEC: process.env.GAME_MASTER_NSEC || "your_game_master_nsec_here",
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
    ITEMS: [
        { id: "gem", name: "Gem", emoji: "💎", value: 50 },
        { id: "crown", name: "Crown", emoji: "👑", value: 100 },
        { id: "star_shard", name: "Star Shard", emoji: "🌟", value: 100 }
    ],
    RARITY: {
        COMMON: { chance: 0.5, name: "Common", color: "#9CA3AF" },
        RARE: { chance: 0.3, name: "Rare", color: "#3B82F6" },
        SUPER_RARE: { chance: 0.15, name: "Super Rare", color: "#8B5CF6" },
        LEGENDARY: { chance: 0.05, name: "Legendary", color: "#F59E0B" }
    },
    SOCIAL_SPACES: {
        CORNY_CHAT: { x: 100, y: 100, radius: 50 },
        HIVE_TALK: { x: 900, y: 900, radius: 50 }
    },
    RECIPES: [
        {
            id: "speed_boost",
            name: "Speed Boost",
            emoji: "⚡",
            rarity: "RARE",
            value: 150,
            requires: [
                { name: "Gem", quantity: 2, rarity: "RARE" },
                { name: "Crown", quantity: 1, rarity: "LEGENDARY" }
            ]
        },
        {
            id: "teleport_scroll",
            name: "Teleport Scroll",
            emoji: "📜",
            rarity: "LEGENDARY",
            value: 300,
            requires: [
                { name: "Star Shard", quantity: 3, rarity: "SUPER RARE" },
                { name: "Gem", quantity: 2, rarity: "RARE" }
            ],
            use: () => {
                const target = prompt("Enter coordinates (x,y):");
                if (target) {
                    const [x, y] = target.split(',').map(Number);
                    if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= CONFIG.WORLD_SIZE && y >= 0 && y <= CONFIG.WORLD_SIZE) {
                        game.player.x = x;
                        game.player.y = y;
                        publishPlayerPosition();
                        showToast("Teleported!", "success");
                        return true;
                    } else {
                        showToast("Invalid coordinates!", "warning");
                    }
                }
                return false;
            }
        }
    ],
    QUEST_INTERVAL: 5 * 60 * 1000,
    LEADERBOARD_UPDATE_INTERVAL: 30 * 1000
};
