import { initGPU } from "./gpu/device";
import { loadImage } from "./image";
import { setupCanvas } from "./canvas";
import { createRenderPipelineFromFilter } from "./render";
import {
  createUniformBindings,
  updateUniformBinding,
  type UniformBinding,
} from "./uniforms";
import { canvasToPng, downloadBlob } from "./export";
import { getFilter } from "./filters/registry";
import { createFilterInstance, type FilterInstance } from "./filters/types";
import "./style.css";

const app = document.getElementById("app");

async function main() {
  if (!app) return;

  const gpuContext = await initGPU();

  if (!gpuContext) {
    app.textContent = "WebGPU is not available in your browser";
    return;
  }

  const { device } = gpuContext;

  const dropZone = document.createElement("div");
  dropZone.className = "drop-zone";
  dropZone.textContent = "Drop an image here or click to select";
  app.appendChild(dropZone);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg";
  fileInput.style.display = "none";
  dropZone.appendChild(fileInput);

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer?.files[0];
    if (!file) return;

    await handleFile(file);
  });

  const canvasSetup = setupCanvas(device);
  if (!canvasSetup) {
    app.textContent = "Failed to create canvas";
    return;
  }

  const { canvas, context, format } = canvasSetup;
  app.appendChild(canvas);

  const controlBar = document.createElement("div");
  controlBar.className = "control-bar";
  app.appendChild(controlBar);

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Grayscale";
  controlBar.appendChild(toggleButton);

  const intensitySlider = document.createElement("input");
  intensitySlider.type = "range";
  intensitySlider.min = "0";
  intensitySlider.max = "1";
  intensitySlider.step = "0.01";
  intensitySlider.value = "1";
  controlBar.appendChild(intensitySlider);

  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download PNG";
  downloadButton.disabled = true;
  controlBar.appendChild(downloadButton);

  const grayscaleFilter = getFilter("grayscale")!;
  let activeFilterInstance: FilterInstance | null = null;
  let currentTexture: GPUTexture | null = null;
  let renderPipeline = createRenderPipelineFromFilter(device, format, grayscaleFilter);
  let uniformBindings: UniformBinding[] = [];

  function render() {
    if (!currentTexture) return;

    const bindGroupEntries = [
      { binding: 0, resource: renderPipeline.sampler },
      { binding: 1, resource: currentTexture.createView() },
    ];

    uniformBindings.forEach((binding, index) => {
      bindGroupEntries.push({ binding: 2 + index, resource: { buffer: binding.buffer } });
    });

    const bindGroup = device.createBindGroup({
      layout: renderPipeline.bindGroupLayout,
      entries: bindGroupEntries,
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

  async function handleFile(file: File) {
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
  }

  toggleButton.addEventListener("click", () => {
    if (activeFilterInstance) {
      activeFilterInstance = null;
      uniformBindings = [];
    } else {
      activeFilterInstance = createFilterInstance(grayscaleFilter, {
        amount: parseFloat(intensitySlider.value),
      });
      uniformBindings = createUniformBindings(
        device,
        activeFilterInstance,
        renderPipeline.bindGroupLayout
      );
    }
    render();
  });

  intensitySlider.addEventListener("input", (event) => {
    const amount = parseFloat((event.target as HTMLInputElement).value);
    if (activeFilterInstance && activeFilterInstance.filter.id === "grayscale") {
      activeFilterInstance.uniformValues.amount = amount;
      if (uniformBindings.length > 0) {
        updateUniformBinding(device, uniformBindings[0], amount);
      }
      render();
    }
  });

  fileInput.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await handleFile(file);
  });

  downloadButton.addEventListener("click", () => {
    const blob = canvasToPng(canvas);
    if (blob) {
      downloadBlob(blob, "graylens-export.png");
    }
  });
}

main();
