// @flow

import type { MediaType, Dimensions } from 'lib/types/media-types';

import { fileInfoFromData } from 'lib/utils/file-utils';

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
  const { name, mime, mediaType } = fileInfoFromData(
    new Uint8Array(arrayBuffer),
    file.name,
  );
  if (!name || !mime || !mediaType || !allowedMimeTypes.has(mime)) {
    return null;
  }
  let dimensions = null;
  if (mediaType === 'photo') {
    dimensions = await getPhotoDimensions(file);
  }
  const fixedFile =
    name !== file.name || mime !== file.type
      ? new File([file], name, { type: mime })
      : file;
  return { file: fixedFile, mediaType, dimensions };
}

const allowedMimeTypeArray = ['image/png', 'image/jpeg', 'image/gif'];
const allowedMimeTypes = new Set(allowedMimeTypeArray);
const allowedMimeTypeString = allowedMimeTypeArray.join(',');

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

export { validateFile, allowedMimeTypeString, preloadImage };
