// @flow

import { requireNativeModule } from 'expo-modules-core';
import RNBlob from 'react-native/Libraries/Blob/Blob.js';
import BlobManager from 'react-native/Libraries/Blob/BlobManager.js';
import type { BlobData } from 'react-native/Libraries/Blob/BlobTypes.js';

const BlobUtilsModule: {
  +copyBlobToTypedArray: (blob: BlobData, destination: Uint8Array) => void,
  +blobFromTypedArray: (data: $TypedArray) => string,
} = requireNativeModule('BlobUtils');

function arrayBufferFromBlob(blob: Blob): ArrayBuffer {
  // $FlowFixMe: react-native Blob type is incompatible with global Blob type
  const rnBlob = (blob: RNBlob);
  if (!(rnBlob instanceof RNBlob)) {
    throw new Error(
      'Given blob is not a React Native blob. Missing "data" property.',
    );
  }
  const blobData = rnBlob.data;

  const resultArray = new Uint8Array(blob.size);
  BlobUtilsModule.copyBlobToTypedArray(blobData, resultArray);
  return resultArray.buffer;
}

function blobFromArrayBuffer(arrayBuffer: ArrayBuffer, type?: string): Blob {
  const typedArray = new Uint8Array(arrayBuffer);
  const blobID = BlobUtilsModule.blobFromTypedArray(typedArray);
  const reactNativeBlob = BlobManager.createFromOptions({
    blobId: blobID,
    offset: 0,
    size: arrayBuffer.byteLength,
    type: type || '',
    lastModified: Date.now(),
  });

  // $FlowFixMe: react-native Blob type is incompatible with global Blob type
  // $FlowFixMe: even though they have the same properties
  return (reactNativeBlob: Blob);
}

export { arrayBufferFromBlob, blobFromArrayBuffer };
