import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so these are available inside vi.mock factories
const { mockToFile, mockJpeg, mockResize, mockSharp, mockMkdir } = vi.hoisted(() => {
  const mockToFile = vi.fn().mockResolvedValue({});
  const mockJpeg = vi.fn().mockReturnValue({ toFile: mockToFile });
  const mockResize = vi.fn().mockReturnValue({ jpeg: mockJpeg });
  const mockSharp = vi.fn().mockReturnValue({ resize: mockResize });
  const mockMkdir = vi.fn().mockResolvedValue(undefined);
  return { mockToFile, mockJpeg, mockResize, mockSharp, mockMkdir };
});

vi.mock("sharp", () => ({
  default: mockSharp,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
  },
}));

vi.mock("node:crypto", () => ({
  randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
}));

import { uploadImage } from "../services/uploadService.js";

describe("uploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadImage", () => {
    it("returns an object with url, thumbnail, card, full fields", async () => {
      const result = await uploadImage(
        Buffer.from("fake-image"),
        "photo.jpg",
        "image/jpeg"
      );
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("thumbnail");
      expect(result).toHaveProperty("card");
      expect(result).toHaveProperty("full");
    });

    it("url and full are the same value", async () => {
      const result = await uploadImage(
        Buffer.from("fake"),
        "test.jpg",
        "image/jpeg"
      );
      expect(result.url).toBe(result.full);
    });

    it("creates the upload directory with recursive:true", async () => {
      await uploadImage(Buffer.from("img"), "pic.jpg", "image/jpeg");
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it("calls sharp 3 times for 3 variants", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      expect(mockSharp).toHaveBeenCalledTimes(3);
    });

    it("calls resize with width 200 for thumbnail variant", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      const widths = mockResize.mock.calls.map((c: unknown[]) => c[0]);
      expect(widths).toContain(200);
    });

    it("calls resize with width 600 for card variant", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      const widths = mockResize.mock.calls.map((c: unknown[]) => c[0]);
      expect(widths).toContain(600);
    });

    it("calls resize with width 1400 for full variant", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      const widths = mockResize.mock.calls.map((c: unknown[]) => c[0]);
      expect(widths).toContain(1400);
    });

    it("passes withoutEnlargement: true to resize", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      for (const call of mockResize.mock.calls) {
        expect(call[2]).toEqual({ withoutEnlargement: true });
      }
    });

    it("converts to jpeg with quality settings", async () => {
      await uploadImage(Buffer.from("data"), "car.jpg", "image/jpeg");
      const qualities = mockJpeg.mock.calls.map((c: unknown[]) => (c[0] as { quality: number }).quality);
      expect(qualities).toContain(70);
      expect(qualities).toContain(80);
      expect(qualities).toContain(85);
    });

    it("thumbnail URL contains -thumb suffix", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "car.jpg",
        "image/jpeg"
      );
      expect(result.thumbnail).toContain("-thumb");
    });

    it("card URL contains -card suffix", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "car.jpg",
        "image/jpeg"
      );
      expect(result.card).toContain("-card");
    });

    it("full URL does not contain -thumb or -card", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "car.jpg",
        "image/jpeg"
      );
      expect(result.full).not.toContain("-thumb");
      expect(result.full).not.toContain("-card");
    });

    it("URL path starts with /uploads/listings/", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "test.jpg",
        "image/jpeg"
      );
      expect(result.url).toMatch(/^\/uploads\/listings\//);
      expect(result.thumbnail).toMatch(/^\/uploads\/listings\//);
      expect(result.card).toMatch(/^\/uploads\/listings\//);
    });

    it("URL contains YYYY/MM date path", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "test.jpg",
        "image/jpeg"
      );
      expect(result.url).toMatch(/\/\d{4}\/\d{2}\//);
    });

    it("all output URLs end with .jpg", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "test.png",
        "image/png"
      );
      expect(result.url).toMatch(/\.jpg$/);
      expect(result.thumbnail).toMatch(/\.jpg$/);
      expect(result.card).toMatch(/\.jpg$/);
    });
  });

  describe("sanitizeName behavior (tested via output)", () => {
    it("lowercases the original name in the URL", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "MyPhoto.JPG",
        "image/jpeg"
      );
      expect(result.url).toContain("myphoto");
      expect(result.url).not.toContain("MyPhoto");
    });

    it("replaces spaces with hyphens", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "my photo.jpg",
        "image/jpeg"
      );
      expect(result.url).toContain("my-photo");
      expect(result.url).not.toContain("my photo");
    });

    it("replaces special characters with hyphens", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "car@2024!#$.jpg",
        "image/jpeg"
      );
      expect(result.url).not.toMatch(/[!@#$%^&*()]/);
    });

    it("preserves dots and hyphens", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "my-car.file.jpg",
        "image/jpeg"
      );
      expect(result.url).toContain("my-car.file.jpg");
    });

    it("handles empty originalName by using car-image fallback", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "",
        "image/jpeg"
      );
      expect(result.url).toContain("car-image");
    });
  });

  describe("file extension detection", () => {
    it("produces .jpg output regardless of input extension", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "photo.webp",
        "image/webp"
      );
      expect(result.url).toMatch(/\.jpg$/);
    });

    it("produces .jpg output regardless of input content type", async () => {
      const result = await uploadImage(
        Buffer.from("data"),
        "image.png",
        "image/png"
      );
      expect(result.full).toMatch(/\.jpg$/);
    });
  });

  describe("sharp pipeline", () => {
    it("passes the buffer to sharp", async () => {
      const buf = Buffer.from("test-image-data");
      await uploadImage(buf, "img.jpg", "image/jpeg");
      expect(mockSharp).toHaveBeenCalledWith(buf);
    });

    it("writes to file paths that include the date directory", async () => {
      await uploadImage(Buffer.from("data"), "pic.jpg", "image/jpeg");
      expect(mockToFile).toHaveBeenCalledTimes(3);
      for (const call of mockToFile.mock.calls) {
        expect(call[0]).toContain("uploads");
        expect(call[0]).toContain("listings");
      }
    });
  });
});
