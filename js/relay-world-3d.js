/**
 * relay-world-3d.js
 * Enhanced 3D rendering engine for Relay World with WebGL fallback mode
 */

// Create the 3D game engine namespace
const RelayWorld3D = {
    // Core properties
    scene: null,
    camera: null,
    renderer: null,
    canvas: null,
    clock: null,
    initialized: false,
    scaleFactor: 1.3,
    defaultProfileImage: 'assets/icons/default-avatar.png',
    
    // Fallback mode for when WebGL is not available
    fallbackMode: false,
    ctx2d: null,
    
    // Game objects
    players: new Map(), // Map<pubkey, {model: THREE.Group, data: Object}>
    collectibles: [],
    lightningBolts: [],
    
    // Check if WebGL is available
    isWebGLAvailable: function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch(e) {
            console.warn('[RelayWorld3D] WebGL test failed:', e);
            return false;
        }
    },
    
    // Initialize the engine
    init: async function() {
        console.log("[RelayWorld3D] Initializing 3D/2D engine...");
        
        // Get the canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("[RelayWorld3D] Game canvas not found!");
            return false;
        }
        
        // Check if WebGL is available
        const webGLAvailable = this.isWebGLAvailable();
        const threeJSAvailable = typeof THREE !== 'undefined';
        
        if (!webGLAvailable) {
            console.warn("[RelayWorld3D] WebGL not available, using 2D fallback mode");
            if (typeof showToast === 'function') {
                showToast("Your browser doesn't support 3D graphics. Using 2D mode instead.", "warning");
            }
            return this.initFallbackMode();
        }
        
        if (!threeJSAvailable) {
            console.warn("[RelayWorld3D] THREE.js not loaded, using 2D fallback mode");
            if (typeof showToast === 'function') {
                showToast("3D graphics library couldn't be loaded. Using 2D mode instead.", "warning");
            }
            return this.initFallbackMode();
        }
        
        try {
            // Create a clock for animations
            this.clock = new THREE.Clock();
            
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
            
            // Create the renderer with proper error handling
            try {
                this.renderer = new THREE.WebGLRenderer({ 
                    canvas: this.canvas,
                    antialias: true,
                    alpha: true
                });
                
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } catch (e) {
                console.error("[RelayWorld3D] Failed to create WebGL renderer:", e);
                if (typeof showToast === 'function') {
                    showToast("3D rendering failed. Using 2D mode instead.", "warning");
                }
                return this.initFallbackMode();
            }
            
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
        } catch (error) {
            console.error("[RelayWorld3D] Failed to initialize 3D engine:", error);
            // Fall back to 2D mode if 3D initialization fails
            return this.initFallbackMode();
        }
    },
    
    // Initialize fallback 2D mode
    initFallbackMode: function() {
        console.log("[RelayWorld3D] Initializing 2D fallback mode");
        
        this.fallbackMode = true;
        
        // Get 2D context
        this.ctx2d = this.canvas.getContext('2d');
        if (!this.ctx2d) {
            console.error("[RelayWorld3D] Failed to get 2D context");
            return false;
        }
        
        // Set canvas dimensions
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
        
        // Start animation loop
        this.animate2D();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Create some random collectibles for the 2D mode
        this.spawnRandomCollectibles2D(20);
        
        this.initialized = true;
        console.log("[RelayWorld3D] 2D fallback mode initialized");
        
        // Show a message to the user about fallback mode
        if (typeof showToast === 'function') {
            showToast("Using simplified 2D mode", "warning");
        }
        
        return true;
    },
    
    // Create demo mode for testing without the full game
    createDemoMode: function() {
        console.log("[RelayWorld3D] Creating demo mode");
        
        if (this.fallbackMode) {
            // 2D demo mode
            this.player2D = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                radius: 20,
                color: "#FF0000",
                name: "Player Demo"
            };
        } else {
            // 3D demo mode
            this.createOstrich("demo", { name: "Player Demo" });
        }
        
        // Spawn collectibles
        if (this.fallbackMode) {
            this.spawnRandomCollectibles2D(30);
        } else {
            this.spawnRandomCollectibles(30);
        }
        
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
        if (this.fallbackMode) {
            // 2D update loop
            this.demoInput = input;
        } else {
            // 3D update loop
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
        }
    },
    
    // Setup lighting for the 3D scene
    setupLighting: function() {
        if (this.fallbackMode) return;
        
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
    
    // Create ground and environment for 3D mode
    createEnvironment: function() {
        if (this.fallbackMode) return;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error creating environment:", error);
        }
    },
    
    // Add terrain details for 3D mode
    addTerrainDetails: function() {
        if (this.fallbackMode) return;
        
        try {
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
                if (tree) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 50 + Math.random() * 130;
                    tree.position.x = Math.cos(angle) * distance;
                    tree.position.z = Math.sin(angle) * distance;
                    this.scene.add(tree);
                }
            }
        } catch (error) {
            console.error("[RelayWorld3D] Error adding terrain details:", error);
        }
    },
    
    // Create a low-poly tree for 3D mode
    createTree: function() {
        if (this.fallbackMode) return null;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error creating tree:", error);
            return null;
        }
    },
    
    // Add stars to the night sky for 3D mode
    addStars: function() {
        if (this.fallbackMode) return;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error adding stars:", error);
        }
    },
    
    // Setup event handlers
    setupEventHandlers: function() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.fallbackMode) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            } else {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
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
                    if (this.fallbackMode) {
                        // Create 2D player
                        this.player2D = {
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2,
                            radius: 20,
                            color: "#FF0000",
                            name: playerModule.name || `User ${data.pubkey.substring(0, 8)}`
                        };
                    } else {
                        // Create 3D player model
                        const playerData = {
                            name: playerModule.name || `User ${data.pubkey.substring(0, 8)}`,
                            picture: playerModule.picture || this.defaultProfileImage,
                            isCurrentPlayer: true
                        };
                        
                        this.createOstrich(data.pubkey, playerData);
                    }
                }
            });
        }
    },
    
    // Create a player model for 3D mode
    createOstrich: function(pubkey, playerData = {}) {
        if (this.fallbackMode) return null;
        
        try {
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
            
            // PLAYER LABEL - Name above head
            const name = playerData.name || pubkey.substring(0, 8);
            
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
        } catch (error) {
            console.error("[RelayWorld3D] Error creating player model:", error);
            return null;
        }
    },
    
    // Create a text sprite for player names
    createTextSprite: function(text) {
        if (this.fallbackMode) return null;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error creating text sprite:", error);
            return null;
        }
    },
    
    // Create a collectible item for 3D mode
    createCollectible: function(x, y, z, value, type = 'gem') {
        if (this.fallbackMode) return null;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error creating collectible:", error);
            return null;
        }
    },
    
    // Create 2D collectibles
    createCollectible2D: function(x, y, value) {
        if (!this.fallbackMode) return null;
        
        const collectible = {
            x: x,
            y: y,
            radius: 10,
            value: value,
            color: "#3B82F6",
            pulse: Math.random() * Math.PI * 2
        };
        
        this.collectibles.push(collectible);
        return collectible;
    },
    
    // 3D Animation loop
    animate: function() {
        if (!this.initialized || this.fallbackMode) return;
        
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        this.update(delta);
        
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (e) {
            console.error("[RelayWorld3D] Error in render loop, falling back to 2D:", e);
            // If rendering fails, switch to 2D mode
            this.fallbackMode = true;
            this.initFallbackMode();
        }
    },
    
    // 2D Animation loop
    animate2D: function() {
        if (!this.initialized || !this.fallbackMode) return;
        
        requestAnimationFrame(() => this.animate2D());
        
        this.update2D();
        this.render2D();
    },
    
    // Update 3D game state
    update: function(delta) {
        if (this.fallbackMode) return;
        
        try {
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
        } catch (error) {
            console.error("[RelayWorld3D] Error in update loop:", error);
        }
    },
    
    // Update 2D game state
    update2D: function() {
        if (!this.fallbackMode) return;
        
        try {
            // Update collectibles animation
            this.collectibles.forEach(collectible => {
                collectible.pulse += 0.05;
                collectible.radius = 10 + Math.sin(collectible.pulse) * 2;
            });
            
            // Update player position if in demo mode
            if (this.demoInput && this.player2D) {
                const speed = 5;
                if (this.demoInput.up) this.player2D.y -= speed;
                if (this.demoInput.down) this.player2D.y += speed;
                if (this.demoInput.left) this.player2D.x -= speed;
                if (this.demoInput.right) this.player2D.x += speed;
                
                // Keep player within bounds
                this.player2D.x = Math.max(this.player2D.radius, Math.min(this.canvas.width - this.player2D.radius, this.player2D.x));
                this.player2D.y = Math.max(this.player2D.radius, Math.min(this.canvas.height - this.player2D.radius, this.player2D.y));
            }
            
            // Update player position based on game state if available
            const playerModule = window.RelayWorldCore?.getModule('player');
            if (playerModule && playerModule.input && this.player2D) {
                const speed = 5;
                if (playerModule.input.up) this.player2D.y -= speed;
                if (playerModule.input.down) this.player2D.y += speed;
                if (playerModule.input.left) this.player2D.x -= speed;
                if (playerModule.input.right) this.player2D.x += speed;
                
                // Keep player within bounds
                this.player2D.x = Math.max(this.player2D.radius, Math.min(this.canvas.width - this.player2D.radius, this.player2D.x));
                this.player2D.y = Math.max(this.player2D.radius, Math.min(this.canvas.height - this.player2D.radius, this.player2D.y));
                
                // Update game module position
                playerModule.x = this.player2D.x;
                playerModule.y = this.player2D.y;
                
                // Check collectible collisions
                this.checkCollectibles2D();
            }
        } catch (error) {
            console.error("[RelayWorld3D] Error in 2D update loop:", error);
        }
    },
    
    // Render 2D game
    render2D: function() {
        if (!this.fallbackMode || !this.ctx2d) return;
        
        try {
            // Clear canvas
            this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw grid background
            this.drawGrid2D();
            
            // Draw collectibles
            this.collectibles.forEach(collectible => {
                this.ctx2d.fillStyle = collectible.color;
                this.ctx2d.beginPath();
                this.ctx2d.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
                this.ctx2d.fill();
                
                // Draw value
                this.ctx2d.fillStyle = "#FFFFFF";
                this.ctx2d.font = "10px Arial";
                this.ctx2d.textAlign = "center";
                this.ctx2d.fillText(collectible.value, collectible.x, collectible.y + 4);
            });
            
            // Draw player
            if (this.player2D) {
                // Draw player circle
                this.ctx2d.fillStyle = this.player2D.color;
                this.ctx2d.beginPath();
                this.ctx2d.arc(this.player2D.x, this.player2D.y, this.player2D.radius, 0, Math.PI * 2);
                this.ctx2d.fill();
                
                // Draw player name
                this.ctx2d.fillStyle = "#FFFFFF";
                this.ctx2d.font = "14px 'Press Start 2P', sans-serif";
                this.ctx2d.textAlign = "center";
                this.ctx2d.fillText(this.player2D.name, this.player2D.x, this.player2D.y - 30);
                
                // Draw player score
                const playerModule = window.RelayWorldCore?.getModule('player');
                if (playerModule) {
                    this.ctx2d.fillStyle = "#FFFF00";
                    this.ctx2d.font = "12px 'Press Start 2P', sans-serif";
                    this.ctx2d.fillText(`Score: ${playerModule.score || 0}`, this.player2D.x, this.player2D.y + 40);
                }
            }
            
            // Draw coordinates
            this.ctx2d.fillStyle = "#FFFFFF";
            this.ctx2d.font = "12px Arial";
            this.ctx2d.textAlign = "left";
            this.ctx2d.fillText(`X: ${this.player2D ? Math.round(this.player2D.x) : 0}, Y: ${this.player2D ? Math.round(this.player2D.y) : 0}`, 10, 20);
            
            // Draw fallback mode notice
            this.ctx2d.fillStyle = "rgba(255,215,0,0.7)";
            this.ctx2d.font = "14px 'Press Start 2P', sans-serif";
            this.ctx2d.textAlign = "center";
            this.ctx2d.fillText("2D FALLBACK MODE", this.canvas.width / 2, 30);
        } catch (error) {
            console.error("[RelayWorld3D] Error in 2D render loop:", error);
        }
    },
    
    // Draw 2D grid background
    drawGrid2D: function() {
        if (!this.fallbackMode || !this.ctx2d) return;
        
        const gridSize = 50;
        
        // Calculate grid offset
        const offsetX = this.player2D ? this.player2D.x % gridSize : 0;
        const offsetY = this.player2D ? this.player2D.y % gridSize : 0;
        
        this.ctx2d.strokeStyle = "#306230";
        this.ctx2d.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = -offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx2d.beginPath();
            this.ctx2d.moveTo(x, 0);
            this.ctx2d.lineTo(x, this.canvas.height);
            this.ctx2d.stroke();
        }
        
        // Draw horizontal lines
        for (let y = -offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx2d.beginPath();
            this.ctx2d.moveTo(0, y);
            this.ctx2d.lineTo(this.canvas.width, y);
            this.ctx2d.stroke();
        }
    },
    
    // Check collectible collisions in 2D mode
    checkCollectibles2D: function() {
        if (!this.fallbackMode || !this.player2D) return;
        
        const playerModule = window.RelayWorldCore?.getModule('player');
        if (!playerModule) return;
        
        for (let i = 0; i < this.collectibles.length; i++) {
            const collectible = this.collectibles[i];
            const distance = Math.hypot(this.player2D.x - collectible.x, this.player2D.y - collectible.y);
            
            if (distance < this.player2D.radius + collectible.radius) {
                // Collect item
                playerModule.score = (playerModule.score || 0) + collectible.value;
                
                // Remove collectible
                this.collectibles.splice(i, 1);
                i--;
                
                // Update UI
                if (typeof showToast === 'function') {
                    showToast(`Collected +${collectible.value} points!`, "success");
                }
                
                // Update profile
                const uiModule = window.RelayWorldCore?.getModule('ui');
                if (uiModule && typeof uiModule.updatePlayerProfile === 'function') {
                    uiModule.updatePlayerProfile();
                }
                
                // Add new collectible
                this.spawnRandomCollectibles2D(1);
            }
        }
    },
    
    // Spawn random collectibles for 3D mode
    spawnRandomCollectibles: function(count = 20) {
        if (this.fallbackMode) {
            return this.spawnRandomCollectibles2D(count);
        }
        
        try {
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
            
            console.log(`[RelayWorld3D] Spawned ${count} collectibles in 3D mode`);
        } catch (error) {
            console.error("[RelayWorld3D] Error spawning collectibles:", error);
        }
    },
    
    // Spawn random collectibles for 2D mode
    spawnRandomCollectibles2D: function(count = 20) {
        if (!this.fallbackMode) {
            return this.spawnRandomCollectibles(count);
        }
        
        // Spawn new collectibles
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const value = Math.floor(Math.random() * 50) + 10;
            
            this.createCollectible2D(x, y, value);
        }
        
        console.log(`[RelayWorld3D] Spawned ${count} collectibles in 2D mode`);
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
