// @flow

import type { UploadInput } from '../creators/upload-creator';
import type { Dimensions } from 'lib/types/media-types';

import sharp from 'sharp';
import sizeOf from 'buffer-image-size';

import { fileInfoFromData } from 'lib/utils/file-utils';

const fiveMegabytes = 5 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);

function getDimensions(buffer: Buffer): Dimensions {
  const { height, width } = sizeOf(buffer);
  return { height, width };
}

async function validateAndConvert(
  initialBuffer: Buffer,
  initialName: string,
  inputDimensions: ?Dimensions,
  size: number, // in bytes
): Promise<?UploadInput> {
  const { mime, mediaType, name } = fileInfoFromData(
    initialBuffer,
    initialName,
  );
  if (!mime || !mediaType || !name) {
    return null;
  }

  if (!allowedMimeTypes.has(mime)) {
    // This should've gotten converted on the client
    return null;
  }
  if (size < fiveMegabytes && (mime === 'image/png' || mime === 'image/jpeg')) {
    const dimensions = inputDimensions
      ? inputDimensions
      : getDimensions(initialBuffer);
    return {
      mime,
      mediaType,
      name,
      buffer: initialBuffer,
      dimensions,
    };
  }

  let sharpImage;
  try {
    sharpImage = sharp(initialBuffer);
  } catch (e) {
    return null;
  }
  sharpImage = sharpImage.resize(3000, 2000, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (mime === 'image/png' || mime === 'image/gif') {
    sharpImage = sharpImage.png();
  } else {
    sharpImage = sharpImage.jpeg({ quality: 92 });
  }

  const convertedBuffer = await sharpImage.toBuffer();
  const {
    mime: convertedMIME,
    mediaType: convertedMediaType,
    name: convertedName,
  } = fileInfoFromData(convertedBuffer, initialName);
  if (!convertedMIME || !convertedMediaType || !convertedName) {
    return null;
  }

  const dimensions = inputDimensions
    ? inputDimensions
    : getDimensions(convertedBuffer);
  return {
    mime: convertedMIME,
    mediaType: convertedMediaType,
    name: convertedName,
    buffer: convertedBuffer,
    dimensions,
  };
}

export { validateAndConvert };
