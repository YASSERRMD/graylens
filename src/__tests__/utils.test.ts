import { describe, it, expect } from "vitest";
import { calculateLuminance, clamp, isValidFileType } from "../utils";

describe("calculateLuminance", () => {
  it("should calculate luminance for black", () => {
    expect(calculateLuminance(0, 0, 0)).toBe(0);
  });

  it("should calculate luminance for white", () => {
    expect(calculateLuminance(1, 1, 1)).toBeCloseTo(1);
  });

  it("should calculate luminance for pure red", () => {
    expect(calculateLuminance(1, 0, 0)).toBeCloseTo(0.2126);
  });

  it("should calculate luminance for pure green", () => {
    expect(calculateLuminance(0, 1, 0)).toBeCloseTo(0.7152);
  });

  it("should calculate luminance for pure blue", () => {
    expect(calculateLuminance(0, 0, 1)).toBeCloseTo(0.0722);
  });
});

describe("clamp", () => {
  it("should clamp value below min", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it("should clamp value above max", () => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("should keep value within range", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("should clamp at min boundary", () => {
    expect(clamp(0, 0, 1)).toBe(0);
  });

  it("should clamp at max boundary", () => {
    expect(clamp(1, 0, 1)).toBe(1);
  });
});

describe("isValidFileType", () => {
  it("should accept PNG files", () => {
    const file = new File([""], "test.png", { type: "image/png" });
    expect(isValidFileType(file)).toBe(true);
  });

  it("should accept JPEG files", () => {
    const file = new File([""], "test.jpg", { type: "image/jpeg" });
    expect(isValidFileType(file)).toBe(true);
  });

  it("should reject GIF files", () => {
    const file = new File([""], "test.gif", { type: "image/gif" });
    expect(isValidFileType(file)).toBe(false);
  });

  it("should reject text files", () => {
    const file = new File([""], "test.txt", { type: "text/plain" });
    expect(isValidFileType(file)).toBe(false);
  });
});
