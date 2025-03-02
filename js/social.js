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
