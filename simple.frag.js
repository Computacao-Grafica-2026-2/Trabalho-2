export default /* wgsl */ `
struct Light {
    position : vec3f,
    color : vec3f,
};

struct Material {
    ambientColor : vec3f,
    diffuseColor : vec3f,
    specularColor : vec3f,
    shininess : f32,
    useTexture : f32,
};

struct SceneData {
    light1 : Light,
    light2 : Light,
    viewPos : vec3f,
    material : Material,
};

@group(0) @binding(1) var<uniform> scene : SceneData;
@group(0) @binding(2) var textureSampler : sampler;
@group(0) @binding(3) var colorTexture : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) fragPosition : vec3f,
    @location(1) fragNormal : vec3f,
    @location(2) fragUV : vec2f,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4f {
    let N = normalize(input.fragNormal);
    let V = normalize(scene.viewPos - input.fragPosition);
    
    var baseColor = scene.material.diffuseColor;
    if (scene.material.useTexture > 0.5) {
        baseColor = textureSample(colorTexture, textureSampler, input.fragUV).rgb;
    }

    var resultColor = scene.material.ambientColor * baseColor;

    // Luz 1
    let L1 = normalize(scene.light1.position - input.fragPosition);
    let diff1 = max(dot(N, L1), 0.0);
    let R1 = reflect(-L1, N);
    let spec1 = pow(max(dot(R1, V), 0.0), scene.material.shininess);
    resultColor += scene.light1.color * (diff1 * baseColor + spec1 * scene.material.specularColor);

    // Luz 2
    let L2 = normalize(scene.light2.position - input.fragPosition);
    let diff2 = max(dot(N, L2), 0.0);
    let R2 = reflect(-L2, N);
    let spec2 = pow(max(dot(R2, V), 0.0), scene.material.shininess);
    resultColor += scene.light2.color * (diff2 * baseColor + spec2 * scene.material.specularColor);

    return vec4f(resultColor, 1.0);
}
`;