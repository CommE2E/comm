// @flow

import type { DetermineFileTypeMediaMissionStep } from 'lib/types/media-types';

import isSvg from 'is-svg';

import {
  fileInfoFromData,
  type FileDataInfo,
  mimeTypesToMediaTypes,
  readableFilename,
} from 'lib/utils/file-utils';
import { getMessageForException } from 'lib/utils/errors';

function deepFileInfoFromData(data: Buffer | ArrayBuffer): FileDataInfo {
  const result = fileInfoFromData(data);
  if (result.mime !== 'application/xml') {
    return result;
  }
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!isSvg(buffer)) {
    return result;
  }
  const mime = 'image/svg+xml';
  return { mime, mediaType: mimeTypesToMediaTypes[mime] };
}

function determineFileType(
  arrayBuffer: ArrayBuffer,
  filename: string,
): DetermineFileTypeMediaMissionStep {
  let mime, mediaType, exceptionMessage;
  const start = Date.now();
  try {
    ({ mime, mediaType } = deepFileInfoFromData(arrayBuffer));
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }

  if (!mime || !mediaType || !allowedMimeTypes.has(mime)) {
    return {
      step: 'determine_file_type',
      success: false,
      exceptionMessage,
      time: Date.now() - start,
      inputFilename: filename,
      outputMIME: mime,
      outputMediaType: mediaType,
      outputFilename: null,
    };
  }

  const name = readableFilename(filename, mime);
  return {
    step: 'determine_file_type',
    success: !!name,
    exceptionMessage,
    time: Date.now() - start,
    inputFilename: filename,
    outputMIME: mime,
    outputMediaType: mediaType,
    outputFilename: name,
  };
}

const allowedMimeTypeArray = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/svg+xml',
  'image/bmp',
];
const allowedMimeTypes = new Set(allowedMimeTypeArray);
const allowedMimeTypeString = allowedMimeTypeArray.join(',');

export { deepFileInfoFromData, determineFileType, allowedMimeTypeString };
