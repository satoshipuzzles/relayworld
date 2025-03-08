/**
 * debug.js - Debug utilities for Relay World
 * Helps with troubleshooting and development
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const DebugUtils = {
    // Module metadata
    name: "debug",
    description: "Debug utilities for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: [],
    priority: 1, // Initialize very early
    
    // Debug panel element
    panel: null,
    
    // Debug settings
    enabled: true,
    logToConsole: true,
    showPanel: false,
    verboseMode: false,
    
    // Initialize debug system
    init: function() {
        console.log("[Debug] Initializing debug utilities...");
        
        // Check if debug is enabled in config
        this.enabled = RelayWorldCore.getConfig('DEBUG_MODE', true);
        
        if (!this.enabled) {
            console.log("[Debug] Debug mode disabled");
            return true;
        }
        
        // Create debug panel
        this.createDebugPanel();
        
        // Add event listeners for toggling debug features
        document.addEventListener('keydown', (e) => {
            // Toggle debug panel with ~ key
            if (e.key === '`' || e.key === '~') {
                this.toggleDebugPanel();
            }
            
            // Toggle verbose mode with Ctrl+Shift+D
            if (e.key === 'D' && e.ctrlKey && e.shiftKey) {
                this.toggleVerboseMode();
            }
        });
        
        // Subscribe to core events
        RelayWorldCore.eventBus.on('core:ready', () => {
            this.log("Core system ready", "success");
        });
        
        // Monitor for errors
        this.setupErrorHandling();
        
        console.log("[Debug] Debug utilities initialized");
        return true;
    },
    
    // Create debug panel
    createDebugPanel: function() {
        if (this.panel) return;
        
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.className = 'debug-panel';
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>Debug Panel</h3>
                <div class="debug-controls">
                    <button id="debug-clear" title="Clear Log">🗑️</button>
                    <button id="debug-run" title="Run Diagnostics">🔄</button>
                    <button id="debug-close" title="Close">×</button>
                </div>
            </div>
            <div class="debug-tabs">
                <button class="debug-tab-button active" data-tab="log">Log</button>
                <button class="debug-tab-button" data-tab="relays">Relays</button>
                <button class="debug-tab-button" data-tab="nostr">Nostr</button>
                <button class="debug-tab-button" data-tab="stats">Stats</button>
            </div>
            <div class="debug-content">
                <div id="debug-log" class="debug-tab active"></div>
                <div id="debug-relays" class="debug-tab"></div>
                <div id="debug-nostr" class="debug-tab"></div>
                <div id="debug-stats" class="debug-tab"></div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        // Add event listeners
        document.getElementById('debug-clear').addEventListener('click', () => {
            document.getElementById('debug-log').innerHTML = '';
        });
        
        document.getElementById('debug-run').addEventListener('click', () => {
            this.runDiagnostics();
        });
        
        document.getElementById('debug-close').addEventListener('click', () => {
            this.toggleDebugPanel();
        });
        
        // Tab switching
        const tabButtons = document.querySelectorAll('.debug-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Hide panel by default
        if (!this.showPanel) {
            this.panel.style.display = 'none';
        }
        
        // Log initial message
        this.log("Debug panel created", "info");
    },
    
    // Switch debug panel tab
    switchTab: function(tab) {
        // Update tab buttons
        const buttons = document.querySelectorAll('.debug-tab-button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tab);
        });
        
        // Update tab content
        const tabs = document.querySelectorAll('.debug-tab');
        tabs.forEach(tabContent => {
            tabContent.classList.toggle('active', tabContent.id === `debug-${tab}`);
        });
        
        // Update tab content based on selection
        if (tab === 'relays') {
            this.updateRelaysTab();
        } else if (tab === 'nostr') {
            this.updateNostrTab();
        } else if (tab === 'stats') {
            this.updateStatsTab();
        }
    },
    
    // Update relays tab content
    updateRelaysTab: function() {
        const relaysTab = document.getElementById('debug-relays');
        if (!relaysTab) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            relaysTab.innerHTML = '<div class="debug-message debug-error">Nostr module not available</div>';
            return;
        }
        
        // Clear existing content
        relaysTab.innerHTML = '';
        
        // Add relay groups
        const relayGroups = [
            { title: 'Game Relay', relays: nostrModule.relayConnections.game ? [nostrModule.relayConnections.game] : [] },
            { title: 'Login Relay', relays: nostrModule.relayConnections.login ? [nostrModule.relayConnections.login] : [] },
            { title: 'Explorer Relays', relays: Array.from(nostrModule.relayConnections.explorers.values()) },
            { title: 'DM Inbox Relays', relays: Array.from(nostrModule.relayConnections.dmInbox.values()) }
        ];
        
        for (const group of relayGroups) {
            const groupEl = document.createElement('div');
            groupEl.className = 'debug-relay-group';
            
            const titleEl = document.createElement('h4');
            titleEl.textContent = group.title;
            groupEl.appendChild(titleEl);
            
            if (group.relays.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'debug-relay-empty';
                emptyEl.textContent = 'No relays connected';
                groupEl.appendChild(emptyEl);
            } else {
                for (const relay of group.relays) {
                    const relayEl = document.createElement('div');
                    relayEl.className = 'debug-relay-item';
                    
                    const statusClass = relay.socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
                    
                    relayEl.innerHTML = `
                        <div class="debug-relay-status ${statusClass}"></div>
                        <div class="debug-relay-url">${relay.url}</div>
                        <div class="debug-relay-actions">
                            <button class="debug-relay-test" data-url="${relay.url}">Test</button>
                            <button class="debug-relay-disconnect" data-url="${relay.url}">Disconnect</button>
                        </div>
                    `;
                    
                    groupEl.appendChild(relayEl);
                }
            }
            
            relaysTab.appendChild(groupEl);
        }
        
        // Add event listeners
        const testButtons = relaysTab.querySelectorAll('.debug-relay-test');
        testButtons.forEach(button => {
            button.addEventListener('click', () => {
                const url = button.dataset.url;
                this.testRelay(url);
            });
        });
        
        const disconnectButtons = relaysTab.querySelectorAll('.debug-relay-disconnect');
        disconnectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const url = button.dataset.url;
                this.disconnectRelay(url);
            });
        });
        
        // Add custom relay connection form
        const formEl = document.createElement('div');
        formEl.className = 'debug-relay-form';
        formEl.innerHTML = `
            <h4>Connect to Relay</h4>
            <div class="debug-relay-input-group">
                <input type="text" id="debug-relay-url" placeholder="wss://relay.example.com">
                <select id="debug-relay-type">
                    <option value="explorer">Explorer</option>
                    <option value="dm_inbox">DM Inbox</option>
                </select>
                <button id="debug-relay-connect">Connect</button>
            </div>
        `;
        
        relaysTab.appendChild(formEl);
        
        // Add connect button listener
        document.getElementById('debug-relay-connect').addEventListener('click', () => {
            const url = document.getElementById('debug-relay-url').value.trim();
            const type = document.getElementById('debug-relay-type').value;
            
            if (!url) return;
            
            if (type === 'explorer') {
                nostrModule.connectToExplorerRelay(url)
                    .then(() => {
                        this.log(`Connected to explorer relay: ${url}`, "success");
                        this.updateRelaysTab();
                    })
                    .catch(error => {
                        this.log(`Failed to connect to relay: ${error.message}`, "error");
                    });
            } else if (type === 'dm_inbox') {
                nostrModule.connectToDMInboxRelay(url)
                    .then(() => {
                        this.log(`Connected to DM inbox relay: ${url}`, "success");
                        this.updateRelaysTab();
                    })
                    .catch(error => {
                        this.log(`Failed to connect to relay: ${error.message}`, "error");
                    });
            }
        });
    },
    
    // Update nostr tab content
    updateNostrTab: function() {
        const nostrTab = document.getElementById('debug-nostr');
        if (!nostrTab) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            nostrTab.innerHTML = '<div class="debug-message debug-error">Nostr module not available</div>';
            return;
        }
        
        // Clear existing content
        nostrTab.innerHTML = '';
        
        // Current user info
        const userInfoEl = document.createElement('div');
        userInfoEl.className = 'debug-nostr-user';
        
        if (nostrModule.currentUser) {
            userInfoEl.innerHTML = `
                <h4>Current User</h4>
                <div class="debug-nostr-field">
                    <span class="debug-field-label">Pubkey:</span>
                    <span class="debug-field-value">${nostrModule.currentUser.pubkey}</span>
                </div>
            `;
        } else {
            userInfoEl.innerHTML = '<h4>Not logged in</h4>';
        }
        
        nostrTab.appendChild(userInfoEl);
        
        // Subscriptions
        const subsEl = document.createElement('div');
        subsEl.className = 'debug-nostr-subscriptions';
        subsEl.innerHTML = `
            <h4>Active Subscriptions (${nostrModule.subscriptions.size})</h4>
            <div class="debug-subscription-list"></div>
        `;
        
        const subsList = subsEl.querySelector('.debug-subscription-list');
        
        if (nostrModule.subscriptions.size === 0) {
            subsList.innerHTML = '<div class="debug-empty">No active subscriptions</div>';
        } else {
            for (const [id, sub] of nostrModule.subscriptions) {
                const subEl = document.createElement('div');
                subEl.className = 'debug-subscription-item';
                subEl.innerHTML = `
                    <div class="debug-sub-id">${id}</div>
                    <div class="debug-sub-filters">${JSON.stringify(sub.filters)}</div>
                    <button class="debug-sub-unsub" data-id="${id}">Unsubscribe</button>
                `;
                subsList.appendChild(subEl);
            }
            
            // Add event listeners
            const unsubButtons = subsList.querySelectorAll('.debug-sub-unsub');
            unsubButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const id = button.dataset.id;
                    const sub = nostrModule.subscriptions.get(id);
                    if (sub && sub.unsub) {
                        sub.unsub();
                        this.log(`Unsubscribed from ${id}`, "info");
                        this.updateNostrTab();
                    }
                });
            });
        }
        
        nostrTab.appendChild(subsEl);
        
        // Test event publisher
        const publisherEl = document.createElement('div');
        publisherEl.className = 'debug-nostr-publisher';
        publisherEl.innerHTML = `
            <h4>Test Event Publisher</h4>
            <div class="debug-publisher-form">
                <div class="debug-field">
                    <label for="debug-event-kind">Event Kind:</label>
                    <input type="number" id="debug-event-kind" value="1">
                </div>
                <div class="debug-field">
                    <label for="debug-event-content">Content:</label>
                    <textarea id="debug-event-content">Test event from Relay World debug panel</textarea>
                </div>
                <div class="debug-field">
                    <label for="debug-event-relay">Relay:</label>
                    <select id="debug-event-relay">
                        <option value="game">Game Relay</option>
                        <option value="login">Login Relay</option>
                        <option value="explorer">Active Explorer Relay</option>
                    </select>
                </div>
                <button id="debug-publish-event">Publish Event</button>
            </div>
        `;
        
        nostrTab.appendChild(publisherEl);
        
        // Add event listener for publish button
        document.getElementById('debug-publish-event').addEventListener('click', () => {
            const kind = parseInt(document.getElementById('debug-event-kind').value);
            const content = document.getElementById('debug-event-content').value;
            const relayType = document.getElementById('debug-event-relay').value;
            
            this.publishTestEvent(kind, content, relayType);
        });
    },
    
    // Update stats tab content
    updateStatsTab: function() {
        const statsTab = document.getElementById('debug-stats');
        if (!statsTab) return;
        
        // Clear existing content
        statsTab.innerHTML = '';
        
        // Game stats
        const gameModule = RelayWorldCore.getModule('game');
        const playerModule = RelayWorldCore.getModule('player');
        const nostrModule = RelayWorldCore.getModule('nostr');
        
        // Performance stats
        const perfEl = document.createElement('div');
        perfEl.className = 'debug-stats-section';
        
        // Current FPS calculation
        let fps = 'N/A';
        if (gameModule && typeof gameModule.getFPS === 'function') {
            fps = gameModule.getFPS().toFixed(1);
        }
        
        perfEl.innerHTML = `
            <h4>Performance</h4>
            <div class="debug-stat-field">
                <span class="debug-field-label">FPS:</span>
                <span class="debug-field-value">${fps}</span>
            </div>
            <div class="debug-stat-field">
                <span class="debug-field-label">Memory:</span>
                <span class="debug-field-value">${this.getMemoryUsage()}</span>
            </div>
        `;
        
        statsTab.appendChild(perfEl);
        
        // Player stats
        if (playerModule) {
            const playerEl = document.createElement('div');
            playerEl.className = 'debug-stats-section';
            
            playerEl.innerHTML = `
                <h4>Player</h4>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Position:</span>
                    <span class="debug-field-value">X: ${playerModule.x?.toFixed(1) || 'N/A'}, Y: ${playerModule.y?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Level:</span>
                    <span class="debug-field-value">${playerModule.level || 'N/A'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Score:</span>
                    <span class="debug-field-value">${playerModule.score || 'N/A'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Inventory:</span>
                    <span class="debug-field-value">${playerModule.inventory?.length || 0} items</span>
                </div>
            `;
            
            statsTab.appendChild(playerEl);
        }
        
        // Network stats
        if (nostrModule) {
            const networkEl = document.createElement('div');
            networkEl.className = 'debug-stats-section';
            
            // Count active connections
            const gameConnected = nostrModule.relayConnections.game?.socket?.readyState === WebSocket.OPEN;
            const loginConnected = nostrModule.relayConnections.login?.socket?.readyState === WebSocket.OPEN;
            const explorerCount = Array.from(nostrModule.relayConnections.explorers.values())
                .filter(r => r.socket?.readyState === WebSocket.OPEN).length;
            const dmInboxCount = Array.from(nostrModule.relayConnections.dmInbox.values())
                .filter(r => r.socket?.readyState === WebSocket.OPEN).length;
            
            networkEl.innerHTML = `
                <h4>Network</h4>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Game Relay:</span>
                    <span class="debug-field-value ${gameConnected ? 'connected' : 'disconnected'}">${gameConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Login Relay:</span>
                    <span class="debug-field-value ${loginConnected ? 'connected' : 'disconnected'}">${loginConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Explorer Relays:</span>
                    <span class="debug-field-value">${explorerCount} connected</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">DM Inbox Relays:</span>
                    <span class="debug-field-value">${dmInboxCount} connected</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Subscriptions:</span>
                    <span class="debug-field-value">${nostrModule.subscriptions.size} active</span>
                </div>
            `;
            
            statsTab.appendChild(networkEl);
        }
        
        // Game world stats
        if (gameModule) {
            const worldEl = document.createElement('div');
            worldEl.className = 'debug-stats-section';
            
            worldEl.innerHTML = `
                <h4>World</h4>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Size:</span>
                    <span class="debug-field-value">${gameModule.world?.width || 'N/A'} x ${gameModule.world?.height || 'N/A'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Collectibles:</span>
                    <span class="debug-field-value">${gameModule.world?.collectibles?.length || 0}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Weather:</span>
                    <span class="debug-field-value">${gameModule.weather?.current || 'N/A'}</span>
                </div>
                <div class="debug-stat-field">
                    <span class="debug-field-label">Players:</span>
                    <span class="debug-field-value">${nostrModule?.users?.size || 0}</span>
                </div>
            `;
            
            statsTab.appendChild(worldEl);
        }
        
        // Add refresh button
        const refreshEl = document.createElement('div');
        refreshEl.className = 'debug-stats-actions';
        refreshEl.innerHTML = `<button id="debug-stats-refresh">Refresh Stats</button>`;
        statsTab.appendChild(refreshEl);
        
        document.getElementById('debug-stats-refresh').addEventListener('click', () => {
            this.updateStatsTab();
        });
    },
    
    // Toggle debug panel visibility
    toggleDebugPanel: function() {
        if (!this.panel) return;
        
        this.showPanel = !this.showPanel;
        this.panel.style.display = this.showPanel ? 'block' : 'none';
    },
    
    // Toggle verbose mode
    toggleVerboseMode: function() {
        this.verboseMode = !this.verboseMode;
        this.log(`Verbose mode ${this.verboseMode ? 'enabled' : 'disabled'}`, "info");
    },
    
    // Log a message
    log: function(message, type = 'info') {
        if (!this.enabled) return;
        
        // Format message
        const timestamp = new Date().toISOString().substring(11, 19);
        const formattedMessage = `[${timestamp}] ${message}`;
        
        // Log to console
        if (this.logToConsole) {
            switch (type) {
                case 'error':
                    console.error(formattedMessage);
                    break;
                case 'warn':
                    console.warn(formattedMessage);
                    break;
                case 'success':
                    console.log(`%c${formattedMessage}`, 'color: green');
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
        
        // Add to debug panel
        if (this.panel) {
            const logElement = document.getElementById('debug-log');
            if (logElement) {
                const messageElement = document.createElement('div');
                messageElement.className = `debug-message debug-${type}`;
                messageElement.textContent = formattedMessage;
                
                // Add to panel
                logElement.insertBefore(messageElement, logElement.firstChild);
                
                // Limit the number of messages
                if (logElement.children.length > 100) {
                    logElement.removeChild(logElement.lastChild);
                }
            }
        }
    },
    
    // Test a relay connection
    testRelay: async function(relayUrl) {
        this.log(`Testing relay connection: ${relayUrl}`);
        
        try {
            // Create a new WebSocket connection
            const ws = new WebSocket(relayUrl);
            
            // Set up promise to handle connection
            const connectionPromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Connection to ${relayUrl} timed out`));
                }, 5000);
                
                ws.onopen = () => {
                    clearTimeout(timeoutId);
                    resolve(ws);
                };
                
                ws.onerror = (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                };
            });
            
            // Wait for connection
            await connectionPromise;
            
            this.log(`Successfully connected to ${relayUrl}`, "success");
            
            // Send a test message (REQ for basic info)
            const testSubId = `test-${Math.random().toString(36).substring(2, 10)}`;
            ws.send(JSON.stringify(["REQ", testSubId, { "limit": 1 }]));
            
            // Wait for response
            const responsePromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`No response from ${relayUrl} within timeout`));
                }, 5000);
                
                ws.onmessage = (event) => {
                    clearTimeout(timeoutId);
                    resolve(event.data);
                };
            });
            
            const response = await responsePromise;
            this.log(`Received response from ${relayUrl}`, "success");
            
            if (this.verboseMode) {
                this.log(`Response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
            }
            
            // Close the connection
            ws.close();
            
            // Update relay tab if open
            if (document.querySelector('.debug-tab-button[data-tab="relays"]').classList.contains('active')) {
                this.updateRelaysTab();
            }
            
            return true;
        } catch (error) {
            this.log(`Test failed for ${relayUrl}: ${error.message}`, "error");
            return false;
        }
    },
    
    // Disconnect from a relay
    disconnectRelay: function(relayUrl) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) {
            this.log("Nostr module not available", "error");
            return false;
        }
        
        try {
            // Find relay by URL
            let relay = null;
            let relayType = null;
            
            if (nostrModule.relayConnections.game?.url === relayUrl) {
                relay = nostrModule.relayConnections.game;
                relayType = 'game';
            } else if (nostrModule.relayConnections.login?.url === relayUrl) {
                relay = nostrModule.relayConnections.login;
                relayType = 'login';
            } else if (nostrModule.relayConnections.explorers.has(relayUrl)) {
                relay = nostrModule.relayConnections.explorers.get(relayUrl);
                relayType = 'explorer';
            } else if (nostrModule.relayConnections.dmInbox.has(relayUrl)) {
                relay = nostrModule.relayConnections.dmInbox.get(relayUrl);
                relayType = 'dmInbox';
            }
            
            if (!relay) {
                this.log(`Relay ${relayUrl} not found in connections`, "error");
                return false;
            }
            
            // Close relay connection
            relay.close();
            
            this.log(`Disconnected from ${relayType} relay: ${relayUrl}`, "success");
            
            // Update relay tab if open
            if (document.querySelector('.debug-tab-button[data-tab="relays"]').classList.contains('active')) {
                this.updateRelaysTab();
            }
            
            return true;
        } catch (error) {
            this.log(`Failed to disconnect from ${relayUrl}: ${error.message}`, "error");
            return false;
        }
    },
    
    // Publish a test event
    publishTestEvent: async function(kind, content, relayType) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule || !nostrModule.currentUser) {
            this.log("Nostr module not available or user not logged in", "error");
            return false;
        }
        
        try {
            // Create event
            const event = {
                kind,
                content,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ["client", "relay-world-debug"]
                ],
                pubkey: nostrModule.currentUser.pubkey
            };
            
            // Get target relay
            let relay = null;
            
            if (relayType === 'game') {
                relay = nostrModule.relayConnections.game;
            } else if (relayType === 'login') {
                relay = nostrModule.relayConnections.login;
            } else if (relayType === 'explorer') {
                relay = nostrModule.relayConnections.explorers.get(nostrModule.activeExplorerRelay);
            }
            
            if (!relay) {
                this.log(`Target relay (${relayType}) not connected`, "error");
                return false;
            }
            
            // Sign and publish the event
            const signedEvent = await nostrModule.signEvent(event);
            await nostrModule.publishToRelay(relay, signedEvent);
            
            this.log(`Published test event (kind: ${kind}) to ${relay.url}`, "success");
            
            if (this.verboseMode) {
                this.log(`Event ID: ${signedEvent.id}`);
            }
            
            return true;
        } catch (error) {
            this.log(`Failed to publish test event: ${error.message}`, "error");
            return false;
        }
    },
    
    // Run diagnostics
    runDiagnostics: function() {
        this.log("Running diagnostics...");
        
        // Check WebRTC support
        const hasWebRTC = !!window.RTCPeerConnection;
        this.log(`WebRTC support: ${hasWebRTC ? 'Yes' : 'No'}`);
        
        // Check Nostr extension
        const hasNostrExtension = !!window.nostr;
        this.log(`Nostr extension: ${hasNostrExtension ? 'Available' : 'Not available'}`);
        
        // Check WebSockets
        const hasWebSockets = !!window.WebSocket;
        this.log(`WebSocket support: ${hasWebSockets ? 'Yes' : 'No'}`);
        
        // Check WebCrypto
        const hasWebCrypto = !!window.crypto && !!window.crypto.subtle;
        this.log(`WebCrypto support: ${hasWebCrypto ? 'Yes' : 'No'}`);
        
        // Check LocalStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.log('LocalStorage support: Yes');
        } catch (e) {
            this.log('LocalStorage support: No', 'error');
        }
        
        // Check modules
        const modules = [
            'utils', 'auth', 'nostr', 'dm', 'game', 'player',
            'items', 'ui', 'audio', 'zaps'
        ];
        
        for (const moduleName of modules) {
            const module = RelayWorldCore.getModule(moduleName);
            this.log(`${moduleName} module: ${module ? 'Available' : 'Missing'}`);
        }
        
        // Check nostr connections
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (nostrModule) {
            const gameConnected = nostrModule.relayConnections.game?.socket?.readyState === WebSocket.OPEN;
            const loginConnected = nostrModule.relayConnections.login?.socket?.readyState === WebSocket.OPEN;
            const explorerCount = Array.from(nostrModule.relayConnections.explorers.values())
                .filter(r => r.socket?.readyState === WebSocket.OPEN).length;
            const dmInboxCount = Array.from(nostrModule.relayConnections.dmInbox.values())
                .filter(r => r.socket?.readyState === WebSocket.OPEN).length;
            
            this.log(`Game relay: ${gameConnected ? 'Connected' : 'Disconnected'}`);
            this.log(`Login relay: ${loginConnected ? 'Connected' : 'Disconnected'}`);
            this.log(`Explorer relays: ${explorerCount} connected`);
            this.log(`DM inbox relays: ${dmInboxCount} connected`);
        }
        
        this.log("Diagnostics complete");
    },
    
    // Setup error handling
    setupErrorHandling: function() {
        // Capture window errors
        window.addEventListener('error', (e) => {
            this.log(`Error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`, 'error');
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.log(`Unhandled promise rejection: ${e.reason}`, 'error');
        });
        
        // Patch console.error
        const originalError = console.error;
        console.error = (...args) => {
            // Call original console.error
            originalError.apply(console, args);
            
            // Log to debug panel if it's not our own log
            if (args[0] && typeof args[0] === 'string' && !args[0].startsWith('[Debug]')) {
                const message = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : arg
                ).join(' ');
                
                // Add to debug panel without calling log again to avoid recursion
                if (this.enabled && this.panel) {
                    const logElement = document.getElementById('debug-log');
                    if (logElement) {
                        const timestamp = new Date().toISOString().substring(11, 19);
                        const messageElement = document.createElement('div');
                        messageElement.className = 'debug-message debug-error';
                        messageElement.textContent = `[${timestamp}] ${message}`;
                        
                        // Add to panel
                        logElement.insertBefore(messageElement, logElement.firstChild);
                    }
                }
            }
        };
    },
    
    // Get memory usage
    getMemoryUsage: function() {
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const usedJSHeapSize = Math.round(memory.usedJSHeapSize / (1024 * 1024));
            const totalJSHeapSize = Math.round(memory.totalJSHeapSize / (1024 * 1024));
            
            return `${usedJSHeapSize}MB / ${totalJSHeapSize}MB`;
        }
        
        return 'N/A';
    },
    
    // Add global debug methods for console access
    addGlobalDebugMethods: function() {
        window.debugRelayWorld = {
            // Version info
            version: '1.0.0',
            
            // Core debug methods
            log: (message, type) => this.log(message, type),
            enableVerbose: () => {
                this.verboseMode = true;
                this.log("Verbose mode enabled", "info");
            },
            disableVerbose: () => {
                this.verboseMode = false;
                this.log("Verbose mode disabled", "info");
            },
            showPanel: () => {
                this.showPanel = true;
                this.panel.style.display = 'block';
                this.log("Debug panel shown", "info");
            },
            hidePanel: () => {
                this.showPanel = false;
                this.panel.style.display = 'none';
                this.log("Debug panel hidden", "info");
            },
            
            // Relay methods
            getRelays: () => {
                const nostrModule = RelayWorldCore.getModule('nostr');
                if (!nostrModule) return { error: "Nostr module not available" };
                
                return {
                    game: nostrModule.relayConnections.game,
                    login: nostrModule.relayConnections.login,
                    explorers: Array.from(nostrModule.relayConnections.explorers.entries()),
                    dmInbox: Array.from(nostrModule.relayConnections.dmInbox.entries())
                };
            },
            testRelay: (url) => this.testRelay(url),
            disconnectRelay: (url) => this.disconnectRelay(url),
            
            // Nostr methods
            getUsers: () => {
                const nostrModule = RelayWorldCore.getModule('nostr');
                return nostrModule ? Array.from(nostrModule.users.entries()) : [];
            },
            getSubscriptions: () => {
                const nostrModule = RelayWorldCore.getModule('nostr');
                return nostrModule ? Array.from(nostrModule.subscriptions.entries()) : [];
            },
            publishTestEvent: (kind, content, relayType) => this.publishTestEvent(kind, content, relayType),
            
            // Diagnostics
            runDiagnostics: () => this.runDiagnostics(),
            getModuleStatus: () => {
                const modules = {};
                for (const [name, module] of RelayWorldCore.modules.entries()) {
                    modules[name] = {
                        initialized: !!module.initialized,
                        version: module.version || 'N/A'
                    };
                }
                return modules;
            },
            getConfig: () => {
                return RelayWorldCore.config.getAllConfig ? 
                    RelayWorldCore.config.getAllConfig() : 
                    'Config manager not available';
            }
        };
        
        this.log("Added global debug methods. Access via window.debugRelayWorld", "success");
    }
};