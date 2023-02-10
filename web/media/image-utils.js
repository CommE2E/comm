// @flow

import EXIF from 'exif-js';

import type { GetOrientationMediaMissionStep } from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

function getEXIFOrientation(file: File): Promise<?number> {
  return new Promise(resolve => {
    EXIF.getData(file, function () {
      resolve(EXIF.getTag(this, 'Orientation'));
    });
  });
}

async function getOrientation(
  file: File,
): Promise<GetOrientationMediaMissionStep> {
  let orientation,
    success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    orientation = await getEXIFOrientation(file);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'exif_fetch',
    success,
    exceptionMessage,
    time: Date.now() - start,
    orientation,
  };
}

export { getOrientation };
