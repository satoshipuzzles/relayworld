/**
 * Voice Chat Module for Relay World 2.0
 * Implements proximity-based voice chat using WebRTC
 */

const voice = (function() {
    // Private members
    let isInitialized = false;
    let isEnabled = false;
    let localStream = null;
    let peerConnections = new Map(); // Map of pubkeys to RTCPeerConnection objects
    let audioContext = null;
    let audioAnalyser = null;
    
    // WebRTC configuration
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    
    // Voice settings
    const settings = {
        range: config.VOICE_CHAT_RANGE || 300, // Voice chat range in game units
        quality: config.VOICE_QUALITY || 'medium', // Audio quality: low, medium, high
        spatialAudio: true, // Enable spatial audio
        autoConnect: true, // Automatically connect to nearby players
        muted: false, // Local microphone muted
        volume: 1.0 // Master volume (0.0 - 1.0)
    };
    
    /**
     * Initialize voice chat system
     * @returns {Promise<boolean>} - Success status
     */
    async function initialize() {
        debug.log("Initializing voice chat system...");
        
        try {
            // Set up UI elements
            setupUIElements();
            
            // We don't automatically start voice chat
            // User needs to enable it first
            
            isInitialized = true;
            return true;
        } catch (error) {
            debug.error("Failed to initialize voice chat:", error);
            return false;
        }
    }
    
    /**
     * Setup UI elements for voice chat
     */
    function setupUIElements() {
        // Create voice chat container
        const voiceChatContainer = document.createElement('div');
        voiceChatContainer.id = 'voice-chat-container';
        voiceChatContainer.className = 'voice-chat-container';
        
        // Create voice chat toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'voice-chat-toggle';
        toggleButton.className = 'voice-chat-button';
        toggleButton.innerHTML = '<span class="icon">🎙️</span>';
        toggleButton.title = 'Enable Voice Chat';
        
        // Create voice chat UI
        const voiceChatUI = `
            <div id="voice-chat-panel" class="voice-chat-panel hidden">
                <div class="voice-chat-header">
                    <h3>Voice Chat</h3>
                    <button id="voice-chat-close" class="voice-chat-close">×</button>
                </div>
                <div class="voice-chat-body">
                    <div class="voice-chat-controls">
                        <button id="voice-chat-mute" class="voice-chat-control-button">
                            <span class="icon">🔊</span> Mute
                        </button>
                        <div class="voice-chat-volume">
                            <span>Volume:</span>
                            <input type="range" id="voice-chat-volume" min="0" max="100" value="100">
                        </div>
                    </div>
                    <div class="voice-chat-settings">
                        <div class="voice-chat-setting">
                            <label for="voice-chat-quality">Quality:</label>
                            <select id="voice-chat-quality">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="voice-chat-setting">
                            <label for="voice-chat-spatial">Spatial Audio:</label>
                            <input type="checkbox" id="voice-chat-spatial" checked>
                        </div>
                        <div class="voice-chat-setting">
                            <label for="voice-chat-auto-connect">Auto-Connect:</label>
                            <input type="checkbox" id="voice-chat-auto-connect" checked>
                        </div>
                    </div>
                    <div class="voice-chat-connections">
                        <h4>Active Connections</h4>
                        <ul id="voice-chat-connections-list"></ul>
                    </div>
                </div>
            </div>
        `;
        
        // Add to voice chat container
        voiceChatContainer.appendChild(toggleButton);
        voiceChatContainer.insertAdjacentHTML('beforeend', voiceChatUI);
        
        // Add to game UI
        document.getElementById('game-ui').appendChild(voiceChatContainer);
        
        // Add button click handler
        toggleButton.addEventListener('click', toggleVoiceChatPanel);
        
        // Add close button handler
        document.getElementById('voice-chat-close').addEventListener('click', hideVoiceChatPanel);
        
        // Add mute button handler
        document.getElementById('voice-chat-mute').addEventListener('click', toggleMute);
        
        // Add volume slider handler
        document.getElementById('voice-chat-volume').addEventListener('input', (event) => {
            setVolume(parseInt(event.target.value) / 100);
        });
        
        // Add quality selector handler
        document.getElementById('voice-chat-quality').addEventListener('change', (event) => {
            settings.quality = event.target.value;
        });
        
        // Add spatial audio toggle handler
        document.getElementById('voice-chat-spatial').addEventListener('change', (event) => {
            settings.spatialAudio = event.target.checked;
        });
        
        // Add auto-connect toggle handler
        document.getElementById('voice-chat-auto-connect').addEventListener('change', (event) => {
            settings.autoConnect = event.target.checked;
        });
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .voice-chat-container {
                position: absolute;
                bottom: 80px;
                right: 20px;
                z-index: 100;
            }
            
            .voice-chat-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: #4CAF50;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
            
            .voice-chat-button.disabled {
                background-color: #ccc;
            }
            
            .voice-chat-button.active {
                background-color: #2196F3;
            }
            
            .voice-chat-button.muted {
                background-color: #F44336;
            }
            
            .voice-chat-panel {
                position: absolute;
                bottom: 50px;
                right: 0;
                width: 300px;
                background-color: rgba(30, 30, 30, 0.9);
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }
            
            .voice-chat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background-color: rgba(0, 0, 0, 0.2);
            }
            
            .voice-chat-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .voice-chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
            
            .voice-chat-body {
                padding: 10px;
            }
            
            .voice-chat-controls {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .voice-chat-control-button {
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                margin-right: 10px;
            }
            
            .voice-chat-control-button.muted {
                background-color: #F44336;
            }
            
            .voice-chat-volume {
                display: flex;
                align-items: center;
                flex: 1;
            }
            
            .voice-chat-volume span {
                margin-right: 10px;
                font-size: 12px;
            }
            
            .voice-chat-volume input {
                flex: 1;
            }
            
            .voice-chat-settings {
                margin-bottom: 10px;
            }
            
            .voice-chat-setting {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                font-size: 12px;
            }
            
            .voice-chat-connections {
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 10px;
            }
            
            .voice-chat-connections h4 {
                margin: 0 0 5px 0;
                font-size: 14px;
            }
            
            #voice-chat-connections-list {
                list-style: none;
                padding: 0;
                margin: 0;
                max-height: 100px;
                overflow-y: auto;
            }
            
            #voice-chat-connections-list li {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 5px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 12px;
            }
            
            .connection-strength {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 5px;
            }
            
            .connection-strength.good {
                background-color: #4CAF50;
            }
            
            .connection-strength.medium {
                background-color: #FFC107;
            }
            
            .connection-strength.poor {
                background-color: #F44336;
            }
            
            .hidden {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Enable voice chat
     * @returns {Promise<boolean>} - Success status
     */
    async function enable() {
        if (!isInitialized) {
            debug.error("Voice chat not initialized");
            return false;
        }
        
        if (isEnabled) {
            debug.warn("Voice chat already enabled");
            return true;
        }
        
        try {
            // Request user media
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 256;
            
            // Connect local stream to analyser
            const source = audioContext.createMediaStreamSource(localStream);
            source.connect(audioAnalyser);
            
            // Update UI
            updateVoiceChatUI(true);
            
            isEnabled = true;
            
            // Subscribe to player events for proximity voice chat
            subscribeToPlayerEvents();
            
            debug.log("Voice chat enabled");
            return true;
        } catch (error) {
            debug.error("Failed to enable voice chat:", error);
            updateVoiceChatUI(false);
            return false;
        }
    }
    
    /**
     * Disable voice chat
     */
    function disable() {
        if (!isEnabled) return;
        
        // Stop all peer connections
        disconnectAllPeers();
        
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Close audio context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        
        audioAnalyser = null;
        
        // Update UI
        updateVoiceChatUI(false);
        
        isEnabled = false;
        debug.log("Voice chat disabled");
    }
    
    /**
     * Update voice chat UI based on enabled state
     * @param {boolean} enabled - Whether voice chat is enabled
     */
    function updateVoiceChatUI(enabled) {
        const toggleButton = document.getElementById('voice-chat-toggle');
        
        if (enabled) {
            toggleButton.classList.add('active');
            toggleButton.title = 'Voice Chat Enabled';
            
            // Update mute button based on mute state
            updateMuteButtonUI();
        } else {
            toggleButton.classList.remove('active');
            toggleButton.classList.remove('muted');
            toggleButton.title = 'Enable Voice Chat';
            
            // Reset connections list
            document.getElementById('voice-chat-connections-list').innerHTML = '';
        }
    }
    
    /**
     * Toggle voice chat panel visibility
     */
    function toggleVoiceChatPanel() {
        const panel = document.getElementById('voice-chat-panel');
        
        if (panel.classList.contains('hidden')) {
            // Show panel
            panel.classList.remove('hidden');
            
            // Enable voice chat if not already enabled
            if (!isEnabled) {
                enable();
            }
        } else {
            // Hide panel
            panel.classList.add('hidden');
        }
    }
    
    /**
     * Hide voice chat panel
     */
    function hideVoiceChatPanel() {
        document.getElementById('voice-chat-panel').classList.add('hidden');
    }
    
    /**
     * Toggle mute state
     */
    function toggleMute() {
        if (!isEnabled || !localStream) return;
        
        settings.muted = !settings.muted;
        
        // Mute/unmute all audio tracks in local stream
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !settings.muted;
        });
        
        // Update UI
        updateMuteButtonUI();
    }
    
    /**
     * Update mute button UI based on mute state
     */
    function updateMuteButtonUI() {
        const toggleButton = document.getElementById('voice-chat-toggle');
        const muteButton = document.getElementById('voice-chat-mute');
        
        if (settings.muted) {
            toggleButton.classList.add('muted');
            muteButton.classList.add('muted');
            muteButton.innerHTML = '<span class="icon">🔇</span> Unmute';
        } else {
            toggleButton.classList.remove('muted');
            muteButton.classList.remove('muted');
            muteButton.innerHTML = '<span class="icon">🔊</span> Mute';
        }
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    function setVolume(volume) {
        settings.volume = Math.min(1.0, Math.max(0.0, volume));
        
        // Update volume for all peer connections
        peerConnections.forEach((pc, pubkey) => {
            if (pc.audioElement) {
                pc.audioElement.volume = calculateVolumeForPeer(pubkey);
            }
        });
    }
    
    /**
     * Calculate actual volume for a peer based on distance and master volume
     * @param {string} pubkey - Peer's pubkey
     * @returns {number} - Volume level (0.0 - 1.0)
     */
    function calculateVolumeForPeer(pubkey) {
        const remotePlayers = player.getAllPlayers();
        const localPlayerPos = player.getPosition();
        
        // Find remote player
        const remotePlayer = remotePlayers.find(p => p.pubkey === pubkey);
        
        if (!remotePlayer) return 0;
        
        // Calculate distance
        const distance = helpers.distance(
            localPlayerPos.x, localPlayerPos.y,
            remotePlayer.x, remotePlayer.y
        );
        
        // Calculate volume based on distance
        // Full volume up to half the range, then linear falloff
        const halfRange = settings.range / 2;
        const distanceVolume = distance <= halfRange ? 
            1.0 : 
            Math.max(0, 1.0 - ((distance - halfRange) / halfRange));
        
        // Apply master volume
        return distanceVolume * settings.volume;
    }
    
    /**
     * Subscribe to player events for proximity voice chat
     */
    function subscribeToPlayerEvents() {
        // We'll periodically check for nearby players
        setInterval(() => {
            if (!isEnabled || !settings.autoConnect) return;
            
            const remotePlayers = player.getAllPlayers();
            const localPlayerPos = player.getPosition();
            const localPlayerPubkey = nostrClient.getPubkey();
            
            // Check each remote player
            for (const remotePlayer of remotePlayers) {
                // Skip local player
                if (remotePlayer.pubkey === localPlayerPubkey) continue;
                
                // Calculate distance
                const distance = helpers.distance(
                    localPlayerPos.x, localPlayerPos.y,
                    remotePlayer.x, remotePlayer.y
                );
                
                // If within range and not already connected, establish connection
                if (distance <= settings.range && !peerConnections.has(remotePlayer.pubkey)) {
                    connectToPeer(remotePlayer.pubkey);
                }
                
                // If outside range and connected, disconnect
                if (distance > settings.range && peerConnections.has(remotePlayer.pubkey)) {
                    disconnectPeer(remotePlayer.pubkey);
                }
                
                // Update volume for connected peers
                if (peerConnections.has(remotePlayer.pubkey)) {
                    const pc = peerConnections.get(remotePlayer.pubkey);
                    if (pc.audioElement) {
                        pc.audioElement.volume = calculateVolumeForPeer(remotePlayer.pubkey);
                    }
                }
            }
            
            // Update connections list
            updateConnectionsList();
        }, 2000); // Check every 2 seconds
    }
    
    /**
     * Connect to a peer for voice chat
     * @param {string} peerPubkey - Peer's pubkey
     */
    function connectToPeer(peerPubkey) {
        if (!isEnabled || !localStream) return;
        
        // Skip if already connected
        if (peerConnections.has(peerPubkey)) return;
        
        try {
            debug.log(`Connecting to peer for voice chat: ${peerPubkey}`);
            
            // Create peer connection
            const pc = new RTCPeerConnection(rtcConfig);
            
            // Add local stream
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
            
            // Create audio element for remote stream
            const audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            
            // Handle remote stream
            pc.ontrack = (event) => {
                audioElement.srcObject = event.streams[0];
            };
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send ICE candidate to peer via Nostr
                    sendSignalingMessage(peerPubkey, {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };
            
            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                debug.log(`Peer connection state changed: ${pc.connectionState}`);
                
                if (pc.connectionState === 'disconnected' || 
                    pc.connectionState === 'failed' || 
                    pc.connectionState === 'closed') {
                    disconnectPeer(peerPubkey);
                }
            };
            
            // Create offer
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    // Send offer to peer via Nostr
                    sendSignalingMessage(peerPubkey, {
                        type: 'offer',
                        sdp: pc.localDescription
                    });
                })
                .catch(error => {
                    debug.error(`Failed to create offer for ${peerPubkey}:`, error);
                    disconnectPeer(peerPubkey);
                });
            
            // Store peer connection
            peerConnections.set(peerPubkey, {
                connection: pc,
                audioElement: audioElement,
                state: 'connecting'
            });
            
            // Update connections list
            updateConnectionsList();
        } catch (error) {
            debug.error(`Failed to connect to peer ${peerPubkey}:`, error);
        }
    }
    
    /**
     * Disconnect from a peer
     * @param {string} peerPubkey - Peer's pubkey
     */
    function disconnectPeer(peerPubkey) {
        if (!peerConnections.has(peerPubkey)) return;
        
        try {
            const pc = peerConnections.get(peerPubkey);
            
            // Close connection
            if (pc.connection) {
                pc.connection.close();
            }
            
            // Remove audio element
            if (pc.audioElement) {
                pc.audioElement.srcObject = null;
                pc.audioElement.remove();
            }
            
            // Remove from connections map
            peerConnections.delete(peerPubkey);
            
            debug.log(`Disconnected from peer: ${peerPubkey}`);
            
            // Update connections list
            updateConnectionsList();
        } catch (error) {
            debug.error(`Error disconnecting from peer ${peerPubkey}:`, error);
        }
    }
    
    /**
     * Disconnect from all peers
     */
    function disconnectAllPeers() {
        const peers = [...peerConnections.keys()];
        
        for (const peerPubkey of peers) {
            disconnectPeer(peerPubkey);
        }
    }
    
    /**
     * Send a signaling message to a peer via Nostr
     * @param {string} peerPubkey - Peer's pubkey
     * @param {Object} message - Signaling message
     */
    function sendSignalingMessage(peerPubkey, message) {
        try {
            // Create encryptable content
            const content = JSON.stringify(message);
            
            // In a real implementation, we'd encrypt this with NIP-04
            // For this demo, we'll just send it as is
            
            // Create event
            const event = {
                kind: 24133, // Custom kind for voice chat signaling
                pubkey: nostrClient.getPubkey(),
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['p', peerPubkey],
                    ['voice', 'signaling']
                ],
                content: content
            };
            
            // Sign and publish to game relay
            nostrClient.signEvent(event)
                .then(signedEvent => {
                    relays.publishToGameRelay(signedEvent);
                })
                .catch(error => {
                    debug.error("Failed to send signaling message:", error);
                });
        } catch (error) {
            debug.error("Error creating signaling message:", error);
        }
    }
    
    /**
     * Handle a received signaling message
     * @param {Object} event - Nostr event
     */
    function handleSignalingMessage(event) {
        try {
            // Parse message
            const message = JSON.parse(event.content);
            
            // Get peer pubkey
            const peerPubkey = event.pubkey;
            
            switch (message.type) {
                case 'offer':
                    handleOffer(peerPubkey, message.sdp);
                    break;
                case 'answer':
                    handleAnswer(peerPubkey, message.sdp);
                    break;
                case 'ice-candidate':
                    handleIceCandidate(peerPubkey, message.candidate);
                    break;
                default:
                    debug.warn(`Unknown signaling message type: ${message.type}`);
            }
        } catch (error) {
            debug.error("Error handling signaling message:", error);
        }
    }
    
    /**
     * Handle an offer from a peer
     * @param {string} peerPubkey - Peer's pubkey
     * @param {RTCSessionDescription} offer - SDP offer
     */
    function handleOffer(peerPubkey, offer) {
        if (!isEnabled || !localStream) return;
        
        try {
            debug.log(`Received offer from peer: ${peerPubkey}`);
            
            // Create peer connection if not exists
            if (!peerConnections.has(peerPubkey)) {
                // Create peer connection
                const pc = new RTCPeerConnection(rtcConfig);
                
                // Add local stream
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
                
                // Create audio element for remote stream
                const audioElement = document.createElement('audio');
                audioElement.autoplay = true;
                
                // Handle remote stream
                pc.ontrack = (event) => {
                    audioElement.srcObject = event.streams[0];
                };
                
                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        // Send ICE candidate to peer via Nostr
                        sendSignalingMessage(peerPubkey, {
                            type: 'ice-candidate',
                            candidate: event.candidate
                        });
                    }
                };
                
                // Handle connection state changes
                pc.onconnectionstatechange = () => {
                    debug.log(`Peer connection state changed: ${pc.connectionState}`);
                    
                    if (pc.connectionState === 'disconnected' || 
                        pc.connectionState === 'failed' || 
                        pc.connectionState === 'closed') {
                        disconnectPeer(peerPubkey);
                    }
                };
                
                // Store peer connection
                peerConnections.set(peerPubkey, {
                    connection: pc,
                    audioElement: audioElement,
                    state: 'connecting'
                });
            }
            
            const pc = peerConnections.get(peerPubkey).connection;
            
            // Set remote description
            pc.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => pc.createAnswer())
                .then(answer => pc.setLocalDescription(answer))
                .then(() => {
                    // Send answer to peer via Nostr
                    sendSignalingMessage(peerPubkey, {
                        type: 'answer',
                        sdp: pc.localDescription
                    });
                })
                .catch(error => {
                    debug.error(`Failed to handle offer from ${peerPubkey}:`, error);
                    disconnectPeer(peerPubkey);
                });
            
            // Update connections list
            updateConnectionsList();
        } catch (error) {
            debug.error(`Error handling offer from ${peerPubkey}:`, error);
        }
    }
    
    /**
     * Handle an answer from a peer
     * @param {string} peerPubkey - Peer's pubkey
     * @param {RTCSessionDescription} answer - SDP answer
     */
    function handleAnswer(peerPubkey, answer) {
        if (!peerConnections.has(peerPubkey)) return;
        
        try {
            debug.log(`Received answer from peer: ${peerPubkey}`);
            
            const pc = peerConnections.get(peerPubkey).connection;
            
            // Set remote description
            pc.setRemoteDescription(new RTCSessionDescription(answer))
                .catch(error => {
                    debug.error(`Failed to handle answer from ${peerPubkey}:`, error);
                    disconnectPeer(peerPubkey);
                });
        } catch (error) {
            debug.error(`Error handling answer from ${peerPubkey}:`, error);
        }
    }
    
    /**
     * Handle an ICE candidate from a peer
     * @param {string} peerPubkey - Peer's pubkey
     * @param {RTCIceCandidate} candidate - ICE candidate
     */
    function handleIceCandidate(peerPubkey, candidate) {
        if (!peerConnections.has(peerPubkey)) return;
        
        try {
            const pc = peerConnections.get(peerPubkey).connection;
            
            // Add ICE candidate
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(error => {
                    debug.error(`Failed to add ICE candidate from ${peerPubkey}:`, error);
                });
        } catch (error) {
            debug.error(`Error handling ICE candidate from ${peerPubkey}:`, error);
        }
    }
    
    /**
     * Update the connections list UI
     */
    function updateConnectionsList() {
        const connectionsList = document.getElementById('voice-chat-connections-list');
        
        // Clear list
        connectionsList.innerHTML = '';
        
        // No connections message
        if (peerConnections.size === 0) {
            const noConnectionsItem = document.createElement('li');
            noConnectionsItem.textContent = 'No active connections';
            connectionsList.appendChild(noConnectionsItem);
            return;
        }
        
        // Add each connection
        peerConnections.forEach((pc, pubkey) => {
            const connectionItem = document.createElement('li');
            
            // Create connection strength indicator
            const strengthIndicator = document.createElement('span');
            strengthIndicator.className = 'connection-strength';
            
            // Set connection strength class
            if (pc.connection.iceConnectionState === 'connected') {
                strengthIndicator.classList.add('good');
            } else if (pc.connection.iceConnectionState === 'checking') {
                strengthIndicator.classList.add('medium');
            } else {
                strengthIndicator.classList.add('poor');
            }
            
            // Create name span
            const nameSpan = document.createElement('span');
            nameSpan.textContent = pubkey.substring(0, 8) + '...';
            
            // Create disconnect button
            const disconnectButton = document.createElement('button');
            disconnectButton.textContent = 'Disconnect';
            disconnectButton.className = 'small-button';
            disconnectButton.addEventListener('click', () => {
                disconnectPeer(pubkey);
            });
            
            // Add elements to item
            connectionItem.appendChild(strengthIndicator);
            connectionItem.appendChild(nameSpan);
            connectionItem.appendChild(disconnectButton);
            
            // Add item to list
            connectionsList.appendChild(connectionItem);
        });
    }
    
    // Public API
    return {
        initialize,
        enable,
        disable,
        connectToPeer,
        disconnectPeer,
        handleSignalingMessage,
        toggleMute,
        setVolume,
        
        // Getters
        isEnabled: () => isEnabled,
        getSettings: () => ({ ...settings }),
        getConnectedPeers: () => [...peerConnections.keys()]
    };
})();
