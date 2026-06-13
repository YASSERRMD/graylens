import type { FilterInstance } from "./filters/types";

export interface UniformBinding {
  buffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

export function createUniformBindings(
  device: GPUDevice,
  filterInstance: FilterInstance,
  bindGroupLayout: GPUBindGroupLayout
): UniformBinding[] {
  const bindings: UniformBinding[] = [];

  filterInstance.filter.uniformParams.forEach((param, index) => {
    const buffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(
      buffer,
      0,
      new Float32Array([filterInstance.uniformValues[param.name]])
    );

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 2 + index, resource: { buffer } }],
    });

    bindings.push({ buffer, bindGroup });
  });

  return bindings;
}

export function updateUniformBinding(
  device: GPUDevice,
  binding: UniformBinding,
  value: number
): void {
  device.queue.writeBuffer(binding.buffer, 0, new Float32Array([value]));
}
