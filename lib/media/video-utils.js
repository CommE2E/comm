// @flow

import invariant from 'invariant';

import type { Dimensions, MediaMissionFailure } from '../types/media-types';
import { getUUID } from '../utils/uuid';
import { replaceExtension, sanitizeFilename } from './file-utils';
import { maxDimensions } from './media-utils';

const { height: maxHeight, width: maxWidth } = maxDimensions;

const estimatedResultBitrate = 0.35; // in MiB/s

type Input = {
  +inputPath: string,
  +inputHasCorrectContainerAndCodec: boolean,
  +inputFileSize: number, // in bytes
  +inputFilename: ?string,
  +inputMimeType: string,
  +inputDuration: number,
  +inputDimensions: Dimensions,
  +outputDirectory: string,
  +outputCodec: string,
  +clientConnectionInfo?: {
    +hasWiFi: boolean,
    +speed: number, // in kilobytes per second
  },
  +clientTranscodeSpeed?: number, // in input video seconds per second
};
export type ProcessPlan = {
  +action: 'process',
  +outputPath: string,
  +thumbnailPath: string,
  +ffmpegCommand: string,
};
type Plan =
  | { +action: 'none', +thumbnailPath: string }
  | { +action: 'reject', +failure: MediaMissionFailure }
  | ProcessPlan;
function getVideoProcessingPlan(input: Input): Plan {
  const {
    inputPath,
    inputHasCorrectContainerAndCodec,
    inputFileSize,
    inputFilename,
    inputMimeType,
    inputDuration,
    inputDimensions,
    outputDirectory,
    outputCodec,
    clientConnectionInfo,
    clientTranscodeSpeed,
  } = input;

  if (inputDuration > videoDurationLimit * 60) {
    return {
      action: 'reject',
      failure: {
        success: false,
        reason: 'video_too_long',
        duration: inputDuration,
      },
    };
  }

  const uuid = getUUID();
  const sanitizedFilename = sanitizeFilename(inputFilename, inputMimeType);
  const thumbnailFilename = replaceExtension(
    `thumb.${uuid}.${sanitizedFilename}`,
    'jpg',
  );
  const thumbnailPath = `${outputDirectory}${thumbnailFilename}`;
  if (inputHasCorrectContainerAndCodec) {
    if (inputFileSize < 1e7) {
      return { action: 'none', thumbnailPath };
    }
    if (clientConnectionInfo && clientTranscodeSpeed) {
      const rawUploadTime = inputFileSize / 1024 / clientConnectionInfo.speed; // in seconds
      const transcodeTime = inputDuration / clientTranscodeSpeed; // in seconds
      const estimatedResultFileSize =
        inputDuration * estimatedResultBitrate * 1024; // in KiB
      const transcodedUploadTime =
        estimatedResultFileSize / clientConnectionInfo.speed; // in seconds
      const fullProcessTime = transcodeTime + transcodedUploadTime;
      if (
        (clientConnectionInfo.hasWiFi && rawUploadTime < fullProcessTime) ||
        (inputFileSize < 1e8 && rawUploadTime * 2 < fullProcessTime)
      ) {
        return { action: 'none', thumbnailPath };
      }
    }
  }

  const outputFilename = replaceExtension(
    `transcode.${uuid}.${sanitizedFilename}`,
    'mp4',
  );
  const outputPath = `${outputDirectory}${outputFilename}`;

  let quality, speed, scale;
  if (outputCodec === 'h264') {
    const { floor, min, max, log2 } = Math;
    const crf = floor(min(5, max(0, log2(inputDuration / 5)))) + 23;
    quality = `-crf ${crf}`;
    speed = '-preset ultrafast';
    scale = `-vf scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease`;
  } else if (outputCodec === 'h264_videotoolbox') {
    quality = '-profile:v baseline';
    speed = '-realtime 1';
    const { width, height } = inputDimensions;
    scale = '';
    const exceedsDimensions = width > maxWidth || height > maxHeight;
    if (exceedsDimensions && width / height > maxWidth / maxHeight) {
      scale = `-vf scale=${maxWidth}:-1`;
    } else if (exceedsDimensions) {
      scale = `-vf scale=-1:${maxHeight}`;
    }
  } else {
    invariant(false, `unrecognized outputCodec ${outputCodec}`);
  }

  const ffmpegCommand =
    `-i ${inputPath} ` +
    `-c:a copy -c:v ${outputCodec} ` +
    `${quality} ` +
    '-vsync 2 -r 30 ' +
    `${scale} ` +
    `${speed} ` +
    '-movflags +faststart ' +
    '-pix_fmt yuv420p ' +
    '-v quiet ' +
    outputPath;

  return { action: 'process', thumbnailPath, outputPath, ffmpegCommand };
}

function getHasMultipleFramesProbeCommand(path: string): string {
  const ffprobeCommand =
    '-v error ' +
    '-count_frames ' +
    '-select_streams v:0 ' +
    '-show_entries stream=nb_read_frames ' +
    '-of default=nokey=1:noprint_wrappers=1 ' +
    '-read_intervals "%+#2" ' +
    path;
  return ffprobeCommand;
}

const videoDurationLimit = 3; // in minutes

export {
  getVideoProcessingPlan,
  getHasMultipleFramesProbeCommand,
  videoDurationLimit,
};
