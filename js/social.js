function handleGlobalChat(event) {
    game.globalChat.push({
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
    nostrClient.publishEvent(game.gameRelay, event);
    if (game.currentQuest?.type === "trivia" && message.toLowerCase() === game.currentQuest.correctAnswer?.toLowerCase()) {
        game.currentQuest.progress = 1;
        nostrClient.publishEvent(game.gameRelay, {
            kind: 420014,
            tags: [["p", game.player.pubkey]],
            content: JSON.stringify({ questId: game.currentQuest.title, progress: 1 })
        });
        completeQuest();
    }
}

function handleDirectMessage(event) {
    nostrClient.decryptMessage(event.pubkey, event.content).then(message => {
        if (!game.directChats.has(event.pubkey)) game.directChats.set(event.pubkey, []);
        game.directChats.get(event.pubkey).push({
            id: event.id,
            content: message,
            fromMe: false,
            created_at: event.created_at
        });
        if (game.selectedPlayer?.pubkey === event.pubkey) updateDirectChatUI();
    });
}

function sendDirectMessage() {
    if (!game.selectedPlayer) return;
    const input = document.getElementById('popup-chat-input');
    const message = input.value.trim();
    if (message === '') return;
    input.value = '';
    nostrClient.createDirectMessageEvent(game.selectedPlayer.pubkey, message).then(event => {
        nostrClient.publishEvent(game.gameRelay, event).then(signedEvent => {
            if (!game.directChats.has(game.selectedPlayer.pubkey)) game.directChats.set(game.selectedPlayer.pubkey, []);
            game.directChats.get(game.selectedPlayer.pubkey).push({
                id: signedEvent.id,
                content: message,
                fromMe: true,
                created_at: signedEvent.created_at
            });
            updateDirectChatUI();
        });
    });
}

function createGuild() {
    const name = prompt("Enter guild name:");
    if (!name) return;
    const guildId = `${game.player.pubkey}-${Date.now()}`;
    const guild = {
        name,
        leader: game.player.pubkey,
        members: new Set([game.player.pubkey]),
        score: 0,
        ranks: new Map([[game.player.pubkey, "leader"]])
    };
    game.guilds.set(guildId, guild);
    game.player.guildId = guildId;
    const event = {
        kind: CONFIG.EVENT_KINDS.GUILD_CREATION,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["guild", guildId]],
        content: JSON.stringify(guild)
    };
    nostrClient.publishEvent(game.gameRelay, event);
    showToast(`Guild "${name}" created!`, "success");
}

function inviteToGuild() {
    if (!game.selectedPlayer || !game.player.guildId) return;
    const guild = game.guilds.get(game.player.guildId);
    if (guild.leader !== game.player.pubkey) {
        showToast("Only the leader can invite!", "warning");
        return;
    }
    const event = {
        kind: CONFIG.EVENT_KINDS.GUILD_INVITE,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", game.selectedPlayer.pubkey], ["guild", game.player.guildId]],
        content: JSON.stringify({ guildName: guild.name })
    };
    nostrClient.publishEvent(game.gameRelay, event);
    showToast(`Invited ${getPlayerName(game.selectedPlayer.pubkey)} to ${guild.name}`, "success");
}

function syncGuilds() {
    nostrClient.subscribeToEvents(
        game.gameRelay,
        [{ kinds: [CONFIG.EVENT_KINDS.GUILD_CREATION, CONFIG.EVENT_KINDS.GUILD_JOIN, CONFIG.EVENT_KINDS.GUILD_RANK_UPDATE] }],
        (event) => {
            if (event.kind === CONFIG.EVENT_KINDS.GUILD_CREATION) {
                const guild = JSON.parse(event.content);
                game.guilds.set(event.tags.find(t => t[0] === "guild")[1], guild);
            } else if (event.kind === CONFIG.EVENT_KINDS.GUILD_JOIN) {
                const data = JSON.parse(event.content);
                const guildId = event.tags.find(t => t[0] === "guild")[1];
                const guild = game.guilds.get(guildId);
                if (guild) {
                    guild.members.add(data.pubkey);
                    guild.ranks.set(data.pubkey, "member");
                }
            } else if (event.kind === CONFIG.EVENT_KINDS.GUILD_RANK_UPDATE) {
                const guildId = event.tags.find(t => t[0] === "guild")[1];
                const pubkey = event.tags.find(t => t[0] === "p")[1];
                const data = JSON.parse(event.content);
                const guild = game.guilds.get(guildId);
                if (guild) guild.ranks.set(pubkey, data.rank);
            }
        }
    );

    nostrClient.subscribeToEvents(
        game.gameRelay,
        [{ kinds: [CONFIG.EVENT_KINDS.GUILD_INVITE], "#p": [game.player.pubkey] }],
        (event) => {
            const data = JSON.parse(event.content);
            if (confirm(`Join guild "${data.guildName}"?`)) {
                const guildId = event.tags.find(t => t[0] === "guild")[1];
                game.player.guildId = guildId;
                const guild = game.guilds.get(guildId);
                guild.members.add(game.player.pubkey);
                guild.ranks.set(game.player.pubkey, "member");
                nostrClient.publishEvent(game.gameRelay, {
                    kind: CONFIG.EVENT_KINDS.GUILD_JOIN,
                    tags: [["guild", guildId]],
                    content: JSON.stringify({ pubkey: game.player.pubkey })
                });
                showToast(`Joined ${guild.name}!`, "success");
            }
        }
    );
}

function promoteToOfficer() {
    if (!game.selectedPlayer || !game.player.guildId || game.selectedPlayer.pubkey === game.player.pubkey) return;
    const guild = game.guilds.get(game.player.guildId);
    if (guild.leader !== game.player.pubkey) {
        showToast("Only the leader can promote!", "warning");
        return;
    }
    guild.ranks.set(game.selectedPlayer.pubkey, "officer");
    nostrClient.publishEvent(game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.GUILD_RANK_UPDATE,
        tags: [["guild", game.player.guildId], ["p", game.selectedPlayer.pubkey]],
        content: JSON.stringify({ rank: "officer" })
    });
    showToast(`${getPlayerName(game.selectedPlayer.pubkey)} promoted to officer!`, "success");
}

function sendGuildChatMessage() {
    if (!game.player.guildId) return;
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (message === '') return;
    input.value = '';
    const event = {
        kind: CONFIG.EVENT_KINDS.GUILD_CHAT,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["guild", game.player.guildId]],
        content: message
    };
    nostrClient.publishEvent(game.gameRelay, event);
}

function followPlayer() {
    if (!game.selectedPlayer) return;
    const pubkey = game.selectedPlayer.pubkey;
    if (game.player.following.has(pubkey)) {
        game.player.following.delete(pubkey);
        showToast(`Unfollowed ${getPlayerName(pubkey)}`, "info");
        document.getElementById('popup-follow').textContent = 'Follow';
    } else {
        game.player.following.add(pubkey);
        showToast(`Followed ${getPlayerName(pubkey)}`, "success");
        document.getElementById('popup-follow').textContent = 'Unfollow';
        if (game.currentQuest?.type === "social_swarm") {
            game.currentQuest.progress.follow += 1;
            publishSocialQuestUpdate();
        }
    }
    updateReputation();
    const contactsEvent = {
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        tags: Array.from(game.player.following).map(pk => ['p', pk]),
        content: ''
    };
    nostrClient.publishEvent(game.gameRelay, contactsEvent);
}

function proposeAlliance() {
    if (!game.selectedPlayer || !game.player.guildId || game.selectedPlayer.guildId === game.player.guildId) return;
    const guild = game.guilds.get(game.player.guildId);
    const targetGuild = game.guilds.get(game.selectedPlayer.guildId);
    if (guild.leader !== game.player.pubkey || targetGuild.leader !== game.selectedPlayer.pubkey) {
        showToast("Only leaders can propose alliances!", "warning");
        return;
    }
    const allianceId = `${game.player.guildId}-${game.selectedPlayer.guildId}-${Date.now()}`;
    nostrClient.publishEvent(game.gameRelay, {
        kind: CONFIG.EVENT_KINDS.ALLIANCE_PROPOSAL,
        tags: [["guild", game.player.guildId], ["p", game.selectedPlayer.pubkey], ["alliance", allianceId]],
        content: JSON.stringify({ proposer: guild.name, target: targetGuild.name })
    });
    showToast(`Alliance proposed to ${targetGuild.name}!`, "success");
}

nostrClient.subscribeToEvents(
    game.gameRelay,
    [{ kinds: [CONFIG.EVENT_KINDS.ALLIANCE_PROPOSAL], "#p": [game.player.pubkey] }],
    (event) => {
        const data = JSON.parse(event.content);
        if (confirm(`Accept alliance with ${data.proposer}?`)) {
            const allianceId = event.tags.find(t => t[0] === "alliance")[1];
            const proposerGuildId = event.tags.find(t => t[0] === "guild")[1];
            game.guildAlliances.set(game.player.guildId, game.guildAlliances.get(game.player.guildId) || new Set()).add(proposerGuildId);
            game.guildAlliances.set(proposerGuildId, game.guildAlliances.get(proposerGuildId) || new Set()).add(game.player.guildId);
            nostrClient.publishEvent(game.gameRelay, {
                kind: CONFIG.EVENT_KINDS.ALLIANCE_ACCEPTED,
                tags: [["guild", game.player.guildId], ["p", event.pubkey], ["alliance", allianceId]],
                content: JSON.stringify({ guild1: game.player.guildId, guild2: proposerGuildId })
            });
            showToast(`Alliance formed with ${data.proposer}!`, "success");
            updateGuildLeaderboard();
        }
    }
);

nostrClient.subscribeToEvents(
    game.gameRelay,
    [{ kinds: [CONFIG.EVENT_KINDS.ALLIANCE_ACCEPTED] }],
    (event) => {
        const data = JSON.parse(event.content);
        if (data.guild1 === game.player.guildId || data.guild2 === game.player.guildId) {
            game.guildAlliances.set(data.guild1, game.guildAlliances.get(data.guild1) || new Set()).add(data.guild2);
            game.guildAlliances.set(data.guild2, game.guildAlliances.get(data.guild2) || new Set()).add(data.guild1);
            updateGuildLeaderboard();
        }
    }
);
