// @flow

import type { Dimensions, MediaType } from 'lib/types/media-types';

import { Platform, Image } from 'react-native';
import base64 from 'base-64';
import ImageResizer from 'react-native-image-resizer';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
} from 'lib/utils/file-utils';

type ReactNativeBlob = 
  & Blob
  & { data: { type: string, name: string, size: number } };
export type MediaValidationResult = {
  uri: string,
  dimensions: Dimensions,
  mediaType: MediaType,
  blob: ReactNativeBlob,
};
type ValidateMediaInput = {
  uri: string,
  height: number,
  width: number,
  ...
};
async function validateMedia(
  imageInfo: ValidateMediaInput,
): Promise<?MediaValidationResult> {
  const { uri, height, width } = imageInfo;
  const dimensions = { height, width };
  const response = await fetch(uri);
  const blob = await response.blob();
  const reportedMIME = blob.type;
  const mediaType = mimeTypesToMediaTypes[reportedMIME];
  if (!mediaType) {
    return null;
  }
  return { uri, dimensions, mediaType, blob };
}

function blobToDataURI(blob: Blob): Promise<string> {
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
  });
}

function stringToIntArray(str: string): Uint8Array {
  const array = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }
  return array;
}

function dataURIToIntArray(dataURI: string): Uint8Array {
  const uri = dataURI.replace(/\r?\n/g, '');

  const firstComma = uri.indexOf(',');
  if (firstComma <= 4) {
    throw new TypeError('malformed data-URI');
  }

  const meta = uri.substring(5, firstComma).split(';');
  const base64Encoded = meta.some(metum => metum === 'base64');

  let data = unescape(uri.substring(firstComma + 1));
  if (base64Encoded) {
    data = base64.decode(data);
  }

  return stringToIntArray(data);
}

function getDimensions(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ height, width }),
      reject,
    );
  });
}

type MediaConversionResult = {|
  uploadURI: string,
  shouldDisposePath: ?string,
  name: string,
  mime: string,
  mediaType: MediaType,
  dimensions: Dimensions,
|};
async function convertMedia(
  validationResult: MediaValidationResult,
): Promise<?MediaConversionResult> {
  const { uri, dimensions } = validationResult;
  let { blob } = validationResult;

  const { type: reportedMIME, size } = blob;
  if (
    reportedMIME === "image/heic" ||
    size > 5e6 ||
    (size > 5e5 && (dimensions.width > 3000 || dimensions.height > 2000))
  ) {
    try {
      const compressFormat = reportedMIME === "image/png" ? "PNG" : "JPEG";
      const compressQuality = size > 5e6 ? 92 : 100;
      const { uri: resizedURI, path, name } =
        await ImageResizer.createResizedImage(
          uri,
          3000,
          2000,
          compressFormat,
          compressQuality,
        );
      const resizedDimensions = await getDimensions(resizedURI);
      return {
        uploadURI: resizedURI,
        shouldDisposePath: path,
        name,
        mime: "image/jpeg",
        mediaType: "photo",
        dimensions: resizedDimensions,
      };
    } catch (e) { }
  }

  const dataURI = await blobToDataURI(blob);
  const intArray = dataURIToIntArray(dataURI);

  const blobName = blob.data.name;
  const fileInfo = fileInfoFromData(intArray, blobName);
  if (!fileInfo) {
    return null;
  }

  const { name, mime, mediaType } = fileInfo;
  return {
    uploadURI: Platform.OS === "ios" ? dataURI : uri,
    shouldDisposePath: null,
    name,
    mime,
    mediaType,
    dimensions,
  };
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
  validateMedia,
  blobToDataURI,
  dataURIToIntArray,
  convertMedia,
  pathFromURI,
};
