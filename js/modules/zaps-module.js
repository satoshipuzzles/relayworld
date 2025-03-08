/**
 * zaps-module.js
 * Lightning Network (Zaps) integration for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const ZapsModule = {
    // Module metadata
    name: "zaps",
    description: "Lightning Network (Zaps) integration for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "utils"],
    priority: 40,
    critical: false,
    
    // Module state
    initialized: false,
    
    // Wallet connection state
    webln: null, // WebLN connection if available
    nwcConnection: null, // NWC connection details
    isConnected: false,
    
    // Recent zaps
    recentZaps: [], // Array of recent zaps sent/received
    zapsReceived: 0, // Total number of zaps received
    zapsSent: 0, // Total number of zaps sent
    
    // Initialize zaps module
    init: async function() {
        console.log("[Zaps] Initializing zaps module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Check for WebLN provider
        await this._checkWebLNProvider();
        
        this.initialized = true;
        console.log("[Zaps] Zaps module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for auth events
        RelayWorldCore.eventBus.on('auth:login', this.handleLogin.bind(this));
        
        // Listen for zap receipt events
        RelayWorldCore.eventBus.on('nostr:zapReceipt', this.handleZapReceipt.bind(this));
        
        // Set up UI event listeners
        const zapClose = document.getElementById('zap-close');
        const zapSendButton = document.getElementById('zap-send-button');
        const zapPresets = document.querySelectorAll('.zap-preset');
        
        if (zapClose) {
            zapClose.addEventListener('click', () => {
                document.getElementById('zap-interface').classList.add('hide');
            });
        }
        
        if (zapSendButton) {
            zapSendButton.addEventListener('click', this.sendZap.bind(this));
        }
        
        if (zapPresets) {
            zapPresets.forEach(preset => {
                preset.addEventListener('click', () => {
                    const amount = preset.dataset.amount;
                    document.getElementById('zap-amount').value = amount;
                    
                    // Remove active class from all presets
                    zapPresets.forEach(p => p.classList.remove('active'));
                    
                    // Add active class to clicked preset
                    preset.classList.add('active');
                });
            });
        }
        
        // Set up Bitcoin Connect UI
        this._setupBitcoinConnect();
    },
    
    // Handle login event
    handleLogin: async function(data) {
        console.log("[Zaps] Handling login...");
        
        // Check for existing WebLN provider after slight delay
        setTimeout(() => this._checkWebLNProvider(), 1000);
    },
    
    // Check for existing WebLN provider
    _checkWebLNProvider: async function() {
        try {
            if (window.webln) {
                // WebLN provider found
                await window.webln.enable();
                this.webln = window.webln;
                this.isConnected = true;
                
                console.log("[Zaps] WebLN provider found and enabled");
                RelayWorldCore.eventBus.emit('zaps:walletConnected', { 
                    type: 'webln',
                    info: await this.webln.getInfo()
                });
                
                return true;
            }
        } catch (error) {
            console.error("[Zaps] Failed to enable WebLN:", error);
        }
        
        return false;
    },
    
    // Set up Bitcoin Connect modal
    _setupBitcoinConnect: function() {
        // Set up Bitcoin Connect modal
        const modal = document.getElementById('bitcoin-connect-modal');
        const closeBtn = document.getElementById('bc-modal-close');
        
        if (!modal || !closeBtn) {
            console.error("[Zaps] Bitcoin Connect modal elements not found");
            return;
        }
        
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hide');
        });
        
        // Set up connector click handlers
        const connectors = document.querySelectorAll('.bc-connector');
        
        connectors.forEach(connector => {
            connector.addEventListener('click', async () => {
                const type = connector.dataset.connector;
                
                try {
                    switch (type) {
                        case 'nwc':
                            await this.connectWithNWC();
                            break;
                        case 'alby':
                            await this.connectWithAlby();
                            break;
                        case 'webln':
                            await this.connectWithWebLN();
                            break;
                    }
                    
                    // Hide modal if connection successful
                    modal.classList.add('hide');
                    
                } catch (error) {
                    console.error(`[Zaps] Failed to connect with ${type}:`, error);
                    RelayWorldCore.eventBus.emit('ui:showToast', {
                        message: `Failed to connect: ${error.message}`,
                        type: "error"
                    });
                }
            });
        });
    },
    
    // Connect with NWC (Nostr Wallet Connect)
    connectWithNWC: async function() {
        try {
            if (!window.BitcoinConnect) {
                throw new Error("Bitcoin Connect library not found");
            }
            
            // In a real implementation, this would open a flow to scan/enter an NWC URI
            // Here we're using a simplified mock flow
            
            // Show input prompt for NWC URI
            const nwcUri = prompt("Enter your NWC URI (nostr+walletconnect://...)");
            
            if (!nwcUri || !nwcUri.startsWith('nostr+walletconnect://')) {
                throw new Error("Invalid NWC URI");
            }
            
            // Parse NWC URI to get connection details
            const parsedUri = this._parseNwcUri(nwcUri);
            
            // Store connection details
            this.nwcConnection = parsedUri;
            
            // Create WebLN provider from NWC connection
            await this._createNwcProvider();
            
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Connected to wallet via NWC",
                type: "success"
            });
            
            RelayWorldCore.eventBus.emit('zaps:walletConnected', { 
                type: 'nwc',
                info: this.nwcConnection
            });
            
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error("[Zaps] Failed to connect with NWC:", error);
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `NWC connection failed: ${error.message}`,
                type: "error"
            });
            
            throw error;
        }
    },
    
    // Parse NWC URI
    _parseNwcUri: function(uri) {
        try {
            // Remove protocol prefix
            const withoutPrefix = uri.replace('nostr+walletconnect://', '');
            
            // Split pubkey and query params
            const [pubkey, queryString] = withoutPrefix.split('?');
            
            // Parse query params
            const params = new URLSearchParams(queryString);
            
            return {
                pubkey,
                relay: params.get('relay'),
                secret: params.get('secret'),
                lud16: params.get('lud16')
            };
        } catch (error) {
            console.error("[Zaps] Failed to parse NWC URI:", error);
            throw new Error("Invalid NWC URI format");
        }
    },
    
    // Create WebLN provider from NWC connection
    _createNwcProvider: async function() {
        if (!this.nwcConnection) return false;
        
        try {
            // In a real implementation, this would create a WebLN provider
            // that communicates with the wallet via Nostr messages
            
            // For this demo, we'll create a mock WebLN provider
            this.webln = {
                enabled: true,
                
                // Get info about the connected wallet
                getInfo: async () => {
                    return {
                        alias: "NWC Wallet",
                        color: "#9945FF",
                        pubkey: this.nwcConnection.pubkey,
                        methods: ["makeInvoice", "sendPayment"]
                    };
                },
                
                // Create a lightning invoice
                makeInvoice: async (args) => {
                    const { amount, defaultMemo } = args;
                    
                    // In a real implementation, this would send a request to the wallet
                    // via Nostr to create an invoice
                    
                    // For this demo, we'll just return a mock invoice
                    return {
                        paymentRequest: `lnbcrt${amount}p1...mock_invoice...`,
                        paymentHash: `mock_payment_hash_${Date.now()}`,
                        preimage: `mock_preimage_${Date.now()}`
                    };
                },
                
                // Send a payment to a lightning invoice
                sendPayment: async (paymentRequest) => {
                    // In a real implementation, this would send a request to the wallet
                    // via Nostr to pay the invoice
                    
                    // For this demo, we'll just return a mock payment result
                    return {
                        preimage: `mock_preimage_${Date.now()}`,
                        paymentHash: `mock_payment_hash_${Date.now()}`
                    };
                }
            };
            
            console.log("[Zaps] Created NWC WebLN provider");
            return true;
            
        } catch (error) {
            console.error("[Zaps] Failed to create NWC provider:", error);
            throw error;
        }
    },
    
    // Connect with Alby extension
    connectWithAlby: async function() {
        try {
            if (!window.alby) {
                throw new Error("Alby extension not found");
            }
            
            // Enable Alby
            await window.alby.enable();
            
            // Use Alby as WebLN provider
            this.webln = window.alby;
            this.isConnected = true;
            
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Connected to Alby wallet",
                type: "success"
            });
            
            RelayWorldCore.eventBus.emit('zaps:walletConnected', { 
                type: 'alby',
                info: await this.webln.getInfo()
            });
            
            return true;
        } catch (error) {
            console.error("[Zaps] Failed to connect with Alby:", error);
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Alby connection failed: ${error.message}`,
                type: "error"
            });
            
            throw error;
        }
    },
    
    // Connect with any WebLN provider
    connectWithWebLN: async function() {
        try {
            // Check if WebLN is available
            if (!window.webln) {
                throw new Error("No WebLN provider found");
            }
            
            // Enable WebLN
            await window.webln.enable();
            
            // Use provider
            this.webln = window.webln;
            this.isConnected = true;
            
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Connected to Lightning wallet",
                type: "success"
            });
            
            RelayWorldCore.eventBus.emit('zaps:walletConnected', { 
                type: 'webln',
                info: await this.webln.getInfo()
            });
            
            return true;
        } catch (error) {
            console.error("[Zaps] Failed to connect with WebLN:", error);
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `WebLN connection failed: ${error.message}`,
                type: "error"
            });
            
            throw error;
        }
    },
    
    // Show zap interface for a user
    showZapInterface: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Nostr module not available",
                type: "error"
            });
            return;
        }
        
        const user = nostrModule.getUser(pubkey);
        if (!user) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "User not found",
                type: "error"
            });
            return;
        }
        
        // Check if we have a lightning wallet connected
        if (!this.isConnected && !this._checkWebLNProvider()) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Please connect a lightning wallet first",
                type: "info"
            });
            
            // Show Bitcoin Connect modal
            const bcModal = document.getElementById('bitcoin-connect-modal');
            if (bcModal) {
                bcModal.classList.remove('hide');
                
                // Update modal title to make it clearer
                const modalTitle = document.getElementById('bc-modal-title');
                if (modalTitle) {
                    modalTitle.textContent = "Connect Lightning Wallet to Send Zaps";
                }
            } else {
                RelayWorldCore.eventBus.emit('ui:showToast', {
                    message: "Bitcoin Connect modal not found",
                    type: "error"
                });
            }
            return;
        }
        
        // Update zap interface with user info
        const zapInterface = document.getElementById('zap-interface');
        if (!zapInterface) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Zap interface not found",
                type: "error"
            });
            return;
        }
        
        const userImage = document.getElementById('zap-target-image');
        const userName = document.getElementById('zap-target-name');
        
        if (userImage) userImage.src = user.profile?.picture || "assets/icons/default-avatar.png";
        if (userName) userName.textContent = user.profile?.name || user.pubkey.slice(0, 8);
        
        // Set default amount
        const zapAmount = document.getElementById('zap-amount');
        const zapMessage = document.getElementById('zap-message');
        
        if (zapAmount) zapAmount.value = "21";
        if (zapMessage) zapMessage.value = "";
        
        // Reset preset buttons
        document.querySelectorAll('.zap-preset').forEach(preset => {
            preset.classList.remove('active');
        });
        const defaultPreset = document.querySelector('.zap-preset[data-amount="21"]');
        if (defaultPreset) defaultPreset.classList.add('active');
        
        // Store target pubkey
        zapInterface.dataset.targetPubkey = pubkey;
        
        // Show interface
        zapInterface.classList.remove('hide');
    },
    
    // Send a zap to a user
    sendZap: async function() {
        const zapInterface = document.getElementById('zap-interface');
        if (!zapInterface) return;
        
        const targetPubkey = zapInterface.dataset.targetPubkey;
        
        if (!targetPubkey) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "No zap target selected",
                type: "error"
            });
            return;
        }
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const user = nostrModule.getUser(targetPubkey);
        if (!user) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "User not found",
                type: "error"
            });
            return;
        }
        
        // Check for lightning address (lud16) or lnurl in user profile
        const lightningAddress = user.profile?.lud16;
        if (!lightningAddress) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "User doesn't have a lightning address",
                type: "error"
            });
            return;
        }
        
        // Get zap amount and message
        const amount = parseInt(document.getElementById('zap-amount').value);
        const message = document.getElementById('zap-message').value;
        
        if (isNaN(amount) || amount <= 0) {
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Invalid zap amount",
                type: "error"
            });
            return;
        }
        
        try {
            // Show loading state
            const zapSendButton = document.getElementById('zap-send-button');
            if (zapSendButton) {
                zapSendButton.disabled = true;
                zapSendButton.textContent = "Sending...";
            }
            
            // Create a zap request (NIP-57)
            const zapRequest = await this._createZapRequest(targetPubkey, amount, message);
            
            // Get LNURL pay info
            const lnurlInfo = await this._getLnurlInfo(lightningAddress);
            
            // Check if the wallet supports zaps
            if (!lnurlInfo.allowsNostr || !lnurlInfo.nostrPubkey) {
                RelayWorldCore.eventBus.emit('ui:showToast', {
                    message: "User's wallet doesn't support zaps",
                    type: "error"
                });
                
                // Fallback to regular lightning payment
                await this._sendRegularPayment(lightningAddress, amount, message);
            } else {
                // Send zap
                await this._sendZapPayment(lnurlInfo, zapRequest);
            }
            
            // Track zap sent
            this.zapsSent += amount;
            this.recentZaps.push({
                type: 'sent',
                pubkey: targetPubkey,
                amount,
                message,
                timestamp: Date.now()
            });
            
            // Trim recent zaps list
            if (this.recentZaps.length > 20) {
                this.recentZaps.shift();
            }
            
            // Update player stats
            const playerModule = RelayWorldCore.getModule('player');
            if (playerModule) {
                playerModule.score += Math.floor(amount / 10); // 10% of zap amount as score
                
                // Save stats
                if (playerModule.saveData) {
                    playerModule.saveData();
                }
                
                // Publish updated stats
                if (nostrModule.publishPlayerStats) {
                    nostrModule.publishPlayerStats();
                }
                
                // Update UI
                RelayWorldCore.eventBus.emit('player:statsUpdated', {
                    score: playerModule.score,
                    zapsSent: this.zapsSent
                });
            }
            
            // Show success message
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Zapped ${user.profile?.name || targetPubkey.slice(0, 8)} ${amount} sats!`,
                type: "success"
            });
            
            // Create zap effect
            this._createZapEffect(user.x, user.y);
            
            // Hide zap interface
            zapInterface.classList.add('hide');
            
            // Fire event
            RelayWorldCore.eventBus.emit('zaps:zapSent', {
                recipientPubkey: targetPubkey,
                amount,
                message
            });
            
        } catch (error) {
            console.error("[Zaps] Failed to send zap:", error);
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Zap failed: ${error.message}`,
                type: "error"
            });
        } finally {
            // Reset button state
            const zapSendButton = document.getElementById('zap-send-button');
            if (zapSendButton) {
                zapSendButton.disabled = false;
                zapSendButton.textContent = "Send Zap";
            }
        }
    },
    
    // Create a zap request (NIP-57)
    _createZapRequest: async function(recipientPubkey, amount, comment) {
        try {
            const nostrModule = RelayWorldCore.getModule('nostr');
            const playerModule = RelayWorldCore.getModule('player');
            
            if (!nostrModule || !playerModule) {
                throw new Error("Required modules not available");
            }
            
            // Create zap request event (kind 9734)
            const zapRequestEvent = {
                kind: 9734,
                content: comment || "",
                tags: [
                    ["p", recipientPubkey],
                    ["amount", (amount * 1000).toString()], // Convert to millisats
                    ["relays", ...Array.from(nostrModule.relays || [])],
                ],
                created_at: Math.floor(Date.now() / 1000),
                pubkey: playerModule.pubkey
            };
            
            // Sign the event
            const signedEvent = await nostrModule.signEvent(zapRequestEvent);
            
            return signedEvent;
        } catch (error) {
            console.error("[Zaps] Failed to create zap request:", error);
            throw error;
        }
    },
    
    // Get LNURL pay info from a lightning address
    _getLnurlInfo: async function(lightningAddress) {
        try {
            // Parse lightning address
            const [name, domain] = lightningAddress.split('@');
            
            // Fetch LNURL info
            const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
            const data = await response.json();
            
            return {
                callback: data.callback,
                minSendable: data.minSendable,
                maxSendable: data.maxSendable,
                nostrPubkey: data.nostrPubkey,
                allowsNostr: data.allowsNostr || false
            };
        } catch (error) {
            console.error("[Zaps] Failed to get LNURL info:", error);
            throw new Error("Failed to get lightning address info");
        }
    },
    
    // Send a zap payment using NIP-57
    _sendZapPayment: async function(lnurlInfo, zapRequest) {
        try {
            if (!this.webln) {
                throw new Error("No WebLN provider available");
            }
            
            // Amount in millisats
            const amount = parseInt(zapRequest.tags.find(t => t[0] === "amount")[1]);
            
            // Check against min/max
            if (amount < lnurlInfo.minSendable) {
                throw new Error(`Amount too small. Minimum is ${lnurlInfo.minSendable / 1000} sats.`);
            }
            
            if (amount > lnurlInfo.maxSendable) {
                throw new Error(`Amount too large. Maximum is ${lnurlInfo.maxSendable / 1000} sats.`);
            }
            
            // Encode zap request as JSON and encode for URL
            const encodedZapRequest = encodeURIComponent(JSON.stringify(zapRequest));
            
            // Create callback URL with zap request
            const callbackUrl = `${lnurlInfo.callback}?amount=${amount}&nostr=${encodedZapRequest}`;
            
            // Fetch invoice
            const response = await fetch(callbackUrl);
            const data = await response.json();
            
            if (!data.pr) {
                throw new Error("No invoice received from lightning provider");
            }
            
            // Pay invoice
            const result = await this.webln.sendPayment(data.pr);
            
            console.log("[Zaps] Zap payment sent:", result);
            return result;
            
        } catch (error) {
            console.error("[Zaps] Failed to send zap payment:", error);
            throw error;
        }
    },
    
    // Send a regular lightning payment (non-zap)
    _sendRegularPayment: async function(lightningAddress, amount, message) {
        try {
            if (!this.webln) {
                throw new Error("No WebLN provider available");
            }
            
            // Parse lightning address
            const [name, domain] = lightningAddress.split('@');
            
            // Fetch LNURL info
            const response = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
            const data = await response.json();
            
            // Amount in millisats
            const millisats = amount * 1000;
            
            // Check against min/max
            if (millisats < data.minSendable) {
                throw new Error(`Amount too small. Minimum is ${data.minSendable / 1000} sats.`);
            }
            
            if (millisats > data.maxSendable) {
                throw new Error(`Amount too large. Maximum is ${data.maxSendable / 1000} sats.`);
            }
            
            // Create callback URL
            let callbackUrl = `${data.callback}?amount=${millisats}`;
            
            // Add comment if provided
            if (message && data.commentAllowed && message.length <= data.commentAllowed) {
                callbackUrl += `&comment=${encodeURIComponent(message)}`;
            }
            
            // Fetch invoice
            const invoiceResponse = await fetch(callbackUrl);
            const invoiceData = await invoiceResponse.json();
            
            if (!invoiceData.pr) {
                throw new Error("No invoice received from lightning provider");
            }
            
            // Pay invoice
            const result = await this.webln.sendPayment(invoiceData.pr);
            
            console.log("[Zaps] Lightning payment sent:", result);
            return result;
            
        } catch (error) {
            console.error("[Zaps] Failed to send lightning payment:", error);
            throw error;
        }
    },
    
    // Handle zap receipt (NIP-57)
    handleZapReceipt: function(data) {
        try {
            const zapReceipt = data.event;
            
            // Parse zap receipt (kind 9735)
            
            // Get amount from BOLT11 invoice
            const bolt11 = zapReceipt.tags.find(t => t[0] === "bolt11")?.[1];
            if (!bolt11) return;
            
            // In a real implementation, we would decode the BOLT11 invoice to get the amount
            // For this demo we'll extract it from the description tag
            const descriptionTag = zapReceipt.tags.find(t => t[0] === "description");
            if (!descriptionTag || !descriptionTag[1]) return;
            
            let zapRequest;
            try {
                zapRequest = JSON.parse(descriptionTag[1]);
            } catch (e) {
                console.error("[Zaps] Failed to parse zap request:", e);
                return;
            }
            
            // Get amount from zap request
            const amountTag = zapRequest.tags.find(t => t[0] === "amount");
            if (!amountTag || !amountTag[1]) return;
            
            const amountMsat = parseInt(amountTag[1]);
            const amount = amountMsat / 1000;
            
            // Get recipient pubkey (should be in 'p' tag of zap request)
            const recipientTag = zapRequest.tags.find(t => t[0] === "p");
            if (!recipientTag || !recipientTag[1]) return;
            
            const recipientPubkey = recipientTag[1];
            
            // Get sender pubkey (from zap request event)
            const senderPubkey = zapRequest.pubkey;
            
            // Check if current player is the recipient
            const playerModule = RelayWorldCore.getModule('player');
            if (!playerModule || playerModule.pubkey !== recipientPubkey) return;
            
            console.log(`[Zaps] Received ${amount} sats zap from ${senderPubkey.slice(0, 8)}`);
            
            // Track zap received
            this.zapsReceived += amount;
            this.recentZaps.push({
                type: 'received',
                pubkey: senderPubkey,
                amount,
                message: zapRequest.content,
                timestamp: Date.now()
            });
            
            // Trim recent zaps list
            if (this.recentZaps.length > 20) {
                this.recentZaps.shift();
            }
            
            // Update player stats
            playerModule.score += amount;
            
            // Save stats
            if (playerModule.saveData) {
                playerModule.saveData();
            }
            
            // Publish updated stats
            const nostrModule = RelayWorldCore.getModule('nostr');
            if (nostrModule && nostrModule.publishPlayerStats) {
                nostrModule.publishPlayerStats();
            }
            
            // Update UI
            RelayWorldCore.eventBus.emit('player:statsUpdated', {
                score: playerModule.score,
                zapsReceived: this.zapsReceived
            });
            
            // Show notification
            const sender = nostrModule ? nostrModule.getUser(senderPubkey) : null;
            const senderName = sender?.profile?.name || senderPubkey.slice(0, 8);
            
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: `Received ${amount} sats zap from ${senderName}!`,
                type: "success"
            });
            
            // Create zap effect on player
            this._createZapEffect(playerModule.x, playerModule.y);
            
            // Play sound
            RelayWorldCore.eventBus.emit('audio:playSound', { 
                name: 'zap', 
                options: { volume: 0.7 } 
            });
            
            // Fire event
            RelayWorldCore.eventBus.emit('zaps:zapReceived', {
                senderPubkey,
                amount,
                message: zapRequest.content
            });
            
        } catch (error) {
            console.error("[Zaps] Failed to handle zap receipt:", error);
        }
    },
    
    // Create visual zap effect
    _createZapEffect: function(x, y) {
        // Create zap effect element
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const effect = document.createElement('div');
        effect.className = 'zap-effect';
        
        // Position at target coordinates
        const gameModule = RelayWorldCore.getModule('game');
        if (!gameModule || !gameModule.camera || !gameModule.canvas) {
            // Fallback positioning if game module not available
            effect.style.left = `50%`;
            effect.style.top = `50%`;
            effect.style.transform = 'translate(-50%, -50%)';
        } else {
            // Position based on game camera
            const screenX = x - (gameModule.camera.x - gameModule.canvas.width / 2);
            const screenY = y - (gameModule.camera.y - gameModule.canvas.height / 2);
            
            effect.style.left = `${screenX - 50}px`;
            effect.style.top = `${screenY - 50}px`;
        }
        
        // Add to game container
        gameContainer.appendChild(effect);
        
        // Play sound
        RelayWorldCore.eventBus.emit('audio:playSound', { 
            name: 'zap', 
            options: { volume: 0.7 } 
        });
        
        // Remove after animation completes
        setTimeout(() => {
            effect.remove();
        }, 500);
    },
    
   // Get recent zaps for a user
    getZapsForUser: function(pubkey) {
        return this.recentZaps.filter(zap => 
            (zap.type === 'sent' && zap.pubkey === pubkey) ||
            (zap.type === 'received' && zap.pubkey === pubkey)
        );
    },
    
    // Get leaderboard by zaps sent/received
    getZapLeaderboard: function() {
        const zapsByUser = new Map();
        
        // Count zaps sent/received for all users
        for (const zap of this.recentZaps) {
            const pubkey = zap.pubkey;
            
            if (!zapsByUser.has(pubkey)) {
                zapsByUser.set(pubkey, { sent: 0, received: 0, total: 0 });
            }
            
            const userZaps = zapsByUser.get(pubkey);
            
            if (zap.type === 'sent') {
                userZaps.sent += zap.amount;
            } else {
                userZaps.received += zap.amount;
            }
            
            userZaps.total = userZaps.sent + userZaps.received;
        }
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        // Convert to array and sort by total zaps
        const leaderboard = Array.from(zapsByUser.entries())
            .map(([pubkey, zaps]) => ({
                pubkey,
                ...zaps,
                user: nostrModule ? nostrModule.getUser(pubkey) : null
            }))
            .sort((a, b) => b.total - a.total);
        
        return leaderboard;
    },
    
    // Check if wallet is connected
    isWalletConnected: function() {
        return this.isConnected && !!this.webln;
    },
    
    // Get wallet info
    getWalletInfo: async function() {
        if (!this.isConnected || !this.webln) {
            return null;
        }
        
        try {
            return await this.webln.getInfo();
        } catch (error) {
            console.error("[Zaps] Failed to get wallet info:", error);
            return null;
        }
    },
    
    // Disconnect wallet
    disconnectWallet: function() {
        this.webln = null;
        this.nwcConnection = null;
        this.isConnected = false;
        
        RelayWorldCore.eventBus.emit('zaps:walletDisconnected', null);
        
        RelayWorldCore.eventBus.emit('ui:showToast', {
            message: "Lightning wallet disconnected",
            type: "info"
        });
        
        return true;
    },
    
    // Show Bitcoin Connect modal
    showConnectModal: function() {
        const modal = document.getElementById('bitcoin-connect-modal');
        if (modal) {
            modal.classList.remove('hide');
        }
    },
    
    // Get total zaps sent
    getTotalZapsSent: function() {
        return this.zapsSent;
    },
    
    // Get total zaps received
    getTotalZapsReceived: function() {
        return this.zapsReceived;
    },
    
    // Check if user can receive zaps (has lightning address)
    canReceiveZaps: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return false;
        
        const user = nostrModule.getUser(pubkey);
        return user && !!user.profile?.lud16;
    }
};