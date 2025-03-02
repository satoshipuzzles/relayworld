const nostrClient = {
    async isExtensionAvailable() {
        return typeof window.nostr !== 'undefined';
    },

    async getPublicKey() {
        try {
            if (!window.nostr) {
                console.error('Nostr extension not available');
                return null;
            }
            return await window.nostr.getPublicKey();
        } catch (error) {
            console.error('Failed to get public key:', error);
            return null;
        }
    },

    async connectRelay(url) {
        try {
            const relay = window.NostrTools.relayInit(url);
            await relay.connect();
            console.log(`Connected to relay: ${url}`);
            return relay;
        } catch (error) {
            console.error(`Failed to connect to relay ${url}:`, error);
            return null;
        }
    },

    async publishEvent(relay, event) {
        try {
            if (!relay) {
                console.error('No relay provided');
                return null;
            }
            const signedEvent = await this.signEvent(event);
            await relay.publish(signedEvent);
            console.log(`Published event: ${event.kind}`);
            return signedEvent;
        } catch (error) {
            console.error('Event publication failed:', error);
            return null;
        }
    },

    async signEvent(event) {
        try {
            if (!window.nostr) {
                throw new Error('Nostr extension not available');
            }
            return await window.nostr.signEvent(event);
        } catch (error) {
            console.error('Event signing failed:', error);
            throw error;
        }
    },

    subscribeToEvents(relay, filters, onEvent, onEOSE) {
        try {
            if (!relay) {
                console.error('No relay provided for subscription');
                return null;
            }
            const sub = relay.sub(filters);
            if (sub) {
                sub.on('event', onEvent);
                if (onEOSE) sub.on('eose', onEOSE);
            } else {
                console.error('Failed to create subscription');
            }
            return sub;
        } catch (error) {
            console.error('Event subscription failed:', error);
            return null;
        }
    },

    createChatEvent(message) {
        return {
            kind: window.CONFIG.EVENT_KINDS.GLOBAL_CHAT,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: message
        };
    },

    createDirectMessageEvent(recipientPubkey, message) {
        return {
            kind: window.CONFIG.EVENT_KINDS.DIRECT_CHAT,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['p', recipientPubkey]],
            content: message
        };
    },

    async decryptMessage(senderPubkey, encryptedMessage) {
        try {
            if (!window.nostr || !window.nostr.nip04) {
                throw new Error('NIP-04 decryption not supported');
            }
            return await window.nostr.nip04.decrypt(senderPubkey, encryptedMessage);
        } catch (error) {
            console.error('Message decryption failed:', error);
            return encryptedMessage; // Fallback to returning encrypted message
        }
    }
};
