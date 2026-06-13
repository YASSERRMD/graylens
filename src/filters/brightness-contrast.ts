import type { Filter } from "./types";

export const brightnessContrastFilter: Filter = {
  id: "brightness-contrast",
  displayName: "Brightness/Contrast",
  kind: "fragment",
  wgslSource: `@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> brightness: f32;
@group(0) @binding(3) var<uniform> contrast: f32;

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
  var result = color.rgb + vec3<f32>(brightness);
  result = (result - vec3<f32>(0.5)) * (contrast + vec3<f32>(1.0)) + vec3<f32>(0.5);
  return vec4<f32>(result, color.a);
}`,
  uniformParams: [
    {
      name: "brightness",
      type: "f32",
      default: 0.0,
      min: -1.0,
      max: 1.0,
    },
    {
      name: "contrast",
      type: "f32",
      default: 0.0,
      min: -1.0,
      max: 1.0,
    },
  ],
};
