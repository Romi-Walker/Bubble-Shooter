// Basic physics utilities for bubble collisions
class Physics {
    static distance(a, b) {
        return Math.sqrt(
            (a.x - b.x) * (a.x - b.x) +
            (a.y - b.y) * (a.y - b.y) +
            (a.z - b.z) * (a.z - b.z)
        );
    }

    static spheresCollide(a, b, radius) {
        return Physics.distance(a.position, b.position) < radius * 2;
    }
}
export default Physics;
