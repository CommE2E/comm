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
  let [ readableFileName ] = fileName.split('.');
  if (!readableFileName) {
    readableFileName = Math.random().toString(36).slice(-5);
  }
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
  "video/mp4": "video",
  "video/quicktime": "video",
};

const extRegex = /\.[0-9a-z]+$/i;
function extensionFromFilename(filename: string): ?string {
  const matches = filename.match(extRegex);
  if (!matches) {
    return null;
  }
  const match = matches[0];
  if (!match) {
    return null;
  }
  return match;
}

function pathFromURI(uri: string): ?string {
  const matches = uri.match(/^file:\/\/(.*)$/);
  if (!matches) {
    return null;
  }
  const path = matches[1];
  if (!path) {
    return null;
  }
  return path;
}

export {
  fileInfoFromData,
  mimeTypesToMediaTypes,
  extensionFromFilename,
  pathFromURI,
};
