import type { FilterInstance } from "./filters/types";
import { createRenderPipelineFromFilter, type RenderPipeline } from "./render";

export interface PassChain {
  execute: (
    device: GPUDevice,
    sourceTexture: GPUTexture,
    canvasContext: GPUCanvasContext,
    format: GPUTextureFormat
  ) => void;
  destroy: () => void;
}

interface CachedRenderPipeline {
  kind: "fragment";
  renderPipeline: RenderPipeline;
  uniformBuffers: GPUBuffer[];
}

interface CachedComputePipeline {
  kind: "compute";
  computePipeline: GPUComputePipeline;
  uniformBuffers: GPUBuffer[];
}

type CachedPipeline = CachedRenderPipeline | CachedComputePipeline;

export function createPassChain(
  filterInstances: FilterInstance[]
): PassChain {
  const pipelineCache = new Map<string, CachedPipeline>();
  let pingPongTextures: GPUTexture[] = [];

  function getCachedPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
    instance: FilterInstance,
    width: number,
    height: number
  ): CachedPipeline {
    const cacheKey = instance.filter.id;
    const cached = pipelineCache.get(cacheKey);
    if (cached) return cached;

    if (instance.filter.kind === "compute") {
      const shaderModule = device.createShaderModule({
        code: instance.filter.wgslSource,
      });

      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: { sampleType: "float" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: { access: "write-only", format },
          },
          ...instance.filter.uniformParams.map((_param, index) => ({
            binding: 2 + index,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" as const },
          })),
        ],
      });

      const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
          module: shaderModule,
          entryPoint: "main",
        },
      });

      const uniformBuffers = instance.filter.uniformParams.map((param) => {
        const buffer = device.createBuffer({
          size: 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(
          buffer,
          0,
          new Float32Array([instance.uniformValues[param.name]])
        );
        return buffer;
      });

      const entry: CachedComputePipeline = {
        kind: "compute",
        computePipeline,
        uniformBuffers,
      };
      pipelineCache.set(cacheKey, entry);
      return entry;
    }

    const renderPipeline = createRenderPipelineFromFilter(
      device,
      format,
      instance.filter
    );

    const uniformBuffers = instance.filter.uniformParams.map((param) => {
      const buffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(
        buffer,
        0,
        new Float32Array([instance.uniformValues[param.name]])
      );
      return buffer;
    });

    if (instance.filter.needsResolution) {
      const buffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(buffer, 0, new Float32Array([width, height]));
      uniformBuffers.push(buffer);
    }

    const entry: CachedRenderPipeline = {
      kind: "fragment",
      renderPipeline,
      uniformBuffers,
    };
    pipelineCache.set(cacheKey, entry);
    return entry;
  }

  function createPingPongTextures(
    device: GPUDevice,
    width: number,
    height: number,
    format: GPUTextureFormat
  ): GPUTexture[] {
    destroyPingPongTextures();
    const textureA = device.createTexture({
      size: [width, height],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.STORAGE_BINDING,
    });
    const textureB = device.createTexture({
      size: [width, height],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.STORAGE_BINDING,
    });
    pingPongTextures = [textureA, textureB];
    return pingPongTextures;
  }

  function destroyPingPongTextures(): void {
    for (const tex of pingPongTextures) {
      tex.destroy();
    }
    pingPongTextures = [];
  }

  function execute(
    device: GPUDevice,
    sourceTexture: GPUTexture,
    canvasContext: GPUCanvasContext,
    format: GPUTextureFormat
  ): void {
    if (filterInstances.length === 0) {
      const commandEncoder = device.createCommandEncoder();
      commandEncoder.copyTextureToTexture(
        { texture: sourceTexture },
        { texture: canvasContext.getCurrentTexture() },
        [sourceTexture.width, sourceTexture.height]
      );
      device.queue.submit([commandEncoder.finish()]);
      return;
    }

    const width = sourceTexture.width;
    const height = sourceTexture.height;
    const ppTextures = createPingPongTextures(device, width, height, format);

    let inputTexture = sourceTexture;

    for (let i = 0; i < filterInstances.length; i++) {
      const instance = filterInstances[i];
      const cached = getCachedPipeline(device, format, instance, width, height);
      const outputTexture = ppTextures[i % 2];

      const commandEncoder = device.createCommandEncoder();

      if (cached.kind === "compute") {
        const bindGroupLayout = cached.computePipeline.getBindGroupLayout(0);
        const bindGroupEntries: GPUBindGroupEntry[] = [
          { binding: 0, resource: inputTexture.createView() },
          { binding: 1, resource: outputTexture.createView() },
        ];

        cached.uniformBuffers.forEach((buffer, index) => {
          bindGroupEntries.push({
            binding: 2 + index,
            resource: { buffer },
          } as GPUBindGroupEntry);
        });

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: bindGroupEntries,
        });

        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(cached.computePipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(
          Math.ceil(width / 8),
          Math.ceil(height / 8)
        );
        computePass.end();
      } else {
        const bindGroupEntries: GPUBindGroupEntry[] = [
          { binding: 0, resource: cached.renderPipeline.sampler },
          { binding: 1, resource: inputTexture.createView() },
        ];

        cached.uniformBuffers.forEach((buffer, index) => {
          bindGroupEntries.push({
            binding: 2 + index,
            resource: { buffer },
          } as GPUBindGroupEntry);
        });

        const bindGroup = device.createBindGroup({
          layout: cached.renderPipeline.bindGroupLayout,
          entries: bindGroupEntries,
        });

        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: outputTexture.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });

        renderPass.setPipeline(cached.renderPipeline.pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3);
        renderPass.end();
      }

      device.queue.submit([commandEncoder.finish()]);

      if (i === filterInstances.length - 1) {
        const copyEncoder = device.createCommandEncoder();
        copyEncoder.copyTextureToTexture(
          { texture: outputTexture },
          { texture: canvasContext.getCurrentTexture() },
          [width, height]
        );
        device.queue.submit([copyEncoder.finish()]);
      }

      inputTexture = outputTexture;
    }
  }

  function destroy(): void {
    destroyPingPongTextures();
    for (const cached of pipelineCache.values()) {
      for (const buffer of cached.uniformBuffers) {
        buffer.destroy();
      }
    }
    pipelineCache.clear();
  }

  return { execute, destroy };
}
