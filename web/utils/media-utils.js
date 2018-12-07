// @flow

import type { MediaType } from 'lib/types/media-types';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
} from 'lib/utils/media-utils';

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = (event) => {
      resolve(event.target.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

// Returns null if unsupported
type FileValidationResult = {|
  file: File,
  mediaType: MediaType,
|};
async function validateFile(file: File): Promise<?FileValidationResult> {
  const arrayBuffer = await blobToArrayBuffer(file);
  const fileInfo = fileInfoFromData(new Uint8Array(arrayBuffer), file.name);
  if (!fileInfo) {
    return null;
  }
  const { name, mime } = fileInfo;
  const mediaType = mimeTypesToMediaTypes[mime];
  if (!mediaType) {
    return null;
  }
  const fixedFile = name !== file.name || mime !== file.type
    ? new File([ file ], name, { type: mime })
    : file;
  return { file: fixedFile, mediaType };
}

const allowedMimeTypeString = Object.keys(mimeTypesToMediaTypes).join(',');

export {
  validateFile,
  allowedMimeTypeString,
};
