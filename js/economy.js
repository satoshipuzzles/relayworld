function handleTradeAction(event) {
    const data = JSON.parse(event.content);
    if (data.status === "offer") {
        game.tradeOffers.set(data.tradeId, data);
    } else if (data.status === "counter" && data.recipientPubkey === game.player.pubkey) {
        game.activeTrade = data;
        initiateTrade();
        document.getElementById('trade-offer').textContent = "Accept Trade";
        document.getElementById('trade-offer').onclick = acceptTrade;
    }
}

function sendTradeOffer() {
    if (!game.selectedPlayer) return;
    const selectedItems = Array.from(document.querySelectorAll('#your-trade-items .trade-item.selected')).map(el => el.dataset.id);
    if (selectedItems.length === 0) {
        showToast('Select at least one item to trade', 'warning');
        return;
    }
    const tradeId = `${game.player.pubkey}-${Date.now()}`;
    const tradeData = {
        tradeId,
        senderPubkey: game.player.pubkey,
        recipientPubkey: game.selectedPlayer.pubkey,
        offeredItems: selectedItems,
        requestedItems: [],
        status: "offer"
    };
    game.tradeOffers.set(tradeId, tradeData);
    const chatEvent = {
        kind: CONFIG.EVENT_KINDS.GLOBAL_CHAT,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["trade", tradeId]],
        content: `${getPlayerName(game.player.pubkey)} offers a trade! Click to respond.`
    };
    const actionEvent = {
        kind: CONFIG.EVENT_KINDS.TRADE_ACTION,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", game.selectedPlayer.pubkey], ["stage", "offer"]],
        content: JSON.stringify(tradeData)
    };
    nostrClient.publishEvent(game.gameRelay, chatEvent);
    nostrClient.publishEvent(game.gameRelay, actionEvent).then(() => {
        closeTrade();
        showToast(`Trade offer sent to ${getPlayerName(game.selectedPlayer.pubkey)}`, "success");
    });
}

function respondToTrade(tradeId) {
    const trade = game.tradeOffers.get(tradeId);
    if (!trade || trade.recipientPubkey !== game.player.pubkey) return;
    game.selectedPlayer = game.players.get(trade.senderPubkey);
    initiateTrade();
    const theirItems = document.getElementById('their-trade-items');
    theirItems.innerHTML = '';
    trade.offeredItems.forEach(itemId => {
        const item = game.player.inventory.find(i => i.id === itemId); // Simplified, assumes sender inventory synced
        if (item) {
            const itemEl = document.createElement('div');
            itemEl.className = 'trade-item';
            itemEl.innerHTML = `<div class="trade-item-icon">${item.emoji}</div><div class="trade-item-name">${item.name}</div>`;
            theirItems.appendChild(itemEl);
        }
    });
}

function sendTradeCounter() {
    const tradeId = game.activeTrade.tradeId;
    const selectedItems = Array.from(document.querySelectorAll('#your-trade-items .trade-item.selected')).map(el => el.dataset.id);
    const tradeData = {
        ...game.activeTrade,
        requestedItems: selectedItems,
        status: "counter"
    };
    const actionEvent = {
        kind: CONFIG.EVENT_KINDS.TRADE_ACTION,
        tags: [["p", game.activeTrade.senderPubkey], ["stage", "counter"]],
        content: JSON.stringify(tradeData)
    };
    nostrClient.publishEvent(game.gameRelay, actionEvent).then(() => {
        showToast("Counter-offer sent!", "success");
        closeTrade();
    });
}

function acceptTrade() {
    const tradeData = { ...game.activeTrade, status: "accepted" };
    const actionEvent = {
        kind: CONFIG.EVENT_KINDS.TRADE_ACTION,
        tags: [["p", game.activeTrade.senderPubkey], ["stage", "accepted"]],
        content: JSON.stringify(tradeData)
    };
    nostrClient.publishEvent(game.gameRelay, actionEvent).then(() => {
        tradeData.offeredItems.forEach(itemId => {
            const item = game.player.inventory.find(i => i.id === itemId);
            if (item) {
                game.player.inventory = game.player.inventory.filter(i => i.id !== itemId);
                game.players.get(tradeData.recipientPubkey).inventory.push(item);
            }
        });
        tradeData.requestedItems.forEach(itemId => {
            const item = game.players.get(tradeData.senderPubkey).inventory.find(i => i.id === itemId);
            if (item) game.player.inventory.push(item);
        });
        game.player.stats.tradesCompleted += 1;
        game.audio.trade.play(); // Audio feedback
        updateReputation();
        updateStats();
        showToast("Trade accepted!", "success");
        closeTrade();
    });
}

function listItemForTrade() {
    const selectedItem = document.querySelector('#your-trade-items .trade-item.selected');
    if (!selectedItem) {
        showToast("Select an item to list!", "warning");
        return;
    }
    const itemId = selectedItem.dataset.id;
    const item = game.player.inventory.find(i => i.id === itemId);
    const asking = prompt("What do you want in return?");
    if (!asking) return;
    game.marketplace.set(itemId, { seller: game.player.pubkey, item, asking });
    game.player.inventory = game.player.inventory.filter(i => i.id !== itemId);
    const event = {
        kind: CONFIG.EVENT_KINDS.MARKETPLACE_LISTING,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["item", itemId]],
        content: JSON.stringify({ seller: game.player.pubkey, item, asking })
    };
    nostrClient.publishEvent(game.gameRelay, event);
    showToast(`${item.name} listed on marketplace!`, "success");
    nostrClient.publishEvent(game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.GLOBAL_CHAT,
        tags: [["market", itemId]],
        content: `${getPlayerName(game.player.pubkey)} listed ${item.name} for "${asking}"! Click to trade.`
    });
    closeTrade();
}

function syncMarketplace() {
    nostrClient.subscribeToEvents(
        game.gameRelay,
        [{ kinds: [CONFIG.EVENT_KINDS.MARKETPLACE_LISTING] }],
        (event) => {
            const data = JSON.parse(event.content);
            game.marketplace.set(event.tags.find(t => t[0] === "item")[1], data);
            updateMarketplaceUI();
        }
    );
}

function initiateMarketTrade(itemId) {
    const listing = game.marketplace.get(itemId);
    game.selectedPlayer = game.players.get(listing.seller);
    initiateTrade();
    document.getElementById('their-trade-items').innerHTML = `
        <div class="trade-item">
            <div class="trade-item-icon">${listing.item.emoji}</div>
            <div class="trade-item-name">${listing.item.name}</div>
        </div>
    `;
    document.getElementById('trade-title').textContent = `Trade for ${listing.item.name} (${listing.asking})`;
}

function canCraft(recipe) {
    return recipe.requires.every(req => {
        const count = game.player.inventory.filter(i => i.name === req.name && i.rarity === req.rarity).length;
        return count >= req.quantity;
    });
}

function craftItem(recipeId) {
    const recipe = CONFIG.RECIPES.find(r => r.id === recipeId);
    if (!canCraft(recipe)) {
        showToast("Missing required items!", "warning");
        return;
    }
    recipe.requires.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
            const index = game.player.inventory.findIndex(item => item.name === req.name && item.rarity === req.rarity);
            game.player.inventory.splice(index, 1);
        }
    });
    const craftedItem = { id: `${recipe.id}-${Date.now()}`, ...recipe };
    game.player.inventory.push(craftedItem);
    nostrClient.publishEvent(game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.CRAFTED_ITEM,
        tags: [["p", game.player.pubkey]],
        content: JSON.stringify(craftedItem)
    });
    showToast(`Crafted ${recipe.name}!`, "success");
    updateInventoryUI();
    if (craftedItem.id.startsWith("rep_token")) {
        game.player.reputation += 100;
        updateReputation();
    }
}

async function sendZap() {
    if (!game.selectedPlayer) {
        closeZap();
        return;
    }
    if (!game.webln) {
        document.getElementById('bitcoin-connect-modal').style.display = 'flex';
        return;
    }
    const amount = parseInt(document.getElementById('zap-amount').value);
    const message = document.getElementById('zap-message').value.trim();
    if (isNaN(amount) || amount <= 0) {
        showToast("Enter a valid sats amount!", "warning");
        return;
    }

    try {
        const zapRequest = {
            kind: 9734,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', game.selectedPlayer.pubkey],
                ['amount', (amount * 1000).toString()],
                ['relays', [CONFIG.GAME_RELAY]]
            ],
            content: message
        };
        const signedZapRequest = await nostrClient.signEvent(zapRequest);

        const recipientProfile = game.players.get(game.selectedPlayer.pubkey).profile;
        const lnurl = recipientProfile?.lud16 || recipientProfile?.lud06;
        if (!lnurl) {
            showToast("Recipient has no zap endpoint!", "error");
            return;
        }

        const response = await fetch(`https://getalby.com/api/lnurlp/${lnurl.split('@')[1]}/${lnurl.split('@')[0]}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        const { callback, minSendable, maxSendable } = await response.json();
        if (amount * 1000 < minSendable || amount * 1000 > maxSendable) {
            showToast(`Amount must be between ${minSendable/1000} and ${maxSendable/1000} sats!`, "warning");
            return;
        }

        const invoiceResponse = await fetch(`${callback}?amount=${amount * 1000}`);
        const { pr: invoice } = await invoiceResponse.json();

        const payment = await game.webln.sendPayment(invoice);
        if (payment.preimage) {
            await nostrClient.publishEvent(game.gameRelay, signedZapRequest);
            const zapReceipt = {
                kind: 9735,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['p', game.selectedPlayer.pubkey],
                    ['bolt11', invoice],
                    ['amount', (amount * 1000).toString()],
                    ['description', JSON.stringify(signedZapRequest)]
                ],
                content: ''
            };
            await nostrClient.publishEvent(game.gameRelay, zapReceipt);

            game.player.stats.zapsSent += 1;
            game.player.score += 50;
            updateReputation();
            updateStats();
            updatePlayerUI();

            if (game.currentQuest?.type === "zap_attack") {
                game.currentQuest.progress += 1;
                await nostrClient.publishEvent(game.gameRelay, {
                    kind: 420014,
                    tags: [["p", game.player.pubkey]],
                    content: JSON.stringify({ questId: game.currentQuest.title, progress: game.currentQuest.progress })
                });
                if (game.currentQuest.progress >= game.currentQuest.target) completeQuest();
            }

            showToast(`Zapped ${getPlayerName(game.selectedPlayer.pubkey)} ${amount} sats!`, "success");
            closeZap();
        }
    } catch (error) {
        debug.error(`Zap failed: ${error.message}`);
        showToast(`Failed to send zap: ${error.message}`, "error");
    }
}

function handleZapReceipt(event) {
    game.player.stats.zapsReceived += 1;
    updateStats();
}

async function initWebLN() {
    if (window.webln) {
        try {
            await window.webln.enable();
            game.webln = window.webln;
            debug.success("WebLN enabled successfully");
        } catch (error) {
            debug.error(`WebLN enable failed: ${error.message}`);
            showToast("Please connect a Lightning wallet!", "warning");
        }
    } else {
        showToast("WebLN not detected. Install a compatible wallet (e.g., Alby).", "error");
    }
}
