export interface GPUCanvas {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export function setupCanvas(): GPUCanvas | null {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgpu");

  if (!context) {
    console.error("Failed to get WebGPU context");
    return null;
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: undefined,
    format,
    alphaMode: "premultiplied",
  });

  return { canvas, context, format };
}
