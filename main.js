import vertShaderSrc from './illumination.vert.js';
import fragShaderSrc from './illumination.frag.js';
import WebGPU from './lib/webgpu.js';
import {
    createIdentityMat4,
    createLookAtMat4,
    createNormalMat4,
    createPerspectiveMat4,
    multiplyMat4,
} from './lib/utils.js';
import { loadPLY } from './ply.js';
import HalfEdgeMesh from './half-edge.js';
import { createTable } from './marching-cubes.js';
import { createBunnyModel, createFloor } from './geometry.js';

class Mesh {
    constructor(gpu, program, geometry, model, material) {
        this.program = program;
        this.model = model;
        this.shape = gpu.createShape({
            buffers: [
                geometry.vertices.flat(),
                geometry.normals.flat(),
                geometry.texcoords ? geometry.texcoords.flat() : new Float32Array(geometry.vertices.length * 2),
            ],
            vertexCount: geometry.vertices.length,
            indices: geometry.indices,
        });
        this.uniform = gpu.createUniform(program, new Float32Array(96));
        this.uniform.data.set(model, 0);
        this.uniform.data.set([1, 1, 1, material.ka], 80);
        this.uniform.data.set([...material.color, material.kd], 84);
        this.uniform.data.set([1, 1, 1, material.ks], 88);
        this.uniform.data.set([material.shininess, material.textured ? 1 : 0, 0, 0], 92);
    }

    updateUniform(view, projection, lights) {
        this.uniform.data.set(view, 16);
        this.uniform.data.set(projection, 32);
        this.uniform.data.set(createNormalMat4(multiplyMat4(view, this.model)), 48);
        for (let i = 0; i < lights.length; i++) {
            this.uniform.data.set(lights[i].position, 64 + 4 * i);
            this.uniform.data.set(lights[i].color, 72 + 4 * i);
        }
    }

    draw(gpu, view, projection, lights, textureBindGroup) {
        this.updateUniform(view, projection, lights);
        gpu.writeBuffer(this.uniform.buffer, this.uniform.data);
        gpu.draw(this.program, this.shape, [this.uniform.bindGroup, textureBindGroup]);
    }
}

class Scene {
    constructor(gpu, bunny, texture) {
        this.distance = 7.5;
        this.azimuth = -0.55;
        this.elevation = 0.3;

        this.lights = [
            { position: [-3, 5, 4, 1], color: [1, 0.96, 0.9, 0.85] },
            { position: [4, 3, -3, 1], color: [0.8, 0.9, 1, 0.55] },
        ];

        this.program = gpu.createProgram(vertShaderSrc, fragShaderSrc, {
            cullMode: 'back',
            buffers: [
                {
                    arrayStride: 4 * 4,
                    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }],
                },
                {
                    arrayStride: 4 * 4,
                    attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }],
                },
                {
                    arrayStride: 2 * 4,
                    attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
                },
            ],
        });

        const sampler = gpu.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
        });
        this.textureBindGroup = gpu.createBindGroup(this.program, [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView() },
        ], 1);

        const halfEdge = new HalfEdgeMesh(bunny.vertices, bunny.indices);
        bunny.normals = halfEdge.calculateNormals();

        this.meshes = [
            new Mesh(gpu, this.program, createFloor(), createIdentityMat4(), {
                color: [1, 1, 1], ka: 0.25, kd: 0.7, ks: 0.04, shininess: 16, textured: true,
            }),
            new Mesh(gpu, this.program, createTable(), createIdentityMat4(), {
                color: [0.08, 0.28, 0.75], ka: 0.25, kd: 0.7, ks: 0.12, shininess: 40,
            }),
            new Mesh(gpu, this.program, bunny, createBunnyModel(bunny.vertices), {
                color: [0.9, 0.87, 0.8], ka: 0.25, kd: 0.7, ks: 0.1, shininess: 32,
            }),
        ];
    }

    createViewMatrix() {
        const at = [0, 1.4, 0];
        const eye = [
            this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth),
            at[1] + this.distance * Math.sin(this.elevation),
            this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth),
        ];
        const up = [0, 1, 0];

        return createLookAtMat4(eye, at, up, true);
    }

    createProjectionMatrix() {
        const aspect = 1024 / 768;
        return createPerspectiveMat4(Math.PI / 4, aspect, 0.1, 60);
    }

    draw(gpu) {
        const view = this.createViewMatrix();
        const projection = this.createProjectionMatrix();

        for (const mesh of this.meshes) {
            mesh.draw(gpu, view, projection, this.lights, this.textureBindGroup);
        }
    }
}

class Main {
    async init() {
        this.gpu = await WebGPU.createCanvas('#glcanvas', 1024, 768, {
            clearColor: { r: 0.17, g: 0.2, b: 0.25, a: 1 },
        });
        const bunny = await loadPLY('./assets/bun_zipper.ply');
        const texture = await this.gpu.createTextureFromImage('./assets/Tiles074_1K-JPG_Color.jpg');
        this.scene = new Scene(this.gpu, bunny, texture);
        this.addEvents();
    }

    addEvents() {
        const canvas = this.gpu.canvas;
        let dragging = false;

        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.scene.distance = Math.max(4.5, Math.min(14, this.scene.distance + event.deltaY * 0.005));
        });

        canvas.addEventListener('mousedown', () => { dragging = true; });
        window.addEventListener('mouseup', () => { dragging = false; });
        canvas.addEventListener('mousemove', (event) => {
            if (!dragging) return;
            this.scene.azimuth -= event.movementX * 0.006;
            this.scene.elevation = Math.max(0.08, Math.min(1.3, this.scene.elevation + event.movementY * 0.006));
        });
    }

    draw() {
        this.gpu.start();
        this.scene.draw(this.gpu);
        this.gpu.finish();
        requestAnimationFrame(this.draw.bind(this));
    }
}

try {
    const app = new Main();
    await app.init();
    app.draw();
} catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML('beforeend', `<p>${error.message}</p>`);
}
