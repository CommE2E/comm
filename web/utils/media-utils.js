// @flow

import type { MediaType, Dimensions } from 'lib/types/media-types';

import { fileInfoFromData, readableFilename } from 'lib/utils/file-utils';
import invariant from 'invariant';
import EXIF from 'exif-js';

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = () => {
      invariant(
        fileReader.result instanceof ArrayBuffer,
        'FileReader.readAsArrayBuffer should result in ArrayBuffer',
      );
      resolve(fileReader.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

function getOrientation(file: File): Promise<?number> {
  return new Promise(resolve => {
    EXIF.getData(file, function() {
      resolve(EXIF.getTag(this, 'Orientation'));
    });
  });
}

type ProcessFileResult = {|
  uri: string,
  dimensions: Dimensions,
|};
async function processFile(
  file: File,
  exifRotate: boolean,
): Promise<ProcessFileResult> {
  const initialURI = URL.createObjectURL(file);
  if (!exifRotate) {
    const { width, height } = await preloadImage(initialURI);
    const dimensions = { width, height };
    return { uri: initialURI, dimensions };
  }

  const [image, orientation] = await Promise.all([
    preloadImage(initialURI),
    getOrientation(file),
  ]);

  const dimensions =
    !!orientation && orientation > 4
      ? { width: image.height, height: image.width }
      : { width: image.width, height: image.height };

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = dimensions.height;
  canvas.width = dimensions.width;

  if (orientation === 2) {
    context.transform(-1, 0, 0, 1, dimensions.width, 0);
  } else if (orientation === 3) {
    context.transform(-1, 0, 0, -1, dimensions.width, dimensions.height);
  } else if (orientation === 4) {
    context.transform(1, 0, 0, -1, 0, dimensions.height);
  } else if (orientation === 5) {
    context.transform(0, 1, 1, 0, 0, 0);
  } else if (orientation === 6) {
    context.transform(0, 1, -1, 0, dimensions.width, 0);
  } else if (orientation === 7) {
    context.transform(0, -1, -1, 0, dimensions.width, dimensions.height);
  } else if (orientation === 8) {
    context.transform(0, -1, 1, 0, 0, dimensions.height);
  } else {
    context.transform(1, 0, 0, 1, 0, 0);
  }

  context.drawImage(image, 0, 0);
  const blob = await new Promise(resolve =>
    canvas.toBlob(blobResult => resolve(blobResult)),
  );

  URL.revokeObjectURL(initialURI);
  const uri = URL.createObjectURL(blob);
  return { uri, dimensions };
}

// Returns null if unsupported
type FileValidationResult = {|
  file: File,
  mediaType: MediaType,
  uri: string,
  dimensions: ?Dimensions,
|};
async function validateFile(
  file: File,
  exifRotate: boolean,
): Promise<?FileValidationResult> {
  const [arrayBuffer, processResult] = await Promise.all([
    blobToArrayBuffer(file),
    processFile(file, exifRotate),
  ]);

  const { mime, mediaType } = fileInfoFromData(arrayBuffer);
  if (!mime || !mediaType || !allowedMimeTypes.has(mime)) {
    return null;
  }
  const name = readableFilename(file.name, mime);
  if (!name) {
    return null;
  }

  const { dimensions, uri } = processResult;
  const fixedFile =
    name !== file.name || mime !== file.type
      ? new File([file], name, { type: mime })
      : file;

  return { file: fixedFile, mediaType, uri, dimensions };
}

const allowedMimeTypeArray = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/tiff',
];
const allowedMimeTypes = new Set(allowedMimeTypeArray);
const allowedMimeTypeString = allowedMimeTypeArray.join(',');

function preloadImage(uri: string): Promise<Image> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = uri;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
  });
}

export { validateFile, allowedMimeTypeString, preloadImage };
