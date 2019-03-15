// @flow

import type { MediaType, Dimensions } from 'lib/types/media-types';

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
    fileReader.onload = event => {
      resolve(event.target.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

function getPhotoDimensions(blob: File): Promise<Dimensions> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = event => {
      resolve(event.target.result);
    };
    fileReader.readAsDataURL(blob);
  }).then(uri => preloadImage(uri));
}

// Returns null if unsupported
type FileValidationResult = {|
  file: File,
  mediaType: MediaType,
  dimensions: ?Dimensions,
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
  let dimensions = null;
  if (mediaType === "photo") {
    dimensions = await getPhotoDimensions(file);
  }
  const fixedFile = name !== file.name || mime !== file.type
    ? new File([ file ], name, { type: mime })
    : file;
  return { file: fixedFile, mediaType, dimensions };
}

const allowedMimeTypeString = Object.keys(mimeTypesToMediaTypes).join(',');

function preloadImage(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = uri;
    img.onload = () => {
      const { width, height } = img;
      resolve({ width, height });
    };
    img.onerror = reject;
  });
}

export {
  validateFile,
  allowedMimeTypeString,
  preloadImage,
};
