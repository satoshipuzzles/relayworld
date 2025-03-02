function getPlayerName(pubkey) {
    if (pubkey === game.player.pubkey) return game.player.profile?.name || pubkey.slice(0, 8);
    const player = game.players.get(pubkey);
    return player?.profile?.name || pubkey.slice(0, 8);
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatScore(score) {
    if (score >= 1e12) return (score / 1e12).toFixed(1) + "T";
    if (score >= 1e9) return (score / 1e9).toFixed(1) + "B";
    if (score >= 1e6) return (score / 1e6).toFixed(1) + "M";
    if (score >= 1e3) return (score / 1e3).toFixed(1) + "K";
    return score;
}

function getRandomRarity() {
    const rand = Math.random();
    let cumulative = 0;
    for (const rarity in CONFIG.RARITY) {
        cumulative += CONFIG.RARITY[rarity].chance;
        if (rand < cumulative) return rarity;
    }
    return "COMMON";
}

function switchActiveRelay(url) {
    game.activeRelay = url;
    updateRelayList();
    spawnNPCsFromSurfingRelay();
    game.analytics = { activeAuthors: new Set(), notes: [], mostActive: { pubkey: null, count: 0 } };
    updateNostrAnalytics();
}

function updateMinimap() {
    const ctx = document.getElementById('mini-map').getContext('2d');
    ctx.clearRect(0, 0, 100, 100);
    ctx.fillStyle = 'rgba(10, 23, 42, 0.7)';
    ctx.fillRect(0, 0, 100, 100);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 100, 100);

    const scaleX = 100 / CONFIG.WORLD_SIZE;
    const scaleY = 100 / CONFIG.WORLD_SIZE;

    ctx.fillStyle = 'rgba(212, 160, 23, 1)';
    ctx.beginPath();
    ctx.arc(game.player.x * scaleX, game.player.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();

    game.players.forEach(player => {
        if (player.pubkey !== game.player.pubkey && player.isVisible) {
            ctx.fillStyle = player.isActive ? 'rgba(212, 160, 23, 0.8)' : 'white';
            ctx.beginPath();
            ctx.arc(player.x * scaleX, player.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.fillStyle = 'rgba(218, 165, 32, 0.8)';
    CONFIG.CHESTS.forEach(chest => {
        if (!chest.opened) {
            ctx.beginPath();
            ctx.arc(chest.x * scaleX, chest.y * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}
