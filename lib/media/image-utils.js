// @flow

import { getTargetMIME } from './file-utils.js';
import { maxDimensions } from './media-utils.js';
import type { Dimensions } from '../types/media-types.js';

const { height: maxHeight, width: maxWidth } = maxDimensions;

type Input = {
  inputMIME: string,
  inputDimensions: Dimensions, // post EXIF orientation
  inputFileSize: number, // in bytes
  inputOrientation: ?number,
};
type ProcessPlan = {
  action: 'process',
  targetMIME: 'image/png' | 'image/jpeg',
  compressionRatio: number,
  fitInside: ?Dimensions,
  shouldRotate: boolean,
};
type Plan = { action: 'none' } | ProcessPlan;
function getImageProcessingPlan(input: Input): Plan {
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
    inputFileSize > 5e5 && (inputWidth > maxWidth || inputHeight > maxHeight);

  if (!unsupportedMIME && !needsRotation && !needsCompression && !needsResize) {
    return { action: 'none' };
  }

  const targetMIME = getTargetMIME(inputMIME);

  let compressionRatio = 1;
  if (targetMIME === 'image/jpeg') {
    if (needsCompression) {
      compressionRatio = 0.83;
    } else {
      compressionRatio = 0.92;
    }
  }

  return {
    action: 'process',
    targetMIME,
    compressionRatio,
    fitInside: needsResize ? maxDimensions : null,
    shouldRotate: needsRotation,
  };
}

export { getImageProcessingPlan };
