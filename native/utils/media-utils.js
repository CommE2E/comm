// @flow

import type { Dimensions, MediaType } from 'lib/types/media-types';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';

import { Platform } from 'react-native';
import base64 from 'base-64';

import { fileInfoFromData } from 'lib/utils/media-utils';

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

export type NativeImageInfo = {|
  uri: string,
  dataURI: ?string,
  dimensions: Dimensions,
  name: string,
  mime: string,
  mediaType: MediaType,
|};
async function validateMedia(
  imageInfo: GalleryImageInfo,
): Promise<?NativeImageInfo> {
  const { uri, ...dimensions } = imageInfo;
  const response = await fetch(uri);
  const blob = await response.blob();

  const dataURI = await blobToDataURI(blob);
  const intArray = dataURIToIntArray(dataURI);

  const blobName = blob.data.name;
  const fileInfo = fileInfoFromData(intArray, blobName);
  if (!fileInfo) {
    return null;
  }

  const { name, mime, mediaType } = fileInfo;
  return {
    uri,
    // On iOS, the URI we receive from the native side doesn't render with Image
    // and can't upload with fetch. Thus we need to use the dataURI for those
    // things, but we have to be careful to avoid storing it in Redux, as it's
    // quite long.
    dataURI: Platform.OS === "ios" ? dataURI : null,
    dimensions,
    name,
    mime,
    mediaType,
  };
}

export {
  validateMedia,
};
