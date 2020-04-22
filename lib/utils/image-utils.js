// @flow

import type { Dimensions } from '../types/media-types';

const maxDimensions = Object.freeze({ width: 3000, height: 2000 });

const convertToPNG = new Set([
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
]);

type Input = {|
  inputMIME: string,
  inputDimensions: Dimensions, // post EXIF orientation
  inputFileSize: number, // in bytes
  inputOrientation: ?number,
|};
type Plan = {|
  targetMIME: 'image/png' | 'image/jpeg',
  compressionRatio: number,
  fitInside: ?Dimensions,
  shouldRotate: boolean,
|};
function getImageProcessingPlan(input: Input): ?Plan {
  const {
    inputMIME,
    inputDimensions: { width: inputWidth, height: inputHeight },
    inputFileSize,
    inputOrientation,
  } = input;

  const unsupportedMIME =
    inputMIME !== 'image/png' && inputMIME !== 'image/jpeg';
  const needsRotation = !!inputOrientation && inputOrientation > 1;
  const needsCompression =
    inputFileSize > 5e6 || (unsupportedMIME && inputFileSize > 3e6);
  const needsResize =
    inputFileSize > 5e5 && (inputWidth > 3000 || inputHeight > 2000);

  if (!unsupportedMIME && !needsRotation && !needsCompression && !needsResize) {
    return null;
  }

  const targetMIME = convertToPNG.has(inputMIME) ? 'image/png' : 'image/jpeg';
  let compressionRatio = 1;
  if (targetMIME === 'image/jpeg') {
    if (needsCompression) {
      compressionRatio = 0.83;
    } else {
      compressionRatio = 0.92;
    }
  }

  return {
    targetMIME,
    compressionRatio,
    fitInside: needsResize ? maxDimensions : null,
    shouldRotate: needsRotation,
  };
}

export { getImageProcessingPlan };
