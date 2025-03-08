/**
 * achievements-module.js
 * Achievement system for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';
import { NostrUtils } from '../utils/nostr-utils.js';

export const AchievementsModule = {
    // Module metadata
    name: "achievements",
    description: "Achievement system for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "player"],
    priority: 60, // Initialize after core modules
    critical: false, // Not a critical module
    
    // Module state
    initialized: false,
    
    // Achievement definitions
    achievements: [
        {
            id: "welcome_to_relay_world",
            name: "Welcome to Relay World",
            description: "Login to Relay World for the first time",
            icon: "🌎",
            category: "general",
            points: 10,
            secret: false
        },
        {
            id: "first_steps",
            name: "First Steps",
            description: "Move around the world",
            icon: "👣",
            category: "exploration",
            points: 10,
            secret: false,
            requirement: { type: "distance", amount: 100 }
        },
        {
            id: "collector",
            name: "Collector",
            description: "Collect your first item",
            icon: "🧩",
            category: "items",
            points: 10,
            secret: false,
            requirement: { type: "items", amount: 1 }
        },
        {
            id: "treasure_hunter",
            name: "Treasure Hunter",
            description: "Find and open a treasure chest",
            icon: "🎁",
            category: "exploration",
            points: 20,
            secret: false,
            requirement: { type: "treasures", amount: 1 }
        },
        {
            id: "social_butterfly",
            name: "Social Butterfly",
            description: "Interact with 5 different players",
            icon: "🦋",
            category: "social",
            points: 20,
            secret: false,
            requirement: { type: "interactions", amount: 5 }
        },
        {
            id: "chatty",
            name: "Chatty",
            description: "Send 10 chat messages",
            icon: "💬",
            category: "social",
            points: 15,
            secret: false,
            requirement: { type: "chat", amount: 10 }
        },
        {
            id: "quest_complete",
            name: "Quest Complete",
            description: "Complete your first quest",
            icon: "📜",
            category: "quests",
            points: 25,
            secret: false,
            requirement: { type: "quests", amount: 1 }
        },
        {
            id: "level_up",
            name: "Level Up",
            description: "Reach level 5",
            icon: "⬆️",
            category: "progression",
            points: 30,
            secret: false,
            requirement: { type: "level", amount: 5 }
        },
        {
            id: "zapper",
            name: "Zapper",
            description: "Send your first zap",
            icon: "⚡",
            category: "lightning",
            points: 20,
            secret: false,
            requirement: { type: "zaps_sent", amount: 1 }
        },
        {
            id: "zapped",
            name: "Zapped",
            description: "Receive your first zap",
            icon: "🔌",
            category: "lightning",
            points: 15,
            secret: false,
            requirement: { type: "zaps_received", amount: 1 }
        },
        {
            id: "merchant",
            name: "Merchant",
            description: "Sell an item on the marketplace",
            icon: "🏪",
            category: "marketplace",
            points: 25,
            secret: false,
            requirement: { type: "items_sold", amount: 1 }
        },
        {
            id: "shopper",
            name: "Shopper",
            description: "Buy an item from the marketplace",
            icon: "🛒",
            category: "marketplace",
            points: 25,
            secret: false,
            requirement: { type: "items_bought", amount: 1 }
        },
        {
            id: "voice_activated",
            name: "Voice Activated",
            description: "Use voice chat for the first time",
            icon: "🎙️",
            category: "social",
            points: 15,
            secret: false,
            requirement: { type: "voice_chat", amount: 1 }
        },
        {
            id: "follower",
            name: "Follower",
            description: "Follow 5 players",
            icon: "👥",
            category: "social",
            points: 20,
            secret: false,
            requirement: { type: "follows", amount: 5 }
        },
        {
            id: "popular",
            name: "Popular",
            description: "Have 5 players follow you",
            icon: "🌟",
            category: "social",
            points: 30,
            secret: false,
            requirement: { type: "followers", amount: 5 }
        },
        {
            id: "explorer",
            name: "Explorer",
            description: "Travel 10000 units around the world",
            icon: "🧭",
            category: "exploration",
            points: 40,
            secret: false,
            requirement: { type: "distance", amount: 10000 }
        },
        {
            {
            id: "millionaire",
            name: "Millionaire",
            description: "Reach a score of 1,000,000",
            icon: "💰",
            category: "progression",
            points: 100,
            secret: false,
            requirement: { type: "score", amount: 1000000 }
        },
        {
            id: "hoarder",
            name: "Hoarder",
            description: "Collect 100 items",
            icon: "📦",
            category: "items",
            points: 50,
            secret: false,
            requirement: { type: "items", amount: 100 }
        },
        {
            id: "master_of_quests",
            name: "Master of Quests",
            description: "Complete 20 quests",
            icon: "📚",
            category: "quests",
            points: 75,
            secret: false,
            requirement: { type: "quests", amount: 20 }
        },
        // Secret achievements
        {
            id: "easter_egg",
            name: "Easter Egg",
            description: "Find a hidden Easter egg",
            icon: "🥚",
            category: "secrets",
            points: 50,
            secret: true
        },
        {
            id: "night_owl",
            name: "Night Owl",
            description: "Play Relay World at 3 AM",
            icon: "🦉",
            category: "secrets",
            points: 30,
            secret: true
        },
        {
            id: "speedster",
            name: "Speedster",
            description: "Reach level 10 in less than 1 hour of playtime",
            icon: "⚡",
            category: "secrets",
            points: 100,
            secret: true
        }
    ],
    
    // Unlocked achievements for the current player
    unlockedAchievements: new Map(), // Map of achievement ID -> unlock timestamp
    
    // Achievement progress for the current player
    achievementProgress: new Map(), // Map of achievement ID -> progress object
    
    // Initialize achievements module
    init: async function() {
        console.log("[Achievements] Initializing achievements module...");
        
        // Only initialize if achievements are enabled
        if (!RelayWorldCore.getConfig('ENABLE_ACHIEVEMENTS', true)) {
            console.log("[Achievements] Achievements disabled in configuration");
            return true;
        }
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Load unlocked achievements
        await this._loadAchievements();
        
        this.initialized = true;
        console.log("[Achievements] Achievements module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for auth events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        
        // Listen for player events
        RelayWorldCore.eventBus.on('player:levelUp', this.checkLevelAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:scoreUpdate', this.checkScoreAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:itemCollected', this.checkItemAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:distanceUpdate', this.checkDistanceAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:interactionUpdate', this.checkInteractionAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:chatUpdate', this.checkChatAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:questCompleted', this.checkQuestAchievements.bind(this));
        
        // Listen for zap events
        RelayWorldCore.eventBus.on('zaps:sent', this.checkZapsSentAchievements.bind(this));
        RelayWorldCore.eventBus.on('zaps:received', this.checkZapsReceivedAchievements.bind(this));
        
        // Listen for marketplace events
        RelayWorldCore.eventBus.on('marketplace:itemSold', this.checkItemsSoldAchievements.bind(this));
        RelayWorldCore.eventBus.on('marketplace:itemPurchased', this.checkItemsPurchasedAchievements.bind(this));
        
        // Listen for social events
        RelayWorldCore.eventBus.on('player:followUpdate', this.checkFollowAchievements.bind(this));
        RelayWorldCore.eventBus.on('player:followersUpdate', this.checkFollowersAchievements.bind(this));
        
        // Listen for voice chat events
        RelayWorldCore.eventBus.on('audio:voiceChatStarted', this.checkVoiceChatAchievements.bind(this));
        
        // Listen for treasure events
        RelayWorldCore.eventBus.on('player:treasureOpened', this.checkTreasureAchievements.bind(this));
        
        // Listen for achievement events
        RelayWorldCore.eventBus.on('nostr:gameEvent', this.handleGameEvent.bind(this));
        
        // Check for time-based achievements periodically
        setInterval(this.checkTimeBasedAchievements.bind(this), 60000); // Check every minute
    },
    
    // Handle login event
    handleLogin: async function(data) {
        console.log("[Achievements] User logged in, loading achievements");
        
        // Load achievements from storage
        await this._loadAchievements();
        
        // Check for first login achievement
        this.unlockAchievement("welcome_to_relay_world");
        
        // Emit achievements loaded event
        RelayWorldCore.eventBus.emit('achievements:loaded', { 
            unlockedCount: this.unlockedAchievements.size,
            totalCount: this.achievements.length
        });
    },
    
    // Handle game events
    handleGameEvent: function(data) {
        const { event } = data;
        
        // Check if it's an achievement event
        if (event.kind === 420012) { // Achievement event kind
            this.processAchievementEvent(event);
        }
    },
    
    // Process achievement event
    processAchievementEvent: function(event) {
        try {
            // Get action from tags
            const actionTag = event.tags.find(tag => tag[0] === 'action');
            if (!actionTag || !actionTag[1]) return;
            
            const action = actionTag[1];
            
            // Get achievement ID from tags
            const achievementTag = event.tags.find(tag => tag[0] === 'achievement');
            if (!achievementTag || !achievementTag[1]) return;
            
            const achievementId = achievementTag[1];
            
            // Process based on action
            switch (action) {
                case 'unlock':
                    this.processAchievementUnlock(event, achievementId);
                    break;
                case 'progress':
                    this.processAchievementProgress(event, achievementId);
                    break;
                default:
                    console.warn(`[Achievements] Unknown achievement action: ${action}`);
            }
        } catch (error) {
            console.error("[Achievements] Failed to process achievement event:", error);
        }
    },
    
    // Process achievement unlock event
    processAchievementUnlock: function(event, achievementId) {
        try {
            // Find the achievement
            const achievement = this.getAchievementById(achievementId);
            if (!achievement) {
                console.warn(`[Achievements] Unknown achievement ID: ${achievementId}`);
                return;
            }
            
            // Check if this is for the current user
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) return;
            
            const currentUserPubkey = nostrModule.currentUser.pubkey;
            
            // Only process if it's for the current user
            if (event.pubkey !== currentUserPubkey) return;
            
            // Add to unlocked achievements if not already unlocked
            if (!this.unlockedAchievements.has(achievementId)) {
                console.log(`[Achievements] Achievement unlocked: ${achievement.name}`);
                this.unlockedAchievements.set(achievementId, event.created_at);
                
                // Show notification
                RelayWorldCore.eventBus.emit('ui:showAchievementNotification', {
                    achievement: achievement,
                    timestamp: event.created_at
                });
                
                // Emit achievement unlocked event
                RelayWorldCore.eventBus.emit('achievements:unlocked', {
                    achievement: achievement,
                    timestamp: event.created_at
                });
            }
        } catch (error) {
            console.error("[Achievements] Failed to process achievement unlock:", error);
        }
    },
    
    // Process achievement progress event
    processAchievementProgress: function(event, achievementId) {
        try {
            // Find the achievement
            const achievement = this.getAchievementById(achievementId);
            if (!achievement) {
                console.warn(`[Achievements] Unknown achievement ID: ${achievementId}`);
                return;
            }
            
            // Check if this is for the current user
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) return;
            
            const currentUserPubkey = nostrModule.currentUser.pubkey;
            
            // Only process if it's for the current user
            if (event.pubkey !== currentUserPubkey) return;
            
            // Parse progress from content
            const progress = JSON.parse(event.content);
            
            // Update progress
            this.achievementProgress.set(achievementId, {
                current: progress.current,
                target: progress.target,
                percentage: progress.percentage,
                updated_at: event.created_at
            });
            
            // Emit achievement progress event
            RelayWorldCore.eventBus.emit('achievements:progress', {
                achievement: achievement,
                progress: progress,
                timestamp: event.created_at
            });
        } catch (error) {
            console.error("[Achievements] Failed to process achievement progress:", error);
        }
    },
    
    // Load achievements from storage and game relay
    _loadAchievements: async function() {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                console.error("[Achievements] Nostr module not available or user not logged in");
                return false;
            }
            
            const currentUserPubkey = nostrModule.currentUser.pubkey;
            
            console.log("[Achievements] Loading achievements for", currentUserPubkey.slice(0, 8));
            
            // Clear existing data
            this.unlockedAchievements.clear();
            this.achievementProgress.clear();
            
            // First try to load from localStorage for quick startup
            this._loadFromLocalStorage();
            
            // Then load from game relay to get latest data
            await this._loadFromGameRelay(currentUserPubkey);
            
            // Save to localStorage for next time
            this._saveToLocalStorage();
            
            console.log(`[Achievements] Loaded ${this.unlockedAchievements.size} unlocked achievements`);
            return true;
        } catch (error) {
            console.error("[Achievements] Failed to load achievements:", error);
            return false;
        }
    },
    
    // Load achievements from localStorage
    _loadFromLocalStorage: function() {
        try {
            const storedAchievements = localStorage.getItem('relayworld_achievements');
            if (storedAchievements) {
                const data = JSON.parse(storedAchievements);
                
                // Restore unlocked achievements
                if (data.unlocked) {
                    for (const [id, timestamp] of Object.entries(data.unlocked)) {
                        this.unlockedAchievements.set(id, timestamp);
                    }
                }
                
                // Restore achievement progress
                if (data.progress) {
                    for (const [id, progress] of Object.entries(data.progress)) {
                        this.achievementProgress.set(id, progress);
                    }
                }
                
                console.log("[Achievements] Loaded achievements from localStorage");
            }
        } catch (error) {
            console.warn("[Achievements] Failed to load achievements from localStorage:", error);
        }
    },
    
    // Save achievements to localStorage
    _saveToLocalStorage: function() {
        try {
            // Convert Maps to Objects for storage
            const data = {
                unlocked: Object.fromEntries(this.unlockedAchievements),
                progress: Object.fromEntries(this.achievementProgress)
            };
            
            localStorage.setItem('relayworld_achievements', JSON.stringify(data));
            console.log("[Achievements] Saved achievements to localStorage");
        } catch (error) {
            console.warn("[Achievements] Failed to save achievements to localStorage:", error);
        }
    },
    
    // Load achievements from game relay
    _loadFromGameRelay: async function(pubkey) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule) {
                console.error("[Achievements] Nostr module not available");
                return false;
            }
            
            // Get game relay
            const gameRelay = nostrModule.relayConnections.game;
            if (!gameRelay) {
                console.error("[Achievements] Game relay not connected");
                return false;
            }
            
            console.log("[Achievements] Loading achievements from game relay...");
            
            // Subscribe to achievement events for this user
            const filters = [{
                kinds: [420012], // Achievement events
                authors: [pubkey],
                since: Math.floor((Date.now() / 1000) - 86400 * 30), // Last 30 days
                limit: 100
            }];
            
            return new Promise((resolve) => {
                const sub = nostrModule.subscribe(gameRelay, filters, (event) => {
                    // Process each achievement event
                    this.processAchievementEvent(event);
                });
                
                // Set a timeout to resolve after fetching initial achievements
                setTimeout(() => {
                    resolve(true);
                    sub.unsub(); // Unsubscribe after loading
                }, 3000);
            });
        } catch (error) {
            console.error("[Achievements] Failed to load achievements from game relay:", error);
            return false;
        }
    },
    
    // Unlock an achievement
    unlockAchievement: async function(achievementId) {
        try {
            // Find the achievement
            const achievement = this.getAchievementById(achievementId);
            if (!achievement) {
                console.warn(`[Achievements] Unknown achievement ID: ${achievementId}`);
                return false;
            }
            
            // Check if already unlocked
            if (this.unlockedAchievements.has(achievementId)) {
                console.log(`[Achievements] Achievement already unlocked: ${achievement.name}`);
                return false;
            }
            
            console.log(`[Achievements] Unlocking achievement: ${achievement.name}`);
            
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                console.error("[Achievements] Nostr module not available or user not logged in");
                return false;
            }
            
            // Create unlock event
            const event = {
                kind: 420012, // Achievement event kind
                content: JSON.stringify({ 
                    unlocked: true,
                    name: achievement.name,
                    points: achievement.points
                }),
                tags: [
                    ["action", "unlock"],
                    ["achievement", achievementId],
                    ["category", achievement.category]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign the event
            const signedEvent = await NostrUtils.signEvent(event);
            
            // Publish to game relay
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Update local state
            this.unlockedAchievements.set(achievementId, event.created_at);
            
            // Save to localStorage
            this._saveToLocalStorage();
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showAchievementNotification', {
                achievement: achievement,
                timestamp: event.created_at
            });
            
            // Emit achievement unlocked event
            RelayWorldCore.eventBus.emit('achievements:unlocked', {
                achievement: achievement,
                timestamp: event.created_at
            });
            
            // Update player score
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule && typeof playerModule.addScore === 'function') {
                playerModule.addScore(achievement.points);
            }
            
            console.log(`[Achievements] Achievement unlocked: ${achievement.name} (+${achievement.points} points)`);
            return true;
        } catch (error) {
            console.error("[Achievements] Failed to unlock achievement:", error);
            return false;
        }
    },
    
    // Update achievement progress
    updateAchievementProgress: async function(achievementId, current, target) {
        try {
            // Find the achievement
            const achievement = this.getAchievementById(achievementId);
            if (!achievement) {
                console.warn(`[Achievements] Unknown achievement ID: ${achievementId}`);
                return false;
            }
            
            // Check if already unlocked
            if (this.unlockedAchievements.has(achievementId)) {
                return false; // No need to update progress for unlocked achievements
            }
            
            // Calculate percentage
            const percentage = Math.min(100, Math.floor((current / target) * 100));
            
            // Check if progress has changed
            const existingProgress = this.achievementProgress.get(achievementId);
            if (existingProgress && existingProgress.current === current) {
                return false; // No change in progress
            }
            
            console.log(`[Achievements] Updating progress for ${achievement.name}: ${current}/${target} (${percentage}%)`);
            
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                console.error("[Achievements] Nostr module not available or user not logged in");
                return false;
            }
            
            // Create progress event
            const event = {
                kind: 420012, // Achievement event kind
                content: JSON.stringify({ 
                    current: current,
                    target: target,
                    percentage: percentage
                }),
                tags: [
                    ["action", "progress"],
                    ["achievement", achievementId],
                    ["category", achievement.category]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign the event
            const signedEvent = await NostrUtils.signEvent(event);
            
            // Publish to game relay
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            // Update local state
            this.achievementProgress.set(achievementId, {
                current: current,
                target: target,
                percentage: percentage,
                updated_at: event.created_at
            });
            
            // Save to localStorage
            this._saveToLocalStorage();
            
            // Emit achievement progress event
            RelayWorldCore.eventBus.emit('achievements:progress', {
                achievement: achievement,
                progress: {
                    current: current,
                    target: target,
                    percentage: percentage
                },
                timestamp: event.created_at
            });
            
            // Check if achievement should be unlocked
            if (current >= target) {
                await this.unlockAchievement(achievementId);
            }
            
            return true;
        } catch (error) {
            console.error("[Achievements] Failed to update achievement progress:", error);
            return false;
        }
    },
    
    // Check level achievements
    checkLevelAchievements: function(data) {
        const level = data.level;
        
        // Find level achievements
        const levelAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'level'
        );
        
        // Check each achievement
        for (const achievement of levelAchievements) {
            const requirement = achievement.requirement;
            
            if (level >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (level > 0) {
                this.updateAchievementProgress(achievement.id, level, requirement.amount);
            }
        }
    },
    
    // Check score achievements
    checkScoreAchievements: function(data) {
        const score = data.score;
        
        // Find score achievements
        const scoreAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'score'
        );
        
        // Check each achievement
        for (const achievement of scoreAchievements) {
            const requirement = achievement.requirement;
            
            if (score >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (score > 0) {
                this.updateAchievementProgress(achievement.id, score, requirement.amount);
            }
        }
    },
    
    // Check item collection achievements
    checkItemAchievements: function(data) {
        const itemsCollected = data.itemsCollected;
        
        // Find item collection achievements
        const itemAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'items'
        );
        
        // Check each achievement
        for (const achievement of itemAchievements) {
            const requirement = achievement.requirement;
            
            if (itemsCollected >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (itemsCollected > 0) {
                this.updateAchievementProgress(achievement.id, itemsCollected, requirement.amount);
            }
        }
    },
    
    // Check distance traveled achievements
    checkDistanceAchievements: function(data) {
        const distance = data.distance;
        
        // Find distance achievements
        const distanceAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'distance'
        );
        
        // Check each achievement
        for (const achievement of distanceAchievements) {
            const requirement = achievement.requirement;
            
            if (distance >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (distance > 0) {
                this.updateAchievementProgress(achievement.id, distance, requirement.amount);
            }
        }
    },
    
    // Check interaction achievements
    checkInteractionAchievements: function(data) {
        const interactions = data.interactions;
        
        // Find interaction achievements
        const interactionAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'interactions'
        );
        
        // Check each achievement
        for (const achievement of interactionAchievements) {
            const requirement = achievement.requirement;
            
            if (interactions >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (interactions > 0) {
                this.updateAchievementProgress(achievement.id, interactions, requirement.amount);
            }
        }
    },
    
    // Check chat achievements
    checkChatAchievements: function(data) {
        const chatMessages = data.chatMessages;
        
        // Find chat achievements
        const chatAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'chat'
        );
        
        // Check each achievement
        for (const achievement of chatAchievements) {
            const requirement = achievement.requirement;
            
            if (chatMessages >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (chatMessages > 0) {
                this.updateAchievementProgress(achievement.id, chatMessages, requirement.amount);
            }
        }
    },
    
    // Check quest achievements
    checkQuestAchievements: function(data) {
        const questsCompleted = data.questsCompleted;
        
        // Find quest achievements
        const questAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'quests'
        );
        
        // Check each achievement
        for (const achievement of questAchievements) {
            const requirement = achievement.requirement;
            
            if (questsCompleted >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (questsCompleted > 0) {
                this.updateAchievementProgress(achievement.id, questsCompleted, requirement.amount);
            }
        }
    },
    
    // Check zaps sent achievements
    checkZapsSentAchievements: function(data) {
        const zapsSent = data.zapsSent;
        
        // Find zaps sent achievements
        const zapsSentAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'zaps_sent'
        );
        
        // Check each achievement
        for (const achievement of zapsSentAchievements) {
            const requirement = achievement.requirement;
            
            if (zapsSent >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (zapsSent > 0) {
                this.updateAchievementProgress(achievement.id, zapsSent, requirement.amount);
            }
        }
    },
    
    // Check zaps received achievements
    checkZapsReceivedAchievements: function(data) {
        const zapsReceived = data.zapsReceived;
        
        // Find zaps received achievements
        const zapsReceivedAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'zaps_received'
        );
        
        // Check each achievement
        for (const achievement of zapsReceivedAchievements) {
            const requirement = achievement.requirement;
            
            if (zapsReceived >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (zapsReceived > 0) {
                this.updateAchievementProgress(achievement.id, zapsReceived, requirement.amount);
            }
        }
    },
    
    // Check items sold achievements
    checkItemsSoldAchievements: function(data) {
        const itemsSold = data.itemsSold;
        
        // Find items sold achievements
        const itemsSoldAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'items_sold'
        );
        
        // Check each achievement
        for (const achievement of itemsSoldAchievements) {
            const requirement = achievement.requirement;
            
            if (itemsSold >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (itemsSold > 0) {
                this.updateAchievementProgress(achievement.id, itemsSold, requirement.amount);
            }
        }
    },
    
    // Check items purchased achievements
    checkItemsPurchasedAchievements: function(data) {
        const itemsPurchased = data.itemsPurchased;
        
        // Find items purchased achievements
        const itemsPurchasedAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'items_bought'
        );
        
        // Check each achievement
        for (const achievement of itemsPurchasedAchievements) {
            const requirement = achievement.requirement;
            
            if (itemsPurchased >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (itemsPurchased > 0) {
                this.updateAchievementProgress(achievement.id, itemsPurchased, requirement.amount);
            }
        }
    },
    
    // Check follow achievements
    checkFollowAchievements: function(data) {
        const follows = data.follows;
        
        // Find follow achievements
        const followAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'follows'
        );
        
        // Check each achievement
        for (const achievement of followAchievements) {
            const requirement = achievement.requirement;
            
            if (follows >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (follows > 0) {
                this.updateAchievementProgress(achievement.id, follows, requirement.amount);
            }
        }
    },
    
    // Check followers achievements
    checkFollowersAchievements: function(data) {
        const followers = data.followers;
        
        // Find followers achievements
        const followersAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'followers'
        );
        
        // Check each achievement
        for (const achievement of followersAchievements) {
            const requirement = achievement.requirement;
            
            if (followers >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (followers > 0) {
                this.updateAchievementProgress(achievement.id, followers, requirement.amount);
            }
        }
    },
    
    // Check voice chat achievements
    checkVoiceChatAchievements: function(data) {
        // Find voice chat achievements
        const voiceChatAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'voice_chat'
        );
        
        // Unlock voice chat achievement
        for (const achievement of voiceChatAchievements) {
            this.unlockAchievement(achievement.id);
        }
    },
    
    // Check treasure achievements
    checkTreasureAchievements: function(data) {
        const treasuresOpened = data.treasuresOpened;
        
        // Find treasure achievements
        const treasureAchievements = this.achievements.filter(
            a => a.requirement && a.requirement.type === 'treasures'
        );
        
        // Check each achievement
        for (const achievement of treasureAchievements) {
            const requirement = achievement.requirement;
            
            if (treasuresOpened >= requirement.amount) {
                this.unlockAchievement(achievement.id);
            } else if (treasuresOpened > 0) {
                this.updateAchievementProgress(achievement.id, treasuresOpened, requirement.amount);
            }
        }
    },
    
    // Check time-based achievements
    checkTimeBasedAchievements: function() {
        const now = new Date();
        const hour = now.getHours();
        
        // Check night owl achievement
        if (hour === 3) {
            this.unlockAchievement("night_owl");
        }
        
        // Check speedster achievement
        if (this.gameStartTime) {
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule && playerModule.level >= 10) {
                const playTimeMs = Date.now() - this.gameStartTime;
                const playTimeHours = playTimeMs / (1000 * 60 * 60);
                
                if (playTimeHours < 1) {
                    this.unlockAchievement("speedster");
                }
            }
        }
    },
    
    // Get achievement by ID
    getAchievementById: function(id) {
        return this.achievements.find(a => a.id === id);
    },
    
    // Get all achievements
    getAllAchievements: function() {
        return this.achievements;
    },
    
    // Get unlocked achievements
    getUnlockedAchievements: function() {
        return this.achievements.filter(a => this.unlockedAchievements.has(a.id));
    },
    
    // Get locked achievements (excluding secret ones unless showSecret is true)
    getLockedAchievements: function(showSecret = false) {
        return this.achievements.filter(a => {
            const isLocked = !this.unlockedAchievements.has(a.id);
            return isLocked && (showSecret || !a.secret);
        });
    },
    
    // Get achievements by category
    getAchievementsByCategory: function(category) {
        return this.achievements.filter(a => a.category === category);
    },
    
    // Check if an achievement is unlocked
    isAchievementUnlocked: function(id) {
        return this.unlockedAchievements.has(id);
    },
    
    // Get achievement progress
    getAchievementProgress: function(id) {
        return this.achievementProgress.get(id) || { current: 0, target: 0, percentage: 0 };
    },
    
    // Get total achievement points
    getTotalAchievementPoints: function() {
        let total = 0;
        
        for (const achievement of this.achievements) {
            if (this.unlockedAchievements.has(achievement.id)) {
                total += achievement.points;
            }
        }
        
        return total;
    },
    
    // Get achievement categories
    getAchievementCategories: function() {
        const categories = new Set();
        
        for (const achievement of this.achievements) {
            categories.add(achievement.category);
        }
        
        return Array.from(categories);
    },
    
    // Track when the game session started (for time-based achievements)
    setGameStartTime: function() {
        this.gameStartTime = Date.now();
    },
    
    // Clear achievement data (for testing)
    clearAchievements: function() {
        this.unlockedAchievements.clear();
        this.achievementProgress.clear();
        this._saveToLocalStorage();
    },
    
    // Award a special achievement (e.g., for easter eggs)
    awardSpecialAchievement: function(id) {
        // Simply unlock the achievement
        this.unlockAchievement(id);
    }
};