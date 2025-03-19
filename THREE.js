import * as THREE from 'three';

// Initialize THREE.js compatibility fixes
console.log('[ThreeFix] Initializing THREE.js compatibility fixes...');

class THREEInitializer {
    static instance = null;
    static isInitialized = false;
    static initPromise = null;

    static getInstance() {
        if (!THREEInitializer.instance) {
            THREEInitializer.instance = new THREEInitializer();
        }
        return THREEInitializer.instance;
    }

    static async initialize() {
        if (THREEInitializer.isInitialized) {
            return THREE;
        }

        if (THREEInitializer.initPromise) {
            return THREEInitializer.initPromise;
        }

        THREEInitializer.initPromise = new Promise((resolve, reject) => {
            try {
                // Since we're using ES modules, THREE should be available immediately
                if (THREE && THREE.Scene) {
                    window.THREE = THREE;
                    THREEInitializer.isInitialized = true;
                    console.log('[ThreeFix] THREE.js initialized successfully');
                    resolve(THREE);
                    return;
                }
                reject(new Error('[ThreeFix] THREE.js failed to load properly'));
            } catch (error) {
                console.error('[ThreeFix] Error during THREE.js initialization:', error);
                reject(error);
            }
        });

        return THREEInitializer.initPromise;
    }

    static validateTHREE() {
        return THREE && 
               typeof THREE.Scene === 'function' && 
               typeof THREE.PerspectiveCamera === 'function' && 
               typeof THREE.WebGLRenderer === 'function';
    }
}

// Initialize immediately and export
const initPromise = THREEInitializer.initialize().catch(error => {
    console.error('[ThreeFix] Failed to initialize THREE.js:', error);
    throw error;
});

export { THREE, THREEInitializer, initPromise }; 