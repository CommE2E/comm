// @flow

import EXIF from 'exif-js';
import { rgbaToThumbHash } from 'thumbhash';

import * as AES from 'lib/media/aes-crypto-utils-common.js';
import { hexToUintArray } from 'lib/media/data-utils.js';
import type {
  GetOrientationMediaMissionStep,
  MediaMissionFailure,
  MediaMissionStep,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { preloadImage } from './media-utils.js';
import { base64EncodeBuffer } from '../utils/base64-utils.js';

function getEXIFOrientation(file: File): Promise<?number> {
  return new Promise(resolve => {
    EXIF.getData(file, function (this: File) {
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

type GenerateThumbhashResult = {
  +success: true,
  +thumbHash: string,
};

/**
 * Generate a thumbhash for a given image file. If `encryptionKey` is provided,
 * the thumbhash string will be encrypted with it.
 */
async function generateThumbHash(
  file: File,
  encryptionKey: ?string = null,
): Promise<{
  +steps: $ReadOnlyArray<MediaMissionStep>,
  +result: GenerateThumbhashResult | MediaMissionFailure,
}> {
  const steps: MediaMissionStep[] = [];
  const initialURI = URL.createObjectURL(file);
  const { steps: preloadSteps, result: image } = await preloadImage(initialURI);
  steps.push(...preloadSteps);
  if (!image) {
    return {
      steps,
      result: { success: false, reason: 'preload_image_failed' },
    };
  }

  let binaryThumbHash, thumbHashString, exceptionMessage;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // rescale to 100px max as thumbhash doesn't need more
    const scale = 100 / Math.max(image.width, image.height);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    binaryThumbHash = rgbaToThumbHash(pixels.width, pixels.height, pixels.data);
    thumbHashString = base64EncodeBuffer(binaryThumbHash);
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  } finally {
    URL.revokeObjectURL(initialURI);
  }
  steps.push({
    step: 'generate_thumbhash',
    success: !!thumbHashString && !exceptionMessage,
    exceptionMessage,
    thumbHash: thumbHashString,
  });
  if (!binaryThumbHash || !thumbHashString || exceptionMessage) {
    return { steps, result: { success: false, reason: 'thumbhash_failed' } };
  }

  if (encryptionKey) {
    try {
      const encryptedThumbHash = await AES.encryptCommon(
        crypto,
        hexToUintArray(encryptionKey),
        binaryThumbHash,
      );
      thumbHashString = base64EncodeBuffer(encryptedThumbHash);
    } catch {
      return { steps, result: { success: false, reason: 'encryption_failed' } };
    }
  }

  return { steps, result: { success: true, thumbHash: thumbHashString } };
}

export { getOrientation, generateThumbHash };
