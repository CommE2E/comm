// @flow

import type { MediaType } from '../types/media-types';

import fileType from 'file-type';

type FileInfo = {| name: string, mime: string, mediaType: MediaType |};
function fileInfoFromData(
  data: Uint8Array | Buffer,
  fileName: string,
): ?FileInfo {
  const fileTypeResult = fileType(data);
  if (!fileTypeResult) {
    return null;
  }
  const { ext, mime } = fileTypeResult;
  const mediaType = mimeTypesToMediaTypes[mime];
  if (!mediaType) {
    return null;
  }
  const [ readableFileName, extension ] = fileName.split('.');
  const maxReadableLength = 255 - ext.length - 1;
  const fixedFileName =
    `${readableFileName.substring(0, maxReadableLength)}.${ext}`;
  return { name: fixedFileName, mime, mediaType };
}

const mimeTypesToMediaTypes = {
  "image/png": "photo",
  "image/jpeg": "photo",
  "image/gif": "photo",
  "image/heic": "photo",
};

export {
  fileInfoFromData,
  mimeTypesToMediaTypes,
};
