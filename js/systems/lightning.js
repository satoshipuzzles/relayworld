/**
 * Lightning Network Integration Module for Relay World 2.0
 * Handles Bitcoin Lightning Network payments via WebLN/NWC
 */

const lightning = (function() {
    // Private members
    let webln = null;
    let isWebLNAvailable = false;
    let nwcConnection = null;
    let isNWCAvailable = false;
    let isInitialized = false;
    
    // Pending payment requests
    const pendingPayments = new Map();
    
    /**
     * Initialize Lightning Network integration
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing Lightning Network integration...");
        
        try {
            // Check for WebLN
            await checkWebLNAvailability();
            
            // Set up NWC if configured
            await setupNWC();
            
            isInitialized = true;
            return true;
        } catch (error) {
            debug.error("Lightning initialization failed:", error);
            return false;
        }
    }
    
    /**
     * Check if WebLN is available in the browser
     * @returns {Promise<boolean>} - WebLN availability
     */
    async function checkWebLNAvailability() {
        try {
            if (typeof window.webln !== 'undefined') {
                webln = window.webln;
                
                // Try to enable WebLN
                await webln.enable();
                isWebLNAvailable = true;
                
                debug.log("WebLN is available");
                return true;
            } else {
                debug.log("WebLN is not available");
                isWebLNAvailable = false;
                return false;
            }
        } catch (error) {
            debug.error("WebLN check failed:", error);
            isWebLNAvailable = false;
            return false;
        }
    }
    
    /**
     * Set up Nostr Wallet Connect if configured
     * @returns {Promise<boolean>} - Success status
     */
    async function setupNWC() {
        try {
            // Check if NWC connection string is configured
            const nwcConnectionString = localStorage.getItem('nwc_connection');
            
            if (!nwcConnectionString) {
                debug.log("No NWC connection configured");
                isNWCAvailable = false;
                return false;
            }
            
            // TODO: Implement NWC connection
            // This would require a library for NWC
            debug.log("NWC support not implemented yet");
            isNWCAvailable = false;
            
            return false;
        } catch (error) {
            debug.error("NWC setup failed:", error);
            isNWCAvailable = false;
            return false;
        }
    }
    
    /**
     * Make a payment using WebLN or NWC
     * @param {string} paymentRequest - BOLT11 payment request
     * @param {string} memo - Payment memo
     * @returns {Promise<Object>} - Payment result
     */
    async function makePayment(paymentRequest, memo = null) {
        if (!isInitialized) {
            throw new Error("Lightning module not initialized");
        }
        
        // Check if payment method is available
        if (!isWebLNAvailable && !isNWCAvailable) {
            throw new Error("No Lightning payment method available");
        }
        
        try {
            let paymentResult;
            
            // Try WebLN first if available
            if (isWebLNAvailable) {
                paymentResult = await makeWebLNPayment(paymentRequest, memo);
            } 
            // Fall back to NWC if available
            else if (isNWCAvailable) {
                paymentResult = await makeNWCPayment(paymentRequest, memo);
            } else {
                throw new Error("No payment method available");
            }
            
            // Return payment result
            return paymentResult;
        } catch (error) {
            debug.error("Payment failed:", error);
            throw error;
        }
    }
    
    /**
     * Make a payment using WebLN
     * @param {string} paymentRequest - BOLT11 payment request
     * @param {string} memo - Payment memo
     * @returns {Promise<Object>} - Payment result
     */
    async function makeWebLNPayment(paymentRequest, memo = null) {
        try {
            // Make payment
            const response = await webln.sendPayment(paymentRequest);
            
            debug.log("WebLN payment successful:", response);
            
            return {
                success: true,
                preimage: response.preimage,
                paymentHash: response.paymentHash || extractPaymentHash(paymentRequest)
            };
        } catch (error) {
            debug.error("WebLN payment failed:", error);
            throw error;
        }
    }
    
    /**
     * Make a payment using NWC
     * @param {string} paymentRequest - BOLT11 payment request
     * @param {string} memo - Payment memo
     * @returns {Promise<Object>} - Payment result
     */
    async function makeNWCPayment(paymentRequest, memo = null) {
        // TODO: Implement NWC payment
        throw new Error("NWC payments not implemented yet");
    }
    
    /**
     * Create an invoice using LNbits
     * @param {number} amount - Amount in sats
     * @param {string} memo - Invoice description
     * @returns {Promise<Object>} - Invoice data
     */
    async function createLNbitsInvoice(amount, memo) {
        try {
            // Check if LNbits API key is configured
            if (!config.LNBITS_API_KEY || !config.LNBITS_URL) {
                throw new Error("LNbits not configured");
            }
            
            // Create invoice
            const response = await fetch(`${config.LNBITS_URL}/api/v1/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': config.LNBITS_API_KEY
                },
                body: JSON.stringify({
                    out: false,
                    amount: amount,
                    memo: memo || "Relay World 2.0 payment",
                    // Include webhook if configured
                    webhook: config.LNBITS_WEBHOOK_URL || null
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`LNbits API error: ${response.status} - ${errorText}`);
            }
            
            const invoiceData = await response.json();
            
            // Store pending payment
            pendingPayments.set(invoiceData.payment_hash, {
                amount,
                memo,
                created: Date.now(),
                paid: false
            });
            
            return invoiceData;
        } catch (error) {
            debug.error("Failed to create invoice:", error);
            throw error;
        }
    }
    
    /**
     * Check if an invoice has been paid
     * @param {string} paymentHash - Payment hash of the invoice
     * @returns {Promise<boolean>} - Payment status
     */
    async function checkPaymentStatus(paymentHash) {
        try {
            // Check if payment is in pending map
            if (!pendingPayments.has(paymentHash)) {
                return false;
            }
            
            // Check if LNbits is configured
            if (!config.LNBITS_API_KEY || !config.LNBITS_URL) {
                throw new Error("LNbits not configured");
            }
            
            // Check payment status
            const response = await fetch(`${config.LNBITS_URL}/api/v1/payments/${paymentHash}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': config.LNBITS_API_KEY
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Payment not found, assume not paid
                    return false;
                }
                
                const errorText = await response.text();
                throw new Error(`LNbits API error: ${response.status} - ${errorText}`);
            }
            
            const paymentData = await response.json();
            
            // Update pending payment
            if (paymentData.paid) {
                const pendingPayment = pendingPayments.get(paymentHash);
                pendingPayment.paid = true;
                pendingPayment.paidAt = Date.now();
                pendingPayments.set(paymentHash, pendingPayment);
            }
            
            return paymentData.paid;
        } catch (error) {
            debug.error("Failed to check payment status:", error);
            return false;
        }
    }
    
    /**
     * Wait for a payment to be confirmed
     * @param {string} paymentHash - Payment hash
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} - True if payment was received
     */
    async function waitForPaymentConfirmation(paymentHash, timeout = 300000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = 2000; // 2 seconds
            
            // Setup interval to check payment status
            const intervalId = setInterval(async () => {
                try {
                    // Check if payment was received
                    const isPaid = await checkPaymentStatus(paymentHash);
                    
                    if (isPaid) {
                        clearInterval(intervalId);
                        resolve(true);
                        return;
                    }
                    
                    // Check for timeout
                    if (Date.now() - startTime > timeout) {
                        clearInterval(intervalId);
                        resolve(false);
                        return;
                    }
                } catch (error) {
                    debug.error("Error checking payment:", error);
                    // Continue checking despite errors
                }
            }, checkInterval);
        });
    }
    
    /**
     * Create and show a payment request dialog
     * @param {number} amount - Amount in sats
     * @param {string} memo - Payment memo
     * @returns {Promise<boolean>} - True if payment was successful
     */
    async function showPaymentDialog(amount, memo) {
        try {
            // Create invoice
            const invoice = await createLNbitsInvoice(amount, memo);
            
            if (!invoice || !invoice.payment_request) {
                throw new Error("Failed to create invoice");
            }
            
            // Show payment dialog
            ui.showPaymentDialog(invoice.payment_request, invoice.payment_hash, amount);
            
            // Wait for payment confirmation
            const paid = await waitForPaymentConfirmation(invoice.payment_hash);
            
            // Hide payment dialog
            ui.hidePaymentDialog();
            
            if (paid) {
                ui.showToast(`Payment of ${amount} sats received!`, "success");
            } else {
                ui.showToast("Payment not received", "error");
            }
            
            return paid;
        } catch (error) {
            debug.error("Payment dialog error:", error);
            ui.hidePaymentDialog();
            ui.showToast(`Payment error: ${error.message}`, "error");
            return false;
        }
    }
    
    /**
     * Create a zap request (NIP-57)
     * @param {string} recipientPubkey - Recipient's pubkey
     * @param {number} amount - Amount in millisats
     * @param {string} content - Content for the zap note
     * @param {string} eventId - Event ID being zapped (optional)
     * @returns {Promise<Object>} - Zap request event
     */
    async function createZapRequest(recipientPubkey, amount, content, eventId = null) {
        try {
            // Create tags
            const tags = [
                ["p", recipientPubkey],
                ["amount", amount.toString()],
                ["relays", ...relays.getAllRelays()]
            ];
            
            // Add event reference if provided
            if (eventId) {
                tags.push(["e", eventId]);
            }
            
            // Create zap request event
            const zapRequest = nostrClient.createEvent(
                config.EVENT_KINDS.ZAP_REQUEST,
                content,
                tags
            );
            
            // Sign the event
            const signedZapRequest = await nostrClient.signEvent(zapRequest);
            
            return signedZapRequest;
        } catch (error) {
            debug.error("Failed to create zap request:", error);
            throw error;
        }
    }
    
    /**
     * Send a zap
     * @param {string} recipientPubkey - Recipient's pubkey
     * @param {number} amount - Amount in sats
     * @param {string} comment - Zap comment
     * @param {string} eventId - Event ID being zapped (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async function sendZap(recipientPubkey, amount, comment = "", eventId = null) {
        try {
            // Check if payment method is available
            if (!isWebLNAvailable && !isNWCAvailable) {
                throw new Error("No Lightning payment method available");
            }
            
            // Create zap request
            const zapRequest = await createZapRequest(
                recipientPubkey,
                amount * 1000, // Convert to millisats
                comment,
                eventId
            );
            
            // Encode zap request
            const encodedZapRequest = btoa(JSON.stringify(zapRequest));
            
            // Get invoice from user's Lightning wallet
            let paymentRequest;
            let preimage;
            
            // Use WebLN if available
            if (isWebLNAvailable) {
                try {
                    // Use WebLN to get invoice
                    const response = await webln.zapRequest({
                        target: recipientPubkey,
                        amount: amount,
                        relays: relays.getAllRelays(),
                        comment: comment,
                        eventId: eventId
                    });
                    
                    paymentRequest = response.paymentRequest;
                    
                    // Make payment
                    const paymentResponse = await webln.sendPayment(paymentRequest);
                    preimage = paymentResponse.preimage;
                } catch (error) {
                    debug.error("WebLN zap failed:", error);
                    throw error;
                }
            } 
            // Use NWC if available
            else if (isNWCAvailable) {
                // TODO: Implement NWC zap
                throw new Error("NWC zaps not implemented yet");
            } else {
                throw new Error("No payment method available");
            }
            
            // Create zap receipt event
            const zapReceiptEvent = {
                kind: config.EVENT_KINDS.ZAP_RECEIPT,
                pubkey: recipientPubkey, // Ideally the recipient's pubkey, but might be our pubkey
                content: comment,
                tags: [
                    ["p", recipientPubkey],
                    ["bolt11", paymentRequest],
                    ["description", encodedZapRequest]
                ]
            };
            
            // Add event reference if provided
            if (eventId) {
                zapReceiptEvent.tags.push(["e", eventId]);
            }
            
            // Add preimage if available
            if (preimage) {
                zapReceiptEvent.tags.push(["preimage", preimage]);
            }
            
            // Publish zap receipt
            await relays.publishToGameRelay(zapReceiptEvent);
            
            // Show success message
            ui.showToast(`Zapped ${amount} sats to ${recipientPubkey.substring(0, 8)}...`, "success");
            
            return true;
        } catch (error) {
            debug.error("Zap failed:", error);
            ui.showToast(`Zap failed: ${error.message}`, "error");
            return false;
        }
    }
    
    /**
     * Extract payment hash from BOLT11 invoice
     * @param {string} bolt11 - BOLT11 payment request
     * @returns {string|null} - Payment hash or null if not found
     */
    function extractPaymentHash(bolt11) {
        try {
            // Extract payment hash from BOLT11
            // This is a simplified implementation
            const parts = bolt11.split('1');
            
            // Find the 'p' tag (payment hash)
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].startsWith('p')) {
                    // The next 52 characters after 'p' should be the payment hash
                    return parts[i].substring(1, 53);
                }
            }
            
            return null;
        } catch (error) {
            debug.error("Failed to extract payment hash:", error);
            return null;
        }
    }
    
    /**
     * Show zap dialog for a player
     * @param {string} pubkey - Player's pubkey
     * @returns {Promise<boolean>} - Success status
     */
    async function showZapDialog(pubkey) {
        // Get custom zap amounts or use defaults
        const zapAmounts = [10, 21, 100, 1000];
        
        // Show dialog
        const result = await ui.showZapDialog(pubkey, zapAmounts);
        
        if (!result) return false;
        
        // Send zap
        return sendZap(pubkey, result.amount, result.comment);
    }
    
    /**
     * Handle zap receipt
     * @param {Object} zapReceipt - Zap receipt event
     */
    function handleZapReceipt(zapReceipt) {
        try {
            // Extract relevant data
            const recipientTag = zapReceipt.tags.find(tag => tag[0] === 'p');
            const bolt11Tag = zapReceipt.tags.find(tag => tag[0] === 'bolt11');
            
            if (!recipientTag || !bolt11Tag) {
                debug.warn("Invalid zap receipt, missing tags");
                return;
            }
            
            const recipientPubkey = recipientTag[1];
            const bolt11 = bolt11Tag[1];
            
            // Extract amount from BOLT11
            // (In a real implementation, we'd use a BOLT11 decoder library)
            const amount = 0; // Placeholder
            
            // Show zap effect
            ui.showZapEffect(recipientPubkey, amount);
            
            debug.log(`Zap receipt for ${recipientPubkey}, amount: ${amount} sats`);
        } catch (error) {
            debug.error("Error handling zap receipt:", error);
        }
    }
    
    // Public API
    return {
        initialize,
        makePayment,
        createLNbitsInvoice,
        checkPaymentStatus,
        waitForPaymentConfirmation,
        showPaymentDialog,
        sendZap,
        showZapDialog,
        handleZapReceipt,
        
        // Getters
        isWebLNAvailable: () => isWebLNAvailable,
        isNWCAvailable: () => isNWCAvailable,
        isLightningAvailable: () => isWebLNAvailable || isNWCAvailable
    };
})();
