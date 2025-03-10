/**
 * nostr-utils.js
 * Nostr-specific utilities for Relay World
 */

// Use global CryptoUtils instead of import
// Remove: import { CryptoUtils } from './crypto-utils.js';

export const NostrUtils = {
    // Sign an event using Nostr extension
    signEvent: async function(event, privateKey = null) {
        try {
            if (privateKey) {
                // Sign with provided private key (for random identities like gift wraps)
                // In a real implementation, this would use nostr-tools or a similar library
                // For now, we'll simulate the signature
                const id = await this.calculateId(event);
                const signature = "simulated_sig_" + CryptoUtils.randomHex(32);
                
                return {
                    ...event,
                    id,
                    sig: signature
                };
            } else if (window.nostr) {
                // Use NIP-07 extension
                // Make sure the event has required fields
                if (!event.created_at) {
                    event.created_at = Math.floor(Date.now() / 1000);
                }
                
                return await window.nostr.signEvent(event);
            } else {
                throw new Error("No signing method available");
            }
        } catch (error) {
            console.error('[NostrUtils] Failed to sign event:', error);
            throw error;
        }
    },
    
    // Calculate event ID
    calculateId: async function(event) {
        try {
            // Create the serialized event for ID calculation
            const serialized = [
                0,
                event.pubkey,
                event.created_at,
                event.kind,
                event.tags,
                event.content
            ];
            
            // Hash the serialized event
            const id = await CryptoUtils.sha256(JSON.stringify(serialized));
            return id;
        } catch (error) {
            console.error('[NostrUtils] Failed to calculate event ID:', error);
            throw error;
        }
    },
    
    // Verify event signature
    verifySignature: function(event) {
        // In a real implementation, this would verify the signature
        // For now, we'll simulate the verification
        return true;
    },
    
    // Format a pubkey for display
    formatPubkey: function(pubkey, options = {}) {
        const { short = true, useNpub = true } = options;
        
        if (!pubkey) return "unknown";
        
        if (useNpub && window.NostrTools && window.NostrTools.nip19) {
            try {
                // Convert to npub if NostrTools is available
                const npub = window.NostrTools.nip19.npubEncode(pubkey);
                if (short) {
                    return `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}`;
                }
                return npub;
            } catch (error) {
                console.warn('[NostrUtils] Failed to convert pubkey to npub:', error);
            }
        }
        
        // Fallback to hex format
        if (short) {
            return `${pubkey.substring(0, 8)}...`;
        }
        
        return pubkey;
    },
    
    // Format a timestamp
    formatTimestamp: function(timestamp, options = {}) {
        const { format = 'relative' } = options;
        const date = new Date(timestamp * 1000);
        
        if (format === 'relative') {
            return this.timeAgo(date);
        } else if (format === 'time') {
            return date.toLocaleTimeString();
        } else if (format === 'date') {
            return date.toLocaleDateString();
        } else if (format === 'datetime') {
            return date.toLocaleString();
        }
        
        return date.toISOString();
    },
    
    // Format relative time
    timeAgo: function(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) {
            return "just now";
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days}d ago`;
        }
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) {
            return `${weeks}w ago`;
        }
        
        const months = Math.floor(days / 30);
        if (months < 12) {
            return `${months}mo ago`;
        }
        
        const years = Math.floor(days / 365);
        return `${years}y ago`;
    },
    
    // NIP-44 encryption (version 2)
    encryptNip44: async function(plaintext, senderPrivateKeyOrPubkey, receiverPubkey) {
        try {
            // In a real implementation, this would use the NIP-44 algorithm
            // For now, we'll simulate the encryption
            
            // Generate a shared key
            const sharedKey = CryptoUtils.generateSharedSecret();
            
            // Encrypt with AES-GCM
            const ciphertext = await CryptoUtils.encryptAESGCM(plaintext, sharedKey);
            
            // Add version prefix for NIP-44 v2
            return `2:${ciphertext}`;
        } catch (error) {
            console.error('[NostrUtils] NIP-44 encryption failed:', error);
            throw error;
        }
    },
    
    // NIP-44 decryption (version 2)
    decryptNip44: async function(ciphertext, senderPubkey, receiverPrivateKeyOrPubkey) {
        try {
            // Check version prefix
            const parts = ciphertext.split(':');
            const version = parts[0];
            
            if (version !== '2') {
                throw new Error(`Unsupported NIP-44 version: ${version}`);
            }
            
            // In a real implementation, this would use the NIP-44 algorithm
            // For now, we'll simulate the decryption
            
            // This is a mock implementation - we can't actually decrypt
            // In a real app, this would derive the shared secret and decrypt
            return `{"simulated_decryption": "This is a mock decryption for demo purposes"}`;
        } catch (error) {
            console.error('[NostrUtils] NIP-44 decryption failed:', error);
            throw error;
        }
    },
    
    // Create a parameterized replaceable event address
    createParamReplaceable: function(kind, pubkey, identifier) {
        // NIP-33: parameterized replaceable events
        const d = identifier || '';
        return `${kind}:${pubkey}:${d}`;
    },
    
    // Parse a Nostr event address (NIP-19)
    parseEventAddress: function(address) {
        try {
            // Example implementation for "note", "nevent", and "naddr" (NIP-19)
            if (address.startsWith('note')) {
                // note1... format (event id)
                if (window.NostrTools && window.NostrTools.nip19) {
                    return window.NostrTools.nip19.decode(address);
                }
                return { type: 'note', data: 'simulated_decode_id' };
            } else if (address.startsWith('nevent')) {
                // nevent1... format (event with relay hint)
                if (window.NostrTools && window.NostrTools.nip19) {
                    return window.NostrTools.nip19.decode(address);
                }
                return { 
                    type: 'nevent', 
                    data: { 
                        id: 'simulated_decode_id',
                        relays: ['wss://relay.example.com']
                    } 
                };
            } else if (address.startsWith('naddr')) {
                // naddr1... format (parameterized replaceable event)
                if (window.NostrTools && window.NostrTools.nip19) {
                    return window.NostrTools.nip19.decode(address);
                }
                return { 
                    type: 'naddr', 
                    data: { 
                        kind: 30023,
                        pubkey: 'simulated_decode_pubkey',
                        identifier: 'simulated_decode_d',
                        relays: ['wss://relay.example.com']
                    } 
                };
            } else {
                throw new Error(`Unknown address format: ${address}`);
            }
        } catch (error) {
            console.error('[NostrUtils] Failed to parse event address:', error);
            throw error;
        }
    },
    
    // Create a conversation ID from participants
    createConversationId: function(participants) {
        // Sort participants to ensure consistent ID regardless of order
        const sorted = [...participants].sort();
        return sorted.join('+');
    },
    
    // Check if a tag has a specific value
    hasTag: function(event, tagName, value = null) {
        if (!event || !event.tags) return false;
        
        for (const tag of event.tags) {
            if (tag[0] === tagName) {
                if (value === null || tag[1] === value) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // Get tag value(s)
    getTagValues: function(event, tagName) {
        if (!event || !event.tags) return [];
        
        return event.tags
            .filter(tag => tag[0] === tagName)
            .map(tag => tag[1]);
    },
    
    // Get first tag value
    getTagValue: function(event, tagName) {
        const values = this.getTagValues(event, tagName);
        return values.length > 0 ? values[0] : null;
    },
    
    // Add a tag to an event
    addTag: function(event, tagName, ...values) {
        if (!event.tags) {
            event.tags = [];
        }
        
        event.tags.push([tagName, ...values]);
        return event;
    },
    
    // Remove tags from an event
    removeTags: function(event, tagName, valueToMatch = null) {
        if (!event || !event.tags) return event;
        
        event.tags = event.tags.filter(tag => {
            if (tag[0] !== tagName) return true;
            if (valueToMatch !== null && tag[1] !== valueToMatch) return true;
            return false;
        });
        
        return event;
    }
};

// Make NostrUtils available globally
window.NostrUtils = NostrUtils;
