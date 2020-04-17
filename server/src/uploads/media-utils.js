// @flow

import type { UploadInput } from '../creators/upload-creator';
import type { Dimensions } from 'lib/types/media-types';

import sharp from 'sharp';
import invariant from 'invariant';

import { fileInfoFromData, readableFilename } from 'lib/utils/file-utils';
import { getImageProcessingPlan } from 'lib/utils/image-utils';

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);

async function validateAndConvert(
  initialBuffer: Buffer,
  initialName: string,
  inputDimensions: ?Dimensions,
  size: number, // in bytes
): Promise<?UploadInput> {
  const { mime, mediaType } = fileInfoFromData(initialBuffer);
  if (!mime || !mediaType) {
    return null;
  }
  if (!allowedMimeTypes.has(mime)) {
    // This should've gotten converted on the client
    return null;
  }

  let sharpImage, metadata;
  try {
    sharpImage = sharp(initialBuffer);
    metadata = await sharpImage.metadata();
  } catch (e) {
    return null;
  }

  let initialDimensions = inputDimensions;
  if (!initialDimensions) {
    if (metadata.orientation && metadata.orientation > 4) {
      initialDimensions = { width: metadata.height, height: metadata.width };
    } else {
      initialDimensions = { width: metadata.width, height: metadata.height };
    }
  }

  const plan = getImageProcessingPlan(
    mime,
    initialDimensions,
    size,
    metadata.orientation,
  );
  if (!plan) {
    const name = readableFilename(initialName, mime);
    invariant(name, `should be able to construct filename for ${mime}`);
    return {
      mime,
      mediaType,
      name,
      buffer: initialBuffer,
      dimensions: initialDimensions,
    };
  }
  console.log(`processing image with ${JSON.stringify(plan)}`);
  const { targetMIME, compressionRatio, fitInside, shouldRotate } = plan;

  if (shouldRotate) {
    sharpImage = sharpImage.rotate();
  }

  if (fitInside) {
    sharpImage = sharpImage.resize(fitInside.width, fitInside.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (targetMIME === 'image/png') {
    sharpImage = sharpImage.png();
  } else {
    sharpImage = sharpImage.jpeg({ quality: compressionRatio * 100 });
  }

  const { data: convertedBuffer, info } = await sharpImage.toBuffer({
    resolveWithObject: true,
  });
  const convertedDimensions = { width: info.width, height: info.height };

  const {
    mime: convertedMIME,
    mediaType: convertedMediaType,
  } = fileInfoFromData(convertedBuffer);
  if (
    !convertedMIME ||
    !convertedMediaType ||
    convertedMIME !== targetMIME ||
    convertedMediaType !== mediaType
  ) {
    return null;
  }

  const convertedName = readableFilename(initialName, targetMIME);
  if (!convertedName) {
    return null;
  }

  return {
    mime: targetMIME,
    mediaType,
    name: convertedName,
    buffer: convertedBuffer,
    dimensions: convertedDimensions,
  };
}

export { validateAndConvert };
