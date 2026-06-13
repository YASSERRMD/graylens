import type { Filter } from "./types";

export const grayscaleComputeFilter: Filter = {
  id: "grayscale-compute",
  displayName: "Grayscale (Compute)",
  kind: "compute",
  wgslSource: `@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> amount: f32;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let dimensions = textureDimensions(inputTexture);
  if (globalId.x >= dimensions.x || globalId.y >= dimensions.y) {
    return;
  }

  let coords = vec2<i32>(globalId.xy);
  let color = textureLoad(inputTexture, coords, 0);
  let luma = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  let gray = vec3<f32>(luma, luma, luma);
  let result = mix(color.rgb, gray, amount);
  textureStore(outputTexture, coords, vec4<f32>(result, color.a));
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
