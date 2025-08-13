import * as THREE from 'https://cdn.skypack.dev/three@v0.128.0';

const BUBBLE_RADIUS = 1;
const HEX_WIDTH = BUBBLE_RADIUS * 2;
const HEX_HEIGHT = Math.sqrt(3) * BUBBLE_RADIUS;

export function worldToGrid(position) {
    const q = (2 / 3 * position.x) / BUBBLE_RADIUS;
    const r = (-1 / 3 * position.x + Math.sqrt(3) / 3 * position.y) / BUBBLE_RADIUS;
    return axialRound({ q, r });
}

export function gridToWorld(coords) {
    const x = BUBBLE_RADIUS * (3 / 2 * coords.q);
    const y = BUBBLE_RADIUS * (Math.sqrt(3) / 2 * coords.q + Math.sqrt(3) * coords.r);
    return new THREE.Vector3(x, y, 0);
}

function axialRound(coords) {
    const q = Math.round(coords.q);
    const r = Math.round(coords.r);
    const s = Math.round(-coords.q - coords.r);
    const q_diff = Math.abs(q - coords.q);
    const r_diff = Math.abs(r - coords.r);
    const s_diff = Math.abs(s - (-coords.q - coords.r));

    if (q_diff > r_diff && q_diff > s_diff) {
        return { q: -r - s, r: r };
    } else if (r_diff > s_diff) {
        return { q: q, r: -q - s };
    } else {
        return { q: q, r: r };
    }
}
