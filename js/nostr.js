const nostrClient = {
    async isExtensionAvailable() {
        return typeof window.nostr !== 'undefined';
    },

    async getPublicKey() {
        return await window.nostr.getPublicKey();
    },

    async signEvent(event) {
        if (event.pubkey === CONFIG.GAME_MASTER_PUBKEY && CONFIG.GAME_MASTER_NSEC) {
            return window.NostrTools.finalizeEvent(event, CONFIG.GAME_MASTER_NSEC);
        }
        return await window.nostr.signEvent(event);
    },

    async connectRelay(url) {
        const relay = window.NostrTools.relayInit(url);
        await relay.connect();
        console.log(`Connected to relay: ${url}`);
        return relay;
    },

    async publishEvent(relay, event) {
        const signedEvent = await this.signEvent(event);
        await relay.publish(signedEvent);
        console.log(`Published event: ${event.kind}`);
        return signedEvent;
    },

    subscribeToEvents(relay, filters, onEvent, onEOSE) {
        const sub = relay.sub(filters);
        sub.on('event', onEvent);
        if (onEOSE) sub.on('eose', onEOSE);
        return sub;
    },

    async encryptMessage(recipientPubkey, message) {
        return await window.nostr.nip04.encrypt(recipientPubkey, message);
    },

    async decryptMessage(senderPubkey, encryptedMessage) {
        return await window.nostr.nip04.decrypt(senderPubkey, encryptedMessage);
    },

    createPositionEvent(x, y) {
        return {
            kind: CONFIG.EVENT_KINDS.PLAYER_POSITION,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: JSON.stringify({ x, y })
        };
    },

    createChatEvent(message) {
        return {
            kind: CONFIG.EVENT_KINDS.GLOBAL_CHAT,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: message
        };
    },

    async createDirectMessageEvent(recipientPubkey, message) {
        const encryptedContent = await this.encryptMessage(recipientPubkey, message);
        return {
            kind: CONFIG.EVENT_KINDS.DIRECT_CHAT,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['p', recipientPubkey]],
            content: encryptedContent
        };
    },

    createGameActionEvent(action, data, recipientPubkey = null) {
        const event = {
            kind: CONFIG.EVENT_KINDS.TRADE_ACTION,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['action', action]],
            content: JSON.stringify(data)
        };
        if (recipientPubkey) event.tags.push(['p', recipientPubkey]);
        return event;
    },

    createScoreEvent(score, level) {
        return {
            kind: CONFIG.EVENT_KINDS.GAME_SCORE,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: JSON.stringify({ score, level })
        };
    },

    createZapRequest(recipientPubkey, amount, message) {
        return {
            kind: 9734,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', recipientPubkey],
                ['amount', amount.toString()],
                ['relays', [CONFIG.GAME_RELAY]]
            ],
            content: message
        };
    },

    parseMetadata(event) {
        try {
            return JSON.parse(event.content);
        } catch (error) {
            console.error(`Failed to parse metadata: ${error.message}`);
            return null;
        }
    },

    parseContacts(event) {
        const pubkeys = new Set();
        for (const tag of event.tags) {
            if (tag[0] === 'p' && tag[1]) pubkeys.add(tag[1]);
        }
        return pubkeys;
    }
};
