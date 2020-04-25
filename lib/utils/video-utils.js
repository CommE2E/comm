// @flow

import invariant from 'invariant';

import { replaceExtension } from './file-utils';
import { getUUID } from './uuid';
import { maxDimensions } from './media-utils';

const { height: maxHeight, width: maxWidth } = maxDimensions;

type Input = {|
  inputPath: string,
  inputHasCorrectContainerAndCodec: boolean,
  inputFileSize: number, // in bytes
  inputFilename: string,
  inputDuration: number,
  outputDirectory: string,
  outputCodec: string,
|};
type Plan = {|
  outputPath: string,
  ffmpegCommand: string,
|};
function getVideoProcessingPlan(input: Input): ?Plan {
  const {
    inputPath,
    inputHasCorrectContainerAndCodec,
    inputFileSize,
    inputFilename,
    inputDuration,
    outputDirectory,
    outputCodec,
  } = input;

  if (inputHasCorrectContainerAndCodec && inputFileSize < 1e7) {
    return null;
  }

  const outputFilename = replaceExtension(
    `transcode.${getUUID()}.${inputFilename}`,
    'mp4',
  );
  const outputPath = `${outputDirectory}${outputFilename}`;

  let quality, speed;
  if (outputCodec === 'h264') {
    const { floor, min, max, log2 } = Math;
    const crf = floor(min(5, max(0, log2(inputDuration / 5)))) + 23;
    quality = `-crf ${crf}`;
    speed = '-preset ultrafast';
  } else if (outputCodec === 'h264_videotoolbox') {
    quality = '-profile:v baseline';
    speed = '-realtime 1';
  } else {
    invariant(false, `unrecognized outputCodec ${outputCodec}`);
  }

  const ffmpegCommand =
    `-i ${inputPath} ` +
    `-c:a copy -c:v ${outputCodec} ` +
    `${quality} ` +
    '-vsync 2 -r 30 ' +
    `-vf scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease ` +
    `${speed} ` +
    '-movflags +faststart ' +
    '-pix_fmt yuv420p ' +
    outputPath;

  return { outputPath, ffmpegCommand };
}

export { getVideoProcessingPlan };
