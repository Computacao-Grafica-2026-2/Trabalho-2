import { calculateTriangleNormal } from './lib/utils.js';

export default class HalfEdgeMesh {
    constructor(positions, indices) {
        this.vertices = positions.map((position) => ({ position, halfEdge: -1 }));
        this.faces = [];
        this.halfEdges = [];
        const directedEdges = new Map();

        for (let i = 0; i < indices.length; i += 3) {
            const triangle = indices.slice(i, i + 3);
            const first = this.halfEdges.length;
            const face = this.faces.length;
            this.faces.push({
                halfEdge: first,
                normal: calculateTriangleNormal(...triangle.map((index) => positions[index])),
            });

            for (let j = 0; j < 3; j++) {
                const origin = triangle[j];
                const destination = triangle[(j + 1) % 3];
                const key = `${origin},${destination}`;
                if (directedEdges.has(key)) {
                    throw new Error('A malha possui arestas não manifold ou faces com orientação inconsistente.');
                }
                const edge = this.halfEdges.length;
                this.halfEdges.push({
                    origin,
                    face,
                    next: first + (j + 1) % 3,
                    prev: first + (j + 2) % 3,
                    twin: -1,
                });
                this.vertices[origin].halfEdge = edge;
                directedEdges.set(key, edge);
            }
        }

        for (let i = 0; i < this.halfEdges.length; i++) {
            const edge = this.halfEdges[i];
            const destination = this.halfEdges[edge.next].origin;
            edge.twin = directedEdges.get(`${destination},${edge.origin}`) ?? -1;
            // No bordo, começamos pela ponta do leque para não perder faces.
            if (edge.twin === -1) {
                this.vertices[edge.origin].halfEdge = i;
            }
        }
    }

    incidentFaces(vertex) {
        const faces = [];
        const first = this.vertices[vertex].halfEdge;
        let current = first;
        if (first === -1) return faces;

        do {
            const edge = this.halfEdges[current];
            faces.push(edge.face);
            current = this.halfEdges[edge.prev].twin;
        } while (current !== -1 && current !== first);
        return faces;
    }

    calculateNormals() {
        return this.vertices.map((vertex, index) => {
            const sum = [0, 0, 0];
            for (const face of this.incidentFaces(index)) {
                const normal = this.faces[face].normal;
                for (let axis = 0; axis < 3; axis++) sum[axis] += normal[axis];
            }
            const length = Math.hypot(...sum);
            // Vértices isolados do PLY não são desenhados.
            return length === 0 ? [0, 1, 0, 0] : [...sum.map((value) => value / length), 0];
        });
    }
}
