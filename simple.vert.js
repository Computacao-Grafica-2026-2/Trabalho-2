export default /* wgsl */ `
struct Uniforms {
    modelMatrix : mat4x4f,
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f,
    normalMatrix : mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexInput {
    @location(0) position : vec3f,
    @location(1) normal : vec3f,
    @location(2) uv : vec2f,
};

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) fragPosition : vec3f,
    @location(1) fragNormal : vec3f,
    @location(2) fragUV : vec2f,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    let worldPos = uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.fragPosition = worldPos.xyz;
    output.fragNormal = normalize((uniforms.normalMatrix * vec4f(input.normal, 0.0)).xyz);
    output.fragUV = input.uv;
    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * worldPos;
    return output;
}
`;