import { THREE, THREEInitializer, initPromise } from './THREE.js';

class RelayWorld3D {
    static async checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return gl !== null;
        } catch (e) {
            return false;
        }
    }

    static async init() {
        console.log('[RelayWorld3D] Initializing 3D/2D engine...');
        
        try {
            // Check WebGL support first
            const hasWebGL = await RelayWorld3D.checkWebGLSupport();
            if (!hasWebGL) {
                throw new Error('WebGL not supported');
            }

            // Wait for THREE.js to initialize
            await initPromise;
            
            if (!THREEInitializer.validateTHREE()) {
                throw new Error('THREE.js not properly initialized');
            }

            // Initialize 3D scene
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);
            
            console.log('[RelayWorld3D] 3D engine initialized successfully');
            await this.setup3DEnvironment(scene, camera, renderer);
        } catch (error) {
            console.warn('[RelayWorld3D] Failed to initialize 3D mode, falling back to 2D:', error);
            await this.initializeFallback2D();
        }
    }

    static async setup3DEnvironment(scene, camera, renderer) {
        // Implementation of setup3DEnvironment method
    }

    static async initializeFallback2D() {
        // Implementation of initializeFallback2D method
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    RelayWorld3D.init();
});

export { RelayWorld3D }; 