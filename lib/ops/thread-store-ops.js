// @flow

import type {
  ClientDBThreadInfo,
  RawThreadInfo,
} from '../types/thread-types.js';

export type RemoveThreadOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllThreadsOperation = {
  +type: 'remove_all',
};

export type ReplaceThreadOperation = {
  +type: 'replace',
  +payload: { +id: string, +threadInfo: RawThreadInfo },
};

export type ThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ReplaceThreadOperation;

export type ClientDBReplaceThreadOperation = {
  +type: 'replace',
  +payload: ClientDBThreadInfo,
};

export type ClientDBThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ClientDBReplaceThreadOperation;
