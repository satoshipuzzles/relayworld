<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relay World - A Nostr Adventure Game</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <!-- Base CSS files -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/game.css">
    <link rel="stylesheet" href="css/ui.css">
    <link rel="stylesheet" href="css/animations.css">
    <!-- Fix CSS files -->
    <link rel="stylesheet" href="css/login-animations.css">
    <link rel="stylesheet" href="css/fix.css">
    <link rel="icon" type="image/png" href="assets/icons/favicon.png">
    <meta name="description" content="Relay World: An interactive multiplayer game powered by Nostr protocol">
    
    <style>
        /* Inline emergency fixes */
        #login-screen {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 9999 !important;
            background-color: var(--color-dark) !important;
        }
        
        #login-panel {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            animation: float 3s ease-in-out infinite !important;
            max-width: 90% !important;
            width: 500px !important;
        }
        
        .triforce-container {
            animation: triforce-spin 10s linear infinite !important;
        }
        
        .triforce {
            animation: triforce-pulse 2s ease-in-out infinite alternate !important;
        }
        
        .sound-wave {
            animation: sound-wave 4s ease-out infinite !important;
        }
        
        @keyframes float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }
        
        @keyframes triforce-spin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
        
        @keyframes triforce-pulse {
            0% { opacity: 0.8; }
            100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.9)); }
        }
        
        @keyframes sound-wave {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        
        /* Toast message styling */
        #toast-container {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 9999 !important;
        }
        
        .toast {
            background-color: var(--color-light) !important;
            color: var(--color-dark) !important;
            padding: 12px !important;
            margin-bottom: 10px !important;
            border-radius: 4px !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
            border: 2px solid var(--color-dark) !important;
            animation: toast-in 0.3s, toast-out 0.3s 2.7s !important;
        }
        
        .toast.success {
            border-left: 4px solid var(--color-success) !important;
        }
        
        .toast.error {
            border-left: 4px solid var(--color-danger) !important;
        }
        
        @keyframes toast-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes toast-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <div id="weather-overlay" class="weather-effect"></div>
    </div>

    <!-- UI Overlay -->
    <div id="ui-container">
        <!-- Login Screen -->
        <div id="login-screen">
            <div id="login-panel">
                <div class="pixel-corner corner-tl"></div>
                <div class="pixel-corner corner-tr"></div>
                <div class="pixel-corner corner-bl"></div>
                <div class="pixel-corner corner-br"></div>
                <div class="triforce-container">
                    <div class="triforce top"></div>
                    <div class="triforce left"></div>
                    <div class="triforce right"></div>
                </div>
                <h1>Relay World</h1>
                <p>EMBARK ON A NOSTR ADVENTURE</p>
                <p>A digital adventure awaits! Explore the Nostr network in a vibrant 3D world.</p>
                
                <!-- Login options -->
                <div id="login-options">
                    <button id="login-button" class="primary-button">CONNECT WITH NOSTR</button>
                    <!-- Guest login button will be added by JS if it doesn't exist -->
                    <div class="login-extras hide">
                        <div class="separator">AFTER LOGGING IN</div>
                        <button id="login-nwc" class="secondary-button">CONNECT LIGHTNING WALLET</button>
                    </div>
                </div>
                
                <div class="loader hide" id="login-loader"></div>
                <div id="login-status"></div>
                <div class="instructions">
                    <h3>QUEST GUIDE</h3>
                    <p><strong>MOVEMENT:</strong> WASD or Arrow Keys</p>
                    <p><strong>INTERACT:</strong> E or Space near users</p>
                    <p><strong>CHAT:</strong> Enter for global chat, V for voice</p>
                    <p><strong>ZAP:</strong> Z to zap nearby players</p>
                    <p><strong>GOAL:</strong> Explore, connect, and build your legend!</p>
                </div>
            </div>
            <div class="sound-wave" id="sound-wave"></div>
        </div>

        <!-- Loading Indicator -->
        <div id="loading-indicator" class="hide">
            <h3>Loading Relay World</h3>
            <div class="spinner"></div>
            <p id="loading-status">Connecting to relay...</p>
        </div>

        <!-- Top Bar -->
        <div id="top-bar" class="hide">
            <div id="score-display">Score: 0</div>
            <div id="game-controls">
                <div class="relay-controls">
                    <div class="relay-group">
                        <label for="relay-selector">Explorer Relay:</label>
                        <select id="relay-selector">
                            <option value="wss://relay.damus.io">relay.damus.io</option>
                        </select>
                    </div>
                    <div class="custom-relay">
                        <input type="text" id="custom-relay-input" placeholder="wss://your-relay.com">
                        <button id="add-relay-button">Add Explorer</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Player Profile -->
        <div id="player-profile" class="hide">
            <div id="player-profile-header">
                <img id="player-profile-image" src="assets/icons/default-avatar.png" alt="Profile">
                <div id="player-profile-details">
                    <div id="player-profile-name">Loading...</div>
                    <div id="player-profile-npub">Loading...</div>
                    <div id="player-profile-title"></div>
                </div>
            </div>
            <div id="player-profile-stats">
                <div class="profile-stat"><div class="label">Score:</div><div class="value" id="profile-score">0</div></div>
                <div class="profile-stat"><div class="label">Items:</div><div class="value" id="profile-items">0</div></div>
                <div class="profile-stat"><div class="label">Interactions:</div><div class="value" id="profile-interactions">0</div></div>
            </div>
        </div>

        <!-- Leaderboard -->
        <div id="leaderboard-container" class="hide">
            <h3>Leaderboard</h3>
            <select id="leaderboard-type">
                <option value="score">Score</option>
                <option value="items">Items</option>
                <option value="quests">Quests</option>
            </select>
            <div id="leaderboard-entries"></div>
        </div>

        <!-- Chat Container -->
        <div id="chat-container" class="hide">
            <div id="chat-messages"></div>
            <div style="display: flex;">
                <input type="text" id="chat-input" placeholder="Type a message...">
                <button id="send-chat-button">Send</button>
            </div>
        </div>

        <!-- Mobile Controls -->
        <div id="mobile-controls" class="hide">
            <div id="mobile-control-up" class="mobile-control-button">↑</div>
            <div id="mobile-control-down" class="mobile-control-button">↓</div>
            <div id="mobile-control-left" class="mobile-control-button">←</div>
            <div id="mobile-control-right" class="mobile-control-button">→</div>
        </div>

        <!-- Toast Notifications -->
        <div id="toast-container"></div>
    </div>

    <!-- External Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    
    <!-- Core scripts (in the proper order) -->
    <script type="module">
        // Check if module loading works
        console.log("Module loading is working");
        
        // Fallback for modules in case they don't load properly
        window.addEventListener('error', function(e) {
            if (e.message.includes('Cannot use import statement')) {
                console.error("Module loading failed, switching to script tags");
                
                // Load core scripts with regular script tags
                const scripts = [
                    "js/core/event-bus.js",
                    "js/core/config.js",
                    "js/core/relay-world-core.js",
                    "js/utils/utils.js",
                    "js/utils/crypto-utils.js",
                    "js/utils/nostr-utils.js",
                    "js/utils/debug.js",
                    "js/main.js"
                ];
                
                scripts.forEach(script => {
                    const scriptEl = document.createElement('script');
                    scriptEl.src = script;
                    document.body.appendChild(scriptEl);
                });
            }
        }, {once: true});
    </script>
    
    <script src="js/core/event-bus.js" type="module"></script>
    <script src="js/core/config.js" type="module"></script>
    <script src="js/core/relay-world-core.js" type="module"></script>
    
    <!-- Utils -->
    <script src="js/utils/utils.js" type="module"></script>
    <script src="js/utils/crypto-utils.js" type="module"></script>
    <script src="js/utils/nostr-utils.js" type="module"></script>
    <script src="js/utils/debug.js" type="module"></script>
    
    <!-- Main application -->
    <script src="js/main.js" type="module"></script>
    
    <!-- Regular scripts (non-module) -->
    <script>
        // Function to load scripts sequentially
        function loadScriptsSequentially(scripts, callback) {
            let index = 0;
            
            function loadNext() {
                if (index < scripts.length) {
                    const script = document.createElement('script');
                    script.src = scripts[index];
                    script.onload = loadNext;
                    script.onerror = loadNext; // Continue even if there's an error
                    document.body.appendChild(script);
                    index++;
                } else if (callback) {
                    callback();
                }
            }
            
            loadNext();
        }
        
        // Load fixed scripts
        loadScriptsSequentially([
            "js/fixed-login-script.js", 
            "js/improved-3d-engine.js"
        ], function() {
            console.log("All fix scripts loaded");
        });
    </script>
</body>
</html>
