/**
 * Cryptography Utility Module for Relay World 2.0
 * Provides cryptographic functions for Nostr and other crypto operations
 */

const crypto = (function() {
    /**
     * Convert hex string to bytes
     * @param {string} hex - Hex string
     * @returns {Uint8Array} - Byte array
     */
    function hexToBytes(hex) {
        if (!hex) return new Uint8Array();
        
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        
        return bytes;
    }
    
    /**
     * Convert bytes to hex string
     * @param {Uint8Array} bytes - Byte array
     * @returns {string} - Hex string
     */
    function bytesToHex(bytes) {
        if (!bytes) return '';
        
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Create SHA-256 hash of data
     * @param {string|Uint8Array} data - Data to hash
     * @returns {Promise<string>} - Hex-encoded hash
     */
    async function sha256(data) {
        try {
            // Convert data to bytes if it's a string
            const dataBytes = typeof data === 'string' 
                ? new TextEncoder().encode(data) 
                : data;
            
            // Hash using Web Crypto API
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBytes);
            
            // Convert to hex
            return bytesToHex(new Uint8Array(hashBuffer));
        } catch (error) {
            console.error('SHA-256 error:', error);
            throw error;
        }
    }
    
    /**
     * Verify a Nostr event signature
     * @param {Object} event - Nostr event object
     * @returns {Promise<boolean>} - True if signature is valid
     */
    async function verifyEventSignature(event) {
        // If using NostrTools, we can use the provided verify function
        if (window.NostrTools && window.NostrTools.verifySignature) {
            return window.NostrTools.verifySignature(event);
        }
        
        // If using a Nostr extension, we can ask it to verify
        if (window.nostr && window.nostr.verifyEvent) {
            return window.nostr.verifyEvent(event);
        }
        
        // If no library is available, we can't verify
        console.warn('No Nostr library available for signature verification');
        return false;
    }
    
    /**
     * Generate a random hex string
     * @param {number} length - Length of output string (must be even)
     * @returns {string} - Random hex string
     */
    function randomHex(length = 32) {
        if (length % 2 !== 0) {
            throw new Error('Length must be even');
        }
        
        const bytes = new Uint8Array(length / 2);
        window.crypto.getRandomValues(bytes);
        
        return bytesToHex(bytes);
    }
    
    /**
     * Calculate a deterministic position from a pubkey
     * @param {string} pubkey - Public key (hex)
     * @returns {Object} - {x, y} coordinates
     */
    function deterministicPosition(pubkey) {
        // Use first 8 bytes of pubkey (16 hex chars) for X and Y
        const xHex = pubkey.substring(0, 8);
        const yHex = pubkey.substring(8, 16);
        
        // Convert to integers
        const xInt = parseInt(xHex, 16);
        const yInt = parseInt(yHex, 16);
        
        // Normalize to world size
        const normalizedX = (xInt / 0xFFFFFFFF) * config.WORLD_WIDTH;
        const normalizedY = (yInt / 0xFFFFFFFF) * config.WORLD_HEIGHT;
        
        return {
            x: normalizedX,
            y: normalizedY
        };
    }
    
    /**
     * Hash a string to a 32-bit integer
     * @param {string} str - String to hash
     * @returns {number} - 32-bit integer hash
     */
    function stringToHash(str) {
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32-bit integer
        }
        
        return hash;
    }
    
    /**
     * Generate a fast deterministic ID from string
     * @param {string} str - Input string
     * @param {number} length - Desired ID length
     * @returns {string} - Deterministic ID
     */
    function fastId(str, length = 8) {
        // Get hash of string
        const hash = stringToHash(str);
        
        // Convert to positive value
        const positiveHash = hash >= 0 ? hash : -hash;
        
        // Convert to alphanumeric
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        
        // Generate ID by picking characters based on hash
        let remainingHash = positiveHash;
        for (let i = 0; i < length; i++) {
            const index = remainingHash % chars.length;
            id += chars.charAt(index);
            remainingHash = Math.floor(remainingHash / chars.length);
        }
        
        return id;
    }
    
    /**
     * Generate a nonce for proof-of-work
     * @param {string} data - Data to find nonce for
     * @param {number} difficulty - Target difficulty (number of leading zeros)
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<string>} - Nonce that satisfies difficulty
     */
    async function findProofOfWorkNonce(data, difficulty, progressCallback) {
        const target = '0'.repeat(difficulty);
        let nonce = 0;
        let hash;
        
        // Report progress every 1000 iterations
        const reportInterval = 1000;
        
        while (true) {
            const nonceStr = nonce.toString();
            hash = await sha256(data + nonceStr);
            
            if (hash.startsWith(target)) {
                return nonceStr;
            }
            
            nonce++;
            
            // Report progress
            if (progressCallback && nonce % reportInterval === 0) {
                progressCallback(nonce);
            }
            
            // Yield to browser every 10000 iterations to prevent UI freezing
            if (nonce % 10000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }
    
    // Public API
    return {
        hexToBytes,
        bytesToHex,
        sha256,
        verifyEventSignature,
        randomHex,
        deterministicPosition,
        stringToHash,
        fastId,
        findProofOfWorkNonce
    };
})();
