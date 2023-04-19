// @flow

import invariant from 'invariant';

import { uintArrayToHexString, hexToUintArray } from 'lib/media/data-utils.js';
import {
  replaceExtension,
  fileInfoFromData,
  readableFilename,
  pathFromURI,
} from 'lib/media/file-utils.js';
import type {
  MediaMissionFailure,
  MediaMissionStep,
  EncryptFileMediaMissionStep,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { pad, unpad, calculatePaddedLength } from 'lib/utils/pkcs7-padding.js';

import { temporaryDirectoryPath } from './file-utils.js';
import { getFetchableURI } from './identifier-utils.js';
import type { MediaResult } from './media-utils.js';
import { commUtilsModule } from '../native-modules.js';
import * as AES from '../utils/aes-crypto-module.js';

const PADDING_THRESHOLD = 5000000; // we don't pad files larger than this

type EncryptedFileResult = {
  +success: true,
  +uri: string,
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
  const destinationURI = replaceExtension(uri, 'dat');
  const destination = pathFromURI(destinationURI);
  invariant(destination, `uri must be a local file:// path: ${destinationURI}`);

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
      const buffer = await response.arrayBuffer();
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
  let key, encryptedData;
  try {
    const plaintextData = shouldPad ? pad(data) : data;
    key = AES.generateKey();
    encryptedData = AES.encrypt(key, plaintextData);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'encrypt_data',
    dataSize: encryptedData?.byteLength ?? -1,
    isPadded: shouldPad,
    time: Date.now() - startEncrypt,
    success,
    exceptionMessage,
  });
  if (!success || !encryptedData || !key) {
    return {
      steps,
      result: { success: false, reason: 'encryption_failed' },
    };
  }

  // Step 3. Write the encrypted file
  const startWriteFile = Date.now();
  try {
    await commUtilsModule.writeBufferToFile(destination, encryptedData.buffer);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'write_encrypted_file',
    file: destination,
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
  const steps = [];

  // Encrypt the media file
  const { steps: encryptionSteps, result: encryptionResult } =
    await encryptFile(uploadURI);
  steps.push(...encryptionSteps);

  if (!encryptionResult.success) {
    return { steps, result: encryptionResult };
  }

  if (preprocessedMedia.mediaType === 'photo') {
    return {
      steps,
      result: {
        ...preprocessedMedia,
        mediaType: 'encrypted_photo',
        uploadURI: encryptionResult.uri,
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

  return {
    steps,
    result: {
      ...preprocessedMedia,
      mediaType: 'encrypted_video',
      uploadURI: encryptionResult.uri,
      encryptionKey: encryptionResult.encryptionKey,
      uploadThumbnailURI: thumbnailEncryptionResult.uri,
      thumbnailEncryptionKey: thumbnailEncryptionResult.encryptionKey,
      shouldDisposePath: pathFromURI(encryptionResult.uri),
    },
  };
}

type DecryptFileStep =
  | {
      +step: 'fetch_file',
      +file: string,
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
      +step: 'write_file',
      +file: string,
      +mimeType: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'create_data_uri',
      +mimeType: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    };
type DecryptionFailure =
  | MediaMissionFailure
  | {
      +success: false,
      +reason:
        | 'fetch_file_failed'
        | 'decrypt_data_failed'
        | 'write_file_failed',
      +exceptionMessage: ?string,
    };

async function decryptMedia(
  holder: string,
  encryptionKey: string,
  options: { +destination: 'file' | 'data_uri' },
): Promise<{
  steps: $ReadOnlyArray<DecryptFileStep>,
  result: DecryptionFailure | { success: true, uri: string },
}> {
  let success = true,
    exceptionMessage;
  const steps: DecryptFileStep[] = [];

  // Step 1. Fetch the file and convert it to a Uint8Array
  const fetchStartTime = Date.now();
  let data;
  try {
    const response = await fetch(getFetchableURI(holder));
    const buf = await response.arrayBuffer();
    data = new Uint8Array(buf);
  } catch (e) {
    success = false;
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'fetch_file',
    file: holder,
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
    // if holder is a URL, then we use the last part of the path as the filename
    const holderSuffix = holder.substring(holder.lastIndexOf('/') + 1);
    const filename = readableFilename(holderSuffix, mime) || holderSuffix;
    const targetPath = `${temporaryDirectoryPath}${Date.now()}-${filename}`;
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

export { encryptMedia, decryptMedia };
