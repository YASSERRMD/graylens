import type { Filter } from "./types";

export const sobelFilter: Filter = {
  id: "sobel",
  displayName: "Sobel Edge Detection",
  kind: "fragment",
  wgslSource: `@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> strength: f32;
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

fn luminance(color: vec3<f32>) -> f32 {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let texelSize = vec2<f32>(1.0) / resolution;

  let tl = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(-texelSize.x, -texelSize.y)).rgb);
  let t  = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(0.0, -texelSize.y)).rgb);
  let tr = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(texelSize.x, -texelSize.y)).rgb);
  let l  = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(-texelSize.x, 0.0)).rgb);
  let r  = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(texelSize.x, 0.0)).rgb);
  let bl = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(-texelSize.x, texelSize.y)).rgb);
  let b  = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(0.0, texelSize.y)).rgb);
  let br = luminance(textureSample(myTexture, mySampler, input.texCoord + vec2<f32>(texelSize.x, texelSize.y)).rgb);

  let gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  let gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;

  let edge = sqrt(gx * gx + gy * gy) * strength;
  let clamped = clamp(edge, 0.0, 1.0);

  return vec4<f32>(clamped, clamped, clamped, 1.0);
}`,
  uniformParams: [
    {
      name: "strength",
      type: "f32",
      default: 1.0,
      min: 0.0,
      max: 2.0,
    },
  ],
  needsResolution: true,
};
