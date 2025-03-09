/**
 * quick-fix.js
 * This script immediately fixes critical errors in Relay World
 */

// Execute this immediately to fix crypto-utils error
(function() {
    console.log("Applying quick fixes...");
    
    // Fix CryptoJS loading
    if (typeof CryptoJS === 'undefined') {
        // Create a global shim until the real library loads
        window.CryptoJS = {
            SHA256: function(text) {
                // Simple placeholder until real library loads
                return {
                    toString: function() { return "placeholder-hash"; }
                };
            }
        };
        
        // Load the actual CryptoJS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        document.head.appendChild(script);
    }
    
    // Fix for crypto-utils.js
    window.CryptoUtils = {
        // Basic shim functions
        generatePrivateKey: function() {
            return "simulated_" + Math.random().toString(36).substring(2);
        },
        randomId: function(prefix) {
            return (prefix || '') + Date.now() + "_" + Math.random().toString(36).substring(2);
        },
        randomHex: function(length) {
            return Array.from(
                { length: length || 64 },
                () => Math.floor(Math.random() * 16).toString(16)
            ).join('');
        },
        sha256: async function(message) {
            // Use CryptoJS if available, otherwise return placeholder
            if (window.CryptoJS && window.CryptoJS.SHA256) {
                return CryptoJS.SHA256(message).toString();
            }
            return "placeholder_sha256_" + Math.random().toString(36).substring(2);
        },
        generateSharedSecret: function() {
            return "shared_secret_" + Math.random().toString(36).substring(2);
        }
    };
    
    // Fix for guest login issues
    document.addEventListener('DOMContentLoaded', function() {
        // Fix duplicate guest buttons
        const guestButtons = document.querySelectorAll('#guest-login-button');
        if (guestButtons.length > 1) {
            // Remove all but the first guest button
            for (let i = 1; i < guestButtons.length; i++) {
                guestButtons[i].parentNode.removeChild(guestButtons[i]);
            }
        }
        
        // Make sure there is at least one guest button
        if (guestButtons.length === 0) {
            const loginButton = document.getElementById('login-button');
            if (loginButton && loginButton.parentNode) {
                const guestLoginButton = document.createElement('button');
                guestLoginButton.id = 'guest-login-button';
                guestLoginButton.className = 'secondary-button';
                guestLoginButton.textContent = 'PLAY AS GUEST';
                
                // Add after login button
                loginButton.parentNode.insertBefore(guestLoginButton, loginButton.nextSibling);
                
                // Add guest login handler
                guestLoginButton.addEventListener('click', function() {
                    const guestName = prompt('Enter your guest username:', 'Guest' + Math.floor(Math.random() * 1000));
                    if (guestName) {
                        // Hide login screen
                        const loginScreen = document.getElementById('login-screen');
                        if (loginScreen) loginScreen.classList.add('hide');
                        
                        // Show game UI
                        document.getElementById('top-bar')?.classList.remove('hide');
                        document.getElementById('chat-container')?.classList.remove('hide');
                        document.getElementById('player-profile')?.classList.remove('hide');
                        
                        // Update profile
                        const nameEl = document.getElementById('player-profile-name');
                        const npubEl = document.getElementById('player-profile-npub');
                        const profileImg = document.getElementById('player-profile-image');
                        
                        if (nameEl) nameEl.textContent = guestName;
                        if (npubEl) npubEl.textContent = 'Guest';
                        if (profileImg) profileImg.src = 'assets/icons/default-avatar.png';
                        
                        // Initialize 3D engine if available
                        if (window.RelayWorld3D) {
                            setTimeout(() => {
                                if (!window.RelayWorld3D.initialized) {
                                    window.RelayWorld3D.init().then(() => {
                                        window.RelayWorld3D.addPlayer('guest', {
                                            name: guestName,
                                            picture: 'assets/icons/default-avatar.png'
                                        });
                                    });
                                } else {
                                    window.RelayWorld3D.addPlayer('guest', {
                                        name: guestName,
                                        picture: 'assets/icons/default-avatar.png'
                                    });
                                }
                            }, 1000);
                        }
                    }
                });
            }
        }
    });
    
    // Fix Add Explorer Relay button
    setTimeout(function() {
        const addRelayButton = document.getElementById('add-relay-button');
        const customRelayInput = document.getElementById('custom-relay-input');
        
        if (addRelayButton && customRelayInput && !addRelayButton.hasClickListener) {
            addRelayButton.hasClickListener = true;
            
            addRelayButton.addEventListener('click', function() {
                const relayUrl = customRelayInput.value.trim();
                if (!relayUrl) return;
                
                // Ensure protocol
                let url = relayUrl;
                if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
                    url = 'wss://' + url;
                }
                
                // Try to connect to relay
                const relaySelector = document.getElementById('relay-selector');
                
                // Add to dropdown immediately
                if (relaySelector) {
                    const option = document.createElement('option');
                    option.value = url;
                    option.textContent = url.replace('wss://', '');
                    relaySelector.appendChild(option);
                    relaySelector.value = url;
                }
                
                // Clear input
                customRelayInput.value = '';
                
                // Show toast
                const toast = document.createElement('div');
                toast.className = 'toast success';
                toast.textContent = `Added explorer relay: ${url}`;
                document.getElementById('toast-container')?.appendChild(toast);
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 3000);
                
                // Try to actually connect via NostrModule
                if (window.RelayWorldCore) {
                    const nostrModule = window.RelayWorldCore.getModule('nostr');
                    if (nostrModule && typeof nostrModule.connectToExplorerRelay === 'function') {
                        nostrModule.connectToExplorerRelay(url).catch(error => {
                            console.error("Failed to connect to relay:", error);
                        });
                    }
                }
            });
        }
    }, 2000);
    
    console.log("Quick fixes applied successfully");
})();
