export async function carregarPLY(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar o arquivo PLY em: ${url}`);
    }
    const texto = await resposta.text();
    const linhas = texto.split(/\r?\n/);

    let qtdVertices = 0;
    let qtdFaces = 0;
    let cabecalhoFinalizado = false;
    let idxLinha = 0;

    while (idxLinha < linhas.length) {
        const linha = linhas[idxLinha++].trim();
        if (linha.startsWith("element vertex")) {
            qtdVertices = parseInt(linha.split(/\s+/)[2], 10);
        } else if (linha.startsWith("element face")) {
            qtdFaces = parseInt(linha.split(/\s+/)[2], 10);
        } else if (linha === "end_header") {
            cabecalhoFinalizado = true;
            break;
        }
    }

    const posicoes = [];
    const faces = [];

    if (!cabecalhoFinalizado) return { posicoes, faces };

    for (let i = 0; i < qtdVertices && idxLinha < linhas.length; i++) {
        const linha = linhas[idxLinha++].trim();
        if (!linha) { i--; continue; }
        const partes = linha.split(/\s+/);
        posicoes.push([
            parseFloat(partes[0]),
            parseFloat(partes[1]),
            parseFloat(partes[2])
        ]);
    }

    for (let i = 0; i < qtdFaces && idxLinha < linhas.length; i++) {
        const linha = linhas[idxLinha++].trim();
        if (!linha) { i--; continue; }
        const partes = linha.split(/\s+/);
        const contagem = parseInt(partes[0], 10);
        if (contagem >= 3) {
            faces.push([
                parseInt(partes[1], 10),
                parseInt(partes[2], 10),
                parseInt(partes[3], 10)
            ]);
        }
    }

    return { posicoes, faces };
}

export class MalhaHalfEdge {
    constructor(posicoes, faces) {
        this.vertices = posicoes.map(p => ({
            pos: p,
            semiAresta: null,
            normal: [0, 1, 0]
        }));
        this.faces = [];
        this.semiArestas = [];

        this.construir(faces);
        this.calcularNormais();
    }

    construir(faces) {
        const mapaArestas = new Map();

        for (let fIdx = 0; fIdx < faces.length; fIdx++) {
            const [v0, v1, v2] = faces[fIdx];
            const indicesFace = [v0, v1, v2];

            const p0 = this.vertices[v0].pos;
            const p1 = this.vertices[v1].pos;
            const p2 = this.vertices[v2].pos;

            const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
            const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;

            const face = { semiAresta: null, normal: [nx, ny, nz] };
            this.faces.push(face);

            const heFace = [];
            for (let i = 0; i < 3; i++) {
                const origem = indicesFace[i];
                const destino = indicesFace[(i + 1) % 3];

                const he = {
                    origem: origem,
                    vertice: destino,
                    face: face,
                    proxima: null,
                    anterior: null,
                    oposta: null
                };
                this.semiArestas.push(he);
                heFace.push(he);

                if (this.vertices[origem].semiAresta === null) {
                    this.vertices[origem].semiAresta = he;
                }

                const chave = `${origem}_${destino}`;
                const chaveOposta = `${destino}_${origem}`;
                mapaArestas.set(chave, he);

                if (mapaArestas.has(chaveOposta)) {
                    const heOposta = mapaArestas.get(chaveOposta);
                    he.oposta = heOposta;
                    heOposta.oposta = he;
                }
            }

            for (let i = 0; i < 3; i++) {
                heFace[i].proxima = heFace[(i + 1) % 3];
                heFace[i].anterior = heFace[(i + 2) % 3];
            }
            face.semiAresta = heFace[0];
        }
    }

    calcularNormais() {
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            const heInicial = v.semiAresta;
            if (!heInicial) continue;

            let nx = 0, ny = 0, nz = 0;
            const facesVisitadas = new Set();

            // 1. Circulação em sentido horário utilizando oposta.proxima
            let atual = heInicial;
            while (atual && !facesVisitadas.has(atual.face)) {
                facesVisitadas.add(atual.face);
                nx += atual.face.normal[0];
                ny += atual.face.normal[1];
                nz += atual.face.normal[2];

                if (atual.oposta) {
                    atual = atual.oposta.proxima;
                    if (atual === heInicial) break;
                } else {
                    break; // Atingiu aresta de bordo
                }
            }

            // 2. Tratamento de bordo: circulação reversa com anterior.oposta
            if (!atual || !atual.oposta) {
                let volta = heInicial.anterior ? heInicial.anterior.oposta : null;
                while (volta && !facesVisitadas.has(volta.face)) {
                    facesVisitadas.add(volta.face);
                    nx += volta.face.normal[0];
                    ny += volta.face.normal[1];
                    nz += volta.face.normal[2];
                    volta = volta.anterior ? volta.anterior.oposta : null;
                }
            }

            const comp = Math.hypot(nx, ny, nz);
            if (comp > 1e-8) {
                v.normal = [nx / comp, ny / comp, nz / comp];
            }
        }
    }

    paraFloat32Array() {
        const dados = new Float32Array(this.faces.length * 3 * 8);
        let deslocamento = 0;

        for (let i = 0; i < this.faces.length; i++) {
            const he0 = this.faces[i].semiAresta;
            const he1 = he0.proxima;
            const he2 = he1.proxima;
            const verticesTriangulo = [he0.origem, he1.origem, he2.origem];

            for (let k = 0; k < 3; k++) {
                const v = this.vertices[verticesTriangulo[k]];
                dados[deslocamento++] = v.pos[0];
                dados[deslocamento++] = v.pos[1];
                dados[deslocamento++] = v.pos[2];
                dados[deslocamento++] = v.normal[0];
                dados[deslocamento++] = v.normal[1];
                dados[deslocamento++] = v.normal[2];
                dados[deslocamento++] = 0.0;
                dados[deslocamento++] = 0.0;
            }
        }
        return dados;
    }
}