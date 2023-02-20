// @flow

import base64 from 'base-64';
import invariant from 'invariant';

import {
  fileInfoFromData,
  bytesNeededForFileTypeCheck,
} from 'lib/media/file-utils.js';
import type {
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { getFetchableURI } from './identifier-utils.js';

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

const base64CharsNeeded = 4 * Math.ceil(bytesNeededForFileTypeCheck / 3);

function dataURIToIntArray(dataURI: string): Uint8Array {
  const uri = dataURI.replace(/\r?\n/g, '');

  const firstComma = uri.indexOf(',');
  if (firstComma <= 4) {
    throw new TypeError('malformed data-URI');
  }

  const meta = uri.substring(5, firstComma).split(';');
  const base64Encoded = meta.some(metum => metum === 'base64');

  let data = unescape(uri.substr(firstComma + 1, base64CharsNeeded));
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

type FetchBlobResult = {
  success: true,
  base64: string,
  mime: string,
};
async function fetchBlob(inputURI: string): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FetchBlobResult,
}> {
  const uri = getFetchableURI(inputURI);
  const steps = [];

  let blob, fetchExceptionMessage;
  const fetchStart = Date.now();
  try {
    const response = await fetch(uri);
    blob = await response.blob();
  } catch (e) {
    fetchExceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'fetch_blob',
    success: !!blob,
    exceptionMessage: fetchExceptionMessage,
    time: Date.now() - fetchStart,
    inputURI,
    uri,
    size: blob && blob.size,
    mime: blob && blob.type,
  });
  if (!blob) {
    return { result: { success: false, reason: 'fetch_failed' }, steps };
  }

  let dataURI, dataURIExceptionMessage;
  const dataURIStart = Date.now();
  try {
    dataURI = await blobToDataURI(blob);
  } catch (e) {
    dataURIExceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'data_uri_from_blob',
    success: !!dataURI,
    exceptionMessage: dataURIExceptionMessage,
    time: Date.now() - dataURIStart,
    first255Chars: dataURI && dataURI.substring(0, 255),
  });
  if (!dataURI) {
    return { result: { success: false, reason: 'data_uri_failed' }, steps };
  }

  const firstComma = dataURI.indexOf(',');
  invariant(firstComma > 4, 'malformed data-URI');
  const base64String = dataURI.substring(firstComma + 1);

  let mime = blob.type;
  if (!mime) {
    let mimeCheckExceptionMessage;
    const mimeCheckStart = Date.now();
    try {
      const intArray = dataURIToIntArray(dataURI);
      ({ mime } = fileInfoFromData(intArray));
    } catch (e) {
      mimeCheckExceptionMessage = getMessageForException(e);
    }
    steps.push({
      step: 'mime_check',
      success: !!mime,
      exceptionMessage: mimeCheckExceptionMessage,
      time: Date.now() - mimeCheckStart,
      mime,
    });
  }

  if (!mime) {
    return {
      result: { success: false, reason: 'mime_check_failed', mime },
      steps,
    };
  }
  return { result: { success: true, base64: base64String, mime }, steps };
}

export { stringToIntArray, fetchBlob };
