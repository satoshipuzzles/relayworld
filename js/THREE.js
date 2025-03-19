/**
 * THREE.js Loader - Direct script loading solution
 */

// Ensure we have a global THREE namespace
window.THREE = window.THREE || {};

console.log('[ThreeFix] Initializing THREE.js compatibility fixes...');

// Load THREE.js directly via script tag for maximum compatibility
(function() {
  // Skip if already loaded
  if (window.THREE && window.THREE.REVISION) {
    console.log(`[ThreeFix] THREE.js already loaded (version ${window.THREE.REVISION})`);
    applyFixes();
    dispatchReady();
    return;
  }

  // Try loading from CDN
  console.log('[ThreeFix] Loading THREE.js from CDN...');
  
  // Create script element
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.min.js';
  script.async = false; // Load in order
  script.crossOrigin = 'anonymous';
  
  // Handle load success
  script.onload = function() {
    if (window.THREE && window.THREE.REVISION) {
      console.log(`[ThreeFix] THREE.js loaded successfully (version ${window.THREE.REVISION})`);
      applyFixes();
      dispatchReady();
    } else {
      console.error('[ThreeFix] THREE.js loaded but global object not available');
      dispatchFallback();
    }
  };
  
  // Handle load error
  script.onerror = function() {
    console.error('[ThreeFix] Failed to load THREE.js from primary CDN, trying fallback...');
    
    // Try fallback CDN
    const fallbackScript = document.createElement('script');
    fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.min.js';
    fallbackScript.async = false;
    fallbackScript.crossOrigin = 'anonymous';
    
    fallbackScript.onload = function() {
      if (window.THREE && window.THREE.REVISION) {
        console.log(`[ThreeFix] THREE.js loaded from fallback CDN (version ${window.THREE.REVISION})`);
        applyFixes();
        dispatchReady();
      } else {
        console.error('[ThreeFix] THREE.js loaded from fallback but global object not available');
        dispatchFallback();
      }
    };
    
    fallbackScript.onerror = function() {
      console.error('[ThreeFix] Failed to load THREE.js from fallback CDN');
      dispatchFallback();
    };
    
    document.head.appendChild(fallbackScript);
  };
  
  // Add to document
  document.head.appendChild(script);
})();

// Apply compatibility fixes
function applyFixes() {
  if (!window.THREE) {
    console.error('[ThreeFix] Cannot apply fixes - THREE.js not loaded');
    return false;
  }
  
  console.log('[ThreeFix] Applying compatibility fixes to THREE.js...');
  
  // Add CapsuleGeometry if missing
  if (!window.THREE.CapsuleGeometry) {
    console.log('[ThreeFix] Adding CapsuleGeometry polyfill');
    window.THREE.CapsuleGeometry = function(radius, length, capSegments, radialSegments) {
      const geometry = new window.THREE.CylinderGeometry(
        radius, radius, length, radialSegments || 16, 1, true
      );
      return geometry;
    };
  }
  
  // Fix flat shading
  if (window.THREE.MeshLambertMaterial) {
    console.log('[ThreeFix] Patching MeshLambertMaterial for flatShading support');
    const originalMeshLambertMaterial = window.THREE.MeshLambertMaterial;
    window.THREE.MeshLambertMaterial = function(params) {
      if (params && params.flatShading) {
        const newParams = { ...params };
        delete newParams.flatShading;
        return new originalMeshLambertMaterial(newParams);
      }
      return new originalMeshLambertMaterial(params);
    };
  }
  
  console.log('[ThreeFix] Applied all compatibility fixes successfully');
  return true;
}

// Dispatch ready event
function dispatchReady() {
  console.log('[ThreeFix] Dispatching THREE.js ready event');
  window.THREE.isReady = true;
  window.dispatchEvent(new CustomEvent('THREEReady', { detail: window.THREE }));
}

// Dispatch fallback event
function dispatchFallback() {
  console.error('[ThreeFix] THREE.js failed to load, dispatching fallback event');
  window.dispatchEvent(new CustomEvent('THREEFallback', { 
    detail: { error: 'Failed to load THREE.js' } 
  }));
}

// Export for module use if needed
if (typeof module !== 'undefined') {
  module.exports = window.THREE;
}

// Add THREE status functions to global scope
window.ThreeFix = {
  isLoaded: function() {
    return window.THREE && window.THREE.REVISION;
  },
  getVersion: function() {
    return window.THREE ? window.THREE.REVISION : null;
  },
  applyFixes: applyFixes
};
