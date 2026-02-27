export type ContainerType = "video" | "audio" | "image";

export interface CodecOption {
  id: string;
  label: string;
  ffmpegCodec: string;
  type: "video" | "audio";
}

export interface OutputFormat {
  id: string;
  label: string;
  extension: string;
  type: ContainerType;
  codecs: CodecOption[];
  defaultCodecId: string;
}

export type RateControlMode = "crf" | "cbr" | "vbr";

export interface VideoAdvancedSettings {
  rateControl: RateControlMode;
  crf: number;
  videoBitrate: string;
  audioBitrate: string;
  scale: string;
  frameRate: string;
  audioCodec: string;
}

export interface AudioAdvancedSettings {
  audioBitrate: string;
  sampleRate: string;
  channels: string;
}

export const OUTPUT_FORMATS: OutputFormat[] = [
  {
    id: "mp4",
    label: "MP4",
    extension: "mp4",
    type: "video",
    defaultCodecId: "h264",
    codecs: [
      { id: "h264", label: "H.264", ffmpegCodec: "libx264", type: "video" },
      { id: "h265", label: "H.265", ffmpegCodec: "libx265", type: "video" },
    ],
  },
  {
    id: "webm",
    label: "WebM",
    extension: "webm",
    type: "video",
    defaultCodecId: "vp9",
    codecs: [
      { id: "vp8", label: "VP8", ffmpegCodec: "libvpx", type: "video" },
      { id: "vp9", label: "VP9", ffmpegCodec: "libvpx-vp9", type: "video" },
    ],
  },
  {
    id: "mkv",
    label: "MKV",
    extension: "mkv",
    type: "video",
    defaultCodecId: "h264",
    codecs: [
      { id: "h264", label: "H.264", ffmpegCodec: "libx264", type: "video" },
      { id: "h265", label: "H.265", ffmpegCodec: "libx265", type: "video" },
    ],
  },
  {
    id: "avi",
    label: "AVI",
    extension: "avi",
    type: "video",
    defaultCodecId: "h264",
    codecs: [
      { id: "h264", label: "H.264", ffmpegCodec: "libx264", type: "video" },
    ],
  },
  {
    id: "mov",
    label: "MOV",
    extension: "mov",
    type: "video",
    defaultCodecId: "h264",
    codecs: [
      { id: "h264", label: "H.264", ffmpegCodec: "libx264", type: "video" },
      { id: "h265", label: "H.265", ffmpegCodec: "libx265", type: "video" },
    ],
  },
  {
    id: "mp3",
    label: "MP3",
    extension: "mp3",
    type: "audio",
    defaultCodecId: "mp3",
    codecs: [
      { id: "mp3", label: "MP3", ffmpegCodec: "libmp3lame", type: "audio" },
    ],
  },
  {
    id: "aac",
    label: "AAC",
    extension: "aac",
    type: "audio",
    defaultCodecId: "aac",
    codecs: [
      { id: "aac", label: "AAC", ffmpegCodec: "aac", type: "audio" },
    ],
  },
  {
    id: "ogg",
    label: "OGG",
    extension: "ogg",
    type: "audio",
    defaultCodecId: "vorbis",
    codecs: [
      {
        id: "vorbis",
        label: "Vorbis",
        ffmpegCodec: "libvorbis",
        type: "audio",
      },
    ],
  },
  {
    id: "wav",
    label: "WAV",
    extension: "wav",
    type: "audio",
    defaultCodecId: "pcm",
    codecs: [
      { id: "pcm", label: "PCM", ffmpegCodec: "pcm_s16le", type: "audio" },
    ],
  },
  {
    id: "flac",
    label: "FLAC",
    extension: "flac",
    type: "audio",
    defaultCodecId: "flac",
    codecs: [
      { id: "flac", label: "FLAC", ffmpegCodec: "flac", type: "audio" },
    ],
  },
  {
    id: "gif",
    label: "GIF",
    extension: "gif",
    type: "image",
    defaultCodecId: "gif",
    codecs: [
      { id: "gif", label: "GIF", ffmpegCodec: "gif", type: "video" },
    ],
  },
];

export function getFormatById(id: string): OutputFormat | undefined {
  return OUTPUT_FORMATS.find((f) => f.id === id);
}

export function getCodecById(
  format: OutputFormat,
  codecId: string,
): CodecOption | undefined {
  return format.codecs.find((c) => c.id === codecId);
}

export function getDefaultVideoSettings(): VideoAdvancedSettings {
  return {
    rateControl: "crf",
    crf: 28,
    videoBitrate: "1M",
    audioBitrate: "96k",
    scale: "1",
    frameRate: "original",
    audioCodec: "aac",
  };
}

export function getDefaultAudioSettings(): AudioAdvancedSettings {
  return {
    audioBitrate: "128k",
    sampleRate: "original",
    channels: "original",
  };
}
