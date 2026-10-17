import {
    createScaleMat4,
    createTranslationMat4,
    multiplyMat4,
} from './lib/utils.js';

export function createBunnyModel(vertices) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const vertex of vertices) {
        for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], vertex[axis]);
            max[axis] = Math.max(max[axis], vertex[axis]);
        }
    }
    const scale = 1.5 / (max[1] - min[1]);
    const center = createTranslationMat4(-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2);
    return multiplyMat4(createTranslationMat4(0, 1.6, 0), multiplyMat4(createScaleMat4(scale, scale, scale), center));
}

export function createFloor() {
    return {
        vertices: [[-8, 0, -8, 1], [-8, 0, 8, 1], [8, 0, 8, 1], [8, 0, -8, 1]],
        normals: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
        texcoords: [[0, 0], [0, 8], [8, 8], [8, 0]],
        indices: [0, 1, 2, 0, 2, 3],
    };
}
