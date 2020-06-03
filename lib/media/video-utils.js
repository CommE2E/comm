// @flow

import type { Dimensions, MediaMissionFailure } from '../types/media-types';

import invariant from 'invariant';

import { replaceExtension } from './file-utils';
import { maxDimensions } from './media-utils';
import { getUUID } from '../utils/uuid';

const { height: maxHeight, width: maxWidth } = maxDimensions;

type Input = {|
  inputPath: string,
  inputHasCorrectContainerAndCodec: boolean,
  inputFileSize: number, // in bytes
  inputFilename: string,
  inputDuration: number,
  inputDimensions: Dimensions,
  outputDirectory: string,
  outputCodec: string,
|};
type ProcessPlan = {|
  action: 'process',
  outputPath: string,
  ffmpegCommand: string,
|};
type Plan =
  | {| action: 'none' |}
  | {| action: 'reject', failure: MediaMissionFailure |}
  | ProcessPlan;
function getVideoProcessingPlan(input: Input): Plan {
  const {
    inputPath,
    inputHasCorrectContainerAndCodec,
    inputFileSize,
    inputFilename,
    inputDuration,
    inputDimensions,
    outputDirectory,
    outputCodec,
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

  if (inputHasCorrectContainerAndCodec && inputFileSize < 1e7) {
    return { action: 'none' };
  }

  const outputFilename = replaceExtension(
    `transcode.${getUUID()}.${inputFilename}`,
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
    outputPath;

  return { action: 'process', outputPath, ffmpegCommand };
}

function getHasMultipleFramesProbeCommand(path: string) {
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
