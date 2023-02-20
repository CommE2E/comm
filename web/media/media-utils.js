// @flow

import type {
  MediaType,
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { probeFile } from './blob-utils.js';
import { getOrientation } from './image-utils.js';

async function preloadImage(uri: string): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?Image,
}> {
  let image, exceptionMessage;
  const start = Date.now();
  try {
    image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.src = uri;
      img.onload = () => {
        resolve(img);
      };
      img.onerror = e => {
        reject(e);
      };
    });
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  const dimensions = image
    ? { height: image.height, width: image.width }
    : null;
  const step = {
    step: 'preload_image',
    success: !!image,
    exceptionMessage,
    time: Date.now() - start,
    uri,
    dimensions,
  };
  return { steps: [step], result: image };
}

type ProcessFileSuccess = {
  success: true,
  uri: string,
  dimensions: ?Dimensions,
};
async function processFile(
  file: File,
  exifRotate: boolean,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessFileSuccess,
}> {
  const initialURI = URL.createObjectURL(file);
  if (!exifRotate) {
    const { steps, result } = await preloadImage(initialURI);
    let dimensions;
    if (result) {
      const { width, height } = result;
      dimensions = { width, height };
    }
    return { steps, result: { success: true, uri: initialURI, dimensions } };
  }

  const [preloadResponse, orientationStep] = await Promise.all([
    preloadImage(initialURI),
    getOrientation(file),
  ]);
  const { steps: preloadSteps, result: image } = preloadResponse;

  const steps = [...preloadSteps, orientationStep];

  if (!image) {
    return {
      steps,
      result: { success: true, uri: initialURI, dimensions: undefined },
    };
  }

  if (!orientationStep.success) {
    return { steps, result: { success: false, reason: 'exif_fetch_failed' } };
  }
  const { orientation } = orientationStep;

  const dimensions =
    !!orientation && orientation > 4
      ? { width: image.height, height: image.width }
      : { width: image.width, height: image.height };
  if (!orientation || orientation === 1) {
    return { steps, result: { success: true, uri: initialURI, dimensions } };
  }

  let reorientedBlob, reorientExceptionMessage;
  const reorientStart = Date.now();
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = dimensions.height;
    canvas.width = dimensions.width;

    if (orientation === 2) {
      context.transform(-1, 0, 0, 1, dimensions.width, 0);
    } else if (orientation === 3) {
      context.transform(-1, 0, 0, -1, dimensions.width, dimensions.height);
    } else if (orientation === 4) {
      context.transform(1, 0, 0, -1, 0, dimensions.height);
    } else if (orientation === 5) {
      context.transform(0, 1, 1, 0, 0, 0);
    } else if (orientation === 6) {
      context.transform(0, 1, -1, 0, dimensions.width, 0);
    } else if (orientation === 7) {
      context.transform(0, -1, -1, 0, dimensions.width, dimensions.height);
    } else if (orientation === 8) {
      context.transform(0, -1, 1, 0, 0, dimensions.height);
    } else {
      context.transform(1, 0, 0, 1, 0, 0);
    }

    context.drawImage(image, 0, 0);
    reorientedBlob = await new Promise(resolve =>
      canvas.toBlob(blobResult => resolve(blobResult)),
    );
  } catch (e) {
    reorientExceptionMessage = getMessageForException(e);
  }
  URL.revokeObjectURL(initialURI);
  const uri = reorientedBlob && URL.createObjectURL(reorientedBlob);
  steps.push({
    step: 'reorient_image',
    success: !!reorientedBlob,
    exceptionMessage: reorientExceptionMessage,
    time: Date.now() - reorientStart,
    uri,
  });

  if (!uri) {
    return {
      steps,
      result: { success: false, reason: 'reorient_image_failed' },
    };
  }
  return { steps, result: { success: true, uri, dimensions } };
}

type FileValidationSuccess = {
  success: true,
  file: File,
  mediaType: MediaType,
  uri: string,
  dimensions: ?Dimensions,
};
async function validateFile(
  file: File,
  exifRotate: boolean,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FileValidationSuccess,
}> {
  const [probeResponse, processResponse] = await Promise.all([
    probeFile(file),
    processFile(file, exifRotate),
  ]);
  const { steps: probeSteps, result: probeResult } = probeResponse;
  const { steps: processSteps, result: processResult } = processResponse;

  const steps = [...probeSteps, ...processSteps];

  if (!probeResult.success) {
    return { steps, result: probeResult };
  }
  const { file: fixedFile, mediaType } = probeResult;

  if (!processResult.success) {
    return { steps, result: processResult };
  }
  const { dimensions, uri } = processResult;

  return {
    steps,
    result: {
      success: true,
      file: fixedFile,
      mediaType,
      uri,
      dimensions,
    },
  };
}

export { preloadImage, validateFile };
