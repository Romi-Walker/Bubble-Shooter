import * as THREE from 'https://cdn.skypack.dev/three@v0.128.0';
import { TWEEN } from 'https://cdn.skypack.dev/three@v0.128.0/examples/jsm/libs/tween.module.min.js';
import { distance, spheresCollide } from './physics.js';
import Bubble from './bubble.js';
import { worldToGrid, gridToWorld } from './grid.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 20);
        this.renderer = new THREE.WebGLRenderer({ canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        this.scene.add(light);

        this.bubbles = [];
        this.colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        this.shots = 50;
        this.score = 0;
        this.highscore = parseInt(localStorage.getItem('highscore')) || 0;

        this.shooter = null;
        this.currentBubble = null;
        this.trajectoryLine = null;

        this.init();
    }

    init() {
        for (let q = -4; q <= 4; q++) {
            for (let r = -4; r <= 4; r++) {
                if (Math.abs(q + r) > 4) continue;
                if (r < 0) continue; // only top half
                const color = this.colors[Math.floor(Math.random() * this.colors.length)];
                const position = gridToWorld({ q, r });
                const bubble = new Bubble(color, position, 1);
                bubble.gridCoords = { q, r };
                this.scene.add(bubble.mesh);
                this.bubbles.push(bubble);
            }
        }
        this.spawnShooterBubble();
        this.updateUI();

        const lineMaterial = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.5, gapSize: 0.2 });
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
        this.trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(this.trajectoryLine);

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('click', (e) => this.shoot(e));
        window.addEventListener('mousemove', (e) => this.updateTrajectory(e));
    }

    spawnShooterBubble() {
        if (this.currentBubble) this.scene.remove(this.currentBubble.mesh);
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.currentBubble = new Bubble(color, new THREE.Vector3(0, -8, 0), 1);
        this.scene.add(this.currentBubble.mesh);
    }

    shoot(event) {
        if (this.shots <= 0 || this.paused) return;
        this.shots--;
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const dir = raycaster.ray.direction.clone().normalize();
        const velocity = dir.multiplyScalar(0.5);
        this.currentBubble.velocity = velocity;
        this.animateBubble(this.currentBubble);
        this.spawnShooterBubble();
        this.updateUI();
    }

    animateBubble(bubble) {
        const animate = () => {
            if (!bubble) return;
            bubble.mesh.position.add(bubble.velocity);
            for (const other of this.bubbles) {
                if (spheresCollide(bubble.mesh, other.mesh, bubble.radius)) {
                    this.attachBubble(bubble, other);
                    return;
                }
            }
            if (bubble.mesh.position.y > 10) {
                this.scene.remove(bubble.mesh);
                return;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    attachBubble(bubble, other) {
        // Stop the bubble's movement by clearing its velocity
        bubble.velocity = new THREE.Vector3(0, 0, 0);

        // Calculate the grid coordinates for the new bubble
        const gridCoords = worldToGrid(bubble.mesh.position);

        // Check if the target cell is already occupied. If so, find a neighbor.
        // This is a simplified approach. A more robust solution would check all 6 neighbors.
        if (this.bubbles.some(b => b.gridCoords && b.gridCoords.q === gridCoords.q && b.gridCoords.r === gridCoords.r)) {
             const neighbors = [
                { q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 }
             ];
             for(const n of neighbors) {
                 const newCoords = {q: other.gridCoords.q + n.q, r: other.gridCoords.r + n.r};
                 if (!this.bubbles.some(b => b.gridCoords && b.gridCoords.q === newCoords.q && b.gridCoords.r === newCoords.r)) {
                     gridCoords.q = newCoords.q;
                     gridCoords.r = newCoords.r;
                     break;
                 }
             }
        }

        bubble.gridCoords = gridCoords;
        const newPosition = gridToWorld(gridCoords);
        bubble.mesh.position.copy(newPosition);

        this.bubbles.push(bubble);
        this.checkMatches(bubble);
    }

    getNeighbors(bubble) {
        if (!bubble.gridCoords) return [];
        const neighbors = [];
        const directions = [
            { q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 }
        ];
        for (const dir of directions) {
            const neighborCoords = { q: bubble.gridCoords.q + dir.q, r: bubble.gridCoords.r + dir.r };
            const neighbor = this.bubbles.find(b => b.gridCoords && b.gridCoords.q === neighborCoords.q && b.gridCoords.r === neighborCoords.r);
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    checkMatches(startBubble) {
        if (!startBubble.gridCoords) return;

        const toCheck = [startBubble];
        const checked = new Set();
        const matches = [];

        while (toCheck.length > 0) {
            const current = toCheck.pop();
            if (checked.has(current)) continue;
            checked.add(current);

            if (current.color === startBubble.color) {
                matches.push(current);
                const neighbors = this.getNeighbors(current);
                for (const neighbor of neighbors) {
                    if (!checked.has(neighbor)) {
                        toCheck.push(neighbor);
                    }
                }
            }
        }

        if (matches.length >= 3) {
            matches.forEach(b => {
                this.popBubble(b);
                const index = this.bubbles.indexOf(b);
                if (index > -1) this.bubbles.splice(index, 1);
                this.score += 10;
            });
            // After clearing matches, check for dangling bubbles
            this.checkDanglingBubbles();
        }
        this.updateUI();
    }

    checkDanglingBubbles() {
        const anchoredBubbles = this.bubbles.filter(b => b.gridCoords && b.gridCoords.r === 0);

        const toCheck = [...anchoredBubbles];
        const safeBubbles = new Set(anchoredBubbles);

        while (toCheck.length > 0) {
            const current = toCheck.pop();
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (!safeBubbles.has(neighbor)) {
                    safeBubbles.add(neighbor);
                    toCheck.push(neighbor);
                }
            }
        }

        const danglingBubbles = this.bubbles.filter(b => !safeBubbles.has(b));
        if (danglingBubbles.length > 0) {
            danglingBubbles.forEach(b => {
                this.scene.remove(b.mesh);
                const index = this.bubbles.indexOf(b);
                if (index > -1) this.bubbles.splice(index, 1);
                this.score += 20; // Bonus points for dropping bubbles
            });
        }
    }

    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('shots').textContent = `Shots: ${this.shots}`;
        if (this.score > this.highscore) {
            this.highscore = this.score;
            localStorage.setItem('highscore', this.highscore);
        }
        document.getElementById('highscore').textContent = `Highscore: ${this.highscore}`;
        if (this.shots === 0) this.endGame();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    endGame() {
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
    }

    restart() {
        document.getElementById('gameOver').classList.add('hidden');
        this.bubbles.forEach(b => this.scene.remove(b.mesh));
        this.bubbles = [];
        this.score = 0;
        this.shots = 50;
        this.init();
    }

    pause(toggle) {
        this.paused = toggle;
    }

    render() {
        if (!this.paused) {
            TWEEN.update();
            this.renderer.render(this.scene, this.camera);
        }
        requestAnimationFrame(() => this.render());
    }

    popBubble(bubble) {
        const tween = new TWEEN.Tween(bubble.mesh.scale)
            .to({ x: 0, y: 0, z: 0 }, 200)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.scene.remove(bubble.mesh);
            })
            .start();
    }

    updateTrajectory(event) {
        if (!this.currentBubble || this.paused) {
            this.trajectoryLine.visible = false;
            return;
        }
        this.trajectoryLine.visible = true;

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const dir = raycaster.ray.direction.clone().normalize();

        if (dir.y > -0.1) { // Prevent shooting backwards
            dir.y = -0.1;
            dir.normalize();
        }

        const startPoint = this.currentBubble.mesh.position.clone();
        const velocity = dir.multiplyScalar(0.5);
        let currentPos = startPoint.clone();
        const points = [startPoint];

        const wallLeft = -5;
        const wallRight = 5;
        const bubbleRadius = 1;

        for (let i = 0; i < 100; i++) { // Limit iterations
            let nextPos = currentPos.clone().add(velocity);

            // Wall collision
            if (nextPos.x - bubbleRadius < wallLeft || nextPos.x + bubbleRadius > wallRight) {
                velocity.x *= -1;
                points.push(nextPos);
                currentPos = nextPos;
                continue;
            }

            // Bubble collision
            raycaster.set(currentPos, velocity.clone().normalize());
            const intersects = raycaster.intersectObjects(this.bubbles.map(b => b.mesh));
            if (intersects.length > 0 && intersects[0].distance < currentPos.distanceTo(nextPos)) {
                points.push(intersects[0].point);
                break;
            }

            currentPos = nextPos;
            if (i % 5 === 0) points.push(currentPos.clone()); // Add intermediate points for a smoother line

            if (points.length > 20) break;
        }


        this.trajectoryLine.geometry.setFromPoints(points);
        this.trajectoryLine.geometry.computeLineDistances();
    }
}

export default Game;
