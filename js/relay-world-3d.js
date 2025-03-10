/**
 * relay-world-3d.js
 * Enhanced 3D rendering engine for Relay World with improved initialization
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
    defaultProfileImage: 'assets/icons/default-avatar.png',
    
    // Game objects
    players: new Map(), // Map<pubkey, {model: THREE.Group, data: Object}>
    collectibles: [],
    lightningBolts: [],
    
    // Initialize the 3D engine
    init: async function() {
        console.log("[RelayWorld3D] Initializing 3D engine...");
        
        // Make sure THREE.js is available
        if (typeof THREE === 'undefined') {
            console.error("[RelayWorld3D] THREE.js not available!");
            return false;
        }
        
        // Get the canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[RelayWorld3D] Game canvas not found!");
            return false;
        }
        
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f380f); // Match game's dark green background
        
        // Add fog for atmosphere
        this.scene.fog = new THREE.FogExp2(0x0f380f, 0.015);
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000 * this.scaleFactor
        );
        this.camera.position.set(0, 15 * this.scaleFactor, 30 * this.scaleFactor);
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
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        this.setupLighting();
        
        // Create the ground and environment
        this.createEnvironment();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Start animation loop
        this.animate();
        
        this.initialized = true;
        console.log("[RelayWorld3D] 3D engine initialized");
        
        // Add demo player if in standalone mode
        if (!window.RelayWorld || !window.RelayWorld.initialized) {
            console.log("[RelayWorld3D] Running in standalone mode");
            this.createDemoMode();
        }
        
        return true;
    },
    
    // Create demo mode for testing without the full game
    createDemoMode: function() {
        console.log("[RelayWorld3D] Creating demo mode");
        
        // Create a demo player
        this.createOstrich("demo", { name: "Player Demo" });
        
        // Spawn collectibles
        this.spawnRandomCollectibles(30);
        
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
        const demoPlayer = this.players.get("demo");
        
        if (demoPlayer) {
            const updateDemo = () => {
                const speed = 0.5;
                
                if (input.up) demoPlayer.model.position.z -= speed;
                if (input.down) demoPlayer.model.position.z += speed;
                if (input.left) demoPlayer.model.position.x -= speed;
                if (input.right) demoPlayer.model.position.x += speed;
                
                // Update camera to follow player
                this.camera.position.x = demoPlayer.model.position.x;
                this.camera.position.z = demoPlayer.model.position.z + 20;
                this.camera.lookAt(demoPlayer.model.position);
                
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
    },
    
    // Setup lighting for the scene
    setupLighting: function() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 30, 20);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(directionalLight);
        
        // Add a secondary directional light for fill
        const fillLight = new THREE.DirectionalLight(0x8bac0f, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        
        // Add a point light for shimmer effect on collectibles
        const pointLight = new THREE.PointLight(0xFFD700, 1, 50);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);
        
        // Animate the point light
        pointLight.userData = {
            originalY: 20,
            originalIntensity: 1
        };
        
        // Store lights for later animation
        this.pointLight = pointLight;
    },
    
    // Create ground and environment
    createEnvironment: function() {
        // Grid helper
        const gridSize = 200;
        const gridDivisions = 40;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x306230, 0x306230);
        gridHelper.position.y = 0.1; // Slightly above ground to avoid z-fighting
        this.scene.add(gridHelper);
        
        // Ground plane
        const groundGeometry = new THREE.CircleGeometry(200, 64);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8bac0f, 
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add some random terrain variation
        this.addTerrainDetails();
        
        // Skybox
        const skyboxGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a2f0a,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        
        // Add stars
        this.addStars();
    },
    
    // Add terrain details
    addTerrainDetails: function() {
        // Add some rocks
        for (let i = 0; i < 50; i++) {
            const size = 1 + Math.random() * 3;
            const rockGeometry = new THREE.DodecahedronGeometry(size, 0);
            const rockMaterial = new THREE.MeshLambertMaterial({
                color: 0x555555
            });
            
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 150;
            rock.position.x = Math.cos(angle) * distance;
            rock.position.z = Math.sin(angle) * distance;
            rock.position.y = size / 2;
            rock.rotation.y = Math.random() * Math.PI * 2;
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            this.scene.add(rock);
        }
        
        // Add some trees
        for (let i = 0; i < 30; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 130;
            tree.position.x = Math.cos(angle) * distance;
            tree.position.z = Math.sin(angle) * distance;
            this.scene.add(tree);
        }
    },
    
    // Create a low-poly tree
    createTree: function() {
        const tree = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 1, 5, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);
        
        // Tree foliage (multiple cones)
        const foliageColors = [0x2E8B57, 0x3CB371, 0x228B22];
        
        for (let i = 0; i < 3; i++) {
            const size = 4 - i * 0.5;
            const height = 4;
            const segments = 6;
            const foliageGeometry = new THREE.ConeGeometry(size, height, segments);
            const foliageMaterial = new THREE.MeshLambertMaterial({ 
                color: foliageColors[i % foliageColors.length]
            });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 6 + i * 2.5;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    },
    
    // Add stars to the night sky
    addStars: function() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.8
        });
        
        const starsVertices = [];
        for (let i = 0; i < 3000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            
            // Ensure stars are far away
            const distance = Math.sqrt(x*x + y*y + z*z);
            if (distance > 300) {
                starsVertices.push(x, y, z);
            }
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    },
    
    // Setup event handlers
    setupEventHandlers: function() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // For mobile - handle touch events
        const touchControls = document.getElementById('mobile-controls');
        if (touchControls) {
            const upButton = document.getElementById('mobile-control-up');
            const downButton = document.getElementById('mobile-control-down');
            const leftButton = document.getElementById('mobile-control-left');
            const rightButton = document.getElementById('mobile-control-right');
            
            if (upButton && downButton && leftButton && rightButton) {
                // Add touch controls
                const handleTouch = (button, direction, isDown) => {
                    button.addEventListener(isDown ? 'touchstart' : 'touchend', (e) => {
                        e.preventDefault();
                        const playerModule = window.RelayWorldCore?.getModule('player');
                        if (playerModule) {
                            playerModule.input = playerModule.input || {};
                            playerModule.input[direction] = isDown;
                        }
                    });
                };
                
                handleTouch(upButton, 'up', true);
                handleTouch(upButton, 'up', false);
                handleTouch(downButton, 'down', true);
                handleTouch(downButton, 'down', false);
                handleTouch(leftButton, 'left', true);
                handleTouch(leftButton, 'left', false);
                handleTouch(rightButton, 'right', true);
                handleTouch(rightButton, 'right', false);
            }
        }
        
        // Listen for player login events
        if (window.EventBus && typeof window.EventBus.on === 'function') {
            window.EventBus.on('auth:login', (data) => {
                console.log("[RelayWorld3D] Player logged in:", data.pubkey.substring(0, 8));
                
                // Get player data from module
                const playerModule = window.RelayWorldCore?.getModule('player');
                if (playerModule) {
                    const playerData = {
                        name: playerModule.name || `User ${data.pubkey.substring(0, 8)}`,
                        picture: playerModule.picture || this.defaultProfileImage,
                        isCurrentPlayer: true
                    };
                    
                    // Create player model
                    this.createOstrich(data.pubkey, playerData);
                }
            });
        }
    },
    
    // Create a player model (simplified version)
    createOstrich: function(pubkey, playerData = {}) {
        // Create a group for the ostrich model
        const ostrich = new THREE.Group();
        
        // Set up colors
        const colors = {
            body: 0x8B5CF6, // Rich purple for body
            legs: 0x6D28D9  // Deep purple for legs
        };
        
        // Body - simplified
        const bodyGeometry = new THREE.CapsuleGeometry(1.5, 2, 8, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.body,
            shininess: 30
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        body.castShadow = true;
        body.receiveShadow = true;
        ostrich.add(body);
        
        // Legs - simplified
        for (let i = -1; i <= 1; i += 2) {
            const legGroup = new THREE.Group();
            
            const shinGeometry = new THREE.CylinderGeometry(0.2, 0.18, 2, 8);
            const legMaterial = new THREE.MeshPhongMaterial({ 
                color: colors.legs,
                shininess: 20
            });
            
            const shin = new THREE.Mesh(shinGeometry, legMaterial);
            shin.position.y = -2.8;
            shin.castShadow = true;
            shin.receiveShadow = true;
            legGroup.add(shin);
            
            legGroup.position.x = i * 0.7;
            legGroup.position.y = 2.5;
            
            if (i < 0) {
                ostrich.userData.leftLeg = legGroup;
            } else {
                ostrich.userData.rightLeg = legGroup;
            }
            
            ostrich.add(legGroup);
        }
        
        // PLAYER LABEL - Name and profile pic above head
        // Get player name and image
        const name = playerData.name || pubkey.substring(0, 8);
        const profileImage = playerData.picture || this.defaultProfileImage;
        
        // Create text sprite for the name
        const textSprite = this.createTextSprite(name);
        textSprite.position.y = 6;
        ostrich.add(textSprite);
        
        // Scale model
        ostrich.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
        
        // Store animation properties
        ostrich.userData = {
            ...ostrich.userData,
            walkSpeed: 0,
            walkCycle: 0,
            isWalking: false,
            startY: 0,
            isJumping: false
        };
        
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
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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
        sprite.scale.set(canvas.width / 50, canvas.height / 50, 1);
        
        return sprite;
    },
    
    // Create a collectible item
    createCollectible: function(x, y, z, value, type = 'gem') {
        const collectible = new THREE.Group();
        collectible.position.set(x, y, z);
        
        // Create a simple geometry for the collectible
        const geometry = new THREE.OctahedronGeometry(1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3B82F6,
            shininess: 100,
            emissive: 0x3B82F6,
            emissiveIntensity: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        collectible.add(mesh);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3B82F6,
            transparent: true,
            opacity: 0.2
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        collectible.add(glow);
        
        // Animate the collectible
        collectible.userData = {
            type,
            value,
            startY: y,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            glowPulse: Math.random() * Math.PI * 2 // Random starting phase
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
        // Get current time for animations
        const now = performance.now();
        
        // Update point light animation
        if (this.pointLight) {
            this.pointLight.position.y = this.pointLight.userData.originalY + Math.sin(now * 0.001) * 5;
            this.pointLight.intensity = this.pointLight.userData.originalIntensity + Math.sin(now * 0.002) * 0.3;
        }
        
        // Update collectible animations
        this.collectibles.forEach(collectible => {
            // Rotate the collectible
            collectible.rotation.y += collectible.userData.rotationSpeed;
            
            // Bob up and down
            collectible.position.y = collectible.userData.startY + Math.sin(now * 0.002) * 0.5;
            
            // Pulse glow effect
            if (collectible.children.length > 1) {
                const glow = collectible.children[1];
                collectible.userData.glowPulse += 0.03;
                
                if (glow.material) {
                    glow.material.opacity = 0.1 + Math.sin(collectible.userData.glowPulse) * 0.1;
                    glow.scale.set(
                        1.2 + Math.sin(collectible.userData.glowPulse) * 0.1,
                        1.2 + Math.sin(collectible.userData.glowPulse) * 0.1,
                        1.2 + Math.sin(collectible.userData.glowPulse) * 0.1
                    );
                }
            }
        });
        
        // Update player models
        if (window.RelayWorld) {
            const playerModule = window.RelayWorldCore?.getModule('player');
            if (playerModule && playerModule.pubkey) {
                // Get current player
                let player = this.players.get(playerModule.pubkey);
                
                if (!player) {
                    // Create player model if it doesn't exist
                    const playerData = {
                        name: playerModule.name || playerModule.pubkey.substring(0, 8),
                        picture: playerModule.picture || this.defaultProfileImage,
                        isCurrentPlayer: true
                    };
                    
                    this.createOstrich(playerModule.pubkey, playerData);
                    player = this.players.get(playerModule.pubkey);
                }
                
                if (player && player.model) {
                    const isMoving = playerModule.input?.up || playerModule.input?.down || 
                                  playerModule.input?.left || playerModule.input?.right;
                    
                    // Update player position based on game state
                    player.model.position.x = (playerModule.x || 1500) - 1500;
                    player.model.position.z = (playerModule.y || 1500) - 1500;
                    
                    // Update walking animation
                    if (isMoving) {
                        player.model.userData.isWalking = true;
                        player.model.userData.walkCycle += delta * 5;
                        
                        // Leg animation
                        if (player.model.userData.leftLeg && player.model.userData.rightLeg) {
                            player.model.userData.leftLeg.rotation.x = Math.sin(player.model.userData.walkCycle) * 0.4;
                            player.model.userData.rightLeg.rotation.x = Math.sin(player.model.userData.walkCycle + Math.PI) * 0.4;
                        }
                        
                        // Bob up and down while walking
                        player.model.position.y = Math.abs(Math.sin(player.model.userData.walkCycle)) * 0.2;
                        
                        // Update player rotation based on movement direction
                        if (playerModule.input.right) player.model.rotation.y = Math.PI * 0.5;
                        if (playerModule.input.left) player.model.rotation.y = Math.PI * 1.5;
                        if (playerModule.input.down) player.model.rotation.y = Math.PI;
                        if (playerModule.input.up) player.model.rotation.y = 0;
                        
                        // Diagonal movement
                        if (playerModule.input.up && playerModule.input.right) player.model.rotation.y = Math.PI * 0.25;
                        if (playerModule.input.up && playerModule.input.left) player.model.rotation.y = Math.PI * 1.75;
                        if (playerModule.input.down && playerModule.input.right) player.model.rotation.y = Math.PI * 0.75;
                        if (playerModule.input.down && playerModule.input.left) player.model.rotation.y = Math.PI * 1.25;
                    } else {
                        // Reset to idle animation
                        player.model.userData.isWalking = false;
                        player.model.position.y = Math.sin(now * 0.001) * 0.05; // Slight idle bob
                        
                        // Reset legs
                        if (player.model.userData.leftLeg && player.model.userData.rightLeg) {
                            player.model.userData.leftLeg.rotation.x = 0;
                            player.model.userData.rightLeg.rotation.x = 0;
                        }
                    }
                    
                    // Position camera to follow player
                    this.camera.position.x = player.model.position.x - Math.sin(player.model.rotation.y) * 30;
                    this.camera.position.z = player.model.position.z - Math.cos(player.model.rotation.y) * 30;
                    this.camera.position.y = player.model.position.y + 20;
                    this.camera.lookAt(
                        player.model.position.x + Math.sin(player.model.rotation.y) * 10,
                        player.model.position.y + 5,
                        player.model.position.z + Math.cos(player.model.rotation.y) * 10
                    );
                }
            }
        }
    },
    
    // Add a new player
    addPlayer: function(pubkey, playerData) {
        // Skip if player already exists
        if (this.players.has(pubkey)) return;
        
        // Create default data if not provided
        if (!playerData) {
            playerData = {
                name: pubkey.substring(0, 8),
                picture: this.defaultProfileImage,
                x: 0,
                y: 0
            };
        }
        
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
        
        // Spawn new collectibles
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            const y = 2 + Math.random() * 2;
            const value = Math.floor(Math.random() * 50) + 10;
            const type = 'gem';
            
            this.createCollectible(x, y, z, value, type);
        }
        
        console.log(`[RelayWorld3D] Spawned ${count} collectibles`);
    }
};

// Wait for DOM to be ready, then try to initialize the 3D engine
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[RelayWorld3D] DOM loaded, initializing 3D engine...");
    
    // Initialize immediately if RelayWorld exists
    if (window.RelayWorld && window.RelayWorld.initialized) {
        await RelayWorld3D.init();
        return;
    }
    
    console.log("[RelayWorld3D] Waiting for game to initialize...");
    
    // Otherwise, try to wait for RelayWorld to initialize
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = setInterval(async () => {
        attempts++;
        
        if (window.RelayWorld && window.RelayWorld.initialized) {
            clearInterval(checkInterval);
            console.log("[RelayWorld3D] RelayWorld initialized, setting up 3D engine...");
            await RelayWorld3D.init();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log("[RelayWorld3D] RelayWorld not initialized after " + maxAttempts + " attempts, initializing standalone mode...");
            await RelayWorld3D.init();
        }
    }, 500);
});

// Export the 3D engine
window.RelayWorld3D = RelayWorld3D;
