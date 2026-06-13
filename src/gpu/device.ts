export interface GPUContext {
  adapter: GPUAdapter;
  device: GPUDevice;
}

export async function initGPU(): Promise<GPUContext | null> {
  if (!navigator.gpu) {
    return null;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return null;
    }

    const device = await adapter.requestDevice();
    return { adapter, device };
  } catch (error) {
    console.error("Failed to initialize WebGPU:", error);
    return null;
  }
}
