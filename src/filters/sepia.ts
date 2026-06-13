import type { Filter } from "./types";

export const sepiaFilter: Filter = {
  id: "sepia",
  displayName: "Sepia",
  kind: "fragment",
  wgslSource: `@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> amount: f32;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) texCoord: vec2<f32>,
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSample(myTexture, mySampler, input.texCoord);
  let sepiaR = dot(color.rgb, vec3<f32>(0.393, 0.769, 0.189));
  let sepiaG = dot(color.rgb, vec3<f32>(0.349, 0.686, 0.168));
  let sepiaB = dot(color.rgb, vec3<f32>(0.272, 0.534, 0.131));
  let sepia = vec3<f32>(sepiaR, sepiaG, sepiaB);
  let result = mix(color.rgb, sepia, amount);
  return vec4<f32>(result, color.a);
}`,
  uniformParams: [
    {
      name: "amount",
      type: "f32",
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
  ],
};
