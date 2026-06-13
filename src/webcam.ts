export interface WebcamSource {
  start: () => Promise<void>;
  stop: () => void;
  getFrame: () => ImageBitmap | null;
  isActive: () => boolean;
}

export function createWebcamSource(): WebcamSource {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let currentFrame: ImageBitmap | null = null;
  let animFrameId: number | null = null;

  async function start(): Promise<void> {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      await video.play();

      captureFrame();
    } catch (error) {
      console.error("Failed to access webcam:", error);
      throw error;
    }
  }

  function captureFrame(): void {
    if (!video || !stream) return;

    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      createImageBitmap(video).then((bitmap) => {
        if (currentFrame) {
          currentFrame.close();
        }
        currentFrame = bitmap;
      });
    }

    animFrameId = requestAnimationFrame(captureFrame);
  }

  function stop(): void {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      stream = null;
    }

    if (currentFrame) {
      currentFrame.close();
      currentFrame = null;
    }

    video = null;
  }

  function getFrame(): ImageBitmap | null {
    return currentFrame;
  }

  function isActive(): boolean {
    return stream !== null;
  }

  return { start, stop, getFrame, isActive };
}
