export async function loadImage(file: File): Promise<ImageBitmap | null> {
  if (!file.type.match(/^image\/(png|jpeg)$/)) {
    console.error("Unsupported file type:", file.type);
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    return bitmap;
  } catch (error) {
    console.error("Failed to load image:", error);
    return null;
  }
}
