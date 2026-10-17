import vertexShaderSrc from './simple.vert.js';
import fragmentShaderSrc from './simple.frag.js';
import { createFloorGeometry } from './Floor.js';
import { Camera } from './Camera.js';

async function init() {
    if (!navigator.gpu) {
        alert("WebGPU não suportada neste navegador!");
        return;
    }

    const canvas = document.getElementById("webgpu-canvas");
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    const camera = new Camera(canvas);

    // 1. Criar Pipeline de Renderização
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({ code: vertexShaderSrc }),
            entryPoint: 'main',
            buffers: [{
                arrayStride: 32, // 3 floats pos + 3 floats normal + 2 floats uv
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x3' },
                    { shaderLocation: 2, offset: 24, format: 'float32x2' }
                ]
            }]
        },
        fragment: {
            module: device.createShaderModule({ code: fragmentShaderSrc }),
            entryPoint: 'main',
            targets: [{ format }]
        },
        primitive: { topology: 'triangle-list', cullMode: 'back' },
        depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: true,
            depthCompare: 'less'
        }
    });

    // 2. Carregar Geometrias e Criar Buffers na GPU
    const floorData = createFloorGeometry();
    const floorBuffer = device.createBuffer({
        size: floorData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(floorBuffer.getMappedRange()).set(floorData);
    floorBuffer.unmap();

    // Textura, Depth Texture e Render Loop principal...
    function frame() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        // Passos de render pass e submissão à fila da GPU...
        
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

init();