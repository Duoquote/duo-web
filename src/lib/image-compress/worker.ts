import * as Comlink from "comlink";
import type { EncodeOptions, EncodePayload } from "./types";

async function encode(
  opts: EncodeOptions,
  src: EncodePayload,
): Promise<Uint8Array> {
  const imageData = new ImageData(src.data, src.width, src.height);

  switch (opts.format) {
    case "mozjpeg": {
      const { default: enc } = await import("@jsquash/jpeg/encode");
      const buf = await enc(imageData, { quality: opts.quality });
      return new Uint8Array(buf);
    }
    case "webp": {
      const { default: enc } = await import("@jsquash/webp/encode");
      const buf = await enc(imageData, { quality: opts.quality });
      return new Uint8Array(buf);
    }
    case "webp-lossless": {
      const { default: enc } = await import("@jsquash/webp/encode");
      const buf = await enc(imageData, {
        lossless: 1,
        quality: 100,
        method: opts.effort,
        exact: 1,
      });
      return new Uint8Array(buf);
    }
    case "avif": {
      const { default: enc } = await import("@jsquash/avif/encode");
      const buf = await enc(imageData, {
        quality: opts.quality,
        speed: opts.speed,
      });
      return new Uint8Array(buf);
    }
    case "jxl": {
      const { default: enc } = await import("@jsquash/jxl/encode");
      const buf = await enc(imageData, {
        quality: opts.quality,
        effort: opts.effort,
      });
      return new Uint8Array(buf);
    }
    case "png-oxi": {
      const { default: pngEnc } = await import("@jsquash/png/encode");
      const { default: optimise } = await import("@jsquash/oxipng/optimise");
      const pngBuf = await pngEnc(imageData);
      const out = await optimise(new Uint8Array(pngBuf), { level: opts.level });
      return new Uint8Array(out);
    }
  }
}

const api = { encode };
export type WorkerApi = typeof api;

Comlink.expose(api);
