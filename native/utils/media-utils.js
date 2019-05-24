// @flow

import type { Dimensions, MediaType } from 'lib/types/media-types';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';

import str2ab from 'string-to-arraybuffer';
import { Platform } from 'react-native';

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

export type NativeImageInfo = {|
  uri: string,
  dimensions: Dimensions,
  name: string,
  mime: string,
  mediaType: MediaType,
|};
async function validateMedia(
  imageInfo: GalleryImageInfo,
): Promise<?NativeImageInfo> {
  const { uri: inputURI, ...dimensions } = imageInfo;
  const response = await fetch(inputURI);
  const blob = await response.blob();

  const dataURI = await blobToDataURI(blob);
  const arrayBuffer = str2ab(dataURI);
  const uint8Array = new Uint8Array(arrayBuffer);

  const blobName = blob.data.name;
  const fileInfo = fileInfoFromData(new Uint8Array(arrayBuffer), blobName);
  if (!fileInfo) {
    return null;
  }

  const { name, mime, mediaType } = fileInfo;
  const uri = Platform.OS === "ios" ? dataURI : inputURI;
  return { uri, dimensions, name, mime, mediaType };
}

export {
  validateMedia,
};
