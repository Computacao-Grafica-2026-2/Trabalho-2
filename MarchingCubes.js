export class MarchingCubes {
    constructor(resX = 56, resY = 56, resZ = 56) {
        this.resX = resX;
        this.resY = resY;
        this.resZ = resZ;
        this.min = [-1.6, -0.2, -1.6];
        this.max = [ 1.6,  1.8,  1.6];
    }

    F(x, y, z) {
        const lateral = x * x + z * z - 0.36 - 2.5 * (y - 0.8) * (y - 0.8);
        return Math.max(lateral, -y, y - 1.6);
    }

    normalGradiente(x, y, z) {
        const eps = 0.002;
        const dx = this.F(x + eps, y, z) - this.F(x - eps, y, z);
        const dy = this.F(x, y + eps, z) - this.F(x, y - eps, z);
        const dz = this.F(x, y, z + eps) - this.F(x, y, z - eps);
        const comp = Math.hypot(dx, dy, dz) || 1.0;
        return [dx / comp, dy / comp, dz / comp];
    }

    interpolar(p1, p2, v1, v2) {
        if (Math.abs(v1) < 1e-6) return p1;
        if (Math.abs(v2) < 1e-6) return p2;
        if (Math.abs(v1 - v2) < 1e-6) return p1;
        const t = -v1 / (v2 - v1);
        return [
            p1[0] + t * (p2[0] - p1[0]),
            p1[1] + t * (p2[1] - p1[1]),
            p1[2] + t * (p2[2] - p1[2])
        ];
    }

    gerarGeometria() {
        const saida = [];
        const dx = (this.max[0] - this.min[0]) / this.resX;
        const dy = (this.max[1] - this.min[1]) / this.resY;
        const dz = (this.max[2] - this.min[2]) / this.resZ;

        // Decomposição de cada célula cúbica em 6 tetraedros para evitar ambiguidades topológicas
        const tetraedros = [
            [0, 5, 1, 6],
            [0, 1, 2, 6],
            [0, 2, 3, 6],
            [0, 3, 7, 6],
            [0, 7, 4, 6],
            [0, 4, 5, 6]
        ];

        const tabelaTriangulosTet = [
            [],
            [[0, 3, 2]],
            [[0, 1, 4]],
            [[1, 4, 2], [2, 4, 3]],
            [[1, 2, 5]],
            [[0, 3, 5], [0, 5, 1]],
            [[0, 2, 5], [0, 5, 4]],
            [[3, 5, 4]],
            [[3, 4, 5]],
            [[0, 4, 5], [0, 5, 2]],
            [[0, 5, 3], [0, 1, 5]],
            [[1, 5, 2]],
            [[1, 2, 4], [2, 3, 4]],
            [[0, 4, 1]],
            [[0, 2, 3]],
            []
        ];

        const arestasTet = [
            [0, 1], [1, 2], [2, 0],
            [0, 3], [1, 3], [2, 3]
        ];

        for (let ix = 0; ix < this.resX; ix++) {
            const x0 = this.min[0] + ix * dx;
            const x1 = x0 + dx;
            for (let iy = 0; iy < this.resY; iy++) {
                const y0 = this.min[1] + iy * dy;
                const y1 = y0 + dy;
                for (let iz = 0; iz < this.resZ; iz++) {
                    const z0 = this.min[2] + iz * dz;
                    const z1 = z0 + dz;

                    const p = [
                        [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
                        [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
                    ];

                    const val = new Float32Array(8);
                    let tudoPositivo = true, tudoNegativo = true;
                    for (let c = 0; c < 8; c++) {
                        val[c] = this.F(p[c][0], p[c][1], p[c][2]);
                        if (val[c] < 0) tudoPositivo = false;
                        else tudoNegativo = false;
                    }
                    if (tudoPositivo || tudoNegativo) continue;

                    for (let t = 0; t < 6; t++) {
                        const tet = tetraedros[t];
                        let mascara = 0;
                        if (val[tet[0]] < 0) mascara |= 1;
                        if (val[tet[1]] < 0) mascara |= 2;
                        if (val[tet[2]] < 0) mascara |= 4;
                        if (val[tet[3]] < 0) mascara |= 8;

                        const triangulos = tabelaTriangulosTet[mascara];
                        if (triangulos.length === 0) continue;

                        for (let tr = 0; tr < triangulos.length; tr++) {
                            const [e0, e1, e2] = triangulos[tr];
                            const arestas = [arestasTet[e0], arestasTet[e1], arestasTet[e2]];

                            const ptsTri = arestas.map(([a, b]) => {
                                const va = tet[a], vb = tet[b];
                                return this.interpolar(p[va], p[vb], val[va], val[vb]);
                            });

                            for (let k = 0; k < 3; k++) {
                                const ponto = ptsTri[k];
                                const n = this.normalGradiente(ponto[0], ponto[1], ponto[2]);
                                saida.push(ponto[0], ponto[1], ponto[2], n[0], n[1], n[2], 0.0, 0.0);
                            }
                        }
                    }
                }
            }
        }

        return new Float32Array(saida);
    }
}