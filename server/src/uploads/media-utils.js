// @flow

import type { UploadInput } from '../creators/upload-creator';

import sharp from 'sharp';

import { fileInfoFromData } from 'lib/utils/media-utils';

const fiveMegabytes = 5 * 1024 * 1024;

async function validateAndConvert(
  initialBuffer: Buffer,
  initialName: string,
  size: number, // in bytes
): Promise<?UploadInput> {
  const fileInfo = fileInfoFromData(initialBuffer, initialName);
  if (!fileInfo) {
    return null;
  }

  const { mime } = fileInfo;
  if (mime === "image/heic") {
    // This should've gotten converted on the client
    return null;
  }
  if (size < fiveMegabytes && (mime === "image/png" || mime === "image/jpeg")) {
    return { ...fileInfo, buffer: initialBuffer };
  }

  let sharpImage;
  try {
    sharpImage = sharp(initialBuffer);
  } catch (e) {
    return null;
  }
  sharpImage = sharpImage.resize(
    3000,
    2000,
    { fit: 'inside', withoutEnlargement: true },
  );

  if (mime === "image/png" || mime === "image/gif") {
    sharpImage = sharpImage.png();
  } else {
    sharpImage = sharpImage.jpeg({ quality: 92 });
  }

  const convertedBuffer = await sharpImage.toBuffer();
  const convertedFileInfo = fileInfoFromData(convertedBuffer, initialName);
  if (!convertedFileInfo) {
    return null;
  }
  return { ...convertedFileInfo, buffer: convertedBuffer };
}

export {
  validateAndConvert,
};
