// @flow

import { commUtilsModule } from '../native-modules.js';
import { arrayBufferFromBlob } from '../utils/blob-utils-module.js';

function getBackupBytesFromBlob(blob: Blob): Uint8Array {
  const buffer = arrayBufferFromBlob(blob);
  const str = commUtilsModule.decodeUTF8ArrayBufferToString(buffer);
  const decodedBuffer = commUtilsModule.base64DecodeBuffer(str);
  return new Uint8Array(decodedBuffer);
}

function convertObjToBytes<T>(obj: T): Uint8Array {
  const objStr = JSON.stringify(obj);
  const objBuffer = commUtilsModule.encodeStringToUTF8ArrayBuffer(objStr ?? '');
  return new Uint8Array(objBuffer);
}

function convertBytesToObj<T>(bytes: Uint8Array): T {
  const str = commUtilsModule.decodeUTF8ArrayBufferToString(bytes.buffer);
  return JSON.parse(str);
}

export { getBackupBytesFromBlob, convertObjToBytes, convertBytesToObj };
