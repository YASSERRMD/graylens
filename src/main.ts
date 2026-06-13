import { initGPU } from "./gpu/device";
import { loadImage } from "./image";
import { setupCanvas } from "./canvas";
import { createPassChain, type PassChain } from "./chain";
import { canvasToPng, downloadBlob } from "./export";
import { getFilter, getAllFilters } from "./filters/registry";
import { createFilterInstance, type FilterInstance } from "./filters/types";
import {
  createPipelineState,
  addFilter,
  removeFilter,
  moveFilter,
  type PipelineState,
} from "./pipeline";
import { createWebcamSource, type WebcamSource } from "./webcam";
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

  const sourceToggle = document.createElement("div");
  sourceToggle.className = "source-toggle";
  app.appendChild(sourceToggle);

  const imageButton = document.createElement("button");
  imageButton.textContent = "Image";
  imageButton.className = "active";
  sourceToggle.appendChild(imageButton);

  const webcamButton = document.createElement("button");
  webcamButton.textContent = "Webcam";
  sourceToggle.appendChild(webcamButton);

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

  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download PNG";
  downloadButton.disabled = true;
  controlBar.appendChild(downloadButton);

  const pipelinePanel = document.createElement("div");
  pipelinePanel.className = "pipeline-panel";
  app.appendChild(pipelinePanel);

  const pipelineHeader = document.createElement("div");
  pipelineHeader.className = "pipeline-header";
  pipelinePanel.appendChild(pipelineHeader);

  const pipelineTitle = document.createElement("h3");
  pipelineTitle.textContent = "Filter Pipeline";
  pipelineHeader.appendChild(pipelineTitle);

  const addFilterSelect = document.createElement("select");
  const allFilters = getAllFilters();
  for (const filter of allFilters) {
    const option = document.createElement("option");
    option.value = filter.id;
    option.textContent = filter.displayName;
    addFilterSelect.appendChild(option);
  }
  pipelineHeader.appendChild(addFilterSelect);

  const addFilterButton = document.createElement("button");
  addFilterButton.textContent = "Add";
  pipelineHeader.appendChild(addFilterButton);

  const pipelineList = document.createElement("div");
  pipelineList.className = "pipeline-list";
  pipelinePanel.appendChild(pipelineList);

  const statusMessage = document.createElement("div");
  statusMessage.className = "status-message";
  statusMessage.style.display = "none";
  app.appendChild(statusMessage);

  const pipelineState = createPipelineState();
  let currentTexture: GPUTexture | null = null;
  let passChain: PassChain | null = null;
  let webcam: WebcamSource | null = null;
  let webcamLoopId: number | null = null;
  let isWebcamMode = false;

  function render() {
    if (!currentTexture || !passChain) return;
    passChain.execute(device, currentTexture, context, format);
  }

  function startWebcamLoop(): void {
    if (!webcam || !webcam.isActive()) return;

    function loop(): void {
      if (!webcam || !webcam.isActive()) return;

      const frame = webcam.getFrame();
      if (frame) {
        if (currentTexture) {
          currentTexture.destroy();
        }

        currentTexture = device.createTexture({
          size: [frame.width, frame.height],
          format,
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        device.queue.copyExternalImageToTexture(
          { source: frame },
          { texture: currentTexture },
          [frame.width, frame.height]
        );

        render();
      }

      webcamLoopId = requestAnimationFrame(loop);
    }

    webcamLoopId = requestAnimationFrame(loop);
  }

  function stopWebcamLoop(): void {
    if (webcamLoopId !== null) {
      cancelAnimationFrame(webcamLoopId);
      webcamLoopId = null;
    }
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

  function updateChain() {
    if (passChain) {
      passChain.destroy();
    }
    passChain = createPassChain(pipelineState.instances);
  }

  function renderPipelineList() {
    pipelineList.innerHTML = "";

    if (pipelineState.instances.length === 0) {
      const empty = document.createElement("div");
      empty.className = "pipeline-empty";
      empty.textContent = "No filters in pipeline. Add a filter above.";
      pipelineList.appendChild(empty);
      return;
    }

    pipelineState.instances.forEach((instance, index) => {
      const entry = document.createElement("div");
      entry.className = "pipeline-entry";

      const nameSpan = document.createElement("span");
      nameSpan.className = "pipeline-entry-name";
      nameSpan.textContent = instance.filter.displayName;
      entry.appendChild(nameSpan);

      const controls = document.createElement("div");
      controls.className = "pipeline-entry-controls";

      const upButton = document.createElement("button");
      upButton.textContent = "Up";
      upButton.disabled = index === 0;
      upButton.addEventListener("click", () => {
        moveFilter(pipelineState, index, index - 1);
        renderPipelineList();
        updateChain();
        render();
      });
      controls.appendChild(upButton);

      const downButton = document.createElement("button");
      downButton.textContent = "Down";
      downButton.disabled = index === pipelineState.instances.length - 1;
      downButton.addEventListener("click", () => {
        moveFilter(pipelineState, index, index + 1);
        renderPipelineList();
        updateChain();
        render();
      });
      controls.appendChild(downButton);

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        removeFilter(pipelineState, index);
        renderPipelineList();
        updateChain();
        render();
      });
      controls.appendChild(removeButton);

      entry.appendChild(controls);

      if (instance.filter.uniformParams.length > 0) {
        const uniforms = document.createElement("div");
        uniforms.className = "pipeline-entry-uniforms";

        for (const param of instance.filter.uniformParams) {
          const uniformControl = document.createElement("div");
          uniformControl.className = "uniform-control";

          const label = document.createElement("label");
          label.textContent = param.name;
          uniformControl.appendChild(label);

          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = String(param.min);
          slider.max = String(param.max);
          slider.step = "0.01";
          slider.value = String(instance.uniformValues[param.name]);
          slider.addEventListener("input", (event) => {
            const value = parseFloat(
              (event.target as HTMLInputElement).value
            );
            instance.uniformValues[param.name] = value;
            updateChain();
            render();
          });
          uniformControl.appendChild(slider);

          const valueSpan = document.createElement("span");
          valueSpan.textContent = instance.uniformValues[param.name].toFixed(2);
          slider.addEventListener("input", () => {
            valueSpan.textContent = slider.value;
          });
          uniformControl.appendChild(valueSpan);

          uniforms.appendChild(uniformControl);
        }

        entry.appendChild(uniforms);
      }

      pipelineList.appendChild(entry);
    });
  }

  function showStatus(message: string): void {
    statusMessage.textContent = message;
    statusMessage.style.display = "block";
  }

  function hideStatus(): void {
    statusMessage.style.display = "none";
  }

  async function switchToWebcam(): Promise<void> {
    stopWebcamLoop();
    if (webcam) {
      webcam.stop();
      webcam = null;
    }

    webcam = createWebcamSource();
    try {
      await webcam.start();
      isWebcamMode = true;
      dropZone.style.display = "none";
      downloadButton.disabled = true;
      hideStatus();
      startWebcamLoop();
    } catch {
      showStatus("Failed to access webcam. Please grant permission.");
      webcam = null;
    }
  }

  function switchToImage(): void {
    stopWebcamLoop();
    if (webcam) {
      webcam.stop();
      webcam = null;
    }
    isWebcamMode = false;
    dropZone.style.display = "block";
    hideStatus();
  }

  imageButton.addEventListener("click", () => {
    if (!isWebcamMode) return;
    imageButton.classList.add("active");
    webcamButton.classList.remove("active");
    switchToImage();
  });

  webcamButton.addEventListener("click", () => {
    if (isWebcamMode) return;
    webcamButton.classList.add("active");
    imageButton.classList.remove("active");
    switchToWebcam();
  });

  addFilterButton.addEventListener("click", () => {
    const filterId = addFilterSelect.value;
    const filter = getFilter(filterId);
    if (filter) {
      addFilter(pipelineState, createFilterInstance(filter));
      renderPipelineList();
      updateChain();
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

  renderPipelineList();
  updateChain();
}

main();
