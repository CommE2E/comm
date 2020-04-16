// @flow

import type { MediaType, MediaMissionStep } from 'lib/types/media-types';

import base64 from 'base-64';
import invariant from 'invariant';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
  type FileDataInfo,
} from 'lib/utils/file-utils';

export type ReactNativeBlob = Blob & {
  data: { type: string, name: string, size: number },
};

// Processes the contents of the blob, looking at "magic numbers" to determine
// MIME type
async function getBlobDataInfo(blob: ReactNativeBlob): Promise<FileDataInfo> {
  const dataURI = await blobToDataURI(blob);
  const intArray = dataURIToIntArray(dataURI);
  return fileInfoFromData(intArray);
}

function blobToDataURI(blob: Blob): Promise<string> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = () => {
      invariant(
        typeof fileReader.result === 'string',
        'FileReader.readAsDataURL should result in string',
      );
      resolve(fileReader.result);
    };
    fileReader.readAsDataURL(blob);
  });
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

function stringToIntArray(str: string): Uint8Array {
  const array = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }
  return array;
}

type FetchBlobResponse = {|
  blob: ReactNativeBlob,
  reportedMIME: ?string,
  reportedMediaType: ?string,
|};
async function fetchBlob(
  uri: string,
  type: MediaType,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?FetchBlobResponse,
|}> {
  const blobFetchStart = Date.now();
  let blob, reportedMIME, reportedMediaType, exceptionMessage;
  try {
    blob = await getBlobFromURI(uri, type);
    reportedMIME =
      uri.startsWith('ph://') && blob.type === 'application/octet-stream'
        ? 'video/quicktime'
        : blob.type;
    reportedMediaType = mimeTypesToMediaTypes[reportedMIME];
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      e.message &&
      typeof e.message === 'string'
    ) {
      exceptionMessage = e.message;
    }
  }

  const compareTypesStep = {
    step: 'compare_blob_mime_to_media_type',
    type,
    success: type === reportedMediaType,
    exceptionMessage,
    time: Date.now() - blobFetchStart,
    blobFetched: !!blob,
    blobMIME: blob ? blob.type : null,
    reportedMIME,
    blobName: blob && blob.data ? blob.data.name : null,
    size: blob ? blob.size : null,
  };

  if (!blob) {
    return { steps: [compareTypesStep], result: null };
  }

  const result = {
    blob,
    reportedMIME,
    reportedMediaType,
  };
  return { steps: [compareTypesStep], result };
}

async function getBlobFromURI(
  uri: string,
  type: MediaType,
): Promise<ReactNativeBlob> {
  // React Native always resolves FBMediaKit's ph:// scheme as an image so that
  // the Image component can render thumbnails of videos. In order to force
  // fetch() to return a blob of the video, we need to use the ph-upload://
  // scheme. https://git.io/Jerlh
  const fbMediaKitURL = uri.startsWith('ph://');
  const fixedURI =
    fbMediaKitURL && type === 'video' ? uri.replace(/^ph:/, 'ph-upload:') : uri;
  const response = await fetch(fixedURI);
  return await response.blob();
}

export { getBlobDataInfo, blobToDataURI, dataURIToIntArray, fetchBlob };
