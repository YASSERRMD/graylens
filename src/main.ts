import { initGPU } from "./gpu/device";
import { loadImage } from "./image";
import { setupCanvas } from "./canvas";
import { createRenderPipeline, type ShaderType } from "./render";
import { createIntensityUniform, updateIntensity } from "./intensity";
import { canvasToPng, downloadBlob } from "./export";

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

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Grayscale";
  app.appendChild(toggleButton);

  const intensitySlider = document.createElement("input");
  intensitySlider.type = "range";
  intensitySlider.min = "0";
  intensitySlider.max = "1";
  intensitySlider.step = "0.01";
  intensitySlider.value = "1";
  app.appendChild(intensitySlider);

  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download PNG";
  downloadButton.disabled = true;
  app.appendChild(downloadButton);

  let currentShaderType: ShaderType = "passthrough";
  let currentTexture: GPUTexture | null = null;
  let renderPipeline = createRenderPipeline(device, format, currentShaderType);
  let intensityUniform = createIntensityUniform(device, renderPipeline.bindGroupLayout);

  function render() {
    if (!currentTexture) return;

    const bindGroup = device.createBindGroup({
      layout: renderPipeline.bindGroupLayout,
      entries: [
        { binding: 0, resource: renderPipeline.sampler },
        { binding: 1, resource: currentTexture.createView() },
        ...(currentShaderType === "grayscale"
          ? [{ binding: 2, resource: { buffer: intensityUniform.buffer } }]
          : []),
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
  }

  toggleButton.addEventListener("click", () => {
    currentShaderType = currentShaderType === "passthrough" ? "grayscale" : "passthrough";
    renderPipeline = createRenderPipeline(device, format, currentShaderType);
    if (currentShaderType === "grayscale") {
      intensityUniform = createIntensityUniform(
        device,
        renderPipeline.bindGroupLayout,
        parseFloat(intensitySlider.value)
      );
    }
    render();
  });

  intensitySlider.addEventListener("input", (event) => {
    const amount = parseFloat((event.target as HTMLInputElement).value);
    if (currentShaderType === "grayscale") {
      intensityUniform = updateIntensity(
        device,
        intensityUniform,
        amount,
        renderPipeline.bindGroupLayout
      );
      render();
    }
  });

  fileInput.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const imageBitmap = await loadImage(file);
    if (!imageBitmap) return;

    currentTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: currentTexture },
      [imageBitmap.width, imageBitmap.height]
    );

    downloadButton.disabled = false;
    render();
  });

  downloadButton.addEventListener("click", () => {
    const blob = canvasToPng(canvas);
    if (blob) {
      downloadBlob(blob, "graylens-export.png");
    }
  });
}

main();
