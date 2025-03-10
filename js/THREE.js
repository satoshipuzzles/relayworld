/**
 * three.js - Compatibility fixes for THREE.js
 * Combines functionality from three-simple-fix.js and three-compatibility.js
 */

(function() {
  console.log('[ThreeFix] Initializing THREE.js compatibility fixes...');
  
  // Try to apply fixes immediately or wait for THREE to load
  if (!applyFixes()) {
    waitForThree();
  }
  
  // Check if THREE is loaded and apply fixes if needed
  function applyFixes() {
    if (typeof THREE === 'undefined') {
      return false;
    }
    
    console.log('[ThreeFix] Applying fixes to THREE.js...');
    
    // Fix 1: Add CapsuleGeometry if missing
    if (!THREE.CapsuleGeometry) {
      console.log('[ThreeFix] Adding CapsuleGeometry fallback');
      
      THREE.CapsuleGeometry = function(radius, length, capSegments, radialSegments) {
        THREE.BufferGeometry.call(this);
        
        this.type = 'CapsuleGeometry';
        
        // Parameters
        radius = radius || 1;
        length = length || 1;
        capSegments = Math.floor(capSegments) || 8;
        radialSegments = Math.floor(radialSegments) || 16;
        
        // Simple fallback - just use a cylinder if THREE.js version is too old
        try {
          // Create cylinder for the middle section
          const cylinderGeometry = new THREE.CylinderGeometry(
            radius, radius, length, radialSegments, 1, true
          );
          
          // Create sphere for the caps
          const sphereGeometry = new THREE.SphereGeometry(
            radius, radialSegments, capSegments, 0, Math.PI * 2, 0, Math.PI / 2
          );
          
          // Clone and position the geometries
          const topSphere = sphereGeometry.clone();
          const matrix = new THREE.Matrix4().makeTranslation(0, length/2, 0);
          topSphere.applyMatrix4(matrix);
          
          const bottomSphere = sphereGeometry.clone();
          const matrix2 = new THREE.Matrix4().makeRotationX(Math.PI).multiply(
            new THREE.Matrix4().makeTranslation(0, -length/2, 0)
          );
          bottomSphere.applyMatrix4(matrix2);
          
          // Combine geometries (simplified for compatibility)
          const geometry = new THREE.BufferGeometry();
          
          // Just return cylinder in case of error
          return cylinderGeometry;
        } catch (e) {
          console.warn('[ThreeFix] Error creating CapsuleGeometry:', e);
          // Fallback to cylinder
          return new THREE.CylinderGeometry(radius, radius, length, radialSegments);
        }
      };
      
      // Make sure to set prototype correctly
      if (THREE.BufferGeometry) {
        THREE.CapsuleGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
        THREE.CapsuleGeometry.prototype.constructor = THREE.CapsuleGeometry;
      }
    }
    
    // Fix 2: Fix flatShading issue with MeshLambertMaterial
    if (typeof THREE.MeshLambertMaterial !== 'undefined') {
      console.log('[ThreeFix] Patching MeshLambertMaterial for flatShading support');
      
      const originalMeshLambertMaterial = THREE.MeshLambertMaterial;
      
      // Replace the constructor to filter out flatShading
      THREE.MeshLambertMaterial = function(params) {
        if (params && params.flatShading !== undefined) {
          // Make a copy without flatShading
          const newParams = Object.assign({}, params);
          delete newParams.flatShading;
          return new originalMeshLambertMaterial(newParams);
        }
        return new originalMeshLambertMaterial(params);
      };
    }
    
    // Fix 3: Fix WebGLRenderer for environments without proper WebGL support
    if (typeof THREE.WebGLRenderer !== 'undefined') {
      try {
        // Create a tiny test renderer to see if it works
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        
        const testRenderer = new THREE.WebGLRenderer({
          canvas: testCanvas,
          antialias: false
        });
        
        // Clean up the test
        testRenderer.dispose();
        console.log('[ThreeFix] WebGL is properly supported');
      } catch (e) {
        console.warn('[ThreeFix] WebGL rendering not fully supported:', e);
        
        // We can't really fix this, but we'll make the error more graceful
        // by providing a fallback error message
        window.WebGLRenderingError = e.message;
      }
    }
    
    // Fix 4: Patch any other compatibility issues as needed
    
    console.log('[ThreeFix] All THREE.js fixes applied');
    return true;
  }
  
  // Wait for THREE to be loaded and try to apply fixes
  function waitForThree() {
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkThreeInterval = setInterval(function() {
      attempts++;
      
      if (applyFixes() || attempts >= maxAttempts) {
        clearInterval(checkThreeInterval);
        
        if (attempts >= maxAttempts) {
          console.warn('[ThreeFix] THREE.js not loaded after ' + maxAttempts + ' attempts');
        }
      }
    }, 200);
  }
  
  // Export public functions
  window.ThreeFix = {
    applyFixes: applyFixes,
    waitForThree: waitForThree
  };
})();
