import passthroughShader from "./shaders/passthrough.wgsl?raw";
import grayscaleShader from "./shaders/grayscale.wgsl?raw";

export interface RenderPipeline {
  pipeline: GPURenderPipeline;
  sampler: GPUSampler;
  bindGroupLayout: GPUBindGroupLayout;
}

export type ShaderType = "passthrough" | "grayscale";

export function createRenderPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderType: ShaderType = "passthrough"
): RenderPipeline {
  const shaderCode = shaderType === "grayscale" ? grayscaleShader : passthroughShader;

  const shaderModule = device.createShaderModule({
    code: shaderCode,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
      ...(shaderType === "grayscale"
        ? [
            {
              binding: 2,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: { type: "uniform" as const },
            },
          ]
        : []),
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format }],
    },
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  return { pipeline, sampler, bindGroupLayout };
}
