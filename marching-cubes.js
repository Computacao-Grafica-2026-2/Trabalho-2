import { calculateTriangleNormal } from './lib/utils.js';

const corners = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];
const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
];
const faces = [
    { corners: [0, 1, 2, 3], edges: [0, 1, 2, 3] },
    { corners: [4, 5, 6, 7], edges: [4, 5, 6, 7] },
    { corners: [0, 1, 5, 4], edges: [0, 9, 4, 8] },
    { corners: [3, 2, 6, 7], edges: [2, 10, 6, 11] },
    { corners: [0, 3, 7, 4], edges: [3, 11, 7, 8] },
    { corners: [1, 2, 6, 5], edges: [1, 10, 5, 9] },
];

export function tableField(x, y, z) {
    return Math.max(x * x + z * z - 0.36 - 2.5 * (y - 0.8) ** 2, -y, y - 1.6);
}

function sideNormal(x, y, z) {
    const normal = [2 * x, -5 * (y - 0.8), 2 * z];
    const length = Math.hypot(...normal);
    return [...normal.map((value) => value / length), 0];
}

export function polygonizeCell(points, values) {
    let cubeCase = 0;
    for (let i = 0; i < 8; i++) {
        if (values[i] < 0) cubeCase |= 1 << i;
    }
    if (cubeCase === 0 || cubeCase === 255) return [];

    const intersections = new Array(12).fill(null);
    const neighbors = Array.from({ length: 12 }, () => []);
    for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        if (((cubeCase >> a) & 1) === ((cubeCase >> b) & 1)) continue;
        const t = values[a] / (values[a] - values[b]);
        intersections[i] = points[a].map((value, axis) => value + t * (points[b][axis] - value));
    }

    const connect = (a, b) => {
        neighbors[a].push(b);
        neighbors[b].push(a);
    };
    for (const face of faces) {
        const crossed = face.edges.filter((edge) => intersections[edge] !== null);
        if (crossed.length === 2) {
            connect(crossed[0], crossed[1]);
        } else if (crossed.length === 4) {
            // O mesmo teste bilinear nas duas células evita fissuras na face compartilhada.
            const [a, b, c, d] = face.corners.map((index) => values[index]);
            const [e0, e1, e2, e3] = face.edges;
            if (a * c - b * d >= 0) {
                connect(e0, e1);
                connect(e2, e3);
            } else {
                connect(e0, e3);
                connect(e1, e2);
            }
        }
    }

    const visited = new Set();
    const triangles = [];
    for (let first = 0; first < 12; first++) {
        if (intersections[first] === null || visited.has(first)) continue;
        const polygon = [];
        let previous = -1;
        let current = first;
        do {
            polygon.push(intersections[current]);
            visited.add(current);
            const next = neighbors[current].find((edge) => edge !== previous);
            previous = current;
            current = next;
        } while (current !== first);

        for (let i = 1; i < polygon.length - 1; i++) {
            triangles.push([polygon[0], polygon[i], polygon[i + 1]]);
        }
    }
    return triangles;
}

export function createTable() {
    const cells = [80, 64, 80];
    const min = [-1.6, -0.2, -1.6];
    const step = [0.04, 0.03125, 0.04];
    const [nx, ny, nz] = cells;
    const gridIndex = (x, y, z) => x + (nx + 1) * (y + (ny + 1) * z);
    const values = new Float64Array((nx + 1) * (ny + 1) * (nz + 1));
    for (let z = 0; z <= nz; z++) {
        for (let y = 0; y <= ny; y++) {
            for (let x = 0; x <= nx; x++) {
                const value = tableField(min[0] + x * step[0], min[1] + y * step[1], min[2] + z * step[2]);
                // Evita triângulos de área quase nula nos pontos que já estão na superfície.
                values[gridIndex(x, y, z)] = Math.abs(value) < 1e-12 ? 0 : value;
            }
        }
    }

    const vertices = [];
    const normals = [];
    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            for (let x = 0; x < nx; x++) {
                const samples = corners.map(([dx, dy, dz]) => values[gridIndex(x + dx, y + dy, z + dz)]);
                if (samples.every((value) => value >= 0) || samples.every((value) => value < 0)) continue;
                const points = corners.map(([dx, dy, dz]) => [
                    min[0] + (x + dx) * step[0],
                    min[1] + (y + dy) * step[1],
                    min[2] + (z + dz) * step[2],
                ]);
                for (const triangle of polygonizeCell(points, samples)) {
                    const center = [0, 1, 2].map((axis) => triangle.reduce((sum, point) => sum + point[axis], 0) / 3);
                    const cap = triangle.every((point) => Math.abs(point[1]) < 1e-10) ? -1 :
                        triangle.every((point) => Math.abs(point[1] - 1.6) < 1e-10) ? 1 : 0;
                    const local = center.map((value, axis) => (value - points[0][axis]) / step[axis]);
                    const outward = [0, 0, 0];
                    // Gradiente da interpolação trilinear da célula, inclusive nas quinas.
                    for (let i = 0; i < 8; i++) {
                        for (let axis = 0; axis < 3; axis++) {
                            let weight = (corners[i][axis] ? 1 : -1) / step[axis];
                            for (let other = 0; other < 3; other++) {
                                if (other !== axis) weight *= corners[i][other] ? local[other] : 1 - local[other];
                            }
                            outward[axis] += samples[i] * weight;
                        }
                    }
                    const normal = calculateTriangleNormal(...triangle);
                    if (Math.hypot(...normal) === 0) continue;
                    if (normal.slice(0, 3).reduce((sum, value, axis) => sum + value * outward[axis], 0) < 0) {
                        [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
                        for (let axis = 0; axis < 3; axis++) normal[axis] *= -1;
                    }
                    const rim = triangle.some((point) => point[1] < step[1] || point[1] > 1.6 - step[1]);
                    for (const point of triangle) {
                        vertices.push([...point, 1]);
                        // A lateral não compartilha a normal dos planos na quina do tampo e da base.
                        normals.push(cap ? [0, cap, 0, 0] : rim ? [...normal, 0] : sideNormal(...point));
                    }
                }
            }
        }
    }
    return { vertices, normals };
}
