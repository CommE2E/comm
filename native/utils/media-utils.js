// @flow

import type { Dimensions, MediaType } from 'lib/types/media-types';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';

import { Platform } from 'react-native';
import base64 from 'base-64';
import HeicConverter from 'react-native-heic-converter';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
} from 'lib/utils/media-utils';

type ReactNativeBlob = Blob & { data: { type: string, name: string } };
export type MediaValidationResult = {
  uri: string,
  dimensions: Dimensions,
  mediaType: MediaType,
  blob: ReactNativeBlob,
};
async function validateMedia(
  imageInfo: GalleryImageInfo,
): Promise<?MediaValidationResult> {
  const { uri, ...dimensions } = imageInfo;
  const response = await fetch(uri);
  const blob = await response.blob();
  const reportedMIME = blob.data.type;
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
  let uri = dataURI;
  uri = uri.replace(/\r?\n/g, '');
  const firstComma = uri.indexOf(',');
  if (-1 === firstComma || firstComma <= 4) {
    throw new TypeError('malformed data-URI');
  }
  const meta = uri.substring(5, firstComma).split(';');

  let base64Encoded = false;
  let charset = 'US-ASCII';
  for (let i = 0; i < meta.length; i++) {
    if (meta[i] === 'base64') {
      base64Encoded = true;
    } else if (meta[i].indexOf('charset=') === 0) {
      charset = meta[i].substring(8);
    }
  }

  let data = unescape(uri.substring(firstComma + 1));
  if (base64Encoded) {
    data = base64.decode(data);
  }

  return stringToIntArray(data);
}

function getHEICAssetLibraryURI(uri: string) {
  if (!uri.startsWith('ph://')) {
    return uri;
  }
  const photoKitID = uri.substr(5);
  const hash = photoKitID.split('/')[0];
  return `assets-library://asset/asset.heic?id=${hash}&ext=heic`;
}

type MediaConversionResult = {|
  uploadURI: string,
  name: string,
  mime: string,
  mediaType: MediaType,
|};
async function convertMedia(
  validationResult: MediaValidationResult,
): Promise<?MediaConversionResult> {
  const { uri } = validationResult;
  let { blob } = validationResult;

  const reportedMIME = blob.data.type;
  if (Platform.OS === "ios" && reportedMIME === "image/heic") {
    const assetLibraryURI = getHEICAssetLibraryURI(uri);
    const { success, path } = await HeicConverter.convert({
      path: assetLibraryURI,
      quality: 0.7,
    });
    if (success) {
      const jpegResponse = await fetch(path);
      blob = await jpegResponse.blob();
    }
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
    name,
    mime,
    mediaType,
  };
}

export {
  validateMedia,
  convertMedia,
};
