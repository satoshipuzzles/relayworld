# Relay World 2.0

A decentralized browser-based metaverse built on the Nostr protocol, allowing players to collaboratively build, trade, and explore a virtual world. The entire game state is persisted through Nostr events, with no central server required beyond standard Nostr relays.

## Features

### Key Components

- **Decentralized Architecture:** Game state persisted through Nostr events
- **Browser-Based:** Pure client-side JavaScript using HTML5 Canvas
- **Resource Gathering:** Collect wood, stone, and metal
- **Building System:** Construct structures from gathered resources
- **Land Claiming:** Claim territories with Lightning payments
- **Guild System:** Form groups with shared objectives and resources
- **Lightning Integration:** Send and receive Bitcoin payments in-game
- **Voice Chat:** Proximity-based WebRTC voice communication

### Technical Highlights

- **Nostr Protocol:** Uses custom event kinds in the 420XXX range for game mechanics
- **WebLN/NWC:** Bitcoin Lightning Network payment integration
- **WebRTC:** Peer-to-peer voice chat system
- **Modular Design:** Clear separation of concerns for easy contribution

## Architecture

### Core Systems

- **Engine:** Main game loop and initialization
- **Renderer:** Canvas rendering and camera control
- **Player:** Movement, inventory, and interaction
- **Resources:** Resource nodes, gathering, and respawning
- **Building:** Structure placement and management
- **World:** Spatial partitioning and region management
- **Lightning:** Payment processing via WebLN/NWC
- **Guild:** Group management and shared resources
- **Voice:** WebRTC proximity chat

### Nostr Integration

Custom event kinds in the 420XXX range:
- 420001: Player Position & Movement
- 420002: Player Stats & Progression
- 420003: Player Inventory
- 420005: Player Avatar Configuration
- 420101: Structure (Building) Event
- 420102: Resource Node State
- 420103: Weather System Event
- 420104: Land Claim Event
- 420201: Resource Collection Action
- 420202: Building Action
- 420301: Guild Management
- 420304: Chat Message
- 420401: Zap Effect

Standard Nostr events (NIP-57) for payments:
- 9734: Zap Request
- 9735: Zap Receipt

## Getting Started

### Prerequisites

- Modern web browser with JavaScript enabled
- NIP-07 compatible Nostr extension (e.g., nos2x, Alby)
- WebLN-compatible wallet for Lightning payments (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/relay-world.git
cd relay-world
```

2. Configure environment variables (optional):
Create a `.env` file or set environment variables in your deployment platform.

```
# World Settings
WORLD_WIDTH=3000
WORLD_HEIGHT=3000
MAX_PLAYERS=1000
NPC_LIMIT=500

# Game Relay
GAME_RELAY_URL=wss://your-relay.com

# Default Explorer Relays
DEFAULT_RELAYS=wss://relay1.com,wss://relay2.com

# Resource Settings
RESOURCE_DENSITY=0.05
RESOURCE_RESPAWN_TIME=300
WOOD_GATHER_TIME=5
STONE_GATHER_TIME=10
METAL_GATHER_TIME=20

# Building Settings
MAX_STRUCTURE_HEIGHT=10
STRUCTURE_DECAY_RATE=0.01
MAX_STRUCTURES_PER_REGION=50

# Land System
LAND_CLAIM_SIZE=100
LAND_CLAIM_COST=1000
LAND_CLAIM_EXPIRY=30

# Lightning Integration
LNBITS_URL=https://lnbits.example.com
LNBITS_API_KEY=your_api_key
LNBITS_WEBHOOK_URL=your_webhook_url

# Voice Chat Settings
VOICE_CHAT_RANGE=300
VOICE_QUALITY=medium
```

3. Deploy to a static hosting service like Vercel, Netlify, or GitHub Pages.

### Development

To run the game locally:

```bash
# Using a simple HTTP server
python -m http.server

# Or with Node.js
npx serve
```

Then open `http://localhost:8000` in your browser.

## Game Controls

- **WASD/Arrow Keys:** Movement
- **E:** Interact with objects/players
- **R:** Gather resources
- **B:** Toggle building mode
- **Tab:** Open inventory
- **G:** Open guild interface
- **M:** Open map

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [WebLN](https://webln.dev/)
- [Nostr Wallet Connect](https://github.com/nbd-wtf/nostr-wallet-connect)
