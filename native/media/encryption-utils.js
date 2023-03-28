// @flow

import filesystem from 'react-native-fs';

import { base64FromIntArray, hexToUintArray } from 'lib/media/data-utils.js';
import { fileInfoFromData, readableFilename } from 'lib/media/file-utils.js';
import type { MediaMissionFailure } from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { unpad } from 'lib/utils/pkcs7-padding.js';

import { temporaryDirectoryPath } from './file-utils.js';
import { getFetchableURI } from './identifier-utils.js';
import * as AES from '../utils/aes-crypto-module.js';

const PADDING_THRESHOLD = 5_000_000; // we don't pad files larger than this

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
    plaintextData = await AES.decrypt(key, data);
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
  const base64 = base64FromIntArray(decryptedData);
  if (options.destination === 'file') {
    // if holder is a URL, then we use the last part of the path as the filename
    const holderSuffix = holder.substring(holder.lastIndexOf('/') + 1);
    const filename = readableFilename(holderSuffix, mime) || holderSuffix;
    const targetPath = `${temporaryDirectoryPath}${Date.now()}-${filename}`;
    try {
      await filesystem.writeFile(targetPath, base64, 'base64');
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
    result: {
      success: true,
      uri,
    },
  };
}

export { decryptMedia };
