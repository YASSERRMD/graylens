import { initGPU } from "./gpu/device";
import { loadImage } from "./image";
import { setupCanvas } from "./canvas";
import { createRenderPipeline } from "./render";

const app = document.getElementById("app");

async function main() {
  if (!app) return;

  const gpuContext = await initGPU();

  if (!gpuContext) {
    app.textContent = "WebGPU is not available in your browser";
    return;
  }

  const { device } = gpuContext;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg";
  app.appendChild(fileInput);

  const canvasSetup = setupCanvas(device);
  if (!canvasSetup) {
    app.textContent = "Failed to create canvas";
    return;
  }

  const { canvas, context, format } = canvasSetup;
  app.appendChild(canvas);

  const renderPipeline = createRenderPipeline(device, format);

  fileInput.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const imageBitmap = await loadImage(file);
    if (!imageBitmap) return;

    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture },
      [imageBitmap.width, imageBitmap.height]
    );

    const bindGroup = device.createBindGroup({
      layout: renderPipeline.bindGroupLayout,
      entries: [
        { binding: 0, resource: renderPipeline.sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(renderPipeline.pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  });
}

main();
