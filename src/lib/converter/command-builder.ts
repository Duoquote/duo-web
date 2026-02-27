import type {
  OutputFormat,
  CodecOption,
  VideoAdvancedSettings,
  AudioAdvancedSettings,
} from "./formats";

interface BuildCommandInput {
  format: OutputFormat;
  codec: CodecOption;
  settings: VideoAdvancedSettings | AudioAdvancedSettings;
}

export function buildFFmpegArgs({
  format,
  codec,
  settings,
}: BuildCommandInput): string[] {
  if (format.type === "audio") {
    return buildAudioArgs(codec, settings as AudioAdvancedSettings);
  }
  if (format.id === "gif") {
    return buildGifArgs(settings as VideoAdvancedSettings);
  }
  return buildVideoArgs(format, codec, settings as VideoAdvancedSettings);
}

function buildVideoArgs(
  format: OutputFormat,
  codec: CodecOption,
  s: VideoAdvancedSettings,
): string[] {
  const args: string[] = [];

  args.push("-c:v", codec.ffmpegCodec);

  if (s.rateControl === "crf") {
    args.push("-crf", String(s.crf));
    if (
      codec.ffmpegCodec === "libvpx" ||
      codec.ffmpegCodec === "libvpx-vp9"
    ) {
      args.push("-b:v", "0");
    }
  } else if (s.rateControl === "cbr") {
    args.push("-b:v", s.videoBitrate);
    args.push("-minrate", s.videoBitrate);
    args.push("-maxrate", s.videoBitrate);
    args.push("-bufsize", s.videoBitrate);
  } else if (s.rateControl === "vbr") {
    args.push("-b:v", s.videoBitrate);
  }

  if (
    codec.ffmpegCodec === "libx264" ||
    codec.ffmpegCodec === "libx265"
  ) {
    args.push("-preset", "medium");
  }

  if (s.scale === "pixel") {
    args.push("-vf", "scale=80:80:force_original_aspect_ratio=decrease,scale=1280:720:force_original_aspect_ratio=increase:flags=neighbor");
  } else if (s.scale !== "1") {
    args.push("-vf", `scale=trunc(iw*${s.scale}/2)*2:trunc(ih*${s.scale}/2)*2`);
  }

  if (s.frameRate !== "original") {
    args.push("-r", s.frameRate);
  }

  if (s.audioCodec === "none") {
    args.push("-an");
  } else if (s.audioCodec === "copy") {
    args.push("-c:a", "copy");
  } else {
    args.push("-c:a", s.audioCodec);
    args.push("-b:a", s.audioBitrate);
  }

  if (format.id === "mp4" || format.id === "mov") {
    args.push("-movflags", "+faststart");
  }

  if (
    codec.ffmpegCodec === "libx264" ||
    codec.ffmpegCodec === "libx265"
  ) {
    args.push("-pix_fmt", "yuv420p");
  }

  return args;
}

function buildAudioArgs(
  codec: CodecOption,
  s: AudioAdvancedSettings,
): string[] {
  const args: string[] = [];

  args.push("-vn");
  args.push("-c:a", codec.ffmpegCodec);

  if (codec.ffmpegCodec !== "pcm_s16le" && codec.ffmpegCodec !== "flac") {
    args.push("-b:a", s.audioBitrate);
  }

  if (s.sampleRate !== "original") {
    args.push("-ar", s.sampleRate);
  }

  if (s.channels !== "original") {
    args.push("-ac", s.channels);
  }

  return args;
}

function buildGifArgs(s: VideoAdvancedSettings): string[] {
  const args: string[] = [];
  const filterParts: string[] = [];

  if (s.scale === "pixel") {
    filterParts.push("scale=80:80:force_original_aspect_ratio=decrease,scale=1280:720:force_original_aspect_ratio=increase:flags=neighbor");
  } else if (s.scale !== "1") {
    filterParts.push(`scale=trunc(iw*${s.scale}/2)*2:trunc(ih*${s.scale}/2)*2:flags=lanczos`);
  }

  if (s.frameRate !== "original") {
    filterParts.push(`fps=${s.frameRate}`);
  } else {
    filterParts.push("fps=15");
  }

  const scaleAndFps = filterParts.join(",");
  args.push(
    "-filter_complex",
    `${scaleAndFps},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=floyd_steinberg`,
  );

  args.push("-an");

  return args;
}

export function getOutputFileName(
  inputName: string,
  formatExtension: string,
): string {
  const baseName = inputName.replace(/\.[^.]+$/, "") || "output";
  return `${baseName}.${formatExtension}`;
}
