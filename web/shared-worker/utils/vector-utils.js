// @flow

import type { ClientDBIntegrityThreadHash } from 'lib/ops/integrity-store-ops.js';
import type { WebClientDBMessageStoreThread } from 'lib/ops/thread-store-ops.js';
import type { OutboundP2PMessage } from 'lib/types/sqlite-types.js';

import type { EmscriptenModule } from '../types/module.js';

export type EmscriptenVector<T> = {
  +size: () => number,
  +get: (index: number) => T,
  +push_back: (item: T) => void,
  ...
};

function vectorToArray<T>(vector: ?EmscriptenVector<T>): Array<T> {
  if (!vector || typeof vector.size !== 'function') {
    return [];
  }

  const size = vector.size();
  const array = [];

  for (let i = 0; i < size; i++) {
    array.push(vector.get(i));
  }

  return array;
}

function arrayToStringVector(
  array: $ReadOnlyArray<string>,
  dbModule: EmscriptenModule,
): EmscriptenVector<string> {
  if (!dbModule || !dbModule.StringVector) {
    throw new Error('Database module or StringVector not available');
  }

  const vector = new dbModule.StringVector();
  for (const item of array) {
    vector.push_back(item);
  }
  return vector;
}

function arrayToIntegrityThreadHashVector(
  array: $ReadOnlyArray<ClientDBIntegrityThreadHash>,
  dbModule: EmscriptenModule,
): EmscriptenVector<ClientDBIntegrityThreadHash> {
  if (!dbModule || !dbModule.IntegrityThreadHashVector) {
    throw new Error(
      'Database module or IntegrityThreadHashVector not available',
    );
  }

  const vector = new dbModule.IntegrityThreadHashVector();
  for (const item of array) {
    vector.push_back(item);
  }
  return vector;
}

function arrayToOutboundP2PMessageVector(
  array: $ReadOnlyArray<OutboundP2PMessage>,
  dbModule: EmscriptenModule,
): EmscriptenVector<OutboundP2PMessage> {
  if (!dbModule || !dbModule.OutboundP2PMessageVector) {
    throw new Error(
      'Database module or OutboundP2PMessageVector not available',
    );
  }

  const vector = new dbModule.OutboundP2PMessageVector();
  for (const item of array) {
    vector.push_back(item);
  }
  return vector;
}

function arrayToMessageStoreThreadVector(
  array: $ReadOnlyArray<WebClientDBMessageStoreThread>,
  dbModule: EmscriptenModule,
): EmscriptenVector<WebClientDBMessageStoreThread> {
  if (!dbModule || !dbModule.MessageStoreThreadVector) {
    throw new Error(
      'Database module or MessageStoreThreadVector not available',
    );
  }

  const vector = new dbModule.MessageStoreThreadVector();
  for (const item of array) {
    vector.push_back(item);
  }
  return vector;
}

function uint8ArrayToByteVector(
  array: Uint8Array,
  dbModule: EmscriptenModule,
): EmscriptenVector<number> {
  if (!dbModule || !dbModule.ByteVector) {
    throw new Error('Database module or ByteVector not available');
  }

  const vector = new dbModule.ByteVector();
  for (const byte of array) {
    vector.push_back(byte);
  }
  return vector;
}

export {
  vectorToArray,
  arrayToStringVector,
  arrayToIntegrityThreadHashVector,
  arrayToOutboundP2PMessageVector,
  arrayToMessageStoreThreadVector,
  uint8ArrayToByteVector,
};
