/**
 * crypto-utils.js
 * Cryptographic utilities for Relay World
 * Compatible version with no modern syntax features
 */

/**
 * CryptoUtils - Utility functions for cryptographic operations
 */

// Create the CryptoUtils object that will be exported
export const CryptoUtils = {
    // Generate a random key
    generateKey: function(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    // Hash a string using SHA-256
    async hash: function(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // Simple encrypt/decrypt functions (for demo purposes)
    encrypt: function(text, key) {
        // Simple XOR encryption for demo
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result); // Base64 encode
    },
    
    decrypt: function(encoded, key) {
        try {
            const text = atob(encoded); // Base64 decode
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (e) {
            console.error("Decryption error:", e);
            return null;
        }
    },
    
    // Generate a random private key
    generatePrivateKey: function() {
        var privateKey = new Uint8Array(32);
        window.crypto.getRandomValues(privateKey);
        return this.uint8ArrayToHex(privateKey);
    },
    
    // Convert a private key to a public key
    getPublicKey: function(privateKey) {
        // In a real implementation, this would use secp256k1
        // For this example, we'll use a placeholder
        return "simulated_" + privateKey.substring(0, 16);
    },
    
    // Generate a random ID
    randomId: function(prefix) {
        var prefixStr = prefix || '';
        return prefixStr + Date.now() + "-" + Math.random().toString(36).substring(2, 11);
    },
    
    // Generate a random hex string
    randomHex: function(length) {
        var len = length || 64;
        var result = "";
        for (var i = 0; i < len / 2; i++) {
            result += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        }
        return result;
    },
    
    // Convert hex string to Uint8Array
    hexToUint8Array: function(hexString) {
        if (!hexString) return new Uint8Array(0);
        var matches = hexString.match(/.{1,2}/g);
        if (!matches) return new Uint8Array(0);
        return new Uint8Array(matches.map(function(byte) {
            return parseInt(byte, 16);
        }));
    },
    
    // Convert Uint8Array to hex string
    uint8ArrayToHex: function(bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i++) {
            var hex = bytes[i].toString(16);
            result.push(hex.length === 1 ? '0' + hex : hex);
        }
        return result.join('');
    },
    
    // Generate a random string
    randomString: function(length) {
        var len = length || 16;
        var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';
        var randomValues = new Uint8Array(len);
        window.crypto.getRandomValues(randomValues);
        
        for (var i = 0; i < len; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        
        return result;
    },
    
    // Generate a random 32-byte shared secret
    generateSharedSecret: function() {
        var secret = new Uint8Array(32);
        window.crypto.getRandomValues(secret);
        return this.uint8ArrayToHex(secret);
    },
    
    // AES-GCM encryption
    encryptAESGCM: async function(data, key) {
        try {
            // Convert key from hex to Uint8Array if needed
            var keyArray = key;
            if (typeof key === 'string') {
                keyArray = this.hexToUint8Array(key);
            }
            
            // Create a CryptoKey from the raw key data
            var cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyArray,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );
            
            // Generate a random IV
            var iv = new Uint8Array(12);
            window.crypto.getRandomValues(iv);
            
            // Convert data to Uint8Array if it's a string
            var dataArray = data;
            if (typeof data === 'string') {
                var encoder = new TextEncoder();
                dataArray = encoder.encode(data);
            }
            
            // Encrypt the data
            var encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                dataArray
            );
            
            // Combine IV and encrypted data
            var encryptedArray = new Uint8Array(encryptedBuffer);
            var result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv);
            result.set(encryptedArray, iv.length);
            
            // Return as hex string
            return this.uint8ArrayToHex(result);
        } catch (error) {
            console.error('[CryptoUtils] AES-GCM encryption failed:', error);
            throw error;
        }
    },
    
    // AES-GCM decryption
    decryptAESGCM: async function(encryptedData, key) {
        try {
            // Convert key from hex to Uint8Array if needed
            var keyArray = key;
            if (typeof key === 'string') {
                keyArray = this.hexToUint8Array(key);
            }
            
            // Create a CryptoKey from the raw key data
            var cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyArray,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            
            // Convert encrypted data from hex to Uint8Array if needed
            var encryptedArray = encryptedData;
            if (typeof encryptedData === 'string') {
                encryptedArray = this.hexToUint8Array(encryptedData);
            }
            
            // Extract IV (first 12 bytes)
            var iv = encryptedArray.slice(0, 12);
            var ciphertext = encryptedArray.slice(12);
            
            // Decrypt the data
            var decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                ciphertext
            );
            
            // Convert the decrypted buffer to a string
            var decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('[CryptoUtils] AES-GCM decryption failed:', error);
            throw error;
        }
    },
    
    // ChaCha20-Poly1305 encryption (polyfill using AES-GCM)
    encryptChaCha20Poly1305: async function(data, key) {
        // For now, use AES-GCM as a stand-in
        return this.encryptAESGCM(data, key);
    },
    
    // ChaCha20-Poly1305 decryption (polyfill using AES-GCM)
    decryptChaCha20Poly1305: async function(encryptedData, key) {
        // For now, use AES-GCM as a stand-in
        return this.decryptAESGCM(encryptedData, key);
    },
    
    // Encrypt a file
    encryptFile: async function(file, algorithm) {
        var algo = algorithm || 'aes-gcm';
        try {
            // Generate a random encryption key
            var key = new Uint8Array(32);
            window.crypto.getRandomValues(key);
            
            // Read the file as an ArrayBuffer
            var fileBuffer = await this._readFileAsArrayBuffer(file);
            
            // Encrypt based on the chosen algorithm
            var encryptedData;
            if (algo === 'aes-gcm') {
                encryptedData = await this.encryptAESGCM(new Uint8Array(fileBuffer), key);
            } else if (algo === 'chacha20-poly1305') {
                encryptedData = await this.encryptChaCha20Poly1305(new Uint8Array(fileBuffer), key);
            } else {
                throw new Error("Unsupported encryption algorithm: " + algo);
            }
            
            // Calculate SHA-256 hash of the original file
            var fileHash = await this.sha256(new Uint8Array(fileBuffer));
            
            // Return encrypted data and metadata
            return {
                encryptedData: encryptedData,
                metadata: {
                    encryptionAlgorithm: algo,
                    decryptionKey: this.uint8ArrayToHex(key),
                    fileHash: fileHash,
                    size: file.size,
                    type: file.type
                }
            };
        } catch (error) {
            console.error('[CryptoUtils] File encryption failed:', error);
            throw error;
        }
    },
    
    // Decrypt a file
    decryptFile: async function(encryptedData, metadata) {
        try {
            var algorithm = metadata.encryptionAlgorithm;
            var decryptionKey = metadata.decryptionKey;
            
            // Decrypt based on the algorithm
            var decryptedData;
            if (algorithm === 'aes-gcm') {
                decryptedData = await this.decryptAESGCM(encryptedData, decryptionKey);
            } else if (algorithm === 'chacha20-poly1305') {
                decryptedData = await this.decryptChaCha20Poly1305(encryptedData, decryptionKey);
            } else {
                throw new Error("Unsupported encryption algorithm: " + algorithm);
            }
            
            // Verify hash if provided
            if (metadata.fileHash) {
                var decryptedHash = await this.sha256(decryptedData);
                if (decryptedHash !== metadata.fileHash) {
                    throw new Error('File integrity check failed: hash mismatch');
                }
            }
            
            // Convert decrypted data to Blob
            var fileType = metadata.type || 'application/octet-stream';
            return new Blob([decryptedData], { type: fileType });
        } catch (error) {
            console.error('[CryptoUtils] File decryption failed:', error);
            throw error;
        }
    },
    
    // Helper function to read a file as ArrayBuffer
    _readFileAsArrayBuffer: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function() {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(file);
        });
    },
    
    // Generate random bytes
    getRandomBytes: function(length) {
        var bytes = new Uint8Array(length);
        window.crypto.getRandomValues(bytes);
        return bytes;
    },
    
    // Check if secure crypto is available
    isSecureCryptoAvailable: function() {
        return window.crypto && window.crypto.subtle && window.crypto.getRandomValues;
    }
};

// Also add it to the window object for non-module scripts
window.CryptoUtils = CryptoUtils;

// Default export for compatibility with both import syntaxes
export default CryptoUtils;
