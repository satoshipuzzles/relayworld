function updateChatUI() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Sort messages by timestamp (most recent first)
    const sortedMessages = window.game.globalChat.sort((a, b) => b.created_at - a.created_at);

    // Display messages
    sortedMessages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const authorName = getPlayerName(message.pubkey);
        messageEl.innerHTML = `
            <span class="chat-author">${authorName}</span>
            <span class="chat-content">${message.content}</span>
        `;
        
        chatMessages.appendChild(messageEl);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updatePlayerUI() {
    if (!window.game.player) return;

    // Update player profile
    const playerNameEl = document.getElementById('player-name');
    const playerLevelEl = document.getElementById('player-level');
    const playerScoreEl = document.getElementById('player-score');
    const playerReputationEl = document.getElementById('player-reputation');
    const playerItemsEl = document.getElementById('player-items');

    if (playerNameEl) playerNameEl.textContent = window.game.player.profile?.name || window.game.player.pubkey.slice(0, 8);
    if (playerLevelEl) playerLevelEl.textContent = `Level: ${window.game.player.level}`;
    if (playerScoreEl) playerScoreEl.textContent = window.game.player.score;
    if (playerReputationEl) playerReputationEl.textContent = window.game.player.reputation;
    if (playerItemsEl) playerItemsEl.textContent = window.game.player.inventory.length;

    // Update avatar if available
    const playerAvatarEl = document.getElementById('player-avatar');
    if (playerAvatarEl && window.game.player.profile?.picture) {
        playerAvatarEl.src = window.game.player.profile.picture;
    }
}

function updateInventoryUI() {
    const inventoryContent = document.getElementById('inventory-content');
    const craftingRecipes = document.getElementById('crafting-recipes');

    if (!inventoryContent || !craftingRecipes) return;

    // Clear previous inventory
    inventoryContent.innerHTML = '';
    craftingRecipes.innerHTML = '';

    // Display inventory items
    window.game.player.inventory.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'inventory-item';
        itemEl.innerHTML = `
            <div class="inventory-item-icon">${item.emoji}</div>
            <div class="inventory-item-name rarity-${item.rarity.toLowerCase()}">${item.name}</div>
        `;
        inventoryContent.appendChild(itemEl);
    });

    // Display crafting recipes
    CONFIG.RECIPES.forEach(recipe => {
        const canCraft = canCraftRecipe(recipe);
        const recipeEl = document.createElement('div');
        recipeEl.className = `crafting-recipe ${canCraft ? 'craftable' : 'uncraftable'}`;
        recipeEl.innerHTML = `
            <div class="recipe-icon">${recipe.emoji}</div>
            <div class="recipe-name">${recipe.name}</div>
            <button onclick="craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>
                ${canCraft ? 'Craft' : 'Cannot Craft'}
            </button>
        `;
        craftingRecipes.appendChild(recipeEl);
    });
}

function canCraftRecipe(recipe) {
    return recipe.requires.every(req => {
        const matchingItems = window.game.player.inventory.filter(
            i => i.name === req.name && i.rarity === req.rarity
        );
        return matchingItems.length >= req.quantity;
    });
}

function craftItem(recipeId) {
    const recipe = CONFIG.RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    if (!canCraftRecipe(recipe)) {
        showToast("Missing required items!", "warning");
        return;
    }

    // Remove crafting ingredients
    recipe.requires.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
            const index = window.game.player.inventory.findIndex(
                item => item.name === req.name && item.rarity === req.rarity
            );
            if (index !== -1) {
                window.game.player.inventory.splice(index, 1);
            }
        }
    });

    // Add crafted item
    const craftedItem = { 
        id: `${recipeId}-${Date.now()}`, 
        ...recipe 
    };
    window.game.player.inventory.push(craftedItem);

    // Publish crafting event
    nostrClient.publishEvent(window.game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.CRAFTED_ITEM,
        tags: [["p", window.game.player.pubkey]],
        content: JSON.stringify(craftedItem)
    });

    showToast(`Crafted ${recipe.name}!`, "success");
    updateInventoryUI();
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toastContainer.removeChild(toast);
    }, 3000);
}
