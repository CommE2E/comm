// @flow

import type { UploadInput } from '../creators/upload-creator';

import sharp from 'sharp';

import { fileInfoFromData } from 'lib/utils/file-utils';

const fiveMegabytes = 5 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);

async function validateAndConvert(
  initialBuffer: Buffer,
  initialName: string,
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
    return {
      mime,
      mediaType,
      name,
      buffer: initialBuffer,
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
  return {
    mime: convertedMIME,
    mediaType: convertedMediaType,
    name: convertedName,
    buffer: convertedBuffer,
  };
}

export { validateAndConvert };
