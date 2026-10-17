export function createFloorGeometry() {
    // Plano formado por triângulos cobrindo a base com coordenadas de textura repetidas (UV)
    const size = 5.0;
    const repeat = 10.0;

    const vertices = [
        -size, 0.0, -size,  0.0, 1.0,  0.0,  0.0, 0.0,
         size, 0.0, -size,  0.0, 1.0,  0.0,  repeat, 0.0,
         size, 0.0,  size,  0.0, 1.0,  0.0,  repeat, repeat,
        -size, 0.0, -size,  0.0, 1.0,  0.0,  0.0, 0.0,
         size, 0.0,  size,  0.0, 1.0,  0.0,  repeat, repeat,
        -size, 0.0,  size,  0.0, 1.0,  0.0,  0.0, repeat,
    ];

    return new Float32Array(vertices);
}