import * as THREE from 'https://cdn.skypack.dev/three@v0.128.0';

class Bubble {
    constructor(color, position, radius) {
        this.color = color;
        this.radius = radius;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
    }
}

export default Bubble;
