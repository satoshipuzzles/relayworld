/**
 * marketplace-module.js
 * In-game marketplace for trading items between players
 */

import { RelayWorldCore } from '../core/relay-world-core.js';
import { NostrUtils } from '../utils/nostr-utils.js';
import { CryptoUtils } from '../utils/crypto-utils.js';

export const MarketplaceModule = {
    // Module metadata
    name: "marketplace",
    description: "In-game marketplace for trading items",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "items", "player"],
    priority: 50, // Initialize after core modules
    critical: false, // Not a critical module
    
    // Module state
    initialized: false,
    
    // Marketplace listings
    listings: new Map(), // Map of listing ID -> listing object
    
    // Transaction history
    transactions: [],
    
    // Initialization
    init: async function() {
        console.log("[Marketplace] Initializing marketplace module...");
        
        // Only initialize if marketplace is enabled
        if (!RelayWorldCore.getConfig('ENABLE_MARKETPLACE', true)) {
            console.log("[Marketplace] Marketplace disabled in configuration");
            return true;
        }
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Load any existing listings
        await this._loadExistingListings();
        
        this.initialized = true;
        console.log("[Marketplace] Marketplace module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for auth events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        
        // Listen for marketplace events
        RelayWorldCore.eventBus.on('nostr:gameEvent', this.handleGameEvent.bind(this));
        
        // Listen for UI events if UI is available
        const uiModule = RelayWorldCore.getModule('ui');
        if (uiModule) {
            // These would be UI-specific event handlers
            console.log("[Marketplace] UI module available, setting up UI event handlers");
        }
    },
    
    // Handle login event
    handleLogin: async function(data) {
        console.log("[Marketplace] User logged in, refreshing marketplace data");
        
        // Load marketplace listings
        await this._loadExistingListings();
        
        // Emit marketplace ready event
        RelayWorldCore.eventBus.emit('marketplace:ready', { 
            listingCount: this.listings.size 
        });
    },
    
    // Handle game events
    handleGameEvent: function(data) {
        const { event } = data;
        
        // Check if it's a marketplace event
        if (event.kind === 420011) { // Marketplace event kind
            this.processMarketplaceEvent(event);
        }
    },
    
    // Process marketplace event
    processMarketplaceEvent: function(event) {
        try {
            // Get action from tags
            const actionTag = event.tags.find(tag => tag[0] === 'action');
            if (!actionTag || !actionTag[1]) return;
            
            const action = actionTag[1];
            
            switch (action) {
                case 'list':
                    this.processListingEvent(event);
                    break;
                case 'update':
                    this.processListingUpdateEvent(event);
                    break;
                case 'cancel':
                    this.processListingCancelEvent(event);
                    break;
                case 'purchase':
                    this.processPurchaseEvent(event);
                    break;
                default:
                    console.warn(`[Marketplace] Unknown marketplace action: ${action}`);
            }
        } catch (error) {
            console.error("[Marketplace] Failed to process marketplace event:", error);
        }
    },
    
    // Process item listing event
    processListingEvent: function(event) {
        try {
            // Parse the listing data
            const listing = JSON.parse(event.content);
            
            // Validate listing
            if (!this._validateListing(listing)) {
                console.warn("[Marketplace] Invalid listing format, ignoring");
                return;
            }
            
            // Add listing timestamp and ID
            listing.timestamp = event.created_at;
            listing.id = event.id;
            listing.seller = event.pubkey;
            
            // Add to listings
            this.listings.set(event.id, listing);
            
            console.log(`[Marketplace] New listing: ${listing.itemName} for ${listing.price} sats`);
            
            // Emit listing event
            RelayWorldCore.eventBus.emit('marketplace:newListing', { listing });
        } catch (error) {
            console.error("[Marketplace] Failed to process listing event:", error);
        }
    },
    
    // Process listing update event
    processListingUpdateEvent: function(event) {
        try {
            // Get listing ID from tags
            const listingTag = event.tags.find(tag => tag[0] === 'e');
            if (!listingTag || !listingTag[1]) return;
            
            const listingId = listingTag[1];
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                console.warn(`[Marketplace] Listing ${listingId} not found for update`);
                return;
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Verify seller is updating their own listing
            if (listing.seller !== event.pubkey) {
                console.warn(`[Marketplace] Unauthorized listing update attempt by ${event.pubkey}`);
                return;
            }
            
            // Parse the update data
            const update = JSON.parse(event.content);
            
            // Update the listing
            const updatedListing = {
                ...listing,
                ...update,
                lastUpdated: event.created_at
            };
            
            // Validate the updated listing
            if (!this._validateListing(updatedListing)) {
                console.warn("[Marketplace] Invalid updated listing format, ignoring");
                return;
            }
            
            // Update the listing
            this.listings.set(listingId, updatedListing);
            
            console.log(`[Marketplace] Updated listing: ${updatedListing.itemName}`);
            
            // Emit update event
            RelayWorldCore.eventBus.emit('marketplace:listingUpdated', { listing: updatedListing });
        } catch (error) {
            console.error("[Marketplace] Failed to process listing update event:", error);
        }
    },
    
    // Process listing cancel event
    processListingCancelEvent: function(event) {
        try {
            // Get listing ID from tags
            const listingTag = event.tags.find(tag => tag[0] === 'e');
            if (!listingTag || !listingTag[1]) return;
            
            const listingId = listingTag[1];
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                console.warn(`[Marketplace] Listing ${listingId} not found for cancellation`);
                return;
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Verify seller is cancelling their own listing
            if (listing.seller !== event.pubkey) {
                console.warn(`[Marketplace] Unauthorized listing cancellation attempt by ${event.pubkey}`);
                return;
            }
            
            // Mark as cancelled
            listing.cancelled = true;
            listing.active = false;
            listing.cancelledAt = event.created_at;
            
            // Update the listing
            this.listings.set(listingId, listing);
            
            console.log(`[Marketplace] Cancelled listing: ${listing.itemName}`);
            
            // Emit cancellation event
            RelayWorldCore.eventBus.emit('marketplace:listingCancelled', { listing });
        } catch (error) {
            console.error("[Marketplace] Failed to process listing cancel event:", error);
        }
    },
    
    // Process purchase event
    processPurchaseEvent: function(event) {
        try {
            // Get listing ID from tags
            const listingTag = event.tags.find(tag => tag[0] === 'e');
            if (!listingTag || !listingTag[1]) return;
            
            const listingId = listingTag[1];
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                console.warn(`[Marketplace] Listing ${listingId} not found for purchase`);
                return;
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Check if listing is still active
            if (!listing.active || listing.cancelled || listing.sold) {
                console.warn(`[Marketplace] Listing ${listingId} is no longer active`);
                return;
            }
            
            // Create transaction record
            const transaction = {
                id: event.id,
                listingId: listingId,
                seller: listing.seller,
                buyer: event.pubkey,
                itemId: listing.itemId,
                itemName: listing.itemName,
                price: listing.price,
                timestamp: event.created_at
            };
            
            // Add to transaction history
            this.transactions.push(transaction);
            
            // Mark listing as sold
            listing.sold = true;
            listing.active = false;
            listing.soldAt = event.created_at;
            listing.buyer = event.pubkey;
            
            // Update the listing
            this.listings.set(listingId, listing);
            
            console.log(`[Marketplace] Item sold: ${listing.itemName} to ${event.pubkey.slice(0, 8)}`);
            
            // Emit purchase event
            RelayWorldCore.eventBus.emit('marketplace:itemPurchased', { transaction, listing });
            
            // Complete the transaction (transfer item)
            this._completeTransaction(transaction);
        } catch (error) {
            console.error("[Marketplace] Failed to process purchase event:", error);
        }
    },
    
    // Complete a transaction by transferring the item
    _completeTransaction: function(transaction) {
        try {
            const playerModule = RelayWorldCore.getModule('player');
            const itemsModule = RelayWorldCore.getModule('items');
            
            // Get the current user's pubkey
            const currentUserPubkey = playerModule?.getCurrentUserPubkey();
            
            // Check if current user is the buyer
            if (currentUserPubkey === transaction.buyer) {
                console.log(`[Marketplace] You purchased ${transaction.itemName}`);
                
                // Add item to inventory
                if (itemsModule) {
                    // This would call into the items module to add the item to the player's inventory
                    // itemsModule.addItemToInventory(transaction.itemId);
                }
                
                // Show notification
                RelayWorldCore.eventBus.emit('ui:showToast', {
                    message: `You purchased ${transaction.itemName}!`,
                    type: 'success'
                });
            }
            
            // Check if current user is the seller
            if (currentUserPubkey === transaction.seller) {
                console.log(`[Marketplace] You sold ${transaction.itemName}`);
                
                // Show notification
                RelayWorldCore.eventBus.emit('ui:showToast', {
                    message: `You sold ${transaction.itemName} for ${transaction.price} sats!`,
                    type: 'success'
                });
            }
        } catch (error) {
            console.error("[Marketplace] Failed to complete transaction:", error);
        }
    },
    
    // Load existing marketplace listings
    _loadExistingListings: async function() {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule) {
                console.error("[Marketplace] Nostr module not available");
                return false;
            }
            
            console.log("[Marketplace] Loading existing listings from game relay...");
            
            // Get game relay
            const gameRelay = nostrModule.relayConnections.game;
            if (!gameRelay) {
                console.error("[Marketplace] Game relay not connected");
                return false;
            }
            
            // Subscribe to marketplace events
            const filters = [{
                kinds: [420011], // Marketplace events
                since: Math.floor((Date.now() / 1000) - 86400 * 7), // Last 7 days
                limit: 100
            }];
            
            return new Promise((resolve) => {
                const sub = nostrModule.subscribe(gameRelay, filters, (event) => {
                    // Process each listing event
                    this.processMarketplaceEvent(event);
                });
                
                // Set a timeout to resolve after fetching initial listings
                setTimeout(() => {
                    resolve(true);
                    // Keep subscription active for real-time updates
                }, 3000);
            });
        } catch (error) {
            console.error("[Marketplace] Failed to load existing listings:", error);
            return false;
        }
    },
    
    // Validate a listing object
    _validateListing: function(listing) {
        // Check required fields
        if (!listing.itemId || !listing.itemName || !listing.price) {
            return false;
        }
        
        // Check price is a positive number
        if (typeof listing.price !== 'number' || listing.price <= 0) {
            return false;
        }
        
        // Listing should be active by default
        if (listing.active === undefined) {
            listing.active = true;
        }
        
        return true;
    },
    
    // Create a new listing
    createListing: async function(item, price, description = '') {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule) {
                throw new Error("Player module not available");
            }
            
            console.log(`[Marketplace] Creating listing for ${item.name} at ${price} sats`);
            
            // Create listing object
            const listing = {
                itemId: item.id,
                itemName: item.name,
                itemType: item.category,
                itemRarity: item.rarity,
                itemEmoji: item.emoji,
                price: price,
                description: description,
                active: true,
                seller: nostrModule.currentUser.pubkey,
                created_at: Math.floor(Date.now() / 1000)
            };
            
            // Create marketplace event
            const event = {
                kind: 420011,
                content: JSON.stringify(listing),
                tags: [
                    ["action", "list"],
                    ["i", item.id],
                    ["p", nostrModule.currentUser.pubkey]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            console.log(`[Marketplace] Listing created: ${item.name} for ${price} sats`);
            
            // Remove item from inventory
            // In a real implementation, this would need to check if the item was successfully removed
            // playerModule.removeItemFromInventory(item.id);
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Listed ${item.name} for ${price} sats`,
                type: 'success'
            });
            
            return true;
        } catch (error) {
            console.error("[Marketplace] Failed to create listing:", error);
            
            // Show error notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Failed to create listing: ${error.message}`,
                type: 'error'
            });
            
            throw error;
        }
    },
    
    // Update an existing listing
    updateListing: async function(listingId, updates) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                throw new Error("Listing not found");
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Verify user owns the listing
            if (listing.seller !== nostrModule.currentUser.pubkey) {
                throw new Error("You don't own this listing");
            }
            
            console.log(`[Marketplace] Updating listing: ${listing.itemName}`);
            
            // Create update event
            const event = {
                kind: 420011,
                content: JSON.stringify(updates),
                tags: [
                    ["action", "update"],
                    ["e", listingId],
                    ["p", nostrModule.currentUser.pubkey]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            console.log(`[Marketplace] Listing updated: ${listing.itemName}`);
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Updated listing for ${listing.itemName}`,
                type: 'success'
            });
            
            return true;
        } catch (error) {
            console.error("[Marketplace] Failed to update listing:", error);
            
            // Show error notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Failed to update listing: ${error.message}`,
                type: 'error'
            });
            
            throw error;
        }
    },
    
    // Cancel a listing
    cancelListing: async function(listingId) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule) {
                throw new Error("Player module not available");
            }
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                throw new Error("Listing not found");
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Verify user owns the listing
            if (listing.seller !== nostrModule.currentUser.pubkey) {
                throw new Error("You don't own this listing");
            }
            
            console.log(`[Marketplace] Cancelling listing: ${listing.itemName}`);
            
            // Create cancellation event
            const event = {
                kind: 420011,
                content: JSON.stringify({ cancelled: true }),
                tags: [
                    ["action", "cancel"],
                    ["e", listingId],
                    ["p", nostrModule.currentUser.pubkey]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            console.log(`[Marketplace] Listing cancelled: ${listing.itemName}`);
            
            // Return item to inventory
            // In a real implementation, this would add the item back to the player's inventory
            // playerModule.addItemToInventory(listing.itemId);
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Listing cancelled for ${listing.itemName}`,
                type: 'success'
            });
            
            return true;
        } catch (error) {
            console.error("[Marketplace] Failed to cancel listing:", error);
            
            // Show error notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Failed to cancel listing: ${error.message}`,
                type: 'error'
            });
            
            throw error;
        }
    },
    
    // Purchase an item
    purchaseItem: async function(listingId) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (!nostrModule || !nostrModule.currentUser) {
                throw new Error("Not authenticated");
            }
            
            const zapsModule = RelayWorldCore.getModule('zaps');
            if (!zapsModule) {
                throw new Error("Zaps module not available");
            }
            
            // Check if listing exists
            if (!this.listings.has(listingId)) {
                throw new Error("Listing not found");
            }
            
            // Get the existing listing
            const listing = this.listings.get(listingId);
            
            // Check if listing is still active
            if (!listing.active || listing.cancelled || listing.sold) {
                throw new Error("Listing is no longer active");
            }
            
            // Verify user is not buying their own listing
            if (listing.seller === nostrModule.currentUser.pubkey) {
                throw new Error("You can't buy your own listing");
            }
            
            console.log(`[Marketplace] Purchasing item: ${listing.itemName} for ${listing.price} sats`);
            
            // Send payment via zaps
            // In a real implementation, this would handle the payment process
            // await zapsModule.sendZap(listing.seller, listing.price, `Payment for ${listing.itemName}`);
            
            // Create purchase event
            const event = {
                kind: 420011,
                content: JSON.stringify({ purchased: true }),
                tags: [
                    ["action", "purchase"],
                    ["e", listingId],
                    ["p", listing.seller]
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Sign and publish the event
            const signedEvent = await NostrUtils.signEvent(event);
            await nostrModule.publishToRelay(nostrModule.relayConnections.game, signedEvent);
            
            console.log(`[Marketplace] Item purchased: ${listing.itemName}`);
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Purchased ${listing.itemName} for ${listing.price} sats`,
                type: 'success'
            });
            
            return true;
        } catch (error) {
            console.error("[Marketplace] Failed to purchase item:", error);
            
            // Show error notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Failed to purchase item: ${error.message}`,
                type: 'error'
            });
            
            throw error;
        }
    },
    
    // Get active listings
    getActiveListings: function() {
        return Array.from(this.listings.values())
            .filter(listing => listing.active && !listing.cancelled && !listing.sold)
            .sort((a, b) => b.timestamp - a.timestamp);
    },
    
    // Get user's listings
    getUserListings: function(pubkey) {
        return Array.from(this.listings.values())
            .filter(listing => listing.seller === pubkey)
            .sort((a, b) => b.timestamp - a.timestamp);
    },
    
    // Get user's transactions
    getUserTransactions: function(pubkey) {
        return this.transactions
            .filter(transaction => transaction.seller === pubkey || transaction.buyer === pubkey)
            .sort((a, b) => b.timestamp - a.timestamp);
    },
    
    // Search listings
    searchListings: function(query) {
        const lowerQuery = query.toLowerCase();
        
        return Array.from(this.listings.values())
            .filter(listing => 
                listing.active && 
                !listing.cancelled && 
                !listing.sold &&
                (
                    listing.itemName.toLowerCase().includes(lowerQuery) ||
                    listing.description.toLowerCase().includes(lowerQuery) ||
                    listing.itemType.toLowerCase().includes(lowerQuery) ||
                    listing.itemRarity.toLowerCase().includes(lowerQuery)
                )
            )
            .sort((a, b) => b.timestamp - a.timestamp);
    }
};