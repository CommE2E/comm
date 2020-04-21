// @flow

import type { MediaType } from '../types/media-types';

import fileType from 'file-type';

const mimeTypesToMediaTypes = Object.freeze({
  'image/png': 'photo',
  'image/jpeg': 'photo',
  'image/gif': 'photo',
  'image/heic': 'photo',
  'image/webp': 'photo',
  'image/tiff': 'photo',
  'image/svg+xml': 'photo',
  'video/mp4': 'video',
  'video/quicktime': 'video',
});

const mimeTypesToExtensions = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mp4',
});

export type FileDataInfo = {|
  mime: ?string,
  mediaType: ?MediaType,
|};
function fileInfoFromData(
  data: Uint8Array | Buffer | ArrayBuffer,
): FileDataInfo {
  const fileTypeResult = fileType(data);
  if (!fileTypeResult) {
    return { mime: null, mediaType: null };
  }
  const { mime } = fileTypeResult;
  const mediaType = mimeTypesToMediaTypes[mime];
  return { mime, mediaType };
}

function replaceExtension(filename: string, ext: string): string {
  const lastIndex = filename.lastIndexOf('.');
  let name = lastIndex >= 0 ? filename.substring(0, lastIndex) : filename;
  if (!name) {
    name = Math.random()
      .toString(36)
      .slice(-5);
  }
  const maxReadableLength = 255 - ext.length - 1;
  return `${name.substring(0, maxReadableLength)}.${ext}`;
}

function readableFilename(filename: string, mime: string): ?string {
  const ext = mimeTypesToExtensions[mime];
  if (!ext) {
    return null;
  }
  return replaceExtension(filename, ext);
}

const extRegex = /\.([0-9a-z]+)$/i;
function extensionFromFilename(filename: string): ?string {
  const matches = filename.match(extRegex);
  if (!matches) {
    return null;
  }
  const match = matches[1];
  if (!match) {
    return null;
  }
  return match.toLowerCase();
}

const pathRegex = /^file:\/\/(.*)$/;
function pathFromURI(uri: string): ?string {
  const matches = uri.match(pathRegex);
  if (!matches) {
    return null;
  }
  return matches[1] ? matches[1] : null;
}

const filenameRegex = /[^/]+$/;
function filenameFromPathOrURI(pathOrURI: string): ?string {
  const matches = pathOrURI.match(filenameRegex);
  if (!matches) {
    return null;
  }
  return matches[0] ? matches[0] : null;
}

export {
  fileInfoFromData,
  replaceExtension,
  readableFilename,
  mimeTypesToMediaTypes,
  extensionFromFilename,
  pathFromURI,
  filenameFromPathOrURI,
};
