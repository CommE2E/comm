// @flow

import invariant from 'invariant';
import isSvg from 'is-svg';

import {
  mediaConfig,
  serverTranscodableTypes,
  fileInfoFromData,
  type FileDataInfo,
  readableFilename,
} from 'lib/media/file-utils.js';
import type { DetermineFileTypeMediaMissionStep } from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

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
  const mediaType = mediaConfig[mime] && mediaConfig[mime].mediaType;
  invariant(mediaType !== 'photo_or_video', 'svg should be considered a photo');
  return { mime, mediaType };
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

  if (!mime || !mediaType || !serverTranscodableTypes.has(mime)) {
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

const allowedMimeTypeString: string = [...serverTranscodableTypes].join(',');

export { deepFileInfoFromData, determineFileType, allowedMimeTypeString };
