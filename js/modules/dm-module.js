/**
 * dm-module.js
 * Direct messaging functionality using NIP-17
 */

import { RelayWorldCore } from '../core/relay-world-core.js';
import { NostrUtils } from '../utils/nostr-utils.js';
import { CryptoUtils } from '../utils/crypto-utils.js';

export const DMModule = {
    // Module metadata
    name: "dm",
    description: "Direct messaging using NIP-17",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "utils"], // Depends on nostr module
    priority: 20, // Initialize after nostr
    critical: false, // Not a critical module
    
    // Module state
    initialized: false,
    
    // Conversations
    conversations: new Map(), // Map of thread ID -> conversation object
    
    // DM inbox preferences
    dmInboxRelays: [], // Array of preferred DM inbox relays
    publishedInboxConfig: false, // Whether inbox config has been published
    
    // Initialize the direct messaging module
    init: async function() {
        console.log("[DM] Initializing direct messaging module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        this.initialized = true;
        console.log("[DM] Direct messaging module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for login events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        
        // Listen for gift wrap events (NIP-17)
        RelayWorldCore.eventBus.on('nostr:dmEvent', this.handleDMEvent.bind(this));
        
        // Listen for relay connection events
        RelayWorldCore.eventBus.on('nostr:relayConnected', this.handleRelayConnected.bind(this));
    },
    
    // Handle login event
    handleLogin: async function(data) {
        console.log("[DM] Handling login...");
        
        try {
            // Load DM inbox preferences
            await this.loadDMInboxPreferences(data.pubkey);
            
            // Subscribe to DM events
            await this.subscribeToGiftWraps(data.pubkey);
            
            console.log("[DM] Login handling complete");
            return true;
        } catch (error) {
            console.error("[DM] Failed to handle login:", error);
            return false;
        }
    },
    
    // Handle DM event
    handleDMEvent: function(data) {
        const { event, relay } = data;
        
        // Process gift wraps (NIP-17)
        if (event.kind === 1059) {
            this.processGiftWrap(event, relay);
        }
    },
    
    // Handle relay connected event
    handleRelayConnected: function(data) {
        const { relay, relayType } = data;
        
        // If this is a DM inbox relay, subscribe to gift wraps
        if (relayType === 'DM_INBOX') {
            const nostrModule = RelayWorldCore.getModule('nostr');
            const currentUser = nostrModule.currentUser;
            
            if (currentUser && currentUser.pubkey) {
                this.subscribeToGiftWrapsOnRelay(currentUser.pubkey, relay);
            }
        }
    },
    
    // Load DM inbox preferences
    loadDMInboxPreferences: async function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            console.error("[DM] Nostr module not available");
            return false;
        }
        
        console.log("[DM] Loading DM inbox preferences...");
        
        try {
            // Check if we have a kind 10050 event listing DM inbox relays
            const inboxRelays = await nostrModule.discoverDMInboxRelays(pubkey);
            
            if (inboxRelays && inboxRelays.length > 0) {
                this.dmInboxRelays = inboxRelays;
                this.publishedInboxConfig = true;
                
                console.log(`[DM] Found ${inboxRelays.length} DM inbox relays`);
                return true;
            } else {
                // No inbox relays found, use default configuration
                this.dmInboxRelays = [];
                this.publishedInboxConfig = false;
                
                // Suggest publishing inbox configuration
                RelayWorldCore.eventBus.emit('dm:suggestInboxPublish', {
                    message: "You haven't published your DM inbox preferences. This is required to receive direct messages."
                });
                
                console.log("[DM] No DM inbox relays found");
                return false;
            }
        } catch (error) {
            console.error("[DM] Failed to load DM inbox preferences:", error);
            return false;
        }
    },
    
    // Subscribe to gift wraps (NIP-17)
    subscribeToGiftWraps: async function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            console.error("[DM] Nostr module not available");
            return false;
        }
        
        console.log("[DM] Subscribing to gift wraps...");
        
        try {
            // Subscribe on all DM inbox relays
            const dmInboxRelays = nostrModule.relayConnections.dmInbox;
            
            if (!dmInboxRelays || dmInboxRelays.size === 0) {
                console.warn("[DM] No DM inbox relays connected");
                return false;
            }
            
            for (const [url, relay] of dmInboxRelays) {
                await this.subscribeToGiftWrapsOnRelay(pubkey, relay);
            }
            
            console.log("[DM] Subscribed to gift wraps on all DM inbox relays");
            return true;
        } catch (error) {
            console.error("[DM] Failed to subscribe to gift wraps:", error);
            return false;
        }
    },
    
   // Subscribe to gift wraps on a specific relay
    subscribeToGiftWrapsOnRelay: async function(pubkey, relay) {
        try {
            console.log(`[DM] Subscribing to gift wraps on ${relay.url}...`);
            
            // Filter for gift wraps addressed to the user
            const filters = [{ 
                kinds: [1059], // Gift wrap (NIP-17)
                "#p": [pubkey],
                limit: 50
            }];
            
            // Create subscription
            const sub = relay.sub(filters);
            
            // Handle events
            sub.on('event', (event) => {
                this.processGiftWrap(event, relay);
            });
            
            console.log(`[DM] Subscribed to gift wraps on ${relay.url}`);
            return true;
        } catch (error) {
            console.error(`[DM] Failed to subscribe to gift wraps on ${relay.url}:`, error);
            return false;
        }
    },
    
    // Process a gift wrap (NIP-17)
    processGiftWrap: async function(event, relay) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                console.error("[DM] Nostr module not available or no current user");
                return false;
            }
            
            const pubkey = nostrModule.currentUser.pubkey;
            
            // Get p tag to verify it's addressed to the user
            const pTag = event.tags.find(tag => tag[0] === 'p' && tag[1] === pubkey);
            if (!pTag) {
                console.warn("[DM] Gift wrap not addressed to current user, ignoring");
                return false;
            }
            
            console.log("[DM] Processing gift wrap...");
            
            // Decrypt the gift wrap to get the seal
            const encrypted = event.content;
            const senderPubkey = event.pubkey; // Random pubkey for the gift wrap
            
            try {
                const decryptedContent = await NostrUtils.decryptNip44(
                    encrypted, 
                    senderPubkey, 
                    pubkey
                );
                
                // Parse the seal
                const seal = JSON.parse(decryptedContent);
                
                // Verify the seal (kind 13)
                if (seal.kind !== 13) {
                    console.warn("[DM] Expected kind 13 seal, got kind", seal.kind);
                    return false;
                }
                
                // Now decrypt the chat message from the seal
                const sealPubkey = seal.pubkey;
                
                const decryptedMessage = await NostrUtils.decryptNip44(
                    seal.content,
                    sealPubkey,
                    pubkey
                );
                
                // Parse the chat message
                const chatMessage = JSON.parse(decryptedMessage);
                
                // Verify it's a chat message (kind 14 or 15)
                if (chatMessage.kind !== 14 && chatMessage.kind !== 15) {
                    console.warn("[DM] Expected kind 14 or 15 chat message, got kind", chatMessage.kind);
                    return false;
                }
                
                // Verify the sender pubkey
                if (chatMessage.pubkey !== seal.pubkey) {
                    console.warn("[DM] Sender pubkey mismatch, potential impersonation");
                    return false;
                }
                
                // Process the chat message
                if (chatMessage.kind === 14) {
                    // Regular chat message
                    this.processChatMessage(chatMessage, sealPubkey);
                } else if (chatMessage.kind === 15) {
                    // File message
                    this.processFileMessage(chatMessage, sealPubkey);
                }
                
                return true;
            } catch (error) {
                console.error("[DM] Failed to decrypt gift wrap:", error);
                return false;
            }
        } catch (error) {
            console.error("[DM] Failed to process gift wrap:", error);
            return false;
        }
    },
    
    // Process a chat message (kind 14)
    processChatMessage: function(message, senderPubkey) {
        try {
            console.log("[DM] Processing chat message...");
            
            // Extract message details
            const content = message.content;
            const created_at = message.created_at;
            
            // Get receiver tags
            const receiverTags = message.tags.filter(tag => tag[0] === 'p');
            const receivers = receiverTags.map(tag => tag[1]);
            
            // Get conversation subject if present
            const subjectTag = message.tags.find(tag => tag[0] === 'subject');
            const subject = subjectTag ? subjectTag[1] : null;
            
            // Get reply tag if present
            const replyTag = message.tags.find(tag => tag[0] === 'e');
            const replyTo = replyTag ? replyTag[1] : null;
            
            // Calculate conversation ID (sorted pubkeys joined with '+')
            const allParticipants = [senderPubkey, ...receivers].sort();
            const conversationId = allParticipants.join('+');
            
            // Get or create conversation
            let conversation = this.conversations.get(conversationId);
            if (!conversation) {
                conversation = {
                    id: conversationId,
                    participants: allParticipants,
                    subject: subject,
                    messages: [],
                    lastMessage: null,
                    unread: 0
                };
                this.conversations.set(conversationId, conversation);
            }
            
            // Update conversation subject if provided
            if (subject) {
                conversation.subject = subject;
            }
            
            // Create message object
            const messageObj = {
                id: message.id || CryptoUtils.randomId(),
                sender: senderPubkey,
                content: content,
                created_at: created_at,
                replyTo: replyTo,
                type: 'text'
            };
            
            // Add message to conversation
            conversation.messages.push(messageObj);
            conversation.lastMessage = messageObj;
            
            // Determine if the message is unread
            const nostrModule = RelayWorldCore.getModule('nostr');
            const currentUserPubkey = nostrModule?.currentUser?.pubkey;
            
            if (currentUserPubkey && senderPubkey !== currentUserPubkey) {
                conversation.unread++;
            }
            
            // Sort messages by timestamp
            conversation.messages.sort((a, b) => a.created_at - b.created_at);
            
            // Emit message received event
            RelayWorldCore.eventBus.emit('dm:messageReceived', {
                conversationId: conversationId,
                message: messageObj,
                conversation: conversation
            });
            
            console.log("[DM] Chat message processed");
            return true;
        } catch (error) {
            console.error("[DM] Failed to process chat message:", error);
            return false;
        }
    },
    
    // Process a file message (kind 15)
    processFileMessage: function(message, senderPubkey) {
        try {
            console.log("[DM] Processing file message...");
            
            // Extract message details
            const fileUrl = message.content;
            const created_at = message.created_at;
            
            // Get file type and encryption details
            const fileTypeTag = message.tags.find(tag => tag[0] === 'file-type');
            const fileType = fileTypeTag ? fileTypeTag[1] : 'application/octet-stream';
            
            const encryptionAlgorithmTag = message.tags.find(tag => tag[0] === 'encryption-algorithm');
            const encryptionAlgorithm = encryptionAlgorithmTag ? encryptionAlgorithmTag[1] : null;
            
            const decryptionKeyTag = message.tags.find(tag => tag[0] === 'decryption-key');
            const decryptionKey = decryptionKeyTag ? decryptionKeyTag[1] : null;
            
            const decryptionNonceTag = message.tags.find(tag => tag[0] === 'decryptiion-nonce');
            const decryptionNonce = decryptionNonceTag ? decryptionNonceTag[1] : null;
            
            // Get file hash for verification
            const fileHashTag = message.tags.find(tag => tag[0] === 'x');
            const fileHash = fileHashTag ? fileHashTag[1] : null;
            
            // Get file metadata
            const sizeTag = message.tags.find(tag => tag[0] === 'size');
            const size = sizeTag ? parseInt(sizeTag[1]) : null;
            
            const dimTag = message.tags.find(tag => tag[0] === 'dim');
            const dimensions = dimTag ? dimTag[1] : null;
            
            const blurhashTag = message.tags.find(tag => tag[0] === 'blurhash');
            const blurhash = blurhashTag ? blurhashTag[1] : null;
            
            const thumbTag = message.tags.find(tag => tag[0] === 'thumb');
            const thumbnail = thumbTag ? thumbTag[1] : null;
            
            // Get receiver tags
            const receiverTags = message.tags.filter(tag => tag[0] === 'p');
            const receivers = receiverTags.map(tag => tag[1]);
            
            // Get conversation subject if present
            const subjectTag = message.tags.find(tag => tag[0] === 'subject');
            const subject = subjectTag ? subjectTag[1] : null;
            
            // Get reply tag if present
            const replyTag = message.tags.find(tag => tag[0] === 'e');
            const replyTo = replyTag ? replyTag[1] : null;
            
            // Calculate conversation ID (sorted pubkeys joined with '+')
            const allParticipants = [senderPubkey, ...receivers].sort();
            const conversationId = allParticipants.join('+');
            
            // Get or create conversation
            let conversation = this.conversations.get(conversationId);
            if (!conversation) {
                conversation = {
                    id: conversationId,
                    participants: allParticipants,
                    subject: subject,
                    messages: [],
                    lastMessage: null,
                    unread: 0
                };
                this.conversations.set(conversationId, conversation);
            }
            
            // Update conversation subject if provided
            if (subject) {
                conversation.subject = subject;
            }
            
            // Create file message object
            const messageObj = {
                id: message.id || CryptoUtils.randomId(),
                sender: senderPubkey,
                content: fileUrl,
                created_at: created_at,
                replyTo: replyTo,
                type: 'file',
                fileMetadata: {
                    fileType,
                    fileHash,
                    encryptionAlgorithm,
                    decryptionKey,
                    decryptionNonce,
                    size,
                    dimensions,
                    blurhash,
                    thumbnail
                }
            };
            
            // Add message to conversation
            conversation.messages.push(messageObj);
            conversation.lastMessage = messageObj;
            
            // Determine if the message is unread
            const nostrModule = RelayWorldCore.getModule('nostr');
            const currentUserPubkey = nostrModule?.currentUser?.pubkey;
            
            if (currentUserPubkey && senderPubkey !== currentUserPubkey) {
                conversation.unread++;
            }
            
            // Sort messages by timestamp
            conversation.messages.sort((a, b) => a.created_at - b.created_at);
            
            // Emit file message received event
            RelayWorldCore.eventBus.emit('dm:fileReceived', {
                conversationId: conversationId,
                message: messageObj,
                conversation: conversation
            });
            
            console.log("[DM] File message processed");
            return true;
        } catch (error) {
            console.error("[DM] Failed to process file message:", error);
            return false;
        }
    },
    
    // Create a direct message
    createDirectMessage: async function(receivers, content, options = {}) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const senderPubkey = nostrModule.currentUser.pubkey;
            
            console.log(`[DM] Creating direct message to ${receivers.length} receivers...`);
            
            // Verify receivers have DM inbox relays published
            const receiversWithInbox = await this.verifyReceiversHaveInbox(receivers);
            
            if (receiversWithInbox.length === 0) {
                throw new Error("None of the receivers have published DM inbox preferences");
            }
            
            if (receiversWithInbox.length < receivers.length) {
                console.warn(`[DM] Some receivers (${receivers.length - receiversWithInbox.length}) don't have DM inbox preferences`);
            }
            
            // Create unsigned kind 14 chat message
            const chatMessage = {
                kind: 14,
                content: content,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    // Add receiver tags
                    ...receiversWithInbox.map(r => ["p", r.pubkey, r.relayUrl])
                ],
                pubkey: senderPubkey
            };
            
            // Add subject if provided
            if (options.subject) {
                chatMessage.tags.push(["subject", options.subject]);
            }
            
            // Add reply tag if provided
            if (options.replyTo) {
                chatMessage.tags.push(["e", options.replyTo, "", "reply"]);
            }
            
            // Send the message to each receiver (including self for backup)
            const allReceivers = [...receiversWithInbox, { pubkey: senderPubkey, relayUrl: this.dmInboxRelays[0] }];
            const results = await Promise.all(allReceivers.map(receiver => 
                this.sendEncryptedDirectMessage(chatMessage, receiver.pubkey, receiver.relayUrl)
            ));
            
            // Check if any sends were successful
            const successCount = results.filter(Boolean).length;
            
            if (successCount === 0) {
                throw new Error("Failed to send message to any receivers");
            }
            
            console.log(`[DM] Direct message sent to ${successCount}/${allReceivers.length} receivers`);
            
            // Process the message locally for the sender
            this.processChatMessage(chatMessage, senderPubkey);
            
            return true;
        } catch (error) {
            console.error("[DM] Failed to create direct message:", error);
            throw error;
        }
    },
    
    // Create a direct file message
    createDirectFileMessage: async function(receivers, fileUrl, fileMetadata, options = {}) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const senderPubkey = nostrModule.currentUser.pubkey;
            
            console.log(`[DM] Creating direct file message to ${receivers.length} receivers...`);
            
            // Verify receivers have DM inbox relays published
            const receiversWithInbox = await this.verifyReceiversHaveInbox(receivers);
            
            if (receiversWithInbox.length === 0) {
                throw new Error("None of the receivers have published DM inbox preferences");
            }
            
            if (receiversWithInbox.length < receivers.length) {
                console.warn(`[DM] Some receivers (${receivers.length - receiversWithInbox.length}) don't have DM inbox preferences`);
            }
            
            // Create unsigned kind 15 file message
            const fileMessage = {
                kind: 15,
                content: fileUrl,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    // Add receiver tags
                    ...receiversWithInbox.map(r => ["p", r.pubkey, r.relayUrl])
                ],
                pubkey: senderPubkey
            };
            
            // Add file metadata tags
            if (fileMetadata.fileType) {
                fileMessage.tags.push(["file-type", fileMetadata.fileType]);
            }
            
            if (fileMetadata.encryptionAlgorithm) {
                fileMessage.tags.push(["encryption-algorithm", fileMetadata.encryptionAlgorithm]);
            }
            
            if (fileMetadata.decryptionKey) {
                fileMessage.tags.push(["decryption-key", fileMetadata.decryptionKey]);
            }
            
            if (fileMetadata.decryptionNonce) {
                fileMessage.tags.push(["decryptiion-nonce", fileMetadata.decryptionNonce]);
            }
            
            if (fileMetadata.fileHash) {
                fileMessage.tags.push(["x", fileMetadata.fileHash]);
            }
            
            if (fileMetadata.size) {
                fileMessage.tags.push(["size", fileMetadata.size.toString()]);
            }
            
            if (fileMetadata.dimensions) {
                fileMessage.tags.push(["dim", fileMetadata.dimensions]);
            }
            
            if (fileMetadata.blurhash) {
                fileMessage.tags.push(["blurhash", fileMetadata.blurhash]);
            }
            
            if (fileMetadata.thumbnail) {
                fileMessage.tags.push(["thumb", fileMetadata.thumbnail]);
            }
            
            // Add subject if provided
            if (options.subject) {
                fileMessage.tags.push(["subject", options.subject]);
            }
            
            // Add reply tag if provided
            if (options.replyTo) {
                fileMessage.tags.push(["e", options.replyTo, "", "reply"]);
            }
            
            // Send the file message to each receiver (including self for backup)
            const allReceivers = [...receiversWithInbox, { pubkey: senderPubkey, relayUrl: this.dmInboxRelays[0] }];
            const results = await Promise.all(allReceivers.map(receiver => 
                this.sendEncryptedDirectMessage(fileMessage, receiver.pubkey, receiver.relayUrl)
            ));
            
            // Check if any sends were successful
            const successCount = results.filter(Boolean).length;
            
            if (successCount === 0) {
                throw new Error("Failed to send file message to any receivers");
            }
            
            console.log(`[DM] Direct file message sent to ${successCount}/${allReceivers.length} receivers`);
            
            // Process the message locally for the sender
            this.processFileMessage(fileMessage, senderPubkey);
            
            return true;
        } catch (error) {
            console.error("[DM] Failed to create direct file message:", error);
            throw error;
        }
    },
    
    // Verify receivers have DM inbox preferences published
    verifyReceiversHaveInbox: async function(receivers) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            console.error("[DM] Nostr module not available");
            return [];
        }
        
        const receiversWithInbox = [];
        
        // Process each receiver
        for (const receiver of receivers) {
            try {
                // Discover DM inbox relays for this receiver
                const inboxRelays = await nostrModule.discoverDMInboxRelays(receiver);
                
                if (inboxRelays && inboxRelays.length > 0) {
                    // Add receiver with their first inbox relay
                    receiversWithInbox.push({
                        pubkey: receiver,
                        relayUrl: inboxRelays[0]
                    });
                } else {
                    console.warn(`[DM] Receiver ${receiver.slice(0, 8)} has no DM inbox relays`);
                }
            } catch (error) {
                console.error(`[DM] Failed to verify inbox for ${receiver.slice(0, 8)}:`, error);
            }
        }
        
        return receiversWithInbox;
    },
    
    // Send an encrypted direct message (NIP-17)
    sendEncryptedDirectMessage: async function(message, receiverPubkey, relayUrl) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule) {
                throw new Error("Nostr module not available");
            }
            
            console.log(`[DM] Sending encrypted message to ${receiverPubkey.slice(0, 8)}...`);
            
            const senderPubkey = message.pubkey;
            
            // 1. First, randomize message timestamp to prevent correlation
            message.created_at = Math.floor(Date.now() / 1000 - Math.random() * 172800); // Up to 2 days in the past
            
            // 2. Create a seal (kind 13)
            // 2.1 Generate a random private key for the seal
            const sealPrivKey = CryptoUtils.generatePrivateKey();
            const sealPubKey = CryptoUtils.getPublicKey(sealPrivKey);
            
            // 2.2 Encrypt the message for the seal
            const encryptedMessage = await NostrUtils.encryptNip44(
                JSON.stringify(message),
                senderPubkey,
                receiverPubkey
            );
            
            // 2.3 Create and sign the seal
            const seal = {
                kind: 13,
                pubkey: senderPubkey,
                content: encryptedMessage,
                tags: [],
                created_at: Math.floor(Date.now() / 1000 - Math.random() * 172800) // Randomize timestamp
            };
            
            const signedSeal = await NostrUtils.signEvent(seal);
            
            // 3. Create a gift wrap (kind 1059)
            // 3.1 Generate a random private key for the gift wrap
            const wrapPrivKey = CryptoUtils.generatePrivateKey();
            const wrapPubKey = CryptoUtils.getPublicKey(wrapPrivKey);
            
            // 3.2 Encrypt the seal for the receiver
            const encryptedSeal = await NostrUtils.encryptNip44(
                JSON.stringify(signedSeal),
                wrapPrivKey,
                receiverPubkey
            );
            
            // 3.3 Create and sign the gift wrap
            const giftWrap = {
                kind: 1059,
                pubkey: wrapPubKey,
                content: encryptedSeal,
                tags: [["p", receiverPubkey]],
                created_at: Math.floor(Date.now() / 1000 - Math.random() * 172800) // Randomize timestamp
            };
            
            const signedGiftWrap = await NostrUtils.signEvent(giftWrap, wrapPrivKey);
            
            // 4. Send the gift wrap to the receiver's inbox relay
            // 4.1 Connect to the relay if not already connected
            let relay = null;
            
            // Try to find an existing connection to this relay
            for (const [url, r] of nostrModule.relayConnections.dmInbox) {
                if (url === relayUrl) {
                    relay = r;
                    break;
                }
            }
            
            // If not connected, try to connect
            if (!relay) {
                try {
                    relay = await nostrModule.connectToDMInboxRelay(relayUrl);
                } catch (error) {
                    console.error(`[DM] Failed to connect to inbox relay ${relayUrl}:`, error);
                    throw error;
                }
            }
            
            // 4.2 Publish the gift wrap
            await nostrModule.publishToRelay(relay, signedGiftWrap);
            
            console.log(`[DM] Encrypted message sent to ${receiverPubkey.slice(0, 8)}`);
            return true;
        } catch (error) {
            console.error(`[DM] Failed to send encrypted message to ${receiverPubkey.slice(0, 8)}:`, error);
            return false;
        }
    },
    
    // Publish DM inbox preferences (kind 10050)
    publishDMInboxPreferences: async function(relays) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            console.log("[DM] Publishing DM inbox preferences...");
            
            // Create kind 10050 event
            const event = {
                kind: 10050,
                content: "",
                tags: relays.map(relay => ["relay", relay]),
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign the event
            const signedEvent = await NostrUtils.signEvent(event);
            
            // Publish to login relay
            if (!nostrModule.relayConnections.login) {
                throw new Error("Login relay not connected");
            }
            
            await nostrModule.publishToRelay(nostrModule.relayConnections.login, signedEvent);
            
            // Update local state
            this.dmInboxRelays = relays;
            this.publishedInboxConfig = true;
            
            // Connect to inbox relays
            for (const relay of relays) {
                try {
                    await nostrModule.connectToDMInboxRelay(relay);
                } catch (error) {
                    console.warn(`[DM] Failed to connect to inbox relay ${relay}:`, error);
                }
            }
            
            console.log("[DM] DM inbox preferences published");
            return true;
        } catch (error) {
            console.error("[DM] Failed to publish DM inbox preferences:", error);
            throw error;
        }
    },
    
    // Get conversations list
    getConversations: function() {
        return Array.from(this.conversations.values())
            .sort((a, b) => {
                // Sort by last message time, newest first
                if (!a.lastMessage) return 1;
                if (!b.lastMessage) return -1;
                return b.lastMessage.created_at - a.lastMessage.created_at;
            });
    },
    
    // Get messages in a conversation
    getConversationMessages: function(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            return [];
        }
        
        return conversation.messages.sort((a, b) => a.created_at - b.created_at);
    },
    
    // Mark conversation as read
    markConversationAsRead: function(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            return false;
        }
        
        conversation.unread = 0;
        
        // Emit event
        RelayWorldCore.eventBus.emit('dm:conversationRead', {
            conversationId: conversationId,
            conversation: conversation
        });
        
        return true;
    },
    
    // Delete a conversation (only from local state)
    deleteConversation: function(conversationId) {
        if (!this.conversations.has(conversationId)) {
            return false;
        }
        
        this.conversations.delete(conversationId);
        
        // Emit event
        RelayWorldCore.eventBus.emit('dm:conversationDeleted', {
            conversationId: conversationId
        });
        
        return true;
    },
    
    // Get unread conversations count
    getUnreadCount: function() {
        let count = 0;
        for (const conversation of this.conversations.values()) {
            count += conversation.unread;
        }
        return count;
    }
};