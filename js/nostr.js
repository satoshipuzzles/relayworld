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
            throw error;
        }
    },

    async publishEvent(relay, event) {
        try {
            const signedEvent = await this.signEvent(event);
            await relay.publish(signedEvent);
            console.log(`Published event: ${event.kind}`);
            return signedEvent;
        } catch (error) {
            console.error('Event publication failed:', error);
            throw error;
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
            const sub = relay.sub(filters);
            sub.on('event', onEvent);
            if (onEOSE) sub.on('eose', onEOSE);
            return sub;
        } catch (error) {
            console.error('Event subscription failed:', error);
            return null;
        }
    }
};
