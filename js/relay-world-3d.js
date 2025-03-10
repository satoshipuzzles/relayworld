/**
 * relay-world-3d.js
 * Enhanced 3D rendering engine for Relay World with improved ostrich models
 */
// Ensure compatibility with older THREE.js versions
document.write('<script src="js/three-compatibility.js"></script>');
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
            side: THREE.DoubleSide,
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
            side: THREE.BackSide,
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
                color: 0x555555,
                flatShading: true
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
                color: foliageColors[i % foliageColors.length],
                flatShading: true
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
    },
    
    // Create a high-quality 3D ostrich player model
    createOstrich: function(pubkey, playerData = {}) {
        // Create a group for the ostrich model
        const ostrich = new THREE.Group();
        
        // Set up colors
        const colors = {
            body: 0x8B5CF6, // Rich purple for body
            neck: 0x9F7AEA, // Lighter purple for neck
            head: 0xA78BFA, // Even lighter purple for head
            darkFeathers: 0x7C3AED, // Dark purple for feet and details
            beak: 0xFFD700, // Gold for beak
            eye: 0xFFFFFF, // White for eyes
            pupil: 0x000000, // Black for pupils
            legs: 0x6D28D9 // Deep purple for legs
        };
        
        // 1. BODY - More sophisticated body shape
        const bodyGeometry = new THREE.CapsuleGeometry(1.5, 2, 8, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.body,
            shininess: 30,
            flatShading: false
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        body.castShadow = true;
        body.receiveShadow = true;
        ostrich.add(body);
        
        // Add some feather details to the body
        const addFeathers = (parent, count, baseY, scale, color) => {
            for (let i = 0; i < count; i++) {
                const featherGeometry = new THREE.ConeGeometry(0.2 * scale, 0.6 * scale, 4);
                const featherMaterial = new THREE.MeshPhongMaterial({
                    color: color,
                    flatShading: true,
                    shininess: 10
                });
                
                const feather = new THREE.Mesh(featherGeometry, featherMaterial);
                const angle = (i / count) * Math.PI * 2;
                const radius = 1.4 * scale;
                
                feather.position.x = Math.cos(angle) * radius;
                feather.position.z = Math.sin(angle) * radius;
                feather.position.y = baseY + Math.random() * 0.3;
                
                // Rotate to point outward
                feather.rotation.x = Math.PI / 2;
                feather.rotation.z = angle + Math.PI;
                
                feather.castShadow = true;
                parent.add(feather);
            }
        };
        
        // Add body feathers
        addFeathers(body, 12, 0, 1, colors.darkFeathers);
        
        // 2. NECK - Curved neck with multiple segments
        const createNeckSegment = (y, scale, bend) => {
            const segGeometry = new THREE.CylinderGeometry(
                0.3 * scale, 
                0.4 * scale, 
                0.5, 
                8
            );
            const segMaterial = new THREE.MeshPhongMaterial({ 
                color: colors.neck,
                shininess: 20
            });
            
            const segment = new THREE.Mesh(segGeometry, segMaterial);
            segment.position.y = y;
            segment.position.z = bend;
            segment.castShadow = true;
            segment.receiveShadow = true;
            
            return segment;
        };
        
        // Create neck with 5 segments for a natural curve
        const neck = new THREE.Group();
        
        for (let i = 0; i < 5; i++) {
            const y = 4 + i * 0.5;
            // Increase bend as we go up
            const bend = -0.1 - (i * 0.15);
            const segment = createNeckSegment(y, 1 - (i * 0.1), bend);
            // Add progressively more rotation as we go up
            segment.rotation.x = Math.PI / 10 + (i * Math.PI / 30);
            neck.add(segment);
        }
        
        ostrich.add(neck);
        
        // 3. HEAD - More detailed head
        const headGroup = new THREE.Group();
        
        // Main head shape
        const headGeometry = new THREE.SphereGeometry(0.6, 12, 12);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.head,
            shininess: 30
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.castShadow = true;
        headGroup.add(head);
        
        // Beak - more detailed shape
        const beakGroup = new THREE.Group();
        
        // Upper beak
        const upperBeakGeometry = new THREE.ConeGeometry(0.25, 0.8, 8);
        const beakMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.beak,
            shininess: 60
        });
        const upperBeak = new THREE.Mesh(upperBeakGeometry, beakMaterial);
        upperBeak.rotation.x = Math.PI / 2;
        upperBeak.position.z = -0.6;
        upperBeak.castShadow = true;
        beakGroup.add(upperBeak);
        
        // Lower beak
        const lowerBeakGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const lowerBeak = new THREE.Mesh(lowerBeakGeometry, beakMaterial);
        lowerBeak.rotation.x = Math.PI / 2;
        lowerBeak.position.z = -0.6;
        lowerBeak.position.y = -0.1;
        lowerBeak.castShadow = true;
        beakGroup.add(lowerBeak);
        
        headGroup.add(beakGroup);
        
        // Eyes - more detailed with proper placement
        for (let i = -1; i <= 1; i += 2) {
            // White of eye
            const eyeGeometry = new THREE.SphereGeometry(0.15, 12, 12);
            const eyeMaterial = new THREE.MeshBasicMaterial({ color: colors.eye });
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.x = i * 0.3;
            eye.position.z = -0.35;
            eye.position.y = 0.1;
            headGroup.add(eye);
            
            // Pupil
            const pupilGeometry = new THREE.SphereGeometry(0.07, 8, 8);
            const pupilMaterial = new THREE.MeshBasicMaterial({ color: colors.pupil });
            const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            pupil.position.x = i * 0.3;
            pupil.position.z = -0.48;
            pupil.position.y = 0.1;
            headGroup.add(pupil);
            
            // Eyelid
            const lidGeometry = new THREE.RingGeometry(0.1, 0.18, 16, 2, 0, Math.PI);
            const lidMaterial = new THREE.MeshBasicMaterial({ 
                color: colors.head,
                side: THREE.DoubleSide
            });
            const lid = new THREE.Mesh(lidGeometry, lidMaterial);
            lid.position.x = i * 0.3;
            lid.position.z = -0.35;
            lid.position.y = 0.18;
            lid.rotation.x = Math.PI / 2;
            headGroup.add(lid);
        }
        
        // Add small feathers on top of head
        const headFeathersGroup = new THREE.Group();
        for (let i = 0; i < 7; i++) {
            const featherGeometry = new THREE.ConeGeometry(0.07, 0.3, 4);
            const featherMaterial = new THREE.MeshPhongMaterial({
                color: colors.darkFeathers,
                flatShading: true
            });
            
            const feather = new THREE.Mesh(featherGeometry, featherMaterial);
            feather.position.y = 0.3 + (i % 3) * 0.1;
            feather.position.x = ((i - 3) * 0.1);
            feather.rotation.x = -Math.PI / 6;
            feather.castShadow = true;
            
            headFeathersGroup.add(feather);
        }
        
        headGroup.add(headFeathersGroup);
        headGroup.position.y = 6.5;
        headGroup.position.z = -1.3;
        headGroup.rotation.x = Math.PI / 8;
        ostrich.add(headGroup);
        
        // 4. LEGS - Better shaped legs with joints
        for (let i = -1; i <= 1; i += 2) {
            const legGroup = new THREE.Group();
            
            // Upper leg - thigh
            const thighGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.8, 8);
            const legMaterial = new THREE.MeshPhongMaterial({ 
                color: colors.legs,
                shininess: 20
            });
            
            const thigh = new THREE.Mesh(thighGeometry, legMaterial);
            thigh.position.y = -0.9;
            thigh.castShadow = true;
            thigh.receiveShadow = true;
            legGroup.add(thigh);
            
            // Lower leg - shin
            const shinGeometry = new THREE.CylinderGeometry(0.2, 0.18, 2, 8);
            const shin = new THREE.Mesh(shinGeometry, legMaterial);
            shin.position.y = -2.8;
            shin.castShadow = true;
            shin.receiveShadow = true;
            legGroup.add(shin);
            
            // Foot
            const footGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1, 3);
            const footMaterial = new THREE.MeshPhongMaterial({ 
                color: colors.darkFeathers,
                shininess: 10
            });
            
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.y = -3.8;
            foot.position.z = 0.3;
            foot.rotation.x = Math.PI / 3;
            foot.castShadow = true;
            foot.receiveShadow = true;
            legGroup.add(foot);
            
            // Position leg group
            legGroup.position.x = i * 0.7;
            legGroup.position.y = 2.5;
            
            // Store leg for animations
            if (i < 0) {
                ostrich.userData.leftLeg = legGroup;
            } else {
                ostrich.userData.rightLeg = legGroup;
            }
            
            ostrich.add(legGroup);
        }
        
        // 5. TAIL FEATHERS - Fan of tail feathers
        const tailGroup = new THREE.Group();
        
        for (let i = 0; i < 7; i++) {
            const featherGeometry = new THREE.PlaneGeometry(0.7, 1.5);
            const featherMaterial = new THREE.MeshPhongMaterial({
                color: colors.darkFeathers,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            
            const feather = new THREE.Mesh(featherGeometry, featherMaterial);
            const angle = ((i - 3) / 7) * Math.PI / 3;
            
            feather.position.z = 1.3;
            feather.position.y = 3;
            feather.rotation.x = Math.PI / 2.5;
            feather.rotation.z = angle;
            
            tailGroup.add(feather);
        }
        
        ostrich.add(tailGroup);
        
        // 6. PLAYER LABEL - Name and profile pic above head
        // Get player name and image
        const name = playerData.name || pubkey.substring(0, 8);
        const profileImage = playerData.picture || this.defaultProfileImage;
        
        // Create a nicer-looking name tag
        const nameTagGroup = new THREE.Group();
        
        // Background panel with rounded corners
        const panelWidth = Math.min(8, Math.max(4, name.length * 0.6));
        const panelGeometry = new THREE.PlaneGeometry(panelWidth, 1.2);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        nameTagGroup.add(panel);
        
        // Create text sprite for the name
        const textSprite = this.createTextSprite(name);
        textSprite.position.z = 0.01; // Slightly in front of the panel
        nameTagGroup.add(textSprite);
        
        // Create profile image sprite if available
        if (profileImage) {
            // Load texture for profile image
            const loader = new THREE.TextureLoader();
            
            // Try to load the profile image
            try {
                loader.load(
                    profileImage,
                    (texture) => {
                        const avatarSize = 1.5;
                        const avatarGeometry = new THREE.CircleGeometry(avatarSize/2, 32);
                        const avatarMaterial = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.DoubleSide
                        });
                        
                        const avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
                        avatar.position.y = 2.5;
                        avatar.position.z = 0.01;
                        
                        nameTagGroup.add(avatar);
                    },
                    undefined,
                    (error) => {
                        console.error("Failed to load profile image:", error);
                    }
                );
            } catch (e) {
                console.error("Error loading profile image:", e);
            }
        }
        
        // Position the name tag group above the ostrich
        nameTagGroup.position.y = 9;
        nameTagGroup.rotation.x = -Math.PI / 6; // Tilt for better visibility
        
        // Ensure name tag always faces camera
        nameTagGroup.userData.billboard = true;
        
        ostrich.add(nameTagGroup);
        
        // 7. SCALE AND FINISH - Apply final scaling
        ostrich.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
        
        // Store animation properties
        ostrich.userData = {
            ...ostrich.userData,
            walkSpeed: 0,
            walkCycle: 0,
            isWalking: false,
            leftLegPos: 0,
            rightLegPos: Math.PI,
            startY: 0,
            jumpHeight: 0,
            isJumping: false,
            blinkTime: 0,
            nextBlinkTime: Math.random() * 5000
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
            // Create a diamond gem shape
            geometry = new THREE.OctahedronGeometry(1, 1);
        } else if (type === 'mushroom') {
            // Create a mushroom shape (cylinder with sphere cap)
            const mushroomGroup = new THREE.Group();
            
            // Stem
            const stemGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1, 8);
            const stemMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xFFFFFF,
                shininess: 30
            });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.y = -0.5;
            stem.castShadow = true;
            mushroomGroup.add(stem);
            
            // Cap
            const capGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const capMaterial = new THREE.MeshPhongMaterial({
                color: props.color,
                shininess: 50
            });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.y = 0.1;
            cap.castShadow = true;
            mushroomGroup.add(cap);
            
            // Add spots
            for (let i = 0; i < 6; i++) {
                const spotGeometry = new THREE.CircleGeometry(0.1, 8);
                const spotMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFFFFFF,
                    side: THREE.DoubleSide
                });
                const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                
                // Position spots randomly on cap
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.2 + Math.random() * 0.4;
                
                spot.position.x = Math.cos(angle) * radius;
                spot.position.z = Math.sin(angle) * radius;
                spot.position.y = 0.11; // Just above cap
                spot.rotation.x = -Math.PI / 2; // Face upward
                
                mushroomGroup.add(spot);
            }
            
            collectible.add(mushroomGroup);
            return collectible;
        } else if (type === 'orb') {
            geometry = new THREE.SphereGeometry(1, 24, 24);
        } else if (type === 'lightning') {
            // Create a more interesting lightning bolt shape
            const lightningGroup = new THREE.Group();
            
            // Base bolt
            const boltGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 6, 1, false);
            const boltMaterial = new THREE.MeshPhongMaterial({
                color: props.color,
                shininess: 80,
                emissive: props.color,
                emissiveIntensity: 0.5
            });
            
            // Deform vertices for zigzag effect
            const positions = boltGeometry.attributes.position;
            
            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                
                // Only affect middle sections
                if (y > -0.8 && y < 0.8) {
                    const zigzagFactor = Math.sin(y * 10) * 0.2;
                    positions.setX(i, positions.getX(i) + zigzagFactor);
                }
            }
            
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
            bolt.castShadow = true;
            lightningGroup.add(bolt);
            
            // Glow effect
            const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: props.color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.scale.y = 1.5;
            lightningGroup.add(glow);
            
            collectible.add(lightningGroup);
            return collectible;
        } else if (type === 'key') {
            // Create a key shape
            const keyGroup = new THREE.Group();
            
            // Key head (circle)
            const headGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
            const keyMaterial = new THREE.MeshPhongMaterial({
                color: props.color,
                shininess: 70
            });
            
            const head = new THREE.Mesh(headGeometry, keyMaterial);
            head.position.y = 0.5;
            head.castShadow = true;
            keyGroup.add(head);
            
            // Key shaft
            const shaftGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8);
            const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
            shaft.position.y = -0.5;
            shaft.castShadow = true;
            keyGroup.add(shaft);
            
            // Key teeth
            for (let i = 0; i < 3; i++) {
                const toothGeometry = new THREE.BoxGeometry(0.4, 0.25, 0.25);
                const tooth = new THREE.Mesh(toothGeometry, keyMaterial);
                tooth.position.y = -0.9 - (i * 0.3);
                tooth.position.x = 0.25;
                tooth.castShadow = true;
                keyGroup.add(tooth);
            }
            
            collectible.add(keyGroup);
            return collectible;
        } else {
            // Default is a simple box
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Create material with glow effect
        const material = new THREE.MeshPhongMaterial({
            color: props.color,
            shininess: 100,
            emissive: props.color,
            emissiveIntensity: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        collectible.add(mesh);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: props.color,
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
        
        // Update player models (if there's a game module)
        if (window.RelayWorld && window.RelayWorldCore) {
            const playerModule = window.RelayWorldCore.getModule('player');
            if (playerModule && playerModule.pubkey) {
                // Get current player
                let player = this.players.get(playerModule.pubkey);
                
                if (!player) {
                    // Create player model if it doesn't exist
                    const nostrModule = window.RelayWorldCore.getModule('nostr');
                    const playerData = {
                        name: nostrModule?.currentUser?.profile?.name || playerModule.pubkey.substring(0, 8),
                        picture: nostrModule?.currentUser?.profile?.picture || this.defaultProfileImage,
                        isCurrentPlayer: true
                    };
                    
                    this.createOstrich(playerModule.pubkey, playerData);
                    player = this.players.get(playerModule.pubkey);
                }
                
                if (player && player.model) {
                    const isMoving = playerModule.input.up || playerModule.input.down || 
                                  playerModule.input.left || playerModule.input.right;
                    
                    // Update player position based on 2D coordinates
                    player.model.position.x = playerModule.x - 1500; // Center around 0
                    player.model.position.z = playerModule.y - 1500; // Convert y to z
                    
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
                    
                    // Check for blinking
                    player.model.userData.blinkTime += delta * 1000;
                    if (player.model.userData.blinkTime > player.model.userData.nextBlinkTime) {
                        // Find eye meshes and make them blink
                        player.model.traverse((child) => {
                            if (child.name === 'eyelid') {
                                child.visible = true;
                                setTimeout(() => {
                                    child.visible = false;
                                }, 150);
                            }
                        });
                        
                        // Reset blink timer
                        player.model.userData.blinkTime = 0;
                        player.model.userData.nextBlinkTime = 2000 + Math.random() * 4000;
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
        
        // Make nametags face the camera (billboard effect)
        this.players.forEach(player => {
            player.model.traverse((child) => {
                if (child.userData && child.userData.billboard) {
                    child.lookAt(this.camera.position);
                }
            });
        });
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
