export interface IntensityUniform {
  buffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

export function createIntensityUniform(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  initialAmount: number = 1.0
): IntensityUniform {
  const buffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(buffer, 0, new Float32Array([initialAmount]));

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 2, resource: { buffer } },
    ],
  });

  return { buffer, bindGroup };
}

export function updateIntensity(
  device: GPUDevice,
  uniform: IntensityUniform,
  amount: number,
  bindGroupLayout: GPUBindGroupLayout
): IntensityUniform {
  device.queue.writeBuffer(uniform.buffer, 0, new Float32Array([amount]));

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 2, resource: { buffer: uniform.buffer } },
    ],
  });

  return { buffer: uniform.buffer, bindGroup };
}
