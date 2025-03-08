/**
 * audio-module.js
 * Audio and voice chat functionality for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const AudioModule = {
    // Module metadata
    name: "audio",
    description: "Audio and voice chat functionality for Relay World",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: ["nostr", "utils"],
    priority: 30,
    critical: false,
    
    // Module state
    initialized: false,
    soundsLoaded: false,
    audioContext: null,
    
    // Sound effects
    sounds: {},
    
    // WebRTC voice chat
    isVoiceChatActive: false,
    localStream: null,
    peers: new Map(), // Map of pubkey -> peer connection
    nearbyUsers: new Map(), // Map of pubkey -> {distance, lastUpdate, speaking}
    voiceAnalyser: null,
    isSpeaking: false,
    speakingThreshold: 30,
    silenceTimer: null,
    
    // Initialize audio module
    init: async function() {
        console.log("[Audio] Initializing audio module...");
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Initialize audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("[Audio] Audio context initialized");
        } catch (error) {
            console.warn("[Audio] Failed to initialize audio context:", error);
        }
        
        // Load sound effects
        await this._loadSounds();
        
        this.initialized = true;
        console.log("[Audio] Audio module initialized");
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Listen for UI events
        const voiceToggleBtn = document.getElementById('voice-toggle');
        if (voiceToggleBtn) {
            voiceToggleBtn.addEventListener('click', this.toggleVoiceChat.bind(this));
        }
        
        // Listen for game events
        RelayWorldCore.eventBus.on('game:playerMoved', this.updateNearbyPlayers.bind(this));
        RelayWorldCore.eventBus.on('nostr:playerJoined', this.checkNewPlayer.bind(this));
        RelayWorldCore.eventBus.on('nostr:playerLeft', this.removePlayer.bind(this));
    },
    
    // Load sound effects
    _loadSounds: async function() {
        console.log("[Audio] Loading sound effects...");
        
        const soundsToLoad = {
            'item': 'assets/sounds/item.mp3',
            'chat': 'assets/sounds/chat.mp3',
            'success': 'assets/sounds/success.mp3',
            'error': 'assets/sounds/error.mp3',
            'portal': 'assets/sounds/portal.mp3',
            'treasure': 'assets/sounds/treasure.mp3',
            'zap': 'assets/sounds/zap.mp3',
            'levelup': 'assets/sounds/levelup.mp3',
            'death': 'assets/sounds/death.mp3',
            'login': 'assets/sounds/login.mp3'
        };
        
        try {
            // Create audio elements for each sound
            for (const [name, url] of Object.entries(soundsToLoad)) {
                const audio = document.createElement('audio');
                audio.src = url;
                audio.preload = 'auto';
                
                // Create promise to track loading
                const loadPromise = new Promise((resolve, reject) => {
                    audio.oncanplaythrough = resolve;
                    audio.onerror = reject;
                    
                    // Timeout to prevent hanging
                    setTimeout(resolve, 5000);
                });
                
                try {
                    await loadPromise;
                    this.sounds[name] = audio;
                    console.log(`[Audio] Loaded sound: ${name}`);
                } catch (error) {
                    console.warn(`[Audio] Failed to load sound "${name}":`, error);
                }
            }
            
            this.soundsLoaded = true;
            console.log("[Audio] Sound effects loaded");
            return true;
        } catch (error) {
            console.error("[Audio] Failed to load sounds:", error);
            return false;
        }
    },
    
    // Play a sound effect
    playSound: function(name, options = {}) {
        const { volume = 0.5, loop = false } = options;
        
        if (!this.soundsLoaded || !this.sounds[name]) {
            console.warn(`[Audio] Sound "${name}" not found or sounds not loaded`);
            return false;
        }
        
        try {
            // Clone the audio to allow overlapping sounds
            const sound = this.sounds[name].cloneNode();
            sound.volume = volume;
            sound.loop = loop;
            
            // Play the sound
            const playPromise = sound.play();
            
            // Handle autoplay restrictions
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`[Audio] Failed to play sound "${name}":`, error);
                });
            }
            
            return true;
        } catch (error) {
            console.error(`[Audio] Failed to play sound "${name}":`, error);
            return false;
        }
    },
    
    // Stop a looping sound
    stopSound: function(name) {
        if (!this.soundsLoaded || !this.sounds[name]) {
            return false;
        }
        
        try {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
            return true;
        } catch (error) {
            console.error(`[Audio] Failed to stop sound "${name}":`, error);
            return false;
        }
    },
    
    // Toggle voice chat on/off
    toggleVoiceChat: async function() {
        if (this.isVoiceChatActive) {
            await this.stopVoiceChat();
            
            // Emit event
            RelayWorldCore.eventBus.emit('audio:voiceChatStopped', null);
        } else {
            const success = await this.startVoiceChat();
            
            if (success) {
                // Emit event
                RelayWorldCore.eventBus.emit('audio:voiceChatStarted', null);
            }
        }
    },
    
    // Start voice chat
    startVoiceChat: async function() {
        try {
            console.log("[Audio] Starting voice chat...");
            
            // Check if browser supports WebRTC
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser does not support WebRTC");
            }
            
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            // Set up voice detection
            this._setupVoiceDetection();
            
            // Update UI
            this.isVoiceChatActive = true;
            
            const voiceIcon = document.getElementById('voice-icon');
            const voiceIndicator = document.getElementById('voice-indicator');
            
            if (voiceIcon) voiceIcon.textContent = '🔊';
            if (voiceIndicator) voiceIndicator.classList.add('active');
            
            // Connect to nearby players
            this._connectToNearbyPlayers();
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Voice chat activated - nearby players can hear you",
                type: "success"
            });
            
            console.log("[Audio] Voice chat started");
            return true;
        } catch (error) {
            console.error("[Audio] Failed to start voice chat:", error);
            
            // Show notification
            RelayWorldCore.eventBus.emit('ui:showToast', {
                message: "Failed to start voice chat: " + error.message,
                type: "error"
            });
            
            return false;
        }
    },
    
    // Stop voice chat
    stopVoiceChat: async function() {
        console.log("[Audio] Stopping voice chat...");
        
        // Close all peer connections
        for (const [pubkey, peer] of this.peers) {
            this._closePeerConnection(pubkey);
        }
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Clear audio analysis
        this.voiceAnalyser = null;
        
        // Update UI
        this.isVoiceChatActive = false;
        
        const voiceIcon = document.getElementById('voice-icon');
        const voiceIndicator = document.getElementById('voice-indicator');
        
        if (voiceIcon) voiceIcon.textContent = '🎙️';
        if (voiceIndicator) voiceIndicator.classList.remove('active');
        
        // Clear voice indicators
        this._clearVoiceIndicators();
        
        // Show notification
        RelayWorldCore.eventBus.emit('ui:showToast', {
            message: "Voice chat deactivated",
            type: "info"
        });
        
        console.log("[Audio] Voice chat stopped");
        return true;
    },
    
    // Set up voice activity detection
    _setupVoiceDetection: function() {
        if (!this.audioContext || !this.localStream) return;
        
        try {
            // Create audio source from stream
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            
            // Create analyser node
            this.voiceAnalyser = this.audioContext.createAnalyser();
            this.voiceAnalyser.fftSize = 256;
            
            // Connect source to analyser
            source.connect(this.voiceAnalyser);
            
            // Start monitoring voice activity
            this._monitorVoiceActivity();
            
        } catch (error) {
            console.error("[Audio] Failed to set up voice detection:", error);
        }
    },
    
    // Monitor voice activity
    _monitorVoiceActivity: function() {
        if (!this.voiceAnalyser) return;
        
        const bufferLength = this.voiceAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkVoiceActivity = () => {
            if (!this.isVoiceChatActive || !this.voiceAnalyser) return;
            
            // Get volume data
            this.voiceAnalyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Check if speaking
            const wasSpeaking = this.isSpeaking;
            this.isSpeaking = average > this.speakingThreshold;
            
            // Handle state change
            if (this.isSpeaking !== wasSpeaking) {
                if (this.isSpeaking) {
                    // Started speaking
                    clearTimeout(this.silenceTimer);
                    
                    const indicator = document.getElementById('voice-indicator');
                    if (indicator) indicator.style.backgroundColor = '#10B981';
                    
                    // Emit speaking started event
                    RelayWorldCore.eventBus.emit('audio:speakingStarted', null);
                } else {
                    // Stopped speaking - add a small delay to prevent flicker
                    this.silenceTimer = setTimeout(() => {
                        if (this.isVoiceChatActive) {
                            const indicator = document.getElementById('voice-indicator');
                            if (indicator) indicator.style.backgroundColor = '#555';
                            
                            // Emit speaking stopped event
                            RelayWorldCore.eventBus.emit('audio:speakingStopped', null);
                        }
                    }, 500);
                }
            }
            
            // Continue monitoring
            requestAnimationFrame(checkVoiceActivity);
        };
        
        checkVoiceActivity();
    },
    
    // Check if local user is speaking
    isLocalUserSpeaking: function() {
        return this.isSpeaking;
    },
    
    // Update nearby players for voice chat
    updateNearbyPlayers: function(data) {
        if (!this.isVoiceChatActive) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        const playerModule = RelayWorldCore.getModule('player');
        
        if (!nostrModule || !playerModule) return;
        
        // Get current player position
        const playerX = playerModule.x;
        const playerY = playerModule.y;
        
        // Get voice chat range
        const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
        
        // Check all users
        for (const [pubkey, user] of nostrModule.users) {
            // Skip current player
            if (pubkey === playerModule.pubkey) continue;
            
            // Calculate distance
            const distance = Math.sqrt(
                Math.pow(playerX - user.x, 2) + 
                Math.pow(playerY - user.y, 2)
            );
            
            if (distance < voiceChatRange) {
                // User is in range, add to nearby users
                this.addNearbyUser(pubkey, distance);
            } else {
                // User is out of range, remove from nearby users
                this.removeNearbyUser(pubkey);
            }
        }
    },
    
    // Add a nearby user
    addNearbyUser: function(pubkey, distance) {
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule || pubkey === playerModule.pubkey) return;
        
        // Add or update user
        this.nearbyUsers.set(pubkey, {
            distance,
            lastUpdate: Date.now(),
            speaking: false
        });
        
        // If voice chat is active, create a WebRTC connection
        if (this.isVoiceChatActive && !this.peers.has(pubkey)) {
            this._createPeerConnection(pubkey);
        }
    },
    
    // Remove a user from nearby users
    removeNearbyUser: function(pubkey) {
        if (!this.nearbyUsers.has(pubkey)) return;
        
        // Remove user
        this.nearbyUsers.delete(pubkey);
        
        // Close WebRTC connection if exists
        this._closePeerConnection(pubkey);
    },
    
    // Check if a new player should be added to nearby users
    checkNewPlayer: function(data) {
        if (!this.isVoiceChatActive) return;
        
        const { pubkey, x, y } = data;
        
        const playerModule = RelayWorldCore.getModule('player');
        if (!playerModule || pubkey === playerModule.pubkey) return;
        
        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(playerModule.x - x, 2) + 
            Math.pow(playerModule.y - y, 2)
        );
        
        // Get voice chat range
        const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
        
        if (distance < voiceChatRange) {
            // User is in range, add to nearby users
            this.addNearbyUser(pubkey, distance);
        }
    },
    
    // Remove a player
    removePlayer: function(data) {
        const { pubkey } = data;
        this.removeNearbyUser(pubkey);
    },
    
    // Create a WebRTC peer connection
    _createPeerConnection: function(pubkey) {
        if (!this.isVoiceChatActive || !this.localStream) return;
        
        console.log(`[Audio] Creating peer connection with ${pubkey.slice(0, 8)}`);
        
        try {
            // Check if SimplePeer library is available
            if (typeof SimplePeer !== 'function') {
                throw new Error("SimplePeer library not found");
            }
            
            // Create a new SimplePeer connection
            const peer = new SimplePeer({
                initiator: true,
                stream: this.localStream,
                trickle: false
            });
            
            // Handle signals
            peer.on('signal', data => {
                this._sendSignal(pubkey, data);
            });
            
            // Handle connected event
            peer.on('connect', () => {
                console.log(`[Audio] Connected to ${pubkey.slice(0, 8)}`);
            });
            
            // Handle stream event
            peer.on('stream', stream => {
                console.log(`[Audio] Received stream from ${pubkey.slice(0, 8)}`);
                this._handleRemoteStream(pubkey, stream);
            });
            
            // Handle close event
            peer.on('close', () => {
                console.log(`[Audio] Connection closed with ${pubkey.slice(0, 8)}`);
                this.peers.delete(pubkey);
            });
            
            // Handle error event
            peer.on('error', err => {
                console.error(`[Audio] Peer error with ${pubkey.slice(0, 8)}:`, err);
                this.peers.delete(pubkey);
            });
            
            // Store the peer connection
            this.peers.set(pubkey, peer);
            
            // Create a voice indicator for this user
            this._createVoiceIndicator(pubkey);
            
            return peer;
        } catch (error) {
            console.error(`[Audio] Failed to create peer connection with ${pubkey.slice(0, 8)}:`, error);
            return null;
        }
    },
    
    // Close a peer connection
    _closePeerConnection: function(pubkey) {
        const peer = this.peers.get(pubkey);
        if (!peer) return;
        
        try {
            peer.destroy();
            this.peers.delete(pubkey);
            
            // Remove voice indicator
            this._removeVoiceIndicator(pubkey);
            
            console.log(`[Audio] Closed peer connection with ${pubkey.slice(0, 8)}`);
        } catch (error) {
            console.error(`[Audio] Failed to close peer connection with ${pubkey.slice(0, 8)}:`, error);
        }
    },
    
    // Send a WebRTC signal via Nostr
    _sendSignal: function(pubkey, signal) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        try {
            // Create a voice chat event (kind 420010)
            const event = {
                kind: 420010,
                content: JSON.stringify(signal),
                tags: [
                    ["p", pubkey],
                    ["type", "webrtc-signal"]
                ],
                created_at: Math.floor(Date.now() / 1000)
            };
            
            // Publish to game relay
            nostrModule.publishToGameRelay(event);
            
            console.log(`[Audio] Sent WebRTC signal to ${pubkey.slice(0, 8)}`);
        } catch (error) {
            console.error(`[Audio] Failed to send WebRTC signal to ${pubkey.slice(0, 8)}:`, error);
        }
    },
    
    // Handle an incoming WebRTC signal
    handleIncomingSignal: function(event) {
        try {
            const pubkey = event.pubkey;
            const signal = JSON.parse(event.content);
            
            console.log(`[Audio] Received WebRTC signal from ${pubkey.slice(0, 8)}`);
            
            // Check if we have a peer connection
            let peer = this.peers.get(pubkey);
            
            if (!peer) {
                // Create new peer connection as non-initiator
                if (!this.isVoiceChatActive || !this.localStream) {
                    console.warn(`[Audio] Cannot handle signal from ${pubkey.slice(0, 8)}: Voice chat not active`);
                    return;
                }
                
                peer = new SimplePeer({
                    initiator: false,
                    stream: this.localStream,
                    trickle: false
                });
                
                // Set up event handlers
                peer.on('signal', data => {
                    this._sendSignal(pubkey, data);
                });
                
                peer.on('connect', () => {
                    console.log(`[Audio] Connected to ${pubkey.slice(0, 8)}`);
                });
                
                peer.on('stream', stream => {
                    console.log(`[Audio] Received stream from ${pubkey.slice(0, 8)}`);
                    this._handleRemoteStream(pubkey, stream);
                });
                
                peer.on('close', () => {
                    console.log(`[Audio] Connection closed with ${pubkey.slice(0, 8)}`);
                    this.peers.delete(pubkey);
                });
                
                peer.on('error', err => {
                    console.error(`[Audio] Peer error with ${pubkey.slice(0, 8)}:`, err);
                    this.peers.delete(pubkey);
                });
                
                // Store the peer connection
                this.peers.set(pubkey, peer);
                
                // Create a voice indicator for this user
                this._createVoiceIndicator(pubkey);
            }
            
            // Pass the signal to the peer
            peer.signal(signal);
            
        } catch (error) {
            console.error(`[Audio] Failed to handle incoming WebRTC signal:`, error);
        }
    },
    
    // Handle a remote stream
    _handleRemoteStream: function(pubkey, stream) {
        try {
            // Create audio element for this stream
            const audio = document.createElement('audio');
            audio.srcObject = stream;
            audio.id = `audio-${pubkey}`;
            audio.autoplay = true;
            
            // Set volume based on distance
            const user = this.nearbyUsers.get(pubkey);
            if (user) {
                this._updateAudioVolume(audio, user.distance);
            }
            
            // Add to document (hidden)
            audio.style.display = 'none';
            document.body.appendChild(audio);
            
            // Set up audio analysis for this stream
            this._setupRemoteVoiceDetection(pubkey, stream);
            
        } catch (error) {
            console.error(`[Audio] Failed to handle remote stream from ${pubkey.slice(0, 8)}:`, error);
        }
    },
    
    // Set up voice detection for a remote stream
    _setupRemoteVoiceDetection: function(pubkey, stream) {
        if (!this.audioContext) return;
        
        try {
            // Create audio source from stream
            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Create analyser node
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Connect source to analyser
            source.connect(analyser);
            
            // Create buffer for analysis
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Store analyser in user data
            const user = this.nearbyUsers.get(pubkey);
            if (user) {
                user.analyser = analyser;
                user.dataArray = dataArray;
            }
            
        } catch (error) {
            console.error(`[Audio] Failed to set up remote voice detection for ${pubkey.slice(0, 8)}:`, error);
        }
    },
    
    // Update audio volume based on distance
    _updateAudioVolume: function(audioElement, distance) {
        if (!audioElement) return;
        
        // Calculate volume based on distance (0-1)
        const voiceChatRange = RelayWorldCore.getConfig('VOICE_CHAT_RANGE', 300);
        const volume = Math.max(0, 1 - (distance / voiceChatRange));
        
        // Apply volume
        audioElement.volume = volume;
    },
    
    // Create a voice indicator for a user
    _createVoiceIndicator: function(pubkey) {
        const nostrModule = RelayWorldCore.getModule('nostr');
        if (!nostrModule) return;
        
        const user = nostrModule.getUser(pubkey);
        if (!user) return;
        
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = 'voice-indicator';
        indicator.id = `voice-indicator-${pubkey}`;
        
        // Add to document
        const indicators = document.getElementById('voice-chat-indicators');
        if (indicators) {
            indicators.appendChild(indicator);
        }
        
        // Position indicator near user
        this._updateVoiceIndicatorPosition(pubkey);
    },
    
    // Remove a voice indicator
    _removeVoiceIndicator: function(pubkey) {
        const indicator = document.getElementById(`voice-indicator-${pubkey}`);
        if (indicator) {
            indicator.remove();
        }
    },
    
    // Update voice indicator position
    _updateVoiceIndicatorPosition: function(pubkey) {
        const indicator = document.getElementById(`voice-indicator-${pubkey}`);
        if (!indicator) return;
        
        const nostrModule = RelayWorldCore.getModule('nostr');
        const gameModule = RelayWorldCore.getModule('game');
        
        if (!nostrModule || !gameModule) return;
        
        const user = nostrModule.getUser(pubkey);
        if (!user) return;
        
        // Calculate screen position
        const camera = gameModule.camera;
        const canvas = gameModule.canvas;
        
        const screenX = user.x - (camera.x - canvas.width / 2);
        const screenY = user.y - (camera.y - canvas.height / 2) - 60;
        
        // Update position
        indicator.style.left = `${screenX - 16}px`;
        indicator.style.top = `${screenY - 16}px`;
        
        // Check if user is speaking
        const nearbyUser = this.nearbyUsers.get(pubkey);
        if (nearbyUser && nearbyUser.speaking) {
            indicator.classList.add('speaking');
        } else {
            indicator.classList.remove('speaking');
        }
    },
    
    // Update all voice indicators
    updateVoiceIndicators: function() {
        if (!this.isVoiceChatActive) return;
        
        // Update all nearby users
        for (const [pubkey, user] of this.nearbyUsers) {
            // Update position
            this._updateVoiceIndicatorPosition(pubkey);
            
            // Update volume based on distance
            const audioElement = document.getElementById(`audio-${pubkey}`);
            if (audioElement) {
                this._updateAudioVolume(audioElement, user.distance);
            }
            
            // Check if user is speaking
            if (user.analyser && user.dataArray) {
                user.analyser.getByteFrequencyData(user.dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < user.dataArray.length; i++) {
                    sum += user.dataArray[i];
                }
                const average = sum / user.dataArray.length;
                
                // Update speaking state
                user.speaking = average > this.speakingThreshold;
            }
        }
    },
    
    // Clear all voice indicators
    _clearVoiceIndicators: function() {
        const indicators = document.getElementById('voice-chat-indicators');
        if (indicators) {
            indicators.innerHTML = '';
        }
    },
    
    // Check if a user is speaking
    isUserSpeaking: function(pubkey) {
        const user = this.nearbyUsers.get(pubkey);
        return user ? user.speaking : false;
    },
    
    // Connect to all nearby users
    _connectToNearbyPlayers: function() {
        if (!this.isVoiceChatActive) return;
        
        for (const [pubkey, user] of this.nearbyUsers) {
            if (!this.peers.has(pubkey)) {
                this._createPeerConnection(pubkey);
            }
        }
    },
    
    // Clean up voice chat resources
    cleanupVoiceChat: function() {
        this.stopVoiceChat();
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close().catch(err => {
                console.error("[Audio] Failed to close audio context:", err);
            });
            this.audioContext = null;
        }
    }
};
