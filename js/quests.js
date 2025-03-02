function generateQuest() {
    if (game.currentQuest || Date.now() - (game.lastQuestTime || 0) < CONFIG.QUEST_INTERVAL) return;

    const questTypes = [
        {
            title: "Item Hunt",
            description: "Find 5 items scattered around the world. 100 points.",
            type: "item_hunt",
            target: 5,
            reward: 100,
            expires: Date.now() + 10 * 60 * 1000,
            progress: 0
        },
        {
            title: "Social Swarm",
            description: "Follow 5 players in 15 minutes. 200 points.",
            type: "social_swarm",
            target: { follow: 5, followed: 3 },
            reward: 200,
            expires: Date.now() + 15 * 60 * 1000,
            progress: { follow: 0, followed: 0 }
        },
        {
            title: "Treasure Hunt",
            description: "Find the legendary treasure! 300 points.",
            type: "treasure_hunt",
            target: 1,
            reward: 300,
            expires: Date.now() + 20 * 60 * 1000,
            progress: 0,
            treasureId: `legendary-${Date.now()}`
        },
        {
            title: "Zap Attack",
            description: "Send 5 zaps to other players in 10 minutes! 250 points.",
            type: "zap_attack",
            target: 5,
            reward: 250,
            expires: Date.now() + 10 * 60 * 1000,
            progress: 0
        },
        {
            title: "Relay Tag Team",
            description: "Your guild must tag 3 NPCs in 15 minutes! 600 points.",
            type: "relay_tag_team",
            target: 3,
            reward: 600,
            expires: Date.now() + 15 * 60 * 1000,
            progress: 0,
            guildId: game.player.guildId,
            targets: []
        },
        {
            title: "Nostr Scavenger Hunt",
            description: "Find 3 clues in Nostr notes within 20 minutes! 400 points.",
            type: "scavenger_hunt",
            target: 3,
            reward: 400,
            expires: Date.now() + 20 * 60 * 1000,
            progress: 0,
            clues: [
                { text: "Find a note mentioning 'Nostr'", key: "Nostr" },
                { text: "Find a note with an emoji", key: /[\u{1F300}-\u{1F6FF}]/u },
                { text: "Find a note longer than 100 chars", key: 100 }
            ],
            found: new Set()
        }
    ];

    const quest = questTypes[Math.floor(Math.random() * questTypes.length)];
    if (quest.type === "relay_tag_team" && !game.player.guildId) return;

    game.currentQuest = quest;
    game.lastQuestTime = Date.now();

    if (quest.type === "treasure_hunt") {
        const treasure = {
            id: quest.treasureId,
            x: Math.random() * CONFIG.WORLD_SIZE,
            y: Math.random() * CONFIG.WORLD_SIZE,
            emoji: "💎",
            name: "Legendary Gem",
            rarity: "LEGENDARY",
            value: 300
        };
        game.items.set(treasure.id, treasure);
    } else if (quest.type === "relay_tag_team") {
        quest.targets = Array.from(game.players.entries())
            .filter(([_, p]) => !p.isActive)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(([pubkey, player]) => ({ pubkey, x: player.x, y: player.y, tagged: false }));
    }

    const event = {
        kind: CONFIG.EVENT_KINDS.GAME_QUEST,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["gm", CONFIG.GAME_MASTER_PUBKEY]],
        content: JSON.stringify(quest)
    };
    if (quest.guildId) event.tags.push(["guild", quest.guildId]);
    nostrClient.publishEvent(game.gameRelay, event);
    showQuestNotification();
}

function handleQuestEvent(event) {
    const data = JSON.parse(event.content);
    const guildId = event.tags.find(t => t[0] === "guild")?.[1];
    if (guildId && guildId !== game.player.guildId) return;
    game.currentQuest = data;
    showQuestNotification();
}

function scheduleNextQuest() {
    generateQuest();
}

function acceptQuest() {
    if (!game.currentQuest) return;
    showToast(`Quest accepted: ${game.currentQuest.title}`, "success");
    document.getElementById('quest-notification').style.display = 'none';
}

function completeQuest() {
    if (!game.currentQuest) return;
    game.player.score += game.currentQuest.reward;
    if (game.currentQuest.guildId) {
        const guild = game.guilds.get(game.currentQuest.guildId);
        guild.score += game.currentQuest.reward;
    }
    game.player.stats.questsCompleted += 1;
    game.audio.quest.play(); // Audio feedback
    updatePlayerUI();
    updateStats();
    showToast(`Quest completed! +${game.currentQuest.reward} points`, "success");
    game.currentQuest = null;
    nostrClient.publishEvent(game.gameRelay, nostrClient.createScoreEvent(game.player.score, game.player.level));
}

function declineQuest() {
    if (!game.currentQuest) return;
    game.currentQuest = null;
    document.getElementById('quest-notification').style.display = 'none';
}

function checkRelayTagTeam() {
    if (game.currentQuest?.type !== "relay_tag_team" || game.currentQuest.guildId !== game.player.guildId) return;
    const quest = game.currentQuest;
    for (const target of quest.targets) {
        if (!target.tagged) {
            const distance = Math.sqrt(
                Math.pow(target.x - game.player.x, 2) + Math.pow(target.y - game.player.y, 2)
            );
            if (distance < 30) {
                target.tagged = true;
                quest.progress += 1;
                nostrClient.publishEvent(game.gameRelay, {
                    kind: CONFIG.EVENT_KINDS.TAG_TEAM,
                    tags: [["p", game.player.pubkey], ["guild", quest.guildId], ["target", target.pubkey]],
                    content: JSON.stringify({ questId: quest.title, progress: quest.progress })
                });
                showToast(`Tagged NPC ${target.pubkey.slice(0, 8)}! ${quest.progress}/${quest.target}`, "success");
                if (quest.progress >= quest.target) completeQuest();
                break;
            }
        }
    }
}

function drawTagTargets() {
    if (game.currentQuest?.type !== "relay_tag_team") return;
    const ctx = game.ctx;
    game.currentQuest.targets.forEach(target => {
        if (!target.tagged) {
            const screenX = target.x - game.camera.x;
            const screenY = target.y - game.camera.y;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(target.pubkey.slice(0, 8), screenX - 20, screenY - 25);
        }
    });
}

function checkScavengerHunt() {
    if (game.currentQuest?.type !== "scavenger_hunt" || game.scavengerHuntActive) return;
    game.scavengerHuntActive = true;

    const relay = game.surfingRelays.get(game.activeRelay);
    const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    nostrClient.subscribeToEvents(
        relay,
        [{ kinds: [1], since }],
        (event) => {
            const quest = game.currentQuest;
            quest.clues.forEach((clue, index) => {
                if (!quest.found.has(index)) {
                    let match = false;
                    if (typeof clue.key === "string") match = event.content.includes(clue.key);
                    else if (clue.key instanceof RegExp) match = clue.key.test(event.content);
                    else if (typeof clue.key === "number") match = event.content.length > clue.key;

                    if (match) {
                        quest.found.add(index);
                        quest.progress += 1;
                        nostrClient.publishEvent(game.gameRelay, {
                            kind: CONFIG.EVENT_KINDS.SCAVENGER_HUNT_PROGRESS,
                            tags: [["p", game.player.pubkey]],
                            content: JSON.stringify({ questId: quest.title, clueIndex: index, progress: quest.progress })
                        });
                        showToast(`Found clue: ${clue.text}! ${quest.progress}/${quest.target}`, "success");
                        if (quest.progress >= quest.target) completeQuest();
                    }
                }
            });
        }
    );
}

function publishSocialQuestUpdate() {
    if (game.currentQuest?.type === "social_swarm") {
        nostrClient.publishEvent(game.gameRelay, {
            kind: 420014,
            tags: [["p", game.player.pubkey]],
            content: JSON.stringify({ questId: game.currentQuest.title, progress: game.currentQuest.progress })
        });
        if (game.currentQuest.progress.follow >= game.currentQuest.target.follow) completeQuest();
    }
}
