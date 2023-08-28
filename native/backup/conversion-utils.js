// @flow

import { commUtilsModule } from '../native-modules.js';
import { arrayBufferFromBlob } from '../utils/blob-utils-module.js';

function getBackupBytesFromBlob(blob: Blob): Uint8Array {
  const buffer = arrayBufferFromBlob(blob);
  const str = commUtilsModule.decodeUTF8ArrayBufferToString(buffer);
  const decodedBuffer = commUtilsModule.base64DecodeBuffer(str);
  return new Uint8Array(decodedBuffer);
}

export { getBackupBytesFromBlob };
