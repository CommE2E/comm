// @flow

import { replaceExtension } from './file-utils';
import { getUUID } from './uuid';

type Input = {|
  inputPath: string,
  inputHasCorrectContainerAndCodec: boolean,
  inputFileSize: number,
  inputFilename: string,
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
    inputFilename,
    outputDirectory,
    outputCodec,
  } = input;

  if (inputHasCorrectContainerAndCodec) {
    return null;
  }

  const outputFilename = replaceExtension(
    `transcode.${getUUID()}.${inputFilename}`,
    'mp4',
  );
  const outputPath = `${outputDirectory}${outputFilename}`;
  const crf = 25;

  const ffmpegCommand =
    `-i ${inputPath} ` +
    `-c:a copy -c:v ${outputCodec} ` +
    `-crf ${crf} ` +
    '-vsync 2 -r 30 ' +
    '-vf scale=1920:1920:force_original_aspect_ratio=decrease ' +
    '-preset ultrafast ' +
    '-movflags +faststart ' +
    '-pix_fmt yuv420p ' +
    outputPath;

  return { outputPath, ffmpegCommand };
}

export { getVideoProcessingPlan };
