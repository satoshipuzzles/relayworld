/**
 * crypto-utils.js
 * Cryptographic utilities for Relay World
 */

export const CryptoUtils = {
    // Generate a random private key
    generatePrivateKey: function() {
        const privateKey = new Uint8Array(32);
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
    randomId: function(prefix = '') {
        return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    },
    
    // Generate a random hex string
    randomHex: function(length = 64) {
        return Array.from(
            { length: length / 2 },
            () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
    },
    
    // Hash a string using SHA-256
    async sha256: function(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },
    
    // Convert hex string to Uint8Array
    hexToUint8Array: function(hexString) {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    },
    
    // Convert Uint8Array to hex string
    uint8ArrayToHex: function(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },
    
    // Generate a random string
    randomString: function(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        
        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        
        return result;
    },
    
    // Generate a random 32-byte shared secret
    generateSharedSecret: function() {
        const secret = new Uint8Array(32);
        window.crypto.getRandomValues(secret);
        return this.uint8ArrayToHex(secret);
    },
    
    // AES-GCM encryption
    async encryptAESGCM: function(data, key) {
        try {
            // Convert key from hex to Uint8Array if needed
            let keyArray = key;
            if (typeof key === 'string') {
                keyArray = this.hexToUint8Array(key);
            }
            
            // Create a CryptoKey from the raw key data
            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyArray,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );
            
            // Generate a random IV
            const iv = new Uint8Array(12);
            window.crypto.getRandomValues(iv);
            
            // Convert data to Uint8Array if it's a string
            let dataArray = data;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                dataArray = encoder.encode(data);
            }
            
            // Encrypt the data
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                dataArray
            );
            
            // Combine IV and encrypted data
            const encryptedArray = new Uint8Array(encryptedBuffer);
            const result = new Uint8Array(iv.length + encryptedArray.length);
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
    async decryptAESGCM: function(encryptedData, key) {
        try {
            // Convert key from hex to Uint8Array if needed
            let keyArray = key;
            if (typeof key === 'string') {
                keyArray = this.hexToUint8Array(key);
            }
            
            // Create a CryptoKey from the raw key data
            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyArray,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            
            // Convert encrypted data from hex to Uint8Array if needed
            let encryptedArray = encryptedData;
            if (typeof encryptedData === 'string') {
                encryptedArray = this.hexToUint8Array(encryptedData);
            }
            
            // Extract IV (first 12 bytes)
            const iv = encryptedArray.slice(0, 12);
            const ciphertext = encryptedArray.slice(12);
            
            // Decrypt the data
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                ciphertext
            );
            
            // Convert the decrypted buffer to a string
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('[CryptoUtils] AES-GCM decryption failed:', error);
            throw error;
        }
    },
    
    // ChaCha20-Poly1305 encryption (polyfill using AES-GCM)
    // In a real implementation, this would use the actual algorithm
    async encryptChaCha20Poly1305: function(data, key) {
        // For now, use AES-GCM as a stand-in
        return this.encryptAESGCM(data, key);
    },
    
    // ChaCha20-Poly1305 decryption (polyfill using AES-GCM)
    async decryptChaCha20Poly1305: function(encryptedData, key) {
        // For now, use AES-GCM as a stand-in
        return this.decryptAESGCM(encryptedData, key);
    },
    
    // Encrypt a file
    async encryptFile: function(file, algorithm = 'aes-gcm') {
        try {
            // Generate a random encryption key
            const key = new Uint8Array(32);
            window.crypto.getRandomValues(key);
            
            // Read the file as an ArrayBuffer
            const fileBuffer = await this._readFileAsArrayBuffer(file);
            
            // Encrypt based on the chosen algorithm
            let encryptedData;
            if (algorithm === 'aes-gcm') {
                encryptedData = await this.encryptAESGCM(new Uint8Array(fileBuffer), key);
            } else if (algorithm === 'chacha20-poly1305') {
                encryptedData = await this.encryptChaCha20Poly1305(new Uint8Array(fileBuffer), key);
            } else {
                throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
            }
            
            // Calculate SHA-256 hash of the original file
            const fileHash = await this.sha256(new Uint8Array(fileBuffer));
            
            // Return encrypted data and metadata
            return {
                encryptedData,
                metadata: {
                    encryptionAlgorithm: algorithm,
                    decryptionKey: this.uint8ArrayToHex(key),
                    fileHash,
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
    async decryptFile: function(encryptedData, metadata) {
        try {
            const { encryptionAlgorithm, decryptionKey } = metadata;
            
            // Decrypt based on the algorithm
            let decryptedData;
            if (encryptionAlgorithm === 'aes-gcm') {
                decryptedData = await this.decryptAESGCM(encryptedData, decryptionKey);
            } else if (encryptionAlgorithm === 'chacha20-poly1305') {
                decryptedData = await this.decryptChaCha20Poly1305(encryptedData, decryptionKey);
            } else {
                throw new Error(`Unsupported encryption algorithm: ${encryptionAlgorithm}`);
            }
            
            // Verify hash if provided
            if (metadata.fileHash) {
                const decryptedHash = await this.sha256(decryptedData);
                if (decryptedHash !== metadata.fileHash) {
                    throw new Error('File integrity check failed: hash mismatch');
                }
            }
            
            // Convert decrypted data to Blob
            return new Blob([decryptedData], { type: metadata.type || 'application/octet-stream' });
        } catch (error) {
            console.error('[CryptoUtils] File decryption failed:', error);
            throw error;
        }
    },
    
    // Helper function to read a file as ArrayBuffer
    _readFileAsArrayBuffer: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },
    
    // Generate random bytes
    getRandomBytes: function(length) {
        const bytes = new Uint8Array(length);
        window.crypto.getRandomValues(bytes);
        return bytes;
    },
    
    // Check if secure crypto is available
    isSecureCryptoAvailable: function() {
        return window.crypto && window.crypto.subtle && window.crypto.getRandomValues;
    }
};