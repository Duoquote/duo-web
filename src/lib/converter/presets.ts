export type QualityPreset = "quality" | "balanced" | "small";

interface PresetValues {
  crf: number;
  videoBitrate: string;
  audioBitrate: string;
}

const PRESET_MAP: Record<string, Record<QualityPreset, PresetValues>> = {
  libx264: {
    quality: { crf: 18, videoBitrate: "5M", audioBitrate: "192k" },
    balanced: { crf: 23, videoBitrate: "2M", audioBitrate: "128k" },
    small: { crf: 28, videoBitrate: "1M", audioBitrate: "96k" },
  },
  libx265: {
    quality: { crf: 20, videoBitrate: "4M", audioBitrate: "192k" },
    balanced: { crf: 26, videoBitrate: "1.5M", audioBitrate: "128k" },
    small: { crf: 32, videoBitrate: "800k", audioBitrate: "96k" },
  },
  libvpx: {
    quality: { crf: 8, videoBitrate: "5M", audioBitrate: "192k" },
    balanced: { crf: 15, videoBitrate: "2M", audioBitrate: "128k" },
    small: { crf: 25, videoBitrate: "1M", audioBitrate: "96k" },
  },
  "libvpx-vp9": {
    quality: { crf: 18, videoBitrate: "4M", audioBitrate: "192k" },
    balanced: { crf: 28, videoBitrate: "1.5M", audioBitrate: "128k" },
    small: { crf: 38, videoBitrate: "800k", audioBitrate: "96k" },
  },
  libmp3lame: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "320k" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "192k" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "128k" },
  },
  aac: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "256k" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "128k" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "96k" },
  },
  libvorbis: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "256k" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "128k" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "96k" },
  },
  pcm_s16le: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
  },
  flac: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
  },
  gif: {
    quality: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    balanced: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
    small: { crf: 0, videoBitrate: "0", audioBitrate: "0" },
  },
};

export function getPresetValues(
  ffmpegCodec: string,
  preset: QualityPreset,
): PresetValues {
  return PRESET_MAP[ffmpegCodec]?.[preset] ?? PRESET_MAP["libx264"][preset];
}
