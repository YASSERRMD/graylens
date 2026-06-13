# graylens

A WebGPU-powered image processing tool that applies grayscale effects with adjustable intensity.

## Features

- Load images via file input or drag-and-drop
- Real-time grayscale conversion using GPU shaders
- Adjustable intensity slider for smooth color-to-grayscale blending
- Export processed images as PNG
- Responsive design with clean, minimalistic UI

## Getting Started

### Prerequisites

- Node.js 20 or higher
- A WebGPU-compatible browser (Chrome 113+, Edge 113+, or Firefox Nightly with WebGPU enabled)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Tests

```bash
npm test
```

## Architecture

### Device Initialization

The application initializes WebGPU through `src/gpu/device.ts`, which requests a GPU adapter and device. If WebGPU is unavailable, a fallback message is displayed.

### Render Pipeline

The render pipeline is managed in `src/render.ts`, supporting two shader modes:

- **Passthrough**: Renders the original image without modifications
- **Grayscale**: Applies Rec. 709 luminance weights (0.2126 R, 0.7152 G, 0.0722 B) for accurate grayscale conversion

### Shaders

WGSL shaders are stored in separate `.wgsl` files:

- `src/shaders/passthrough.wgsl`: Vertex and fragment shaders for passthrough rendering
- `src/shaders/grayscale.wgsl`: Fragment shader with luminance calculation and intensity mixing

### Uniforms

The grayscale shader uses a uniform buffer to control the intensity of the effect, allowing real-time adjustment via the slider.

### Image Loading

Images are decoded to `ImageBitmap` and loaded to GPU textures through `src/image.ts` and `src/canvas.ts`.

### Export

The processed image is exported as PNG using `src/export.ts`, which converts the canvas content to a downloadable blob.

## Browser Requirements

WebGPU is required for this application. Supported browsers:

- Google Chrome 113+
- Microsoft Edge 113+
- Firefox Nightly (with `dom.webgpu.enabled` enabled in about:config)

## License

MIT
