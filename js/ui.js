            sum + n.length, 0) / game.analytics.notes.length || 0;
            document.getElementById('avg-length').textContent = avgLength.toFixed(1);
            const mostActivePlayer = game.players.get(game.analytics.mostActive.pubkey);
            document.getElementById('most-active').textContent = mostActivePlayer?.profile?.name || game.analytics.mostActive.pubkey?.slice(0, 8) || '-';
        }
    );
}

function showQuestNotification() {
    if (!game.currentQuest) return;
    document.getElementById('quest-title').textContent = game.currentQuest.title;
    document.getElementById('quest-description').textContent = `${game.currentQuest.description} Reward: ${game.currentQuest.reward} points`;
    const progress = game.currentQuest.type === "social_swarm" 
        ? Math.max(game.currentQuest.progress.follow / game.currentQuest.target.follow, game.currentQuest.progress.followed / game.currentQuest.target.followed)
        : game.currentQuest.progress / game.currentQuest.target;
    document.getElementById('quest-progress-bar').style.width = `${progress * 100}%`;
    document.getElementById('quest-notification').style.display = 'block';
}

function initiateTrade() {
    document.getElementById('trade-interface').style.display = 'block';
    document.getElementById('your-trade-items').innerHTML = '';
    game.player.inventory.forEach(item => {
        const el = document.createElement('div');
        el.className = 'trade-item';
        el.dataset.id = item.id;
        el.innerHTML = `<div class="trade-item-icon">${item.emoji}</div><div class="trade-item-name">${item.name}</div>`;
        el.addEventListener('click', () => el.classList.toggle('selected'));
        document.getElementById('your-trade-items').appendChild(el);
    });
    document.getElementById('trade-offer').textContent = "Send Offer";
    document.getElementById('trade-offer').onclick = sendTradeOffer;
}

function closeTrade() {
    document.getElementById('trade-interface').style.display = 'none';
    game.activeTrade = null;
}

function initiateZap() {
    document.getElementById('zap-interface').style.display = 'block';
}

function closeZap() {
    document.getElementById('zap-interface').style.display = 'none';
}
