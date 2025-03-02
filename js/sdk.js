// Nostr Game Synchronization SDK
const NostrGameSync = {
    async init(config) {
        this.relay = await nostrClient.connectRelay(config.relayUrl);
        this.pubkey = await nostrClient.getPublicKey();
        this.gameId = config.gameId;
        this.kinds = config.kinds || {};
    },

    async publishState(kind, data, tags = []) {
        const event = {
            kind: kind,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['game', this.gameId], ...tags],
            content: JSON.stringify(data)
        };
        return await nostrClient.publishEvent(this.relay, event);
    },

    subscribeToState(kind, callback) {
        nostrClient.subscribeToEvents(
            this.relay,
            [{ kinds: [kind], "#game": [this.gameId] }],
            (event) => {
                const data = JSON.parse(event.content);
                callback(event.pubkey, data, event.tags);
            }
        );
    },

    // Example Usage for Relay World
    updatePlayerPosition(x, y) {
        return this.publishState(CONFIG.EVENT_KINDS.PLAYER_POSITION, { x, y });
    },

    onPlayerPosition(callback) {
        this.subscribeToState(CONFIG.EVENT_KINDS.PLAYER_POSITION, callback);
    },

    updateScore(score, level) {
        return this.publishState(CONFIG.EVENT_KINDS.GAME_SCORE, { score, level });
    },

    onScoreUpdate(callback) {
        this.subscribeToState(CONFIG.EVENT_KINDS.GAME_SCORE, callback);
    },

    collectItem(item) {
        return this.publishState(CONFIG.EVENT_KINDS.ITEM_COLLECT, item, [["p", this.pubkey]]);
    },

    onItemCollected(callback) {
        this.subscribeToState(CONFIG.EVENT_KINDS.ITEM_COLLECT, callback);
    }
};

// Usage Example:
/*
const gameSync = NostrGameSync;
await gameSync.init({
    relayUrl: "wss://relay.damus.io",
    gameId: "relay-world",
    kinds: CONFIG.EVENT_KINDS
});
gameSync.updatePlayerPosition(500, 500);
gameSync.onPlayerPosition((pubkey, data) => console.log(`${pubkey} moved to ${data.x}, ${data.y}`));
*/
