// @flow

import invariant from 'invariant';
import * as React from 'react';
import { thumbHashToDataURL } from 'thumbhash';

import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import * as AES from 'lib/media/aes-crypto-utils-common.js';
import { hexToUintArray, uintArrayToHexString } from 'lib/media/data-utils.js';
import { fileInfoFromData } from 'lib/media/file-utils.js';
import { fetchableMediaURI } from 'lib/media/media-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import type {
  MediaMissionFailure,
  MediaMissionStep,
} from 'lib/types/media-types.js';
import { isBlobServiceURI } from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { calculatePaddedLength, pad, unpad } from 'lib/utils/pkcs7-padding.js';
import {
  createDefaultHTTPRequestHeaders,
  responseIsInvalidCSAT,
} from 'lib/utils/services-utils.js';

import { base64DecodeBuffer } from '../utils/base64-utils.js';

const PADDING_THRESHOLD = 5000000; // 5MB

type EncryptFileResult = {
  +success: true,
  +file: File,
  +uri: string,
  +encryptionKey: string,
  +sha256Hash: string,
};

async function encryptFile(input: File): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: EncryptFileResult | MediaMissionFailure,
}> {
  const steps = [];
  let success = true,
    exceptionMessage;

  // Step 1: Read the file into an ArrayBuffer
  let data;
  const arrayBufferStart = Date.now();
  try {
    const inputBuffer = await input.arrayBuffer();
    data = new Uint8Array(inputBuffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'array_buffer_from_blob',
    success,
    exceptionMessage,
    time: Date.now() - arrayBufferStart,
  });
  if (!success || !data) {
    return { steps, result: { success: false, reason: 'array_buffer_failed' } };
  }

  // Step 2: Encrypt the data
  const startEncrypt = Date.now();
  const paddedLength = calculatePaddedLength(data.length);
  const shouldPad = paddedLength <= PADDING_THRESHOLD;
  let key, encryptedData, sha256;
  try {
    const plaintextData = shouldPad ? pad(data) : data;
    key = await AES.generateKeyCommon(crypto);
    encryptedData = await AES.encryptCommon(crypto, key, plaintextData);

    const hashBytes = await crypto.subtle.digest('SHA-256', encryptedData);
    sha256 = btoa(String.fromCharCode(...new Uint8Array(hashBytes)));
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'encrypt_data',
    dataSize: encryptedData?.byteLength ?? -1,
    isPadded: shouldPad,
    time: Date.now() - startEncrypt,
    sha256,
    success,
    exceptionMessage,
  });
  if (encryptedData && !sha256) {
    return { steps, result: { success: false, reason: 'digest_failed' } };
  }
  if (!success || !encryptedData || !key || !sha256) {
    return { steps, result: { success: false, reason: 'encryption_failed' } };
  }

  // Step 3: Create a File from the encrypted data
  const output = new File([encryptedData], input.name, { type: input.type });
  return {
    steps,
    result: {
      success: true,
      file: output,
      uri: URL.createObjectURL(output),
      encryptionKey: uintArrayToHexString(key),
      sha256Hash: sha256,
    },
  };
}

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

type FetchAndDecryptMediaOutput = {
  steps: $ReadOnlyArray<DecryptFileStep>,
  result: { success: true, uri: string } | DecryptionFailure,
};

/**
 * Fetches the encrypted media for given {@link blobURI}, decrypts it,
 * and stores it in a blob. Returns the object URL of the blob.
 *
 * The returned object URL should be revoked when the media is no longer needed.
 */
async function fetchAndDecryptMedia(
  blobURI: string,
  encryptionKey: string,
  authMetadata: AuthMetadata,
): Promise<FetchAndDecryptMediaOutput> {
  let success = true;
  let exceptionMessage;
  const steps: DecryptFileStep[] = [];

  // Step 1 - Fetch the encrypted media and convert it to a Uint8Array
  const isBlobServiceHosted = isBlobServiceURI(blobURI);

  let headers;
  if (isBlobServiceHosted) {
    headers = createDefaultHTTPRequestHeaders(authMetadata);
  }

  let data;
  const fetchStartTime = Date.now();
  const url = fetchableMediaURI(blobURI);
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      if (isBlobServiceHosted && responseIsInvalidCSAT(response)) {
        return { steps, result: { success: false, reason: 'invalid_csat' } };
      }
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    data = new Uint8Array(buffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'fetch_buffer',
    url,
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
    const plaintext = await AES.decryptCommon(crypto, keyBytes, data);
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

function useFetchAndDecryptMedia(): (
  blobURI: string,
  encryptionKey: string,
) => Promise<FetchAndDecryptMediaOutput> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const invalidTokenLogOut = useInvalidCSATLogOut();

  return React.useCallback(
    async (blobURI, encryptionKey) => {
      const authMetadata = await getAuthMetadata();
      const output = await fetchAndDecryptMedia(
        blobURI,
        encryptionKey,
        authMetadata,
      );

      if (!output.result.success && output.result.reason === 'invalid_csat') {
        void invalidTokenLogOut();
      }
      return output;
    },
    [getAuthMetadata, invalidTokenLogOut],
  );
}

async function decryptThumbhashToDataURL(
  encryptedThumbHash: string,
  keyHex: string,
): Promise<string> {
  const encryptedData = base64DecodeBuffer(encryptedThumbHash);
  const thumbhashBytes = await AES.decryptCommon(
    crypto,
    hexToUintArray(keyHex),
    encryptedData,
  );
  return thumbHashToDataURL(thumbhashBytes);
}

export {
  encryptFile,
  fetchAndDecryptMedia,
  useFetchAndDecryptMedia,
  decryptThumbhashToDataURL,
};
