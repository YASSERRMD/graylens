import type { Filter } from "./types";

export const boxBlurFilter: Filter = {
  id: "box-blur",
  displayName: "Box Blur",
  kind: "fragment",
  wgslSource: `@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> radius: f32;
@group(0) @binding(3) var<uniform> resolution: vec2<f32>;

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
  let texelSize = vec2<f32>(1.0) / resolution;
  let r = i32(ceil(radius));
  var color = vec4<f32>(0.0);
  var total = 0.0;

  for (var x = -r; x <= r; x = x + 1) {
    for (var y = -r; y <= r; y = y + 1) {
      let offset = vec2<f32>(f32(x), f32(y)) * texelSize;
      color = color + textureSample(myTexture, mySampler, input.texCoord + offset);
      total = total + 1.0;
    }
  }

  return color / vec4<f32>(total, total, total, total);
}`,
  uniformParams: [
    {
      name: "radius",
      type: "f32",
      default: 2.0,
      min: 0.0,
      max: 8.0,
    },
  ],
  needsResolution: true,
};
