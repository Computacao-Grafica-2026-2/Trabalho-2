import codigoVertexShader from './simple.vert.js';
import codigoFragmentShader from './simple.frag.js';
import { createFloorGeometry } from './Floor.js';
import { MarchingCubes } from './MarchingCubes.js';
import { carregarPLY, MalhaHalfEdge } from './HalfEdge.js';
import {
    Camera,
    mat4Identidade,
    mat4Translacao,
    mat4Escala,
    mat4Multiplicar,
    mat4NormalDoModelo
} from './Camera.js';

async function carregarTexturaOuPadrao(dispositivo, url) {
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error("Arquivo de imagem não encontrado");
        const blob = await resposta.blob();
        const mapaBits = await createImageBitmap(blob);

        const textura = dispositivo.createTexture({
            size: [mapaBits.width, mapaBits.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });

        dispositivo.queue.copyExternalImageToTexture(
            { source: mapaBits },
            { texture: textura },
            [mapaBits.width, mapaBits.height]
        );
        return textura;
    } catch (erro) {
        console.warn("Utilizando textura procedural de reserva para o chão:", erro.message);
        const largura = 64, altura = 64;
        const pixels = new Uint8Array(largura * altura * 4);
        for (let y = 0; y < altura; y++) {
            for (let x = 0; x < largura; x++) {
                const idx = (y * largura + x) * 4;
                const borda = (x < 2 || y < 2);
                const c = borda ? 120 : 210;
                pixels[idx] = c;
                pixels[idx + 1] = c - 10;
                pixels[idx + 2] = c - 20;
                pixels[idx + 3] = 255;
            }
        }
        const textura = dispositivo.createTexture({
            size: [largura, altura, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        dispositivo.queue.writeTexture(
            { texture: textura },
            pixels,
            { bytesPerRow: largura * 4 },
            [largura, altura]
        );
        return textura;
    }
}

function criarBufferVertices(dispositivo, dadosFloat) {
    const buffer = dispositivo.createBuffer({
        size: dadosFloat.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(buffer.getMappedRange()).set(dadosFloat);
    buffer.unmap();
    return { buffer, contagemVertices: dadosFloat.length / 8 };
}

async function inicializar() {
    if (!navigator.gpu) {
        alert("WebGPU não é suportada neste navegador.");
        return;
    }

    // 01. Setup Inicial
    const canvas = document.getElementById("webgpu-canvas");
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;

    const adaptador = await navigator.gpu.requestAdapter();
    if (!adaptador) throw new Error("Nenhum adaptador WebGPU disponível. Atualize o navegador/driver e teste em localhost.");
    const dispositivo = await adaptador.requestDevice();
    const contexto = canvas.getContext("webgpu");
    const formato = navigator.gpu.getPreferredCanvasFormat();
    contexto.configure({ device: dispositivo, format: formato, alphaMode: 'opaque' });

    const camera = new Camera(canvas);

    // 02. Pipeline de Renderização
    const pipeline = dispositivo.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: dispositivo.createShaderModule({ code: codigoVertexShader }),
            entryPoint: 'main',
            buffers: [{
                arrayStride: 32,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x3' },
                    { shaderLocation: 2, offset: 24, format: 'float32x2' }
                ]
            }]
        },
        fragment: {
            module: dispositivo.createShaderModule({ code: codigoFragmentShader }),
            entryPoint: 'main',
            targets: [{ format: formato }]
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none'
        },
        depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: true,
            depthCompare: 'less'
        }
    });

    // 03. Recursos: Geometrias e Malhas
    const malhaChao = criarBufferVertices(dispositivo, createFloorGeometry());

    const mc = new MarchingCubes(56, 56, 56);
    const malhaMesa = criarBufferVertices(dispositivo, mc.gerarGeometria());

    let malhaBunny = null;
    let matrizModeloBunny = mat4Identidade();

    try {
        const { posicoes, faces } = await carregarPLY('./bun_zipper.ply');
        if (posicoes.length > 0 && faces.length > 0) {
            const malhaHE = new MalhaHalfEdge(posicoes, faces);
            malhaBunny = criarBufferVertices(dispositivo, malhaHE.paraFloat32Array());

            // Delimita a caixa envolvente do Bunny para apoiá-lo sobre o topo da mesa (y = 1.6)
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            for (const p of posicoes) {
                if (p[0] < minX) minX = p[0];
                if (p[1] < minY) minY = p[1];
                if (p[2] < minZ) minZ = p[2];
                if (p[0] > maxX) maxX = p[0];
                if (p[1] > maxY) maxY = p[1];
                if (p[2] > maxZ) maxZ = p[2];
            }

            const cx = (minX + maxX) * 0.5;
            const cz = (minZ + maxZ) * 0.5;
            const escalaBunny = 6.5;

            const transladaParaOrigem = mat4Translacao(-cx, -minY, -cz);
            const escalaMat = mat4Escala(escalaBunny, escalaBunny, escalaBunny);
            const transladaParaTopoMesa = mat4Translacao(0.0, 1.6, 0.0);

            matrizModeloBunny = mat4Multiplicar(transladaParaTopoMesa, mat4Multiplicar(escalaMat, transladaParaOrigem));
        }
    } catch (e) {
        console.error("Aviso ao carregar bun_zipper.ply:", e.message);
    }

    // Textura e Sampler do chão
    const texturaChao = await carregarTexturaOuPadrao(dispositivo, './Tiles074_1K-JPG_Color.jpg');
    const amostrador = dispositivo.createSampler({
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        magFilter: 'linear',
        minFilter: 'linear'
    });

    // Criação dos uniformes e BindGroups individuais por objeto
    function criarRecursosObjeto(matrizModelo, material) {
        const bufferMatrizes = dispositivo.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bufferCena = dispositivo.createBuffer({
            size: 144,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroup = dispositivo.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: bufferMatrizes } },
                { binding: 1, resource: { buffer: bufferCena } },
                { binding: 2, resource: amostrador },
                { binding: 3, resource: texturaChao.createView() }
            ]
        });

        return {
            bufferMatrizes,
            bufferCena,
            bindGroup,
            matrizModelo,
            matrizNormal: mat4NormalDoModelo(matrizModelo),
            material
        };
    }

    const objetos = [
        {
            malha: malhaChao,
            recursos: criarRecursosObjeto(mat4Identidade(), {
                ambiente: [0.25, 0.25, 0.25],
                difusa: [1.0, 1.0, 1.0],
                especular: [0.15, 0.15, 0.15],
                brilho: 16.0,
                usarTextura: 1.0
            })
        },
        {
            malha: malhaMesa,
            recursos: criarRecursosObjeto(mat4Identidade(), {
                ambiente: [0.15, 0.2, 0.35],
                difusa: [0.18, 0.45, 0.85], // Cor sólida azul
                especular: [0.25, 0.25, 0.25],
                brilho: 32.0,
                usarTextura: 0.0
            })
        }
    ];

    if (malhaBunny) {
        objetos.push({
            malha: malhaBunny,
            recursos: criarRecursosObjeto(matrizModeloBunny, {
                ambiente: [0.25, 0.24, 0.22],
                difusa: [0.92, 0.89, 0.84], // Cor sólida clara
                especular: [0.2, 0.2, 0.2],
                brilho: 24.0,
                usarTextura: 0.0
            })
        });
    }

    let texturaProfundidade = dispositivo.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        texturaProfundidade.destroy();
        texturaProfundidade = dispositivo.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    });

    // Posições e cores fixas das duas fontes de luz pontuais
    const luz1Pos = [3.5, 4.5, 3.5, 1.0];
    const luz1Cor = [0.85, 0.85, 0.82, 1.0];
    const luz2Pos = [-3.5, 3.2, -2.5, 1.0];
    const luz2Cor = [0.45, 0.50, 0.60, 1.0];

    // 04. Execução (Loop de Renderização)
    function quadro() {
        const aspecto = canvas.width / canvas.height;
        const matrizVisao = camera.getViewMatrix();
        const matrizProjecao = camera.getProjectionMatrix(aspecto);
        const olho = camera.getEye();

        for (const obj of objetos) {
            const { bufferMatrizes, bufferCena, matrizModelo, matrizNormal, material } = obj.recursos;

            const dadosMatrizes = new Float32Array(64);
            dadosMatrizes.set(matrizModelo, 0);
            dadosMatrizes.set(matrizVisao, 16);
            dadosMatrizes.set(matrizProjecao, 32);
            dadosMatrizes.set(matrizNormal, 48);
            dispositivo.queue.writeBuffer(bufferMatrizes, 0, dadosMatrizes);

            const dadosCena = new Float32Array([
                ...luz1Pos,
                ...luz1Cor,
                ...luz2Pos,
                ...luz2Cor,
                olho[0], olho[1], olho[2], 1.0,
                ...material.ambiente, 1.0,
                ...material.difusa, 1.0,
                ...material.especular, material.brilho,
                material.usarTextura, 0.0, 0.0, 0.0
            ]);
            dispositivo.queue.writeBuffer(bufferCena, 0, dadosCena);
        }

        const codificadorComandos = dispositivo.createCommandEncoder();
        const passeRenderizacao = codificadorComandos.beginRenderPass({
            colorAttachments: [{
                view: contexto.getCurrentTexture().createView(),
                clearValue: { r: 0.12, g: 0.13, b: 0.16, a: 1.0 }, // Cor sólida de fundo
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: texturaProfundidade.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        });

        passeRenderizacao.setPipeline(pipeline);

        for (const obj of objetos) {
            passeRenderizacao.setBindGroup(0, obj.recursos.bindGroup);
            passeRenderizacao.setVertexBuffer(0, obj.malha.buffer);
            passeRenderizacao.draw(obj.malha.contagemVertices);
        }

        passeRenderizacao.end();
        dispositivo.queue.submit([codificadorComandos.finish()]);

        requestAnimationFrame(quadro);
    }

    requestAnimationFrame(quadro);
}

inicializar().catch(erro => {
    console.error("Falha ao inicializar a cena WebGPU:", erro);
    const aviso = document.createElement("pre");
    aviso.style.cssText = "position:fixed;left:12px;top:12px;right:12px;padding:12px;background:#300;color:white;white-space:pre-wrap;z-index:9999";
    aviso.textContent = "Falha ao iniciar WebGPU: " + (erro?.message || erro);
    document.body.appendChild(aviso);
});