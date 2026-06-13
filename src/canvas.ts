export interface GPUCanvas {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export function setupCanvas(device: GPUDevice): GPUCanvas | null {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;

  if (!context) {
    console.error("Failed to get WebGPU context");
    return null;
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  });

  return { canvas, context, format };
}
