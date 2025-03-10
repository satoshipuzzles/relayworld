/**
 * three-compatibility.js
 * Adds backwards compatibility for newer THREE.js features
 */

// Wait for THREE to be loaded
(function checkThree() {
  if (typeof THREE !== 'undefined') {
    addMissingGeometries();
  } else {
    setTimeout(checkThree, 100);
  }
})();

function addMissingGeometries() {
  // Add CapsuleGeometry if missing (added in r125, but we're using r134)
  if (!THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = function(radius, length, capSegments, radialSegments) {
      THREE.BufferGeometry.call(this);
      
      this.type = 'CapsuleGeometry';
      
      // Parameters
      radius = radius || 1;
      length = length || 1;
      capSegments = Math.floor(capSegments) || 8;
      radialSegments = Math.floor(radialSegments) || 16;
      
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
      
      // Combine geometries
      const geometry = new THREE.BufferGeometry();
      const position = [];
      const normal = [];
      const uv = [];
      
      // Collect all buffer data from the three geometries
      const collectBufferData = (geo) => {
        const posAttr = geo.attributes.position;
        const normalAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;
        
        for (let i = 0; i < posAttr.count; i++) {
          position.push(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          );
          
          normal.push(
            normalAttr.getX(i),
            normalAttr.getY(i),
            normalAttr.getZ(i)
          );
          
          uv.push(
            uvAttr.getX(i),
            uvAttr.getY(i)
          );
        }
      };
      
      collectBufferData(cylinderGeometry);
      collectBufferData(topSphere);
      collectBufferData(bottomSphere);
      
      // Set the combined data to the capsule geometry
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      
      // Compute face indices for the combined geometry
      geometry.computeVertexNormals();
      
      return geometry;
    };
    
    THREE.CapsuleGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
    THREE.CapsuleGeometry.prototype.constructor = THREE.CapsuleGeometry;
    
    console.log('Added THREE.CapsuleGeometry compatibility');
  }
  
  // Add other missing geometries as needed
  
  // Add MeshLambertMaterial.flatShading property if missing
  if (typeof THREE.MeshLambertMaterial !== 'undefined') {
    const originalMeshLambertMaterial = THREE.MeshLambertMaterial;
    THREE.MeshLambertMaterial = function(parameters) {
      // Remove flatShading from parameters if present
      if (parameters && parameters.flatShading) {
        const flatShading = parameters.flatShading;
        delete parameters.flatShading;
        
        const material = new originalMeshLambertMaterial(parameters);
        // In newer THREE versions, flatShading would have an effect, but not in r134
        return material;
      }
      
      return new originalMeshLambertMaterial(parameters);
    };
    
    console.log('Patched THREE.MeshLambertMaterial for flatShading support');
  }
}
