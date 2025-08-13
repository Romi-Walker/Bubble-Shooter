// Basic physics utilities for bubble collisions
export function distance(a, b) {
    return Math.sqrt(
        (a.x - b.x) * (a.x - b.x) +
        (a.y - b.y) * (a.y - b.y) +
        (a.z - b.z) * (a.z - b.z)
    );
}

export function spheresCollide(a, b, radius) {
    return distance(a.position, b.position) < radius * 2;
}
