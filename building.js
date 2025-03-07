import { config } from './config.js';
import { nostrClient } from './nostr.js';

export class BuildingSystem {
  constructor() {
    this.structures = new Map();
    this.resources = { wood: 0, stone: 0 };
    this.landClaims = new Map();
    this.resourceNodes = new Map();
    this.selectedBlueprint = null;
  }

  hasResources(blueprint) {
    return this.resources.wood >= blueprint.wood && this.resources.stone >= blueprint.stone;
  }

  consumeResources(blueprint) {
    this.resources.wood -= blueprint.wood;
    this.resources.stone -= blueprint.stone;
    this.updateInventory(nostrClient.pubkey);
  }

  checkCollision(x, y, width, height) {
    const gridX = Math.floor(x / config.GRID_SIZE);
    const gridY = Math.floor(y / config.GRID_SIZE);
    const gridWidth = width;
    const gridHeight = height;

    for (const [, structure] of this.structures) {
      const sGridX = Math.floor(structure.x / config.GRID_SIZE);
      const sGridY = Math.floor(structure.y / config.GRID_SIZE);
      const sGridWidth = Math.floor(structure.width / config.GRID_SIZE);
      const sGridHeight = Math.floor(structure.height / config.GRID_SIZE);

      if (
        gridX < sGridX + sGridWidth &&
        gridX + gridWidth > sGridX &&
        gridY < sGridY + sGridHeight &&
        gridY + gridHeight > sGridY
      ) {
        return true;
      }
    }
    return false;
  }

  canBuild(pubkey, x, y, width, height) {
    const regionId = `${Math.floor(x / (config.LAND_CLAIM_SIZE * config.GRID_SIZE))}-${Math.floor(y / (config.LAND_CLAIM_SIZE * config.GRID_SIZE))}`;
    const claim = this.landClaims.get(regionId);
    return (!claim || claim.owner === pubkey) && !this.checkCollision(x, y, width, height);
  }

  async placeStructure(pubkey, blueprint, x, y) {
    if (!this.hasResources(blueprint)) {
      document.getElementById('status').textContent = 'Not enough resources';
      return false;
    }

    const gridX = Math.floor(x / config.GRID_SIZE) * config.GRID_SIZE;
    const gridY = Math.floor(y / config.GRID_SIZE) * config.GRID_SIZE;

    if (!this.canBuild(pubkey, gridX, gridY, blueprint.width, blueprint.height)) {
      document.getElementById('status').textContent = 'Cannot build here (land or collision)';
      return false;
    }

    const structureId = `${blueprint.type}-${Date.now()}`;
    const event = {
      kind: 420101,
      pubkey,
      content: JSON.stringify({
        type: blueprint.type,
        x: gridX,
        y: gridY,
        width: blueprint.width * config.GRID_SIZE,
        height: blueprint.height * config.GRID_SIZE
      }),
      tags: [['t', 'structure'], ['id', structureId]],
      created_at: Math.floor(Date.now() / 1000),
    };

    const buildingAction = {
      kind: 420202,
      pubkey,
      content: JSON.stringify({ action: 'place', structureId }),
      tags: [['t', 'buildingAction']],
      created_at: Math.floor(Date.now() / 1000),
    };

    await Promise.all([
      nostrClient.publish(config.GAME_RELAY_URL, event),
      nostrClient.publish(config.GAME_RELAY_URL, buildingAction)
    ]);
    this.consumeResources(blueprint);
    this.structures.set(structureId, { ...JSON.parse(event.content), id: structureId });
    return true;
  }

  async claimLand(pubkey, x, y, preimage) {
    const regionId = `${Math.floor(x / (config.LAND_CLAIM_SIZE * config.GRID_SIZE))}-${Math.floor(y / (config.LAND_CLAIM_SIZE * config.GRID_SIZE))}`;
    if (this.landClaims.has(regionId)) {
      document.getElementById('status').textContent = 'Land already claimed';
      return false;
    }

    const event = {
      kind: 420104,
      pubkey,
      content: JSON.stringify({
        regionId,
        paymentProof: preimage,
        expiry: Math.floor(Date.now() / 1000) + config.LAND_CLAIM_EXPIRY
      }),
      tags: [['t', 'claim']],
      created_at: Math.floor(Date.now() / 1000),
    };

    await nostrClient.publish(config.GAME_RELAY_URL, event);
    this.landClaims.set(regionId, {
      owner: pubkey,
      expiry: JSON.parse(event.content).expiry,
      x: Math.floor(x / (config.LAND_CLAIM_SIZE * config.GRID_SIZE)) * config.LAND_CLAIM_SIZE * config.GRID_SIZE,
      y: Math.floor(y / (config.LAND_CLAIM_SIZE * config.GRID_SIZE)) * config.LAND_CLAIM_SIZE * config.GRID_SIZE
    });
    return true;
  }

  async gatherResource(pubkey, nodeId, x, y) {
    const node = this.resourceNodes.get(nodeId);
    if (!node || node.depleted) return false;

    const resource = node.type;
    const time = resource === 'wood' ? config.WOOD_GATHER_TIME : config.STONE_GATHER_TIME;
    await new Promise(resolve => setTimeout(resolve, time * 1000));

    const gatherEvent = {
      kind: 420201,
      pubkey,
      content: JSON.stringify({ resourceId: nodeId, resourceType: resource, amount: 1, position: { x, y } }),
      tags: [['t', 'gather']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.GAME_RELAY_URL, gatherEvent);

    const nodeEvent = {
      kind: 420102,
      pubkey,
      content: JSON.stringify({ resourceId: nodeId, depleted: true, respawnTime: Date.now() + 300000 }),
      tags: [['t', 'resourceUpdate']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.GAME_RELAY_URL, nodeEvent);

    this.resources[resource] += 1;
    this.updateInventory(pubkey);
    node.depleted = true;
    document.getElementById(resource).textContent = this.resources[resource];
    return true;
  }

  async updateInventory(pubkey) {
    const event = {
      kind: 420003,
      pubkey,
      content: JSON.stringify(this.resources),
      tags: [['t', 'inventory']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.GAME_RELAY_URL, event);
  }

  async tradeWithUser(pubkey, targetPubkey) {
    if (this.resources.wood < 1) {
      document.getElementById('status').textContent = 'Not enough wood to trade';
      return false;
    }
    this.resources.wood -= 1;
    this.resources.stone += 1;
    this.updateInventory(pubkey);
    document.getElementById('wood').textContent = this.resources.wood;
    document.getElementById('stone').textContent = this.resources.stone;
    document.getElementById('status').textContent = `Traded with ${targetPubkey.slice(0, 8)}`;
    return true;
  }

  loadData(callback) {
    nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420101] }, (event) => {
      const data = JSON.parse(event.content);
      const id = event.tags.find(t => t[0] === 'id')[1];
      this.structures.set(id, { ...data, id });
      callback();
    });

    nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420104] }, (event) => {
      const data = JSON.parse(event.content);
      this.landClaims.set(data.regionId, {
        owner: event.pubkey,
        expiry: data.expiry,
        x: parseInt(data.regionId.split('-')[0]) * config.LAND_CLAIM_SIZE * config.GRID_SIZE,
        y: parseInt(data.regionId.split('-')[1]) * config.LAND_CLAIM_SIZE * config.GRID_SIZE
      });
      callback();
    });

    nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420102] }, (event) => {
      const data = JSON.parse(event.content);
      this.resourceNodes.set(data.resourceId, {
        type: data.resourceId.startsWith('wood') ? 'wood' : 'stone',
        x: Math.random() * config.WORLD_WIDTH,
        y: Math.random() * config.WORLD_HEIGHT,
        depleted: data.depleted,
        respawnTime: data.respawnTime
      });
      callback();
    });

    nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420003] }, (event) => {
      if (event.pubkey === nostrClient.pubkey) {
        this.resources = JSON.parse(event.content);
        document.getElementById('wood').textContent = this.resources.wood;
        document.getElementById('stone').textContent = this.resources.stone;
      }
    });

    if (this.resourceNodes.size === 0) {
      for (let i = 0; i < 5; i++) {
        const id = `wood-${i}`;
        this.resourceNodes.set(id, { type: 'wood', x: Math.random() * config.WORLD_WIDTH, y: Math.random() * config.WORLD_HEIGHT, depleted: false });
        nostrClient.publish(config.GAME_RELAY_URL, {
          kind: 420102,
          pubkey: nostrClient.pubkey,
          content: JSON.stringify({ resourceId: id, depleted: false }),
          tags: [['t', 'resourceUpdate']],
          created_at: Math.floor(Date.now() / 1000),
        });
      }
      for (let i = 0; i < 5; i++) {
        const id = `stone-${i}`;
        this.resourceNodes.set(id, { type: 'stone', x: Math.random() * config.WORLD_WIDTH, y: Math.random() * config.WORLD_HEIGHT, depleted: false });
        nostrClient.publish(config.GAME_RELAY_URL, {
          kind: 420102,
          pubkey: nostrClient.pubkey,
          content: JSON.stringify({ resourceId: id, depleted: false }),
          tags: [['t', 'resourceUpdate']],
          created_at: Math.floor(Date.now() / 1000),
        });
      }
    }
  }

  checkExpirations() {
    const now = Math.floor(Date.now() / 1000);
    for (const [regionId, claim] of this.landClaims) {
      if (claim.expiry < now) {
        this.landClaims.delete(regionId);
      }
    }
    for (const [id, node] of this.resourceNodes) {
      if (node.depleted && node.respawnTime && Date.now() >= node.respawnTime) {
        node.depleted = false;
        node.respawnTime = null;
        nostrClient.publish(config.GAME_RELAY_URL, {
          kind: 420102,
          pubkey: nostrClient.pubkey,
          content: JSON.stringify({ resourceId: id, depleted: false }),
          tags: [['t', 'resourceUpdate']],
          created_at: Math.floor(Date.now() / 1000),
        });
      }
    }
  }
}

export const buildingSystem = new BuildingSystem();
