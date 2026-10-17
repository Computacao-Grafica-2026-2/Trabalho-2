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

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) viewPosition : vec3f,
  @location(1) viewNormal : vec3f,
  @location(2) texcoord : vec2f,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@vertex
fn main(
  @location(0) position : vec4f,
  @location(1) normal : vec4f,
  @location(2) texcoord : vec2f,
) -> VertexOutput {
  let viewPosition = uniforms.view * uniforms.model * position;
  var output : VertexOutput;
  output.position = uniforms.projection * viewPosition;
  output.viewPosition = viewPosition.xyz;
  output.viewNormal = (uniforms.normalMatrix * normal).xyz;
  output.texcoord = texcoord;
  return output;
}
`;
