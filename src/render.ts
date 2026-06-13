import type { Filter } from "./filters/types";

export interface RenderPipeline {
  pipeline: GPURenderPipeline;
  sampler: GPUSampler;
  bindGroupLayout: GPUBindGroupLayout;
}

export function createRenderPipelineFromFilter(
  device: GPUDevice,
  format: GPUTextureFormat,
  filter: Filter
): RenderPipeline {
  const shaderModule = device.createShaderModule({
    code: filter.wgslSource,
  });

  const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [
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
  ];

  filter.uniformParams.forEach((param, index) => {
    bindGroupLayoutEntries.push({
      binding: 2 + index,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    });
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: bindGroupLayoutEntries,
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

export type ShaderType = "passthrough" | "grayscale";
