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
  const ffmpegCommand = `-i ${inputPath} -c:v ${outputCodec} -c:a copy ${outputPath}`;

  return { outputPath, ffmpegCommand };
}

export { getVideoProcessingPlan };
