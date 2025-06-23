import Physics from './physics.js';

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

        this.init();
    }

    init() {
        for (let y = 0; y < 5; y++) {
            for (let x = -5; x <= 5; x += 2) {
                const color = this.colors[Math.floor(Math.random() * this.colors.length)];
                const bubble = new Bubble(color, new THREE.Vector3(x, y * 2, 0), 1);
                this.scene.add(bubble.mesh);
                this.bubbles.push(bubble);
            }
        }
        this.spawnShooterBubble();
        this.updateUI();
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('click', (e) => this.shoot(e));
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
                if (Physics.spheresCollide(bubble.mesh, other.mesh, bubble.radius)) {
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
        bubble.mesh.position.y = Math.round(bubble.mesh.position.y);
        bubble.mesh.position.x = Math.round(bubble.mesh.position.x);
        this.bubbles.push(bubble);
        this.checkMatches(bubble);
    }

    checkMatches(bubble) {
        const matches = this.bubbles.filter(b => Physics.distance(b.mesh.position, bubble.mesh.position) <= 2.1 && b.color === bubble.color);
        if (matches.length >= 3) {
            matches.forEach(b => {
                this.scene.remove(b.mesh);
                const index = this.bubbles.indexOf(b);
                if (index > -1) this.bubbles.splice(index, 1);
                this.score += 10;
            });
        }
        this.updateUI();
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
        if (!this.paused) this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render());
    }
}

export default Game;
