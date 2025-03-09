/**
 * relay-world-3d.js
 * This script enhances Relay World with 3D rendering and ostrich characters
 */

// Create the 3D game engine namespace
const RelayWorld3D = {
    // Core properties
    scene: null,
    camera: null,
    renderer: null,
    canvas: null,
    clock: new THREE.Clock(),
    initialized: false,
    scaleFactor: 1.3,
    
    // Game objects
    players: new Map(), // Map<pubkey, {model: THREE.Group, data: Object}>
    collectibles: [],
    lightningBolts: [],
    
    // Initialize the 3D engine
    init: async function() {
        console.log("[RelayWorld3D] Initializing 3D engine...");
        
        // Make sure THREE.js is available
        if (typeof THREE === 'undefined') {
            await this.loadThreeJS();
        }
        
        // Get the canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[RelayWorld3D] Game canvas not found!");
            return false;
        }
        
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f380f); // Match game's dark green
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000 * this.scaleFactor
        );
        this.camera.position.set(0, 10 * this.scaleFactor, 20 * this.scaleFactor);
        this.camera.lookAt(0, 0, 0);
        
        // Create the renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        // Add lighting
        this.setupLighting();
        
        // Create the ground
        this.createGround();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Start animation loop
        this.animate();
        
        this.initialized = true;
        console.log("[RelayWorld3D] 3D engine initialized");
        return true;
    },
    
    // Load Three.js from CDN if not available
    loadThreeJS: function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    // Setup lighting for the scene
    setupLighting: function() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);
    },
    
    // Create ground grid
    createGround: function() {
        // Grid helper
        const gridSize = 100;
        const gridDivisions = 30;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x306230, 0x306230);
        this.scene.add(gridHelper);
        
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8bac0f, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1; // Slightly below grid
        this.scene.add(ground);
    },
    
    // Create a 3D ostrich player model
    createOstrich: function(pubkey, playerData = {}) {
        // Create a group for the ostrich
        const ostrich = new THREE.Group();
        
        // Body - purple cylindrical body
        const bodyGeometry = new THREE.CylinderGeometry(1, 1.5, 3, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B5CF6 }); // Purple
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        body.castShadow = true;
        ostrich.add(body);
        
        // Neck - thin cylinder
        const neckGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
        const neckMaterial = new THREE.MeshLambertMaterial({ color: 0x9F7AEA }); // Lighter purple
        const neck = new THREE.Mesh(neckGeometry, neckMaterial);
        neck.position.y = 5;
        neck.position.z = -0.5;
        neck.rotation.x = Math.PI / 10; // Slight bend
        neck.castShadow = true;
        ostrich.add(neck);
        
        // Head - sphere
        const headGeometry = new THREE.SphereGeometry(0.6, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xA78BFA }); // Light purple
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 6.5;
        head.position.z = -0.7;
        head.castShadow = true;
        ostrich.add(head);
        
        // Beak - cone
        const beakGeometry = new THREE.ConeGeometry(0.2, 1, 8);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFCD34D }); // Yellow
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.y = 6.5;
        beak.position.z = -1.5;
        beak.rotation.x = Math.PI / 2;
        beak.castShadow = true;
        ostrich.add(beak);
        
        // Eyes - small white spheres with black pupils
        for (let i = -1; i <= 1; i += 2) {
            // White of eye
            const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.y = 6.7;
            eye.position.z = -1.1;
            eye.position.x = i * 0.3;
            ostrich.add(eye);
            
            // Pupil
            const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            pupil.position.y = 6.7;
            pupil.position.z = -1.25;
            pupil.position.x = i * 0.3;
            ostrich.add(pupil);
        }
        
        // Legs - thin cylinders
        for (let i = -1; i <= 1; i += 2) {
            const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 8);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x7C3AED }); // Dark purple
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.x = i * 0.7;
            leg.position.y = 0.5;
            leg.castShadow = true;
            ostrich.add(leg);
            
            // Foot
            const footGeometry = new THREE.CylinderGeometry(0.3, 0.1, 0.8, 3);
            const footMaterial = new THREE.MeshLambertMaterial({ color: 0x6D28D9 }); // Dark purple
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.x = i * 0.7;
            foot.position.y = -1;
            foot.position.z = 0.3;
            foot.rotation.x = Math.PI / 4;
            foot.castShadow = true;
            ostrich.add(foot);
        }
        
        // Add name label using sprite
        const name = playerData.name || pubkey.substring(0, 8);
        const textSprite = this.createTextSprite(name);
        textSprite.position.y = 8;
        ostrich.add(textSprite);
        
        // Scale the model
        ostrich.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
        
        // Add to scene
        this.scene.add(ostrich);
        
        // Store player data
        this.players.set(pubkey, {
            model: ostrich,
            data: playerData
        });
        
        return ostrich;
    },
    
    // Create a text sprite for player names
    createTextSprite: function(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 32px Arial';
        
        // Measure text width
        const textWidth = ctx.measureText(text).width;
        
        // Set canvas dimensions with padding
        canvas.width = textWidth + 20;
        canvas.height = 50;
        
        // Draw background with rounded corners
        ctx.fillStyle = 'rgba(70, 70, 70, 0.7)';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
        ctx.fill();
        
        // Draw text
        ctx.font = 'Bold 32px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create sprite material
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5, 2.5, 1);
        
        return sprite;
    },
    
    // Create a collectible item
    createCollectible: function(x, y, z, value, type = 'gem') {
        // Define collectible types and their properties
        const collectibleTypes = {
            gem: { color: 0x3B82F6, emoji: '💎' }, // Blue
            mushroom: { color: 0xEF4444, emoji: '🍄' }, // Red
            orb: { color: 0x8B5CF6, emoji: '🔮' }, // Purple
            lightning: { color: 0xF59E0B, emoji: '⚡' }, // Yellow
            key: { color: 0xF59E0B, emoji: '🔑' } // Gold
        };
        
        const collectible = new THREE.Group();
        collectible.position.set(x, y, z);
        
        // Get collectible properties
        const props = collectibleTypes[type] || collectibleTypes.gem;
        
        // Create the base geometry based on type
        let geometry;
        if (type === 'gem') {
            geometry = new THREE.OctahedronGeometry(1, 0);
        } else if (type === 'mushroom') {
            // Create a mushroom shape (sphere on cylinder)
            const stemGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
            const stem = new THREE.Mesh(
                stemGeometry,
                new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
            );
            stem.position.y = -0.5;
            collectible.add(stem);
            
            geometry = new THREE.SphereGeometry(0.7, 8, 8);
        } else if (type === 'orb') {
            geometry = new THREE.SphereGeometry(1, 16, 16);
        } else if (type === 'lightning') {
            // Create a lightning bolt shape
            geometry = new THREE.ConeGeometry(0.5, 2, 4);
        } else {
            // Default/key is a cube
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Create the main collectible mesh
        const material = new THREE.MeshLambertMaterial({
            color: props.color,
            emissive: props.color,
            emissiveIntensity: 0.3
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        collectible.add(mesh);
        
        // Add a sprite with the emoji
        const sprite = this.createTextSprite(props.emoji);
        sprite.position.y = 2;
        collectible.add(sprite);
        
        // Animate the collectible
        collectible.userData = {
            type,
            value,
            startY: y,
            rotationSpeed: 0.01 + Math.random() * 0.02
        };
        
        // Add to scene and collectibles array
        this.scene.add(collectible);
        this.collectibles.push(collectible);
        
        return collectible;
    },
    
    // Main animation loop
    animate: function() {
        if (!this.initialized) return;
        
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        this.update(delta);
        
        this.renderer.render(this.scene, this.camera);
    },
    
    // Update game state
    update: function(delta) {
        // Update collectible animations
        this.collectibles.forEach(collectible => {
            // Rotate the collectible
            collectible.rotation.y += collectible.userData.rotationSpeed;
            
            // Bob up and down
            collectible.position.y = collectible.userData.startY + 
                Math.sin(performance.now() * 0.002) * 0.5;
        });
        
        // Update player models (if there's a game module)
        if (window.RelayWorld && window.RelayWorldCore) {
            const playerModule = window.RelayWorldCore.getModule('player');
            if (playerModule && playerModule.pubkey) {
                // Get current player
                let player = this.players.get(playerModule.pubkey);
                
                if (!player) {
                    // Create player model if it doesn't exist
                    const nostrModule = window.RelayWorldCore.getModule('nostr');
                    const playerName = nostrModule?.currentUser?.profile?.name || playerModule.pubkey.substring(0, 8);
                    
                    this.createOstrich(playerModule.pubkey, {
                        name: playerName,
                        isCurrentPlayer: true
                    });
                    
                    player = this.players.get(playerModule.pubkey);
                }
                
                if (player) {
                    // Update player position based on 2D coordinates
                    player.model.position.x = playerModule.x - 1500; // Center around 0
                    player.model.position.z = playerModule.y - 1500; // Convert y to z
                    
                    // Bob up and down while moving
                    if (playerModule.input.up || playerModule.input.down || 
                        playerModule.input.left || playerModule.input.right) {
                        player.model.position.y = Math.sin(performance.now() * 0.01) * 0.2;
                        
                        // Update player rotation based on movement
                        if (playerModule.input.right) player.model.rotation.y = Math.PI * 0.5;
                        if (playerModule.input.left) player.model.rotation.y = Math.PI * 1.5;
                        if (playerModule.input.down) player.model.rotation.y = Math.PI;
                        if (playerModule.input.up) player.model.rotation.y = 0;
                        
                        // Diagonal movement
                        if (playerModule.input.up && playerModule.input.right) player.model.rotation.y = Math.PI * 0.25;
                        if (playerModule.input.up && playerModule.input.left) player.model.rotation.y = Math.PI * 1.75;
                        if (playerModule.input.down && playerModule.input.right) player.model.rotation.y = Math.PI * 0.75;
                        if (playerModule.input.down && playerModule.input.left) player.model.rotation.y = Math.PI * 1.25;
                    }
                    
                    // Position camera to follow player
                    this.camera.position.x = player.model.position.x;
                    this.camera.position.z = player.model.position.z + 20 * this.scaleFactor;
                    this.camera.lookAt(player.model.position.x, player.model.position.y + 5, player.model.position.z);
                }
            }
        }
    },
    
    // Add a new player
    addPlayer: function(pubkey, name, x, y) {
        // Skip if player already exists
        if (this.players.has(pubkey)) return;
        
        // Create new ostrich player
        const playerData = {
            name: name || pubkey.substring(0, 8),
            x: x || 0,
            y: y || 0
        };
        
        return this.createOstrich(pubkey, playerData);
    },
    
    // Remove a player
    removePlayer: function(pubkey) {
        const player = this.players.get(pubkey);
        if (player) {
            this.scene.remove(player.model);
            this.players.delete(pubkey);
        }
    },
    
    // Spawn random collectibles
    spawnRandomCollectibles: function(count = 20) {
        // Clear existing collectibles
        this.collectibles.forEach(collectible => {
            this.scene.remove(collectible);
        });
        this.collectibles = [];
        
        // Types of collectibles
        const types = ['gem', 'mushroom', 'orb', 'lightning', 'key'];
        
        // Spawn new collectibles
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            const y = 2 + Math.random() * 2;
            const value = Math.floor(Math.random() * 50) + 10;
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.createCollectible(x, y, z, value, type);
        }
        
        console.log(`[RelayWorld3D] Spawned ${count} collectibles`);
    }
};

// Initialize the 3D engine when the page is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[RelayWorld3D] Waiting for game to initialize...");
    
    // Wait for RelayWorld to initialize
    const waitForRelayWorld = async () => {
        for (let i = 0; i < 20; i++) { // Try for 10 seconds (20 * 500ms)
            if (window.RelayWorld && window.RelayWorld.initialized) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return false;
    };
    
    const relayWorldReady = await waitForRelayWorld();
    
    if (relayWorldReady) {
        console.log("[RelayWorld3D] RelayWorld initialized, setting up 3D engine...");
        
        // Override the game's rendering
        const gameModule = window.RelayWorldCore.getModule('game');
        if (gameModule) {
            // Save original methods
            const originalDraw = gameModule.draw;
            
            // Override draw method to prevent 2D rendering
            gameModule.draw = function() {
                // Only update UI elements from original draw
                this.drawUI();
            };
            
            console.log("[RelayWorld3D] Game rendering overridden");
        }
        
        // Initialize the 3D engine
        await RelayWorld3D.init();
        
        // Spawn initial collectibles
        RelayWorld3D.spawnRandomCollectibles(30);
        
        console.log("[RelayWorld3D] 3D engine integration complete");
    } else {
        console.error("[RelayWorld3D] RelayWorld not initialized, initializing standalone 3D engine...");
        
        // Initialize 3D engine in standalone mode
        await RelayWorld3D.init();
        
        // Create a demo player
        RelayWorld3D.createOstrich("demo", { name: "Player" });
        
        // Spawn collectibles
        RelayWorld3D.spawnRandomCollectibles(30);
        
        // Setup basic keyboard controls for demo
        const input = { up: false, down: false, left: false, right: false };
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') input.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') input.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') input.right = true;
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') input.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') input.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') input.right = false;
        });
        
        // Update loop for demo mode
        const demoPlayer = RelayWorld3D.players.get("demo");
        
        if (demoPlayer) {
            const updateDemo = () => {
                const speed = 0.5;
                
                if (input.up) demoPlayer.model.position.z -= speed;
                if (input.down) demoPlayer.model.position.z += speed;
                if (input.left) demoPlayer.model.position.x -= speed;
                if (input.right) demoPlayer.model.position.x += speed;
                
                // Update camera to follow player
                RelayWorld3D.camera.position.x = demoPlayer.model.position.x;
                RelayWorld3D.camera.position.z = demoPlayer.model.position.z + 20;
                RelayWorld3D.camera.lookAt(demoPlayer.model.position);
                
                // Update player rotation based on movement
                if (input.up && input.right) demoPlayer.model.rotation.y = Math.PI * 0.25;
                else if (input.up && input.left) demoPlayer.model.rotation.y = Math.PI * 1.75;
                else if (input.down && input.right) demoPlayer.model.rotation.y = Math.PI * 0.75;
                else if (input.down && input.left) demoPlayer.model.rotation.y = Math.PI * 1.25;
                else if (input.right) demoPlayer.model.rotation.y = Math.PI * 0.5;
                else if (input.left) demoPlayer.model.rotation.y = Math.PI * 1.5;
                else if (input.down) demoPlayer.model.rotation.y = Math.PI;
                else if (input.up) demoPlayer.model.rotation.y = 0;
                
                requestAnimationFrame(updateDemo);
            };
            
            requestAnimationFrame(updateDemo);
        }
    }
});

// Export the 3D engine
window.RelayWorld3D = RelayWorld3D;
