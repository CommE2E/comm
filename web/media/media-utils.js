// @flow

import { detect as detectBrowser } from 'detect-browser';
import * as React from 'react';
import { thumbHashToDataURL } from 'thumbhash';

import { fetchableMediaURI } from 'lib/media/media-utils.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import type {
  MediaType,
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import { isBlobServiceURI } from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { createDefaultHTTPRequestHeaders } from 'lib/utils/services-utils.js';

import { probeFile } from './blob-utils.js';
import { decryptThumbhashToDataURL } from './encryption-utils.js';
import { getOrientation } from './image-utils.js';
import { base64DecodeBuffer } from '../utils/base64-utils.js';

async function preloadImage(uri: string): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?Image,
}> {
  let image, exceptionMessage;
  const start = Date.now();
  const imageURI = fetchableMediaURI(uri);
  try {
    image = await new Promise<Image>((resolve, reject) => {
      const img = new Image();
      img.src = imageURI;
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
    uri: imageURI,
    dimensions,
  };
  return { steps: [step], result: image };
}

/**
 * Preloads a media resource (image or video) from a URI. This sends a HTTP GET
 * request to the URI to let the browser download it and cache it,
 * so further requests will be loaded from the cache.
 *
 * For raw images, use {@link preloadImage} instead.
 *
 * @param uri The URI of the media resource.
 * @returns Steps and the result of the preload. The preload is successful
 * if the HTTP response is OK (20x).
 */
async function preloadMediaResource(
  uri: string,
  authMetadata: AuthMetadata,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: { +success: boolean },
}> {
  let headers;
  if (isBlobServiceURI(uri)) {
    headers = createDefaultHTTPRequestHeaders(authMetadata);
  }

  const start = Date.now();
  const mediaURI = fetchableMediaURI(uri);
  let success, exceptionMessage;
  try {
    const response = await fetch(mediaURI, { headers });
    // we need to read the blob to make sure the browser caches it
    await response.blob();
    success = response.ok;
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }

  const step = {
    step: 'preload_resource',
    success,
    exceptionMessage,
    time: Date.now() - start,
    uri: mediaURI,
  };

  return { steps: [step], result: { success } };
}

type ProcessFileSuccess = {
  success: true,
  uri: string,
  dimensions: ?Dimensions,
};

const browser = detectBrowser();
const exifRotate =
  !browser || (browser.name !== 'safari' && browser.name !== 'chrome');

async function processFile(file: File): Promise<{
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

  const steps: MediaMissionStep[] = [...preloadSteps, orientationStep];

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
    reorientedBlob = await new Promise<Blob>(resolve =>
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
async function validateFile(file: File): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FileValidationSuccess,
}> {
  const [probeResponse, processResponse] = await Promise.all([
    probeFile(file),
    processFile(file),
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

function usePlaceholder(thumbHash: ?string, encryptionKey: ?string): ?string {
  const [placeholder, setPlaceholder] = React.useState<?string>(null);

  React.useEffect(() => {
    if (!thumbHash) {
      setPlaceholder(null);
      return;
    }

    if (!encryptionKey) {
      try {
        const binaryThumbHash = base64DecodeBuffer(thumbHash);
        const placeholderImage = thumbHashToDataURL(binaryThumbHash);
        setPlaceholder(placeholderImage);
      } catch (e) {
        console.warn('Failed to set placeholder thumbHash:', e);
      }
      return;
    }

    void (async () => {
      try {
        const decryptedThumbHash = await decryptThumbhashToDataURL(
          thumbHash,
          encryptionKey,
        );
        setPlaceholder(decryptedThumbHash);
      } catch {
        setPlaceholder(null);
      }
    })();
  }, [thumbHash, encryptionKey]);

  return placeholder;
}

export { preloadImage, preloadMediaResource, validateFile, usePlaceholder };
