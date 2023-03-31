// @flow

import invariant from 'invariant';

import { hexToUintArray } from 'lib/media/data-utils.js';
import { fileInfoFromData } from 'lib/media/file-utils.js';
import type { MediaMissionFailure } from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { unpad } from 'lib/utils/pkcs7-padding.js';

import * as AES from './aes-crypto-utils.js';

const PADDING_THRESHOLD = 5_000_000; // 5MB

type DecryptFileStep =
  | {
      +step: 'fetch_buffer',
      +url: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'decrypt_data',
      +dataSize: number,
      +time: number,
      +isPadded: boolean,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'save_blob',
      +objectURL: ?string,
      +mimeType: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    };
type DecryptionFailure =
  | MediaMissionFailure
  | {
      +success: false,
      +reason: 'decrypt_data_failed' | 'save_blob_failed',
    };

/**
 * Fetches the encrypted media for given {@link holder}, decrypts it,
 * and stores it in a blob. Returns the object URL of the blob.
 *
 * The returned object URL should be revoked when the media is no longer needed.
 */
async function decryptMedia(
  holder: string,
  encryptionKey: string,
): Promise<{
  steps: $ReadOnlyArray<DecryptFileStep>,
  result: { success: true, uri: string } | DecryptionFailure,
}> {
  let success = true;
  let exceptionMessage;
  const steps: DecryptFileStep[] = [];

  // Step 1 - Fetch the encrypted media and convert it to a Uint8Array
  let data;
  const fetchStartTime = Date.now();
  try {
    const response = await fetch(holder);
    const buffer = await response.arrayBuffer();
    data = new Uint8Array(buffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'fetch_buffer',
    url: holder,
    time: Date.now() - fetchStartTime,
    success,
    exceptionMessage,
  });
  if (!success || !data) {
    return {
      steps,
      result: { success: false, reason: 'fetch_failed' },
    };
  }

  // Step 2 - Decrypt the data
  let decryptedData;
  const decryptStartTime = Date.now();
  try {
    const keyBytes = hexToUintArray(encryptionKey);
    const plaintext = await AES.decrypt(keyBytes, data);
    decryptedData =
      plaintext.byteLength > PADDING_THRESHOLD ? plaintext : unpad(plaintext);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'decrypt_data',
    dataSize: decryptedData?.byteLength ?? -1,
    time: Date.now() - decryptStartTime,
    isPadded: data.byteLength > PADDING_THRESHOLD,
    success,
    exceptionMessage,
  });
  if (!success || !decryptedData) {
    return { steps, result: { success: false, reason: 'decrypt_data_failed' } };
  }

  // Step 3 - Create a blob from the decrypted data and return it
  const saveStartTime = Date.now();
  const { mime } = fileInfoFromData(decryptedData);
  if (!mime) {
    return {
      steps,
      result: { success: false, reason: 'mime_check_failed', mime },
    };
  }

  let objectURL;
  try {
    invariant(mime, 'mime type should be defined');
    const decryptedBlob = new Blob([decryptedData], { type: mime });
    objectURL = URL.createObjectURL(decryptedBlob);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'save_blob',
    objectURL,
    mimeType: mime,
    time: Date.now() - saveStartTime,
    success,
    exceptionMessage,
  });
  if (!success || !objectURL) {
    return {
      steps,
      result: { success: false, reason: 'save_blob_failed' },
    };
  }

  return { steps, result: { success: true, uri: objectURL } };
}

export { decryptMedia };
