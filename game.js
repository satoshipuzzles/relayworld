import { config } from './config.js';
import { nostrClient } from './nostr.js';
import { lightningClient } from './lightning.js';
import { buildingSystem } from './building.js';
import { voiceChat } from './voice.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = config.WORLD_WIDTH;
canvas.height = config.WORLD_HEIGHT;

const players = new Map();
let buildingMode = false;
const particles = [];
let weather = 'clear';
let kind1Notes = new Map();
let dirtyRects = [];

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

export async function startGame() {
  await Promise.all([nostrClient.init(), lightningClient.init(), voiceChat.init()]);
  const player = { x: 400, y: 300, moved: false, health: 100, energy: 100, color: 'blue', active: true };
  players.set(nostrClient.pubkey, player);

  setupUI();
  setupSubscriptions();
  setInterval(() => buildingSystem.checkExpirations(), 60000);
  setInterval(updateWeather, config.WEATHER_UPDATE_INTERVAL);
  gameLoop();
}

function setupUI() {
  document.getElementById('buildWall').addEventListener('click', () => {
    buildingMode = true;
    buildingSystem.selectedBlueprint = config.BLUEPRINTS.wall;
    document.getElementById('status').textContent = 'Click to place wall';
  });

  document.getElementById('buildHouse').addEventListener('click', () => {
    buildingMode = true;
    buildingSystem.selectedBlueprint = config.BLUEPRINTS.house;
    document.getElementById('status').textContent = 'Click to place house';
  });

  document.getElementById('claimLand').addEventListener('click', async () => {
    const player = players.get(nostrClient.pubkey);
    const preimage = await lightningClient.claimLand(`${Math.floor(player.x / 160)}-${Math.floor(player.y / 160)}`);
    const success = await buildingSystem.claimLand(nostrClient.pubkey, player.x, player.y, preimage);
    if (success) document.getElementById('status').textContent = 'Land claimed';
  });

  const zapAmount = document.getElementById('zapAmount');
  const zapValue = document.getElementById('zapValue');
  zapAmount.addEventListener('input', () => zapValue.textContent = zapAmount.value);

  const zapRange = document.getElementById('zapRange');
  const zapRangeValue = document.getElementById('zapRangeValue');
  zapRange.addEventListener('input', () => zapRangeValue.textContent = zapRange.value);

  document.getElementById('zapButton').addEventListener('click', async () => {
    const range = parseInt(zapRange.value);
    const nearestPlayer = [...players].find(([pk, p]) => 
      pk !== nostrClient.pubkey && Math.hypot(p.x - player.x, p.y - player.y) < range
    );
    if (nearestPlayer) {
      await lightningClient.zapPlayer(nearestPlayer[0], parseInt(zapAmount.value));
      document.getElementById('status').textContent = `Zapped ${nearestPlayer[0].slice(0, 8)}`;
    } else {
      document.getElementById('status').textContent = 'No player in range';
    }
  });

  document.getElementById('chatSend').addEventListener('click', async () => {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (message) {
      const event = {
        kind: 420304,
        pubkey: nostrClient.pubkey,
        content: message,
        tags: [['t', 'chat']],
        created_at: Math.floor(Date.now() / 1000),
      };
      await nostrClient.publish(config.GAME_RELAY_URL, event);
      input.value = '';
    }
  });

  document.getElementById('avatarColor').addEventListener('change', async (e) => {
    const player = players.get(nostrClient.pubkey);
    player.color = e.target.value;
    const event = {
      kind: 420005,
      pubkey: nostrClient.pubkey,
      content: JSON.stringify({ color: player.color }),
      tags: [['t', 'avatar']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.GAME_RELAY_URL, event);
  });

  document.getElementById('userTrade').addEventListener('click', async () => {
    const pubkey = document.getElementById('userPopup').dataset.pubkey;
    await buildingSystem.tradeWithUser(nostrClient.pubkey, pubkey);
    document.getElementById('userPopup').style.display = 'none';
  });

  document.getElementById('userClose').addEventListener('click', () => {
    document.getElementById('userPopup').style.display = 'none';
  });

  canvas.addEventListener('click', async (e) => {
    if (buildingMode && buildingSystem.selectedBlueprint) {
      const success = await buildingSystem.placeStructure(nostrClient.pubkey, buildingSystem.selectedBlueprint, e.offsetX, e.offsetY);
      if (success) {
        buildingMode = false;
        buildingSystem.selectedBlueprint = null;
        document.getElementById('status').textContent = 'Structure placed';
        dirtyRects.push({ x: e.offsetX - 50, y: e.offsetY - 50, width: 100, height: 100 });
      }
    } else {
      const nearestUser = [...players].find(([pk, p]) => 
        pk !== nostrClient.pubkey && Math.hypot(p.x - e.offsetX, p.y - e.offsetY) < config.USER_INTERACTION_RANGE
      );
      if (nearestUser) {
        showUserPopup(nearestUser[0], nearestUser[1], e.offsetX, e.offsetY);
      }
    }
  });
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  const player = players.get(nostrClient.pubkey);
  if (!player) return;

  let dx = 0, dy = 0;
  if (keys.has('w')) dy -= config.PLAYER_SPEED;
  if (keys.has('s')) dy += config.PLAYER_SPEED;
  if (keys.has('a')) dx -= config.PLAYER_SPEED;
  if (keys.has('d')) dx += config.PLAYER_SPEED;

  if (dx || dy) {
    const oldX = player.x, oldY = player.y;
    player.x = Math.max(0, Math.min(config.WORLD_WIDTH - 20, player.x + dx));
    player.y = Math.max(0, Math.min(config.WORLD_HEIGHT - 20, player.y + dy));
    player.moved = true;
    player.energy = Math.max(0, player.energy - 0.1);
    publishPosition(player.x, player.y);
    updateStats(player);
    dirtyRects.push({ x: oldX - 10, y: oldY - 10, width: 40, height: 40 });
    dirtyRects.push({ x: player.x - 10, y: player.y - 10, width: 40, height: 40 });
  }

  if (keys.has('r') && !player.gathering && player.energy > 10) {
    const nearestNode = [...buildingSystem.resourceNodes].find(([, n]) => 
      !n.depleted && Math.hypot(n.x - player.x, n.y - player.y) < 50
    );
    if (nearestNode) {
      player.gathering = true;
      const success = await buildingSystem.gatherResource(nostrClient.pubkey, nearestNode[0], player.x, player.y);
      if (success) {
        document.getElementById('status').textContent = `Gathered ${nearestNode[1].type}`;
        player.energy = Math.max(0, player.energy - 5);
        updateStats(player);
        dirtyRects.push({ x: nearestNode[1].x - 20, y: nearestNode[1].y - 20, width: 40, height: 40 });
      }
      player.gathering = false;
    } else {
      document.getElementById('status').textContent = 'No resource node nearby';
    }
  }

  voiceChat.updatePeers(players, player.x, player.y);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      dirtyRects.push({ x: p.x - 5, y: p.y - 5, width: 10, height: 10 });
    }
  }

  player.energy = Math.min(100, player.energy + 0.05);
  updateStats(player);
}

function render() {
  if (dirtyRects.length === 0) return;

  // Merge overlapping rectangles
  const mergedRects = mergeRects(dirtyRects);
  dirtyRects = [];

  mergedRects.forEach(rect => {
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = weather === 'rain' ? 'rgba(0, 0, 255, 0.1)' : weather === 'storm' ? 'rgba(100, 100, 100, 0.2)' : '#87ceeb';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    for (const [, claim] of buildingSystem.landClaims) {
      if (intersects(rect, claim)) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(claim.x, claim.y, config.LAND_CLAIM_SIZE * config.GRID_SIZE, config.LAND_CLAIM_SIZE * config.GRID_SIZE);
      }
    }

    for (const [, node] of buildingSystem.resourceNodes) {
      if (!node.depleted && intersects(rect, node)) {
        ctx.fillStyle = node.type === 'wood' ? 'green' : 'gray';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const [, structure] of buildingSystem.structures) {
      if (intersects(rect, structure)) {
        ctx.fillStyle = structure.type === 'wall' ? 'brown' : 'gray';
        ctx.fillRect(structure.x, structure.y, structure.width, structure.height);
      }
    }

    for (const [pubkey, player] of players) {
      if (intersects(rect, player)) {
        ctx.fillStyle = player.color || 'purple';
        ctx.beginPath();
        ctx.moveTo(player.x + 10, player.y);
        ctx.lineTo(player.x + 20, player.y + 20);
        ctx.lineTo(player.x, player.y + 20);
        ctx.closePath();
        ctx.fill();
        if (!player.active) {
          ctx.strokeStyle = 'gray';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      if (intersects(rect, p)) {
        ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

let positionQueue = [];
let lastFlush = Date.now();

async function publishPosition(x, y) {
  positionQueue.push({ x, y });
  if (Date.now() - lastFlush >= 500) {
    const event = {
      kind: 420001,
      pubkey: nostrClient.pubkey,
      content: JSON.stringify(positionQueue),
      tags: [['t', 'positionBatch']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.GAME_RELAY_URL, event);
    positionQueue = [];
    lastFlush = Date.now();
  }
}

let lastStatsUpdate = 0;
async function updateStats(player) {
  if (Date.now() - lastStatsUpdate < 1000) return; // Debounce to 1s
  const event = {
    kind: 420002,
    pubkey: nostrClient.pubkey,
    content: JSON.stringify({ health: player.health, energy: player.energy }),
    tags: [['t', 'stats']],
    created_at: Math.floor(Date.now() / 1000),
  };
  await nostrClient.publish(config.GAME_RELAY_URL, event);
  document.getElementById('health').textContent = Math.round(player.health);
  document.getElementById('energy').textContent = Math.round(player.energy);
  lastStatsUpdate = Date.now();
}

async function updateWeather() {
  const states = ['clear', 'rain', 'storm'];
  weather = states[Math.floor(Math.random() * states.length)];
  const event = {
    kind: 420103,
    pubkey: nostrClient.pubkey,
    content: JSON.stringify({ state: weather }),
    tags: [['t', 'weather']],
    created_at: Math.floor(Date.now() / 1000),
  };
  await nostrClient.publish(config.GAME_RELAY_URL, event);
  dirtyRects.push({ x: 0, y: 0, width: config.WORLD_WIDTH, height: config.WORLD_HEIGHT });
}

function createZapEffect(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x + 10,
      y: y + 10,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      hue: Math.random() * 360
    });
  }
}

function showUserPopup(pubkey, player, clickX, clickY) {
  const popup = document.getElementById('userPopup');
  popup.style.display = 'block';
  popup.style.left = `${clickX + 10}px`;
  popup.style.top = `${clickY + 10}px`;
  popup.dataset.pubkey = pubkey;
  document.getElementById('userName').textContent = `${pubkey.slice(0, 8)} ${player.active ? '(Online)' : '(Offline)'}`;
  const feed = document.getElementById('userFeed');
  feed.innerHTML = 'Loading...';
  loadUserNotes(pubkey).then(notes => {
    feed.innerHTML = '';
    notes.slice(-5).forEach(note => {
      const div = document.createElement('div');
      div.textContent = note.content;
      div.style.borderBottom = '1px solid #eee';
      feed.appendChild(div);
    });
    if (notes.length === 0) feed.textContent = 'No recent posts';
  });
}

async function loadUserNotes(pubkey) {
  if (!kind1Notes.has(pubkey)) {
    const notes = [];
    const sub = nostrClient.subscribe(config.SURFING_RELAYS[0], { kinds: [1], authors: [pubkey], limit: 5 }, (event) => {
      notes.push(event);
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for notes
    sub.unsub();
    kind1Notes.set(pubkey, notes);
  }
  return kind1Notes.get(pubkey) || [];
}

function setupSubscriptions() {
  const subs = [];
  subs.push(nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420001] }, (event) => {
    const data = JSON.parse(event.content);
    const playerData = { active: true, x: 400, y: 300, color: 'purple' };
    if (Array.isArray(data)) {
      data.forEach(pos => {
        const oldPlayer = players.get(event.pubkey);
        players.set(event.pubkey, { ...oldPlayer || playerData, x: pos.x, y: pos.y });
        if (oldPlayer) dirtyRects.push({ x: oldPlayer.x - 10, y: oldPlayer.y - 10, width: 40, height: 40 });
        dirtyRects.push({ x: pos.x - 10, y: pos.y - 10, width: 40, height: 40 });
      });
    } else {
      const oldPlayer = players.get(event.pubkey);
      players.set(event.pubkey, { ...oldPlayer || playerData, x: data.x, y: data.y });
      if (oldPlayer) dirtyRects.push({ x: oldPlayer.x - 10, y: oldPlayer.y - 10, width: 40, height: 40 });
      dirtyRects.push({ x: data.x - 10, y: data.y - 10, width: 40, height: 40 });
    }
  }));

  buildingSystem.loadData(() => dirtyRects.push({ x: 0, y: 0, width: config.WORLD_WIDTH, height: config.WORLD_HEIGHT }));

  subs.push(nostrClient.subscribe(config.WEBRTC_RELAY_URL, { kinds: [420401] }, (event) => {
    voiceChat.handleSignaling(event);
  }));

  config.SURFING_RELAYS.forEach(url => {
    subs.push(nostrClient.subscribe(url, { kinds: [9735] }, (event) => {
      const target = event.tags.find(t => t[0] === 'p')?.[1];
      if (target === nostrClient.pubkey) {
        document.getElementById('status').textContent = `Received zap from ${event.pubkey.slice(0, 8)}`;
        const player = players.get(nostrClient.pubkey);
        createZapEffect(player.x, player.y);
      }
    }));
    subs.push(nostrClient.subscribe(url, { kinds: [1], limit: 50 }, (event) => {
      const notes = kind1Notes.get(event.pubkey) || [];
      notes.push(event);
      if (notes.length > 50) notes.shift();
      kind1Notes.set(event.pubkey, notes);
      if (!players.has(event.pubkey)) {
        players.set(event.pubkey, { x: 400, y: 300, color: 'purple', active: false });
        dirtyRects.push({ x: 390, y: 290, width: 40, height: 40 });
      }
    }));
  });

  subs.push(nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420304] }, (event) => {
    const chat = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.textContent = `${event.pubkey.slice(0, 8)}: ${event.content}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
  }));

  subs.push(nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420002] }, (event) => {
    if (event.pubkey === nostrClient.pubkey) {
      const data = JSON.parse(event.content);
      const player = players.get(nostrClient.pubkey);
      player.health = data.health;
      player.energy = data.energy;
      document.getElementById('health').textContent = Math.round(player.health);
      document.getElementById('energy').textContent = Math.round(player.energy);
    }
  }));

  subs.push(nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420005] }, (event) => {
    const data = JSON.parse(event.content);
    const player = players.get(event.pubkey) || { x: 400, y: 300, active: false };
    player.color = data.color;
    players.set(event.pubkey, player);
    dirtyRects.push({ x: player.x - 10, y: player.y - 10, width: 40, height: 40 });
  }));

  subs.push(nostrClient.subscribe(config.GAME_RELAY_URL, { kinds: [420103] }, (event) => {
    const data = JSON.parse(event.content);
    weather = data.state;
    dirtyRects.push({ x: 0, y: 0, width: config.WORLD_WIDTH, height: config.WORLD_HEIGHT });
  }));

  window.addEventListener('unload', () => subs.forEach(sub => sub.unsub()));
}

function mergeRects(rects) {
  if (rects.length <= 1) return rects;
  const merged = [];
  rects.forEach(r => {
    let added = false;
    for (let i = 0; i < merged.length; i++) {
      if (intersects(r, merged[i])) {
        merged[i] = {
          x: Math.min(r.x, merged[i].x),
          y: Math.min(r.y, merged[i].y),
          width: Math.max(r.x + r.width, merged[i].x + merged[i].width) - Math.min(r.x, merged[i].x),
          height: Math.max(r.y + r.height, merged[i].y + merged[i].height) - Math.min(r.y, merged[i].y)
        };
        added = true;
        break;
      }
    }
    if (!added) merged.push(r);
  });
  return merged;
}

function intersects(rect, obj) {
  return rect.x < obj.x + (obj.width || 20) && rect.x + rect.width > obj.x &&
         rect.y < obj.y + (obj.height || 20) && rect.y + rect.height > obj.y;
}
