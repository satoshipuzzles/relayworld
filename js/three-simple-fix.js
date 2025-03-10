/**
 * three-simple-fix.js
 * Simple fix for the THREE.js CapsuleGeometry error
 */

(function() {
  console.log('[ThreeFix] Checking for THREE.js issues...');
  
  // Check if THREE is available and fix if needed
  function checkAndFixThreeJs() {
    if (typeof THREE !== 'undefined') {
      // Fix CapsuleGeometry if it's missing
      if (!THREE.CapsuleGeometry) {
        console.log('[ThreeFix] Adding simple CapsuleGeometry replacement');
        
        // Simple replacement that just uses a cylinder
        THREE.CapsuleGeometry = function(radius, height, radiusSegments, heightSegments) {
          // Just use a cylinder as fallback
          return new THREE.CylinderGeometry(
            radius, 
            radius, 
            height, 
            radiusSegments || 8
          );
        };
      }
      
      // Fix the flatShading issue with MeshLambertMaterial
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
      
      // Patch any other issues as needed
      
      console.log('[ThreeFix] THREE.js fixes applied');
      return true;
    }
    
    return false;
  }
  
  // Try immediately
  if (!checkAndFixThreeJs()) {
    // If THREE isn't loaded yet, wait and try again
    const maxAttempts = 20;
    let attempts = 0;
    
    const interval = setInterval(function() {
      attempts++;
      
      if (checkAndFixThreeJs() || attempts >= maxAttempts) {
        clearInterval(interval);
        
        if (attempts >= maxAttempts) {
          console.error('[ThreeFix] Failed to fix THREE.js - not loaded after multiple attempts');
        }
      }
    }, 200);
  }
})();
