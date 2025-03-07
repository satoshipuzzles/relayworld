import { config } from './config.js';
import { nostrClient } from './nostr.js';

export class LightningClient {
  async init() {}

  async claimLand(regionId) {
    const response = await fetch(`${config.LNBITS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'X-Api-Key': config.LNBITS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: config.LAND_CLAIM_COST,
        description: `Land claim: ${regionId}`
      })
    });
    const data = await response.json();
    return data.payment_hash; // Simplified preimage
  }

  async zapPlayer(targetPubkey, amount) {
    const zapEvent = {
      kind: 9734,
      pubkey: nostrClient.pubkey,
      content: '',
      tags: [
        ['p', targetPubkey],
        ['amount', amount.toString()]
      ],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.SURFING_RELAYS[0], zapEvent);
  }
}

export const lightningClient = new LightningClient();
