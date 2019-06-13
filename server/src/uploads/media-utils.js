// @flow

import type { UploadInput } from '../creators/upload-creator';

import { fileInfoFromData } from 'lib/utils/media-utils';

async function validateAndConvert(
  initialData: Buffer,
  initialName: string,
  size: number, // in bytes
): Promise<?UploadInput> {
  const fileInfo = fileInfoFromData(initialData, initialName);
  if (!fileInfo) {
    return null;
  }
  if (fileInfo.mime === "image/heic") {
    // This should've gotten converted on the client
    return null;
  }
  return { ...fileInfo, buffer: initialData };
}

export {
  validateAndConvert,
};
