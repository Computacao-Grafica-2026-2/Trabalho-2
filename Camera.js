export class Camera {
    constructor(canvas) {
        this.distance = 4.0;
        this.target = [0.0, 0.8, 0.0]; // Focado na região central entre mesa e bunny
        
        canvas.addEventListener('wheel', (e) => {
            this.distance += e.deltaY * 0.005;
            this.distance = Math.max(1.5, Math.min(10.0, this.distance));
            e.preventDefault();
        }, { passive: false });
    }

    getViewMatrix() {
        const x = 0.0;
        const y = this.target[1] + this.distance * 0.5;
        const z = this.target[2] + this.distance;
        
        // Retorna matriz LookAt 4x4 em Float32Array (column-major)
        return mat4LookAt([x, y, z], this.target, [0, 1, 0]);
    }

    getProjectionMatrix(aspect) {
        return mat4Perspective(Math.PI / 4, aspect, 0.1, 100.0);
    }
}