// @flow

import fileType from 'file-type';
import invariant from 'invariant';

import type { Shape } from '../types/core.js';
import type { MediaType } from '../types/media-types.js';

type ResultMIME = 'image/png' | 'image/jpeg';
type MediaConfig = {
  +mediaType: 'photo' | 'video' | 'photo_or_video',
  +extension: string,
  +serverCanHandle: boolean,
  +serverTranscodesImage: boolean,
  +imageConfig?: Shape<{
    +convertTo: ResultMIME,
  }>,
  +videoConfig?: Shape<{
    +loop: boolean,
  }>,
};
const mediaConfig: { [mime: string]: MediaConfig } = Object.freeze({
  'image/png': {
    mediaType: 'photo',
    extension: 'png',
    serverCanHandle: true,
    serverTranscodesImage: true,
  },
  'image/jpeg': {
    mediaType: 'photo',
    extension: 'jpg',
    serverCanHandle: true,
    serverTranscodesImage: true,
  },
  'image/gif': {
    // Set mediaType to 'photo_or_video' when working on
    // video messages to treat animated GIFs as videos.
    mediaType: 'photo',
    extension: 'gif',
    serverCanHandle: true,
    serverTranscodesImage: true,
    imageConfig: {
      convertTo: 'image/png',
    },
    videoConfig: {
      loop: true,
    },
  },
  'image/heic': {
    mediaType: 'photo',
    extension: 'heic',
    serverCanHandle: false,
    serverTranscodesImage: false,
    imageConfig: {
      convertTo: 'image/jpeg',
    },
  },
  'image/webp': {
    mediaType: 'photo',
    extension: 'webp',
    serverCanHandle: true,
    serverTranscodesImage: true,
    imageConfig: {
      convertTo: 'image/jpeg',
    },
  },
  'image/tiff': {
    mediaType: 'photo',
    extension: 'tiff',
    serverCanHandle: true,
    serverTranscodesImage: true,
    imageConfig: {
      convertTo: 'image/jpeg',
    },
  },
  'image/svg+xml': {
    mediaType: 'photo',
    extension: 'svg',
    serverCanHandle: true,
    serverTranscodesImage: true,
    imageConfig: {
      convertTo: 'image/png',
    },
  },
  'image/bmp': {
    mediaType: 'photo',
    extension: 'bmp',
    serverCanHandle: true,
    serverTranscodesImage: true,
    imageConfig: {
      convertTo: 'image/png',
    },
  },
  'video/mp4': {
    mediaType: 'video',
    extension: 'mp4',
    serverCanHandle: true,
    serverTranscodesImage: false,
  },
  'video/quicktime': {
    mediaType: 'video',
    extension: 'mp4',
    serverCanHandle: true,
    serverTranscodesImage: false,
  },
});

const serverTranscodableTypes: Set<$Keys<typeof mediaConfig>> = new Set();
const serverCanHandleTypes: Set<$Keys<typeof mediaConfig>> = new Set();

for (const mime in mediaConfig) {
  if (mediaConfig[mime].serverTranscodesImage) {
    serverTranscodableTypes.add(mime);
  }
  if (mediaConfig[mime].serverCanHandle) {
    serverCanHandleTypes.add(mime);
  }
}

function getTargetMIME(inputMIME: string): ResultMIME {
  const config = mediaConfig[inputMIME];
  if (!config) {
    return 'image/jpeg';
  }
  const targetMIME = config.imageConfig && config.imageConfig.convertTo;
  if (targetMIME) {
    return targetMIME;
  }
  invariant(
    inputMIME === 'image/png' || inputMIME === 'image/jpeg',
    'all images must be converted to jpeg or png',
  );
  return inputMIME;
}

const bytesNeededForFileTypeCheck = 64;

export type FileDataInfo = {
  mime: ?string,
  mediaType: ?MediaType,
};
function fileInfoFromData(
  data: Uint8Array | Buffer | ArrayBuffer,
): FileDataInfo {
  const fileTypeResult = fileType(data);
  if (!fileTypeResult) {
    return { mime: null, mediaType: null };
  }
  const { mime } = fileTypeResult;

  const rawMediaType = mediaConfig[mime] && mediaConfig[mime].mediaType;
  const mediaType = rawMediaType === 'photo_or_video' ? 'photo' : rawMediaType;

  return { mime, mediaType };
}

function replaceExtension(filename: string, ext: string): string {
  const lastIndex = filename.lastIndexOf('.');
  let name = lastIndex >= 0 ? filename.substring(0, lastIndex) : filename;
  if (!name) {
    name = Math.random().toString(36).slice(-5);
  }
  const maxReadableLength = 255 - ext.length - 1;
  return `${name.substring(0, maxReadableLength)}.${ext}`;
}

function readableFilename(filename: string, mime: string): ?string {
  const ext = mediaConfig[mime] && mediaConfig[mime].extension;
  if (!ext) {
    return null;
  }
  return replaceExtension(filename, ext);
}

const basenameRegex = /[^a-z0-9._-]/gi;
function sanitizeFilename(filename: ?string, mime: string): string {
  if (!filename) {
    // Generate a random filename and deduce the extension from the mime type.
    const randomName = Math.random().toString(36).slice(-5);
    filename = readableFilename(randomName, mime) || randomName;
  }
  return filename.replace(basenameRegex, '_');
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

function filenameWithoutExtension(filename: string): string {
  const extension = extensionFromFilename(filename);
  if (!extension) {
    return filename;
  }
  return filename.replace(new RegExp(`\\.${extension}$`), '');
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
  mediaConfig,
  serverTranscodableTypes,
  serverCanHandleTypes,
  getTargetMIME,
  bytesNeededForFileTypeCheck,
  fileInfoFromData,
  replaceExtension,
  readableFilename,
  sanitizeFilename,
  extensionFromFilename,
  pathFromURI,
  filenameFromPathOrURI,
  filenameWithoutExtension,
};
