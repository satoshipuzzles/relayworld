function syncGuilds() {
    // Only attempt to subscribe if game relay exists
    if (!window.game.gameRelay) {
        console.error('Game relay not initialized for guild sync');
        return;
    }

    try {
        nostrClient.subscribeToEvents(
            window.game.gameRelay,
            [{ kinds: [CONFIG.EVENT_KINDS.GUILD_CREATION, CONFIG.EVENT_KINDS.GUILD_JOIN, CONFIG.EVENT_KINDS.GUILD_RANK_UPDATE] }],
            (event) => {
                if (event.kind === CONFIG.EVENT_KINDS.GUILD_CREATION) {
                    const guild = JSON.parse(event.content);
                    window.game.guilds.set(event.tags.find(t => t[0] === "guild")[1], guild);
                } else if (event.kind === CONFIG.EVENT_KINDS.GUILD_JOIN) {
                    const data = JSON.parse(event.content);
                    const guildId = event.tags.find(t => t[0] === "guild")[1];
                    const guild = window.game.guilds.get(guildId);
                    if (guild) {
                        guild.members.add(data.pubkey);
                        guild.ranks.set(data.pubkey, "member");
                    }
                } else if (event.kind === CONFIG.EVENT_KINDS.GUILD_RANK_UPDATE) {
                    const guildId = event.tags.find(t => t[0] === "guild")[1];
                    const pubkey = event.tags.find(t => t[0] === "p")[1];
                    const data = JSON.parse(event.content);
                    const guild = window.game.guilds.get(guildId);
                    if (guild) guild.ranks.set(pubkey, data.rank);
                }
            },
            () => console.log('Guild sync subscription completed')
        );

        // Guild invite subscription
        nostrClient.subscribeToEvents(
            window.game.gameRelay,
            [{ kinds: [CONFIG.EVENT_KINDS.GUILD_INVITE], "#p": [window.game.player.pubkey] }],
            (event) => {
                const data = JSON.parse(event.content);
                if (confirm(`Join guild "${data.guildName}"?`)) {
                    const guildId = event.tags.find(t => t[0] === "guild")[1];
                    window.game.player.guildId = guildId;
                    const guild = window.game.guilds.get(guildId);
                    if (guild) {
                        guild.members.add(window.game.player.pubkey);
                        guild.ranks.set(window.game.player.pubkey, "member");
                        nostrClient.publishEvent(window.game.gameRelay, {
                            kind: CONFIG.EVENT_KINDS.GUILD_JOIN,
                            tags: [["guild", guildId]],
                            content: JSON.stringify({ pubkey: window.game.player.pubkey })
                        });
                        showToast(`Joined ${guild.name}!`, "success");
                    }
                }
            },
            () => console.log('Guild invite subscription completed')
        );
    } catch (error) {
        console.error('Guild sync failed:', error);
    }
}

function publishSocialQuestUpdate() {
    if (window.game && window.game.currentQuest?.type === "social_swarm") {
        nostrClient.publishEvent(window.game.gameRelay, {
            kind: 420014,
            tags: [["p", window.game.player.pubkey]],
            content: JSON.stringify({ 
                questId: window.game.currentQuest.title, 
                progress: window.game.currentQuest.progress 
            })
        });
        
        if (window.game.currentQuest.progress.follow >= window.game.currentQuest.target.follow) {
            completeQuest();
        }
    }
}

function followPlayer() {
    if (!window.game.selectedPlayer) return;
    
    const pubkey = window.game.selectedPlayer.pubkey;
    if (window.game.player.following.has(pubkey)) {
        window.game.player.following.delete(pubkey);
        showToast(`Unfollowed ${getPlayerName(pubkey)}`, "info");
        document.getElementById('popup-follow').textContent = 'Follow';
    } else {
        window.game.player.following.add(pubkey);
        showToast(`Followed ${getPlayerName(pubkey)}`, "success");
        document.getElementById('popup-follow').textContent = 'Unfollow';
        
        if (window.game.currentQuest?.type === "social_swarm") {
            window.game.currentQuest.progress.follow += 1;
            publishSocialQuestUpdate();
        }
    }
    
    updateReputation();
    
    const contactsEvent = {
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        tags: Array.from(window.game.player.following).map(pk => ['p', pk]),
        content: ''
    };
    
    nostrClient.publishEvent(window.game.gameRelay, contactsEvent);
}

function handleGlobalChat(event) {
    window.game.globalChat.push({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at
    });
    
    const tradeTag = event.tags.find(t => t[0] === "trade");
    if (tradeTag) {
        const chatEl = document.createElement('div');
        chatEl.className = 'chat-message clickable-trade';
        chatEl.dataset.tradeId = tradeTag[1];
        chatEl.textContent = event.content;
        chatEl.addEventListener('click', () => respondToTrade(tradeTag[1]));
        document.getElementById('chat-messages').appendChild(chatEl);
    }
    
    updateChatUI();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (message === '') return;
    
    input.value = '';
    const event = nostrClient.createChatEvent(message);
    nostrClient.publishEvent(window.game.gameRelay, event);
    
    if (window.game.currentQuest?.type === "trivia" && message.toLowerCase() === window.game.currentQuest.correctAnswer?.toLowerCase()) {
        window.game.currentQuest.progress = 1;
        nostrClient.publishEvent(window.game.gameRelay, {
            kind: 420014,
            tags: [["p", window.game.player.pubkey]],
            content: JSON.stringify({ questId: window.game.currentQuest.title, progress: 1 })
        });
        completeQuest();
    }
}

function proposeAlliance() {
    if (!window.game.selectedPlayer || !window.game.player.guildId || window.game.selectedPlayer.guildId === window.game.player.guildId) return;
    
    const guild = window.game.guilds.get(window.game.player.guildId);
    const targetGuild = window.game.guilds.get(window.game.selectedPlayer.guildId);
    
    if (guild.leader !== window.game.player.pubkey || targetGuild.leader !== window.game.selectedPlayer.pubkey) {
        showToast("Only leaders can propose alliances!", "warning");
        return;
    }
    
    const allianceId = `${window.game.player.guildId}-${window.game.selectedPlayer.guildId}-${Date.now()}`;
    
    nostrClient.publishEvent(window.game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.ALLIANCE_PROPOSAL,
        tags: [["guild", window.game.player.guildId], ["p", window.game.selectedPlayer.pubkey], ["alliance", allianceId]],
        content: JSON.stringify({ proposer: guild.name, target: targetGuild.name })
    });
    
    showToast(`Alliance proposed to ${targetGuild.name}!`, "success");
}
