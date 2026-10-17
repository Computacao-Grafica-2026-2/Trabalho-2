export default /* wgsl */ `
struct Uniforms {
  model : mat4x4f,
  view : mat4x4f,
  projection : mat4x4f,
  normalMatrix : mat4x4f,
  lightPositions : array<vec4f, 2>,
  lightColors : array<vec4f, 2>,
  ambient : vec4f,
  diffuse : vec4f,
  specular : vec4f,
  materialParams : vec4f,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var floorSampler : sampler;
@group(1) @binding(1) var floorTexture : texture_2d<f32>;

@fragment
fn main(
  @location(0) viewPosition : vec3f,
  @location(1) viewNormal : vec3f,
  @location(2) texcoord : vec2f,
) -> @location(0) vec4f {
  let sampledColor = textureSample(floorTexture, floorSampler, texcoord).rgb;
  var materialColor = uniforms.diffuse.rgb;
  if (uniforms.materialParams.y > 0.5) {
    materialColor = sampledColor;
  }

  let normal = normalize(viewNormal);
  let cameraDir = normalize(-viewPosition);
  var color = uniforms.ambient.a * uniforms.ambient.rgb * materialColor;

  for (var i = 0u; i < 2u; i++) {
    let viewLight = (uniforms.view * uniforms.lightPositions[i]).xyz;
    let lightDir = normalize(viewLight - viewPosition);
    let diffuseFactor = max(dot(normal, lightDir), 0.0);
    var specularFactor = 0.0;
    if (diffuseFactor > 0.0) {
      let reflected = reflect(-lightDir, normal);
      specularFactor = pow(max(dot(reflected, cameraDir), 0.0), uniforms.materialParams.x);
    }
    let diffuse = uniforms.diffuse.a * diffuseFactor * materialColor;
    let specular = uniforms.specular.a * specularFactor * uniforms.specular.rgb;
    color += uniforms.lightColors[i].rgb * uniforms.lightColors[i].a * (diffuse + specular);
  }

  return vec4f(color, 1.0);
}
`;
