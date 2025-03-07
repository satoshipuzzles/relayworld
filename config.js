export const config = {
  GAME_RELAY_URL: 'wss://your-game-relay.com',
  SURFING_RELAYS: ['wss://relay.damus.io', 'wss://bevo.nostr1.com'],
  LOGIN_RELAY_URL: 'wss://relay.damus.io',
  WEBRTC_RELAY_URL: 'wss://relay.nostrfreaks.com',
  WORLD_WIDTH: 800,
  WORLD_HEIGHT: 600,
  GRID_SIZE: 40,
  PLAYER_SPEED: 2,
  WOOD_GATHER_TIME: 2,
  STONE_GATHER_TIME: 3,
  BLUEPRINTS: {
    wall: { wood: 5, stone: 0, width: 1, height: 1 },
    house: { wood: 10, stone: 5, width: 2, height: 2 }
  },
  LAND_CLAIM_COST: 1000,
  LAND_CLAIM_SIZE: 4,
  LAND_CLAIM_EXPIRY: 30 * 24 * 60 * 60,
  LNBITS_URL: import.meta.env.VITE_LNBITS_URL || 'https://default-lnbits.com',
  LNBITS_API_KEY: import.meta.env.VITE_LNBITS_API_KEY || 'default-api-key',
  ZAP_MIN: 1,
  ZAP_MAX: 1000,
  ZAP_DEFAULT: 21,
  VOICE_CHAT_RANGE: 200,
  ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
  USER_INTERACTION_RANGE: 50,
  WEATHER_UPDATE_INTERVAL: 300000
};
