// @flow

import type { Dimensions } from '../types/media-types';

const maxDimensions = Object.freeze({ width: 3000, height: 2000 });

type ImageProcessingPlan = {|
  targetMIME: 'image/png' | 'image/jpeg',
  compressionRatio: number,
  fitInside: ?Dimensions,
  shouldRotate: boolean,
|};
function getImageProcessingPlan(
  mime: string,
  dimensions: Dimensions, // post EXIF orientation
  fileSize: number, // in bytes
  orientation: ?number,
): ?ImageProcessingPlan {
  const unsupportedMIME = mime !== 'image/png' && mime !== 'image/jpeg';
  const needsRotation = !!orientation && orientation > 1;
  const needsCompression =
    fileSize > 5e6 || (unsupportedMIME && fileSize > 3e6);
  const needsResize =
    fileSize > 5e5 && (dimensions.width > 3000 || dimensions.height > 2000);

  if (!unsupportedMIME && !needsRotation && !needsCompression && !needsResize) {
    return null;
  }

  const targetMIME =
    mime === 'image/png' || mime === 'image/gif' ? 'image/png' : 'image/jpeg';
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
