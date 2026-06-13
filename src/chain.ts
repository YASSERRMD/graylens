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

interface CachedPipeline {
  renderPipeline: RenderPipeline;
  uniformBuffers: GPUBuffer[];
}

export function createPassChain(
  filterInstances: FilterInstance[]
): PassChain {
  const pipelineCache = new Map<string, CachedPipeline>();
  let pingPongTextures: GPUTexture[] = [];

  function getCachedPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
    instance: FilterInstance
  ): CachedPipeline {
    const cacheKey = instance.filter.id;
    const cached = pipelineCache.get(cacheKey);
    if (cached) return cached;

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

    const entry: CachedPipeline = { renderPipeline, uniformBuffers };
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
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const textureB = device.createTexture({
      size: [width, height],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
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
      const canvasTextureView = canvasContext.getCurrentTexture().createView();
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
      const cached = getCachedPipeline(device, format, instance);
      const outputTexture = ppTextures[i % 2];

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

      const commandEncoder = device.createCommandEncoder();
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
