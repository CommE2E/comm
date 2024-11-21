// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import { uintArrayToHexString, hexToUintArray } from 'lib/media/data-utils.js';
import {
  replaceExtension,
  fileInfoFromData,
  filenameFromPathOrURI,
  readableFilename,
  pathFromURI,
} from 'lib/media/file-utils.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  MediaMissionFailure,
  MediaMissionStep,
  DecryptFileMediaMissionStep,
  EncryptFileMediaMissionStep,
} from 'lib/types/media-types.js';
import { isBlobServiceURI } from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { pad, unpad, calculatePaddedLength } from 'lib/utils/pkcs7-padding.js';
import {
  createDefaultHTTPRequestHeaders,
  usingCommServicesAccessToken,
  httpResponseIsInvalidCSAT,
} from 'lib/utils/services-utils.js';

import { temporaryDirectoryPath } from './file-utils.js';
import { getFetchableURI } from './identifier-utils.js';
import type { MediaResult } from './media-utils.js';
import { commUtilsModule } from '../native-modules.js';
import * as AES from '../utils/aes-crypto-module.js';
import { arrayBufferFromBlob } from '../utils/blob-utils-module.js';

const PADDING_THRESHOLD = 5000000; // we don't pad files larger than this

type EncryptedFileResult = {
  +success: true,
  +uri: string,
  +sha256Hash: string,
  +encryptionKey: string,
};

/**
 * Encrypts a single file and returns the encrypted file URI
 * and the encryption key. The encryption key is returned as a hex string.
 * The encrypted file is written to the same directory as the original file,
 * with the same name, but with the extension ".dat".
 *
 * @param uri uri to the file to encrypt
 * @returns encryption result along with mission steps
 */
async function encryptFile(uri: string): Promise<{
  steps: $ReadOnlyArray<EncryptFileMediaMissionStep>,
  result: MediaMissionFailure | EncryptedFileResult,
}> {
  let success = true,
    exceptionMessage;
  const steps: EncryptFileMediaMissionStep[] = [];

  // prepare destination path for temporary encrypted file
  const originalFilename = filenameFromPathOrURI(uri);
  invariant(originalFilename, 'encryptFile: Invalid URI - filename is null');
  const targetFilename = replaceExtension(originalFilename, 'dat');
  const destinationPath = `${temporaryDirectoryPath}${targetFilename}`;
  const destinationURI = `file://${destinationPath}`;

  // Step 1. Read the file
  const startOpenFile = Date.now();
  let data;
  try {
    const path = pathFromURI(uri);
    // for local paths (file:// URI) we can use native module which is faster
    if (path) {
      const buffer = await commUtilsModule.readBufferFromFile(path);
      data = new Uint8Array(buffer);
    } else {
      const response = await fetch(getFetchableURI(uri));
      const blob = await response.blob();
      const buffer = arrayBufferFromBlob(blob);
      data = new Uint8Array(buffer);
    }
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'read_plaintext_file',
    file: uri,
    time: Date.now() - startOpenFile,
    success,
    exceptionMessage,
  });
  if (!success || !data) {
    return {
      steps,
      result: { success: false, reason: 'fetch_failed' },
    };
  }

  // Step 2. Encrypt the file
  const startEncrypt = Date.now();
  const paddedLength = calculatePaddedLength(data.byteLength);
  const shouldPad = paddedLength <= PADDING_THRESHOLD;
  let key, encryptedData, sha256Hash;
  try {
    const plaintextData = shouldPad ? pad(data) : data;
    key = AES.generateKey();
    encryptedData = AES.encrypt(key, plaintextData);
    sha256Hash = commUtilsModule.sha256(encryptedData.buffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'encrypt_data',
    dataSize: encryptedData?.byteLength ?? -1,
    isPadded: shouldPad,
    time: Date.now() - startEncrypt,
    sha256: sha256Hash,
    success,
    exceptionMessage,
  });
  if (encryptedData && !sha256Hash) {
    return { steps, result: { success: false, reason: 'digest_failed' } };
  }
  if (!success || !encryptedData || !key || !sha256Hash) {
    return {
      steps,
      result: { success: false, reason: 'encryption_failed' },
    };
  }

  // Step 3. Write the encrypted file
  const startWriteFile = Date.now();
  try {
    await commUtilsModule.writeBufferToFile(
      destinationPath,
      encryptedData.buffer,
    );
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'write_encrypted_file',
    file: destinationPath,
    time: Date.now() - startWriteFile,
    success,
    exceptionMessage,
  });
  if (!success) {
    return {
      steps,
      result: { success: false, reason: 'write_file_failed' },
    };
  }

  return {
    steps,
    result: {
      success: true,
      uri: destinationURI,
      encryptionKey: uintArrayToHexString(key),
      sha256Hash,
    },
  };
}

/**
 * Encrypts a single photo or video. Replaces the uploadURI with the encrypted
 * file URI. Attaches `encryptionKey` to the result. Changes the mediaType to
 * `encrypted_photo` or `encrypted_video`.
 *
 * @param preprocessedMedia - Result of `processMedia()` call
 * @returns a `preprocessedMedia` param, but with encryption applied
 */
async function encryptMedia(preprocessedMedia: MediaResult): Promise<{
  result: MediaResult | MediaMissionFailure,
  steps: $ReadOnlyArray<MediaMissionStep>,
}> {
  invariant(preprocessedMedia.success, 'encryptMedia called on failure result');
  invariant(
    preprocessedMedia.mediaType === 'photo' ||
      preprocessedMedia.mediaType === 'video',
    'encryptMedia should only be called on unencrypted photos and videos',
  );
  const { uploadURI } = preprocessedMedia;
  const steps: Array<MediaMissionStep> = [];

  // Encrypt the media file
  const { steps: encryptionSteps, result: encryptionResult } =
    await encryptFile(uploadURI);
  steps.push(...encryptionSteps);

  if (!encryptionResult.success) {
    return { steps, result: encryptionResult };
  }

  if (preprocessedMedia.mediaType === 'photo') {
    const thumbHashResult = preprocessedMedia.thumbHash
      ? encryptBase64(
          preprocessedMedia.thumbHash,
          hexToUintArray(encryptionResult.encryptionKey),
        )
      : null;
    return {
      steps,
      result: {
        ...preprocessedMedia,
        mediaType: 'encrypted_photo',
        uploadURI: encryptionResult.uri,
        blobHash: encryptionResult.sha256Hash,
        thumbHash: thumbHashResult?.base64,
        encryptionKey: encryptionResult.encryptionKey,
        shouldDisposePath: pathFromURI(encryptionResult.uri),
      },
    };
  }

  // For videos, we also need to encrypt the thumbnail
  const { steps: thumbnailEncryptionSteps, result: thumbnailEncryptionResult } =
    await encryptFile(preprocessedMedia.uploadThumbnailURI);
  steps.push(...thumbnailEncryptionSteps);

  if (!thumbnailEncryptionResult.success) {
    return { steps, result: thumbnailEncryptionResult };
  }

  const thumbHashResult = preprocessedMedia.thumbHash
    ? encryptBase64(
        preprocessedMedia.thumbHash,
        hexToUintArray(thumbnailEncryptionResult.encryptionKey),
      )
    : null;

  return {
    steps,
    result: {
      ...preprocessedMedia,
      mediaType: 'encrypted_video',
      uploadURI: encryptionResult.uri,
      blobHash: encryptionResult.sha256Hash,
      thumbHash: thumbHashResult?.base64,
      encryptionKey: encryptionResult.encryptionKey,
      uploadThumbnailURI: thumbnailEncryptionResult.uri,
      thumbnailBlobHash: thumbnailEncryptionResult.sha256Hash,
      thumbnailEncryptionKey: thumbnailEncryptionResult.encryptionKey,
      shouldDisposePath: pathFromURI(encryptionResult.uri),
    },
  };
}

type FetchAndDecryptMediaOptions = {
  +destination: 'file' | 'data_uri',
  +destinationDirectory?: string,
};

type FetchAndDecryptMediaOutput = {
  steps: $ReadOnlyArray<DecryptFileMediaMissionStep>,
  result: MediaMissionFailure | { success: true, uri: string },
};

async function fetchAndDecryptMedia(
  blobURI: string,
  encryptionKey: string,
  authMetadata: ?AuthMetadata,
  options: FetchAndDecryptMediaOptions,
): Promise<FetchAndDecryptMediaOutput> {
  let success = true,
    exceptionMessage;
  const steps: DecryptFileMediaMissionStep[] = [];

  // Step 1. Fetch the file and convert it to a Uint8Array
  const isBlobServiceHosted = isBlobServiceURI(blobURI);

  let headers;
  if (isBlobServiceHosted && authMetadata) {
    headers = createDefaultHTTPRequestHeaders(authMetadata);
  }

  const fetchStartTime = Date.now();
  let data;
  try {
    const response = await fetch(getFetchableURI(blobURI), { headers });
    if (!response.ok) {
      if (isBlobServiceHosted && httpResponseIsInvalidCSAT(response)) {
        return { steps, result: { success: false, reason: 'invalid_csat' } };
      }
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = arrayBufferFromBlob(blob);
    data = new Uint8Array(buffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'fetch_file',
    file: blobURI,
    time: Date.now() - fetchStartTime,
    success,
    exceptionMessage,
  });
  if (!success || !data) {
    return {
      steps,
      result: { success: false, reason: 'fetch_file_failed', exceptionMessage },
    };
  }

  // Step 2. Decrypt the data
  const decryptionStartTime = Date.now();
  let plaintextData, decryptedData, isPadded;
  try {
    const key = hexToUintArray(encryptionKey);
    plaintextData = AES.decrypt(key, data);
    isPadded = plaintextData.byteLength <= PADDING_THRESHOLD;
    decryptedData = isPadded ? unpad(plaintextData) : plaintextData;
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'decrypt_data',
    dataSize: decryptedData?.byteLength ?? -1,
    isPadded: !!isPadded,
    time: Date.now() - decryptionStartTime,
    success,
    exceptionMessage,
  });

  if (!success || !decryptedData) {
    return {
      steps,
      result: {
        success: false,
        reason: 'decrypt_data_failed',
        exceptionMessage,
      },
    };
  }

  // Step 3. Write the file to disk or create a data URI
  let uri;
  const writeStartTime = Date.now();
  // we need extension for react-native-video to work
  const { mime } = fileInfoFromData(decryptedData);
  if (!mime) {
    return {
      steps,
      result: {
        success: false,
        reason: 'mime_check_failed',
        mime,
      },
    };
  }
  if (options.destination === 'file') {
    // blobURI is a URL, we use the last part of the path as the filename
    const uriSuffix = blobURI.substring(blobURI.lastIndexOf('/') + 1);
    const filename = readableFilename(uriSuffix, mime) || uriSuffix;
    const directory = options.destinationDirectory ?? temporaryDirectoryPath;
    const targetPath = `${directory}${Date.now()}-${filename}`;
    try {
      await commUtilsModule.writeBufferToFile(targetPath, decryptedData.buffer);
    } catch (e) {
      success = false;
      exceptionMessage = getMessageForException(e);
    }
    uri = `file://${targetPath}`;
    steps.push({
      step: 'write_file',
      file: uri,
      mimeType: mime,
      time: Date.now() - writeStartTime,
      success,
      exceptionMessage,
    });
    if (!success) {
      return {
        steps,
        result: {
          success: false,
          reason: 'write_file_failed',
          exceptionMessage,
        },
      };
    }
  } else {
    const base64 = commUtilsModule.base64EncodeBuffer(decryptedData.buffer);
    uri = `data:${mime};base64,${base64}`;
    steps.push({
      step: 'create_data_uri',
      mimeType: mime,
      time: Date.now() - writeStartTime,
      success,
      exceptionMessage,
    });
  }

  return {
    steps,
    result: { success: true, uri },
  };
}

function useFetchAndDecryptMedia(): (
  blobURI: string,
  encryptionKey: string,
  options: FetchAndDecryptMediaOptions,
) => Promise<FetchAndDecryptMediaOutput> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const invalidTokenLogOut = useInvalidCSATLogOut();

  return React.useCallback(
    async (blobURI, encryptionKey, options) => {
      let authMetadata;
      if (usingCommServicesAccessToken) {
        try {
          authMetadata = await getAuthMetadata();
        } catch (err) {
          console.warn('Failed to get auth metadata:', err);
        }
      }
      const output = await fetchAndDecryptMedia(
        blobURI,
        encryptionKey,
        authMetadata,
        options,
      );

      if (!output.result.success && output.result.reason === 'invalid_csat') {
        void invalidTokenLogOut();
      }
      return output;
    },
    [getAuthMetadata, invalidTokenLogOut],
  );
}

function encryptBase64(
  base64: string,
  keyBytes?: Uint8Array,
): { +base64: string, +keyHex: string } {
  const rawData = commUtilsModule.base64DecodeBuffer(base64);
  const aesKey = keyBytes ?? AES.generateKey();
  const encrypted = AES.encrypt(aesKey, new Uint8Array(rawData));
  return {
    base64: commUtilsModule.base64EncodeBuffer(encrypted.buffer),
    keyHex: uintArrayToHexString(aesKey),
  };
}

function decryptBase64(encrypted: string, keyHex: string): string {
  const encryptedData = commUtilsModule.base64DecodeBuffer(encrypted);
  const decryptedData = AES.decrypt(
    hexToUintArray(keyHex),
    new Uint8Array(encryptedData),
  );
  return commUtilsModule.base64EncodeBuffer(decryptedData.buffer);
}

export {
  encryptMedia,
  fetchAndDecryptMedia,
  useFetchAndDecryptMedia,
  encryptBase64,
  decryptBase64,
};
