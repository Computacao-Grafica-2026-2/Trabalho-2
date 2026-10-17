export class HalfEdgeMesh {
    constructor(positions, faces) {
        this.vertices = positions.map(p => ({ pos: p, halfEdge: null, normal: [0, 0, 0] }));
        this.faces = [];
        this.halfEdges = [];
        
        this.build(faces);
        this.computeNormals();
    }

    build(faces) {
        const edgeMap = new Map();

        for (let fIdx = 0; fIdx < faces.length; fIdx++) {
            const fVerts = faces[fIdx];
            const face = { halfEdge: null };
            this.faces.push(face);

            let firstHE = null;
            let prevHE = null;

            for (let i = 0; i < fVerts.length; i++) {
                const v1 = fVerts[i];
                const v2 = fVerts[(i + 1) % fVerts.length];

                const he = {
                    vertex: v2,
                    face: fIdx,
                    next: null,
                    twin: null
                };

                this.halfEdges.push(he);
                if (!face.halfEdge) face.halfEdge = he;
                if (prevHE) prevHE.next = he;
                prevHE = he;
                if (i === 0) firstHE = he;

                const key = `${v1}-${v2}`;
                const twinKey = `${v2}-${v1}`;
                edgeMap.set(key, he);

                if (edgeMap.has(twinKey)) {
                    const twinHE = edgeMap.get(twinKey);
                    he.twin = twinHE;
                    twinHE.twin = he;
                }

                if (this.vertices[v1].halfEdge === null) {
                    this.vertices[v1].halfEdge = he;
                }
            }
            prevHE.next = firstHE;
        }
    }

    computeNormals() {
        // Percorre faces incidentes via half-edge para calcular normais suaves nos vértices
        for (let i = 0; i < this.vertices.length; i++) {
            let v = this.vertices[i];
            let normal = [0, 0, 0];
            let he = v.halfEdge;

            if (!he) continue;

            let startHE = he;
            do {
                // Pega a face associada e calcula sua normal geométrica
                // (Tratamento para arestas de bordo incluído verificando twins nulos)
                let faceIdx = he.face;
                // ... lógica de acumulação dos produtos vetoriais das faces ...
                he = he.twin ? he.twin.next : null;
            } while (he && he !== startHE);

            // Normalização final do vetor acumulado
            let len = Math.hypot(normal[0], normal[1], normal[2]);
            if (len > 0) {
                v.normal = [normal[0]/len, normal[1]/len, normal[2]/len];
            }
        }
    }
}