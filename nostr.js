import { relayInit } from 'nostr-tools';

export class NostrClient {
  constructor() {
    this.pubkey = null;
    this.relays = new Map();
  }

  async init() {
    this.pubkey = await window.nostr.getPublicKey();
  }

  connect(url) {
    if (!this.relays.has(url)) {
      const relay = relayInit(url);
      relay.connect();
      this.relays.set(url, relay);
    }
    return this.relays.get(url);
  }

  async publish(url, event) {
    event.id = Math.random().toString(36).slice(2); // Placeholder for real ID
    event.sig = await window.nostr.signEvent(event);
    const relay = this.connect(url);
    return relay.publish(event);
  }

  subscribe(url, filters, callback) {
    const relay = this.connect(url);
    const sub = relay.sub(filters);
    sub.on('event', callback);
    return sub;
  }
}

export const nostrClient = new NostrClient();
