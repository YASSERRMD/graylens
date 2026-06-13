import { initGPU } from "./gpu/device";

const app = document.getElementById("app");

async function main() {
  if (!app) return;

  const gpuContext = await initGPU();

  if (gpuContext) {
    app.textContent = "WebGPU ready";
  } else {
    app.textContent = "WebGPU is not available in your browser";
  }
}

main();
